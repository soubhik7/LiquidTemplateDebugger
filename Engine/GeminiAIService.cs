using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using LiquidTemplateDebugger.Engine.Interfaces;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Implementation of IAIService using Google Gemini API
/// </summary>
public class GeminiAIService : IAIService
{
    private readonly HttpClient _httpClient;
    private readonly AIConfiguration _config;
    private readonly DataSanitizer _sanitizer;
    private const string GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

    public GeminiAIService(AIConfiguration config, HttpClient? httpClient = null)
    {
        _config = config;
        _httpClient = httpClient ?? new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(config.TimeoutSeconds);
        _sanitizer = new DataSanitizer(config);
    }

    public bool IsConfigured()
    {
        return _config.Enabled && !string.IsNullOrWhiteSpace(_config.ApiKey);
    }

    public async Task<GenerateTemplateResponse> GenerateTemplateAsync(GenerateTemplateRequest request)
    {
        if (!IsConfigured())
        {
            return new GenerateTemplateResponse
            {
                Success = false,
                ErrorMessage = "AI service is not configured. Please set up your Gemini API key in Settings."
            };
        }

        var stopwatch = Stopwatch.StartNew();
        var response = new GenerateTemplateResponse();

        try
        {
            // Sanitize input data
            var inputSanitization = _sanitizer.Sanitize(request.InputData, request.InputFormat);
            var outputSanitization = _sanitizer.Sanitize(request.ExpectedOutput, request.OutputFormat);

            response.Metadata.DataWasSanitized = inputSanitization.WasSanitized || outputSanitization.WasSanitized;
            response.Metadata.SanitizedFields = inputSanitization.SanitizedFields
                .Concat(outputSanitization.SanitizedFields)
                .Select(f => f.FieldPath)
                .ToList();

            if (response.Metadata.DataWasSanitized)
            {
                response.Warnings.Add($"Sanitized {response.Metadata.SanitizedFields.Count} sensitive fields before processing.");
            }

            // Build the prompt
            var prompt = BuildPrompt(
                inputSanitization.SanitizedData,
                outputSanitization.SanitizedData,
                request.BusinessLogic,
                request.InputFormat,
                request.OutputFormat,
                request.Options
            );

            // Call Gemini API
            var model = request.Options.Model ?? _config.DefaultModel;
            var geminiResponse = await CallGeminiApiAsync(prompt, model, request.Options);

            if (geminiResponse.Success)
            {
                response.Success = true;
                response.GeneratedTemplate = ExtractTemplateFromResponse(geminiResponse.Content);
                response.Metadata.TokensUsed = geminiResponse.TokensUsed;
                response.Metadata.ModelUsed = model;
            }
            else
            {
                response.Success = false;
                response.ErrorMessage = geminiResponse.ErrorMessage;
            }
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.ErrorMessage = $"Template generation failed: {ex.Message}";
        }
        finally
        {
            stopwatch.Stop();
            response.Metadata.GenerationTimeMs = stopwatch.Elapsed.TotalMilliseconds;
        }

        return response;
    }

    public async Task<bool> ValidateApiKeyAsync(string apiKey)
    {
        try
        {
            var url = $"{GEMINI_API_BASE}/models?key={apiKey}";
            var response = await _httpClient.GetAsync(url);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<List<string>> GetAvailableModelsAsync()
    {
        if (!IsConfigured())
        {
            return new List<string> { "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro" };
        }

        try
        {
            var url = $"{GEMINI_API_BASE}/models?key={_config.ApiKey}";
            var response = await _httpClient.GetAsync(url);
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var json = JsonDocument.Parse(content);
                
                var models = new List<string>();
                if (json.RootElement.TryGetProperty("models", out var modelsArray))
                {
                    foreach (var model in modelsArray.EnumerateArray())
                    {
                        if (model.TryGetProperty("name", out var name))
                        {
                            var modelName = name.GetString()?.Replace("models/", "") ?? "";
                            if (modelName.StartsWith("gemini"))
                            {
                                models.Add(modelName);
                            }
                        }
                    }
                }
                
                return models.Count > 0 ? models : GetDefaultModels();
            }
        }
        catch
        {
            // Fall back to default models
        }

        return GetDefaultModels();
    }

    private string BuildPrompt(
        string inputData,
        string expectedOutput,
        string? businessLogic,
        string inputFormat,
        string outputFormat,
        GenerationOptions options)
    {
        var sb = new StringBuilder();

        sb.AppendLine("You are an expert in DotLiquid template language. Generate a Liquid template that transforms the given input data into the expected output format.");
        sb.AppendLine();
        sb.AppendLine("# Task");
        sb.AppendLine($"Create a Liquid template that converts {inputFormat.ToUpper()} input to {outputFormat.ToUpper()} output.");
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(businessLogic))
        {
            sb.AppendLine("# Business Logic / Mapping Rules");
            sb.AppendLine(businessLogic);
            sb.AppendLine();
        }

        sb.AppendLine("# Input Data");
        sb.AppendLine("```" + inputFormat);
        sb.AppendLine(inputData);
        sb.AppendLine("```");
        sb.AppendLine();

        sb.AppendLine("# Expected Output");
        sb.AppendLine("```" + outputFormat);
        sb.AppendLine(expectedOutput);
        sb.AppendLine("```");
        sb.AppendLine();

        sb.AppendLine("# Requirements");
        sb.AppendLine("- Use DotLiquid syntax (similar to Shopify Liquid)");
        sb.AppendLine("- Handle null/missing values gracefully");
        sb.AppendLine("- Use appropriate filters for data transformation");
        sb.AppendLine($"- Complexity level: {options.Complexity}");
        
        if (options.IncludeComments)
        {
            sb.AppendLine("- Include helpful comments explaining the logic");
        }

        sb.AppendLine();
        sb.AppendLine("# DotLiquid Syntax Reference");
        sb.AppendLine("- Variables: {{ variable_name }}");
        sb.AppendLine("- Filters: {{ variable | filter_name }}");
        sb.AppendLine("- Loops: {% for item in collection %} ... {% endfor %}");
        sb.AppendLine("- Conditionals: {% if condition %} ... {% elsif %} ... {% else %} ... {% endif %}");
        sb.AppendLine("- Assignments: {% assign var = value %}");
        sb.AppendLine("- Case/When: {% case variable %} {% when value %} ... {% endcase %}");
        sb.AppendLine();

        sb.AppendLine("# Common Filters");
        sb.AppendLine("- String: upcase, downcase, capitalize, strip, lstrip, rstrip, replace, remove, split, join");
        sb.AppendLine("- Array: first, last, size, sort, reverse, uniq, map, where");
        sb.AppendLine("- Math: plus, minus, times, divided_by, modulo, abs, ceil, floor, round");
        sb.AppendLine("- Date: date (format: '%Y-%m-%d')");
        sb.AppendLine();

        sb.AppendLine("# Output Format");
        sb.AppendLine("Provide ONLY the Liquid template code without any explanations or markdown code blocks.");
        sb.AppendLine("The template should be ready to use directly.");

        return sb.ToString();
    }

    private async Task<GeminiApiResponse> CallGeminiApiAsync(string prompt, string model, GenerationOptions options)
    {
        var result = new GeminiApiResponse();

        try
        {
            var url = $"{GEMINI_API_BASE}/models/{model}:generateContent?key={_config.ApiKey}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = options.Temperature,
                    maxOutputTokens = options.MaxTokens,
                    topP = 0.95,
                    topK = 40
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var jsonDoc = JsonDocument.Parse(responseContent);
                
                if (jsonDoc.RootElement.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0)
                {
                    var candidate = candidates[0];
                    if (candidate.TryGetProperty("content", out var contentObj) &&
                        contentObj.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0)
                    {
                        var part = parts[0];
                        if (part.TryGetProperty("text", out var text))
                        {
                            result.Success = true;
                            result.Content = text.GetString() ?? "";
                        }
                    }
                }

                // Try to get token usage
                if (jsonDoc.RootElement.TryGetProperty("usageMetadata", out var usage))
                {
                    if (usage.TryGetProperty("totalTokenCount", out var tokens))
                    {
                        result.TokensUsed = tokens.GetInt32();
                    }
                }

                if (!result.Success)
                {
                    result.ErrorMessage = "No content generated in response";
                }
            }
            else
            {
                result.Success = false;
                result.ErrorMessage = $"API request failed: {response.StatusCode} - {responseContent}";
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessage = $"API call failed: {ex.Message}";
        }

        return result;
    }

    private string ExtractTemplateFromResponse(string response)
    {
        // Remove markdown code blocks if present
        var cleaned = response.Trim();
        
        // Remove ```liquid or ``` blocks
        if (cleaned.StartsWith("```"))
        {
            var lines = cleaned.Split('\n');
            var templateLines = new List<string>();
            bool inCodeBlock = false;
            
            foreach (var line in lines)
            {
                if (line.Trim().StartsWith("```"))
                {
                    inCodeBlock = !inCodeBlock;
                    continue;
                }
                if (inCodeBlock)
                {
                    templateLines.Add(line);
                }
            }
            
            if (templateLines.Count > 0)
            {
                return string.Join('\n', templateLines).Trim();
            }
        }

        return cleaned;
    }

    private List<string> GetDefaultModels()
    {
        return new List<string>
        {
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro"
        };
    }

    private class GeminiApiResponse
    {
        public bool Success { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public int TokensUsed { get; set; }
    }
}

// Made with Bob
