namespace LiquidTemplateDebugger.Models;

/// <summary>
/// Options for template generation
/// </summary>
public class GenerationOptions
{
    public string Complexity { get; set; } = "intermediate"; // "basic", "intermediate", "advanced"
    public bool IncludeComments { get; set; } = true;
    public List<string> SensitiveFieldPatterns { get; set; } = new();
    public string Model { get; set; } = "gemini-1.5-flash"; // Gemini model to use
    public int MaxTokens { get; set; } = 8000;
    public double Temperature { get; set; } = 0.7;
}

/// <summary>
/// Request for template generation
/// </summary>
public class GenerateTemplateRequest
{
    public string InputData { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
    public string? BusinessLogic { get; set; }
    public string InputFormat { get; set; } = "json"; // "json", "xml", "csv", "text"
    public string OutputFormat { get; set; } = "json";
    public GenerationOptions Options { get; set; } = new();
}

/// <summary>
/// Response from template generation
/// </summary>
public class GenerateTemplateResponse
{
    public bool Success { get; set; }
    public string? GeneratedTemplate { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string> Warnings { get; set; } = new();
    public GenerationMetadata Metadata { get; set; } = new();
}

/// <summary>
/// Metadata about the generation process
/// </summary>
public class GenerationMetadata
{
    public int TokensUsed { get; set; }
    public double GenerationTimeMs { get; set; }
    public string ModelUsed { get; set; } = string.Empty;
    public List<string> SanitizedFields { get; set; } = new();
    public bool DataWasSanitized { get; set; }
}

/// <summary>
/// Configuration for AI service
/// </summary>
public class AIConfiguration
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string DefaultModel { get; set; } = "gemini-1.5-flash";
    public List<string> SensitivePatterns { get; set; } = new()
    {
        @"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", // Email
        @"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", // Phone
        @"\b(?:password|pwd|secret|token|key|apikey|api_key)\b", // Sensitive keywords
        @"\b[A-Za-z0-9]{32,}\b" // Long alphanumeric strings (potential tokens)
    };
    public int MaxRetries { get; set; } = 3;
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// Result of data sanitization
/// </summary>
public class SanitizationResult
{
    public string SanitizedData { get; set; } = string.Empty;
    public List<SanitizedField> SanitizedFields { get; set; } = new();
    public bool WasSanitized { get; set; }
}

/// <summary>
/// Information about a sanitized field
/// </summary>
public class SanitizedField
{
    public string FieldPath { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string SanitizationType { get; set; } = "redacted"; // "redacted", "masked", "removed"
}

// Made with Bob
