using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine.Interfaces;

/// <summary>
/// Interface for AI service that generates Liquid templates
/// </summary>
public interface IAIService
{
    /// <summary>
    /// Generate a Liquid template based on input data and expected output
    /// </summary>
    Task<GenerateTemplateResponse> GenerateTemplateAsync(GenerateTemplateRequest request);

    /// <summary>
    /// Validate that the API key is configured and working
    /// </summary>
    Task<bool> ValidateApiKeyAsync(string apiKey);

    /// <summary>
    /// Get available models
    /// </summary>
    Task<List<string>> GetAvailableModelsAsync();

    /// <summary>
    /// Check if the service is configured and ready
    /// </summary>
    bool IsConfigured();
}

// Made with Bob
