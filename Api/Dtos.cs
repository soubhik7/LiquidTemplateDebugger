namespace LiquidTemplateDebugger.Api;

// --- Response DTOs ---

public record FullStateDto(
    bool IsLoaded,
    string? TemplateSource,
    string? DataContent,
    string? DataFormat,
    List<TemplateElementDto> Elements,
    DebugStateDto? State,
    List<BreakpointDto> Breakpoints,
    List<WatchDto> Watches
);

public record DebugStateDto(
    int CurrentElementIndex,
    int CurrentLine,
    string CurrentExpression,
    string CurrentElementType,
    string OutputSoFar,
    string? LastOutputChunk,
    List<string> ScopeStack,
    bool IsComplete,
    string? ErrorMessage,
    List<VariableDto> Variables
);

public record VariableDto(
    string Name,
    string CurrentValue,
    object? RawValue,
    string TypeName,
    string ScopeTag,
    int ScopeDepth,
    OriginDto? Origin,
    List<TransformationDto> Transformations
);

public record OriginDto(
    string SourcePath,
    string SourceFormat,
    string? OriginalValue,
    int? SourceLineNumber
);

public record TransformationDto(
    string TransformationType,
    string Description,
    string? ValueBefore,
    string? ValueAfter,
    int AtLine,
    string Expression
);

public record TemplateElementDto(
    int Index,
    int LineNumber,
    int ColumnStart,
    int ColumnEnd,
    string RawText,
    string ElementType,
    string? TagName,
    string? Expression,
    int Depth,
    int? ParentIndex,
    List<int> ChildIndices
);

public record BreakpointDto(
    int Id,
    int Line,
    string? Condition,
    bool IsEnabled,
    int HitCount
);

public record WatchDto(
    int Id,
    string Expression,
    string DisplayExpression,
    string? CurrentValue,
    string? TypeName,
    bool HasChanged
);

public record EvalResultDto(
    string Expression,
    string? Value,
    string? TypeName,
    string? Error
);

public record InspectResultDto(
    string Name,
    string? CurrentValue,
    object? RawValue,
    string? TypeName,
    string? ScopeTag,
    int? ScopeDepth,
    OriginDto? Origin,
    List<TransformationDto> Transformations,
    string? Error
);

public record ValidateResponseDto(
    bool IsValid,
    string? ErrorMessage,
    int? SourceLineNumber
);

// --- Request DTOs ---

public record LoadRequest(
    string? TemplateContent,
    string? DataContent,
    string? Format,
    string? TemplatePath,
    string? DataPath
);

public record StepRequest(
    string Action,     // "next", "into", "over", "out", "continue", "runToLine"
    int? TargetLine
);

public record AddBreakpointRequest(
    int Line,
    string? Condition
);

public record AddWatchRequest(
    string Expression
);

public record EvalRequest(
    string Expression
);

public record InspectRequest(
    string Name
);

public record ConvertFormatRequest(
    string? OutputFormat,  // "json", "xml", "csv", or null for text
    string? InputFormat    // Optional: hint about current format
);

public record TransformRequest(
    string TemplateContent,
    string DataContent,
    string InputFormat,    // "json", "xml", "csv", "text"
    string OutputFormat    // "json", "xml", "csv", "text"
);

public record ValidateRequest(
    string Format // "json", "xml", "csv"
);

public record BeautifyRequest(
    string Content,
    string Format // "json", "xml", "csv", "text"
);

// --- AI Template Generation DTOs ---

public record GenerateTemplateRequestDto(
    string InputData,
    string ExpectedOutput,
    string? BusinessLogic,
    string InputFormat,  // "json", "xml", "csv", "text"
    string OutputFormat, // "json", "xml", "csv", "text"
    GenerationOptionsDto Options
);

public record GenerationOptionsDto(
    string Complexity,      // "basic", "intermediate", "advanced"
    bool IncludeComments,
    List<string> SensitiveFieldPatterns,
    string Model,
    int MaxTokens,
    double Temperature
);

public record GenerateTemplateResponseDto(
    bool Success,
    string? GeneratedTemplate,
    string? ErrorMessage,
    List<string> Warnings,
    GenerationMetadataDto Metadata
);

public record GenerationMetadataDto(
    int TokensUsed,
    double GenerationTimeMs,
    string ModelUsed,
    List<string> SanitizedFields,
    bool DataWasSanitized
);

public record ValidateApiKeyRequestDto(
    string ApiKey
);

public record ValidateApiKeyResponseDto(
    bool IsValid,
    string? ErrorMessage
);

public record GetModelsResponseDto(
    List<string> Models
);
