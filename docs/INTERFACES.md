# Interface-Based Programming Guide

## Overview

This document defines the interfaces for all major components in the Liquid Template Debugger, enabling dependency injection, testability, and loose coupling.

## Core Interfaces

### 1. IDebugEngine

Core debugging engine interface for template execution and debugging operations.

```csharp
// Engine/Interfaces/IDebugEngine.cs
namespace LiquidTemplateDebugger.Engine.Interfaces;

public interface IDebugEngine
{
    // State
    DebugState State { get; }
    List<TemplateElement> Elements { get; }
    List<Breakpoint> Breakpoints { get; }
    List<WatchExpression> Watches { get; }
    
    // Execution Control
    void Step(StepAction action, int? targetLine = null);
    void Reset();
    bool IsComplete { get; }
    
    // Breakpoints
    Breakpoint AddBreakpoint(int line, string? condition = null);
    bool RemoveBreakpoint(int id);
    void ToggleBreakpoint(int id);
    bool ShouldBreakAt(int line);
    
    // Watches
    WatchExpression AddWatch(string expression);
    bool RemoveWatch(int id);
    void UpdateWatches();
    
    // Evaluation
    object? Evaluate(string expression);
    string GetFullRender();
    
    // Variable Inspection
    TrackedVariable? GetVariable(string name);
    Dictionary<string, TrackedVariable> GetAllVariables();
}
```

### 2. ITemplateParser

Interface for parsing Liquid templates into debuggable elements.

```csharp
// Engine/Interfaces/ITemplateParser.cs
namespace LiquidTemplateDebugger.Engine.Interfaces;

public interface ITemplateParser
{
    /// <summary>
    /// Parse a Liquid template into a list of debuggable elements.
    /// </summary>
    List<TemplateElement> Parse(string templateContent);
    
    /// <summary>
    /// Validate template syntax without full parsing.
    /// </summary>
    ValidationResult ValidateSyntax(string templateContent);
    
    /// <summary>
    /// Get line and column information for a character position.
    /// </summary>
    (int line, int column) GetPosition(string template, int charIndex);
}
```

### 3. IInputDataLoader

Interface for loading and converting input data from various formats.

```csharp
// Engine/Interfaces/IInputDataLoader.cs
namespace LiquidTemplateDebugger.Engine.Interfaces;

public interface IInputDataLoader
{
    /// <summary>
    /// Load data from a file path.
    /// </summary>
    (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromFile(string filePath);
    
    /// <summary>
    /// Load data from a string with specified format.
    /// </summary>
    (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromString(string content, string format);
    
    /// <summary>
    /// Get supported input formats.
    /// </summary>
    IEnumerable<string> GetSupportedFormats();
    
    /// <summary>
    /// Detect format from content.
    /// </summary>
    string DetectFormat(string content);
}
```

### 4. IFormatConverter

Interface for converting output between different formats.

```csharp
// Engine/Interfaces/IFormatConverter.cs
namespace LiquidTemplateDebugger.Engine.Interfaces;

public interface IFormatConverter
{
    /// <summary>
    /// Convert output from one format to another.
    /// </summary>
    string ConvertOutput(string output, string targetFormat, string sourceFormat = "TEXT");
    
    /// <summary>
    /// Get supported output formats.
    /// </summary>
    IEnumerable<string> GetSupportedFormats();
    
    /// <summary>
    /// Validate if content is valid for specified format.
    /// </summary>
    bool IsValidFormat(string content, string format);
}
```

### 5. IOutputValidator

Interface for validating output format correctness.

```csharp
// Engine/Interfaces/IOutputValidator.cs
namespace LiquidTemplateDebugger.Engine.Interfaces;

public interface IOutputValidator
{
    /// <summary>
    /// Validate output against expected format.
    /// </summary>
    ValidationResult Validate(string output, string format, List<OutputRangeMapping>? mappings = null);
    
    /// <summary>
    /// Get detailed validation errors.
    /// </summary>
    IEnumerable<ValidationError> GetValidationErrors(string output, string format);
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public int? SourceLineNumber { get; set; }
    
    public static ValidationResult Success() => new() { IsValid = true };
    public static ValidationResult Failure(string message, int? line = null) => 
        new() { IsValid = false, ErrorMessage = message, SourceLineNumber = line };
}

public class ValidationError
{
    public string Message { get; set; } = string.Empty;
    public int? Line { get; set; }
    public int? Column { get; set; }
    public string Severity { get; set; } = "Error"; // Error, Warning, Info
}
```

### 6. ISessionManager

Interface for managing debug sessions.

```csharp
// Api/Interfaces/ISessionManager.cs
namespace LiquidTemplateDebugger.Api.Interfaces;

public interface ISessionManager
{
    /// <summary>
    /// Get or create a session for the given session ID.
    /// </summary>
    Task<IDebugEngine?> GetSessionAsync(string sessionId);
    
    /// <summary>
    /// Create a new debug session.
    /// </summary>
    Task<string> CreateSessionAsync(string templateContent, string dataContent, string format);
    
    /// <summary>
    /// Delete a session.
    /// </summary>
    Task<bool> DeleteSessionAsync(string sessionId);
    
    /// <summary>
    /// Reset a session to initial state.
    /// </summary>
    Task<bool> ResetSessionAsync(string sessionId);
    
    /// <summary>
    /// Get all active sessions.
    /// </summary>
    Task<IEnumerable<SessionInfo>> GetActiveSessionsAsync();
    
    /// <summary>
    /// Clean up expired sessions.
    /// </summary>
    Task CleanupExpiredSessionsAsync();
}

public class SessionInfo
{
    public string SessionId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastAccessedAt { get; set; }
    public bool IsActive { get; set; }
}
```

### 7. IInputValidator

Interface for validating user inputs.

```csharp
// Security/Interfaces/IInputValidator.cs
namespace LiquidTemplateDebugger.Security.Interfaces;

public interface IInputValidator
{
    /// <summary>
    /// Validate template path for security issues.
    /// </summary>
    ValidationResult ValidateTemplatePath(string path);
    
    /// <summary>
    /// Validate data path for security issues.
    /// </summary>
    ValidationResult ValidateDataPath(string path);
    
    /// <summary>
    /// Validate template content for size and suspicious patterns.
    /// </summary>
    ValidationResult ValidateTemplateContent(string content);
    
    /// <summary>
    /// Validate data content for size and format.
    /// </summary>
    ValidationResult ValidateDataContent(string content, string format);
    
    /// <summary>
    /// Sanitize user input to prevent injection attacks.
    /// </summary>
    string Sanitize(string input);
}
```

### 8. IFeatureFlagService

Interface for feature flag management.

```csharp
// Configuration/Interfaces/IFeatureFlagService.cs
namespace LiquidTemplateDebugger.Configuration.Interfaces;

public interface IFeatureFlagService
{
    /// <summary>
    /// Check if a feature is enabled.
    /// </summary>
    bool IsEnabled(string featureName);
    
    /// <summary>
    /// Check if a feature is enabled asynchronously.
    /// </summary>
    Task<bool> IsEnabledAsync(string featureName);
    
    /// <summary>
    /// Check if a feature is enabled for a specific user.
    /// </summary>
    Task<bool> IsEnabledForUserAsync(string featureName, string userId);
    
    /// <summary>
    /// Get all feature flags and their states.
    /// </summary>
    Task<Dictionary<string, bool>> GetAllFlagsAsync();
    
    /// <summary>
    /// Update a feature flag state.
    /// </summary>
    Task UpdateFlagAsync(string featureName, bool enabled);
}
```

### 9. IAuditLogger

Interface for security audit logging.

```csharp
// Security/Interfaces/IAuditLogger.cs
namespace LiquidTemplateDebugger.Security.Interfaces;

public interface IAuditLogger
{
    /// <summary>
    /// Log an access event.
    /// </summary>
    Task LogAccessAsync(string userId, string resource, string action, bool success = true);
    
    /// <summary>
    /// Log a security event.
    /// </summary>
    Task LogSecurityEventAsync(string eventType, string details, string? userId = null);
    
    /// <summary>
    /// Log an authentication event.
    /// </summary>
    Task LogAuthenticationAsync(string userId, bool success, string? reason = null);
    
    /// <summary>
    /// Log an authorization event.
    /// </summary>
    Task LogAuthorizationAsync(string userId, string resource, bool granted, string? reason = null);
    
    /// <summary>
    /// Query audit logs.
    /// </summary>
    Task<IEnumerable<AuditLogEntry>> QueryLogsAsync(AuditLogQuery query);
}

public class AuditLogEntry
{
    public DateTime Timestamp { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Details { get; set; }
    public string IpAddress { get; set; } = string.Empty;
}

public class AuditLogQuery
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? UserId { get; set; }
    public string? EventType { get; set; }
    public int MaxResults { get; set; } = 100;
}
```

### 10. IDataProtectionService

Interface for encrypting sensitive data.

```csharp
// Security/Interfaces/IDataProtectionService.cs
namespace LiquidTemplateDebugger.Security.Interfaces;

public interface IDataProtectionService
{
    /// <summary>
    /// Encrypt plaintext data.
    /// </summary>
    string Protect(string plainText);
    
    /// <summary>
    /// Decrypt protected data.
    /// </summary>
    string Unprotect(string protectedText);
    
    /// <summary>
    /// Hash data for comparison (one-way).
    /// </summary>
    string Hash(string data);
    
    /// <summary>
    /// Verify hashed data.
    /// </summary>
    bool VerifyHash(string data, string hash);
}
```

## Implementation Guidelines

### 1. Dependency Injection Registration

```csharp
// Program.cs
public static void ConfigureServices(IServiceCollection services)
{
    // Core Services
    services.AddSingleton<ITemplateParser, TemplateParser>();
    services.AddSingleton<IInputDataLoader, InputDataLoader>();
    services.AddSingleton<IFormatConverter, FormatConverter>();
    services.AddSingleton<IOutputValidator, OutputValidator>();
    
    // Session Management
    services.AddScoped<ISessionManager, SessionManager>();
    services.AddScoped<IDebugEngine, DebugEngine>();
    
    // Security
    services.AddSingleton<IInputValidator, InputValidator>();
    services.AddSingleton<IAuditLogger, AuditLogger>();
    services.AddSingleton<IDataProtectionService, DataProtectionService>();
    
    // Configuration
    services.AddSingleton<IFeatureFlagService, FeatureFlagService>();
}
```

### 2. Constructor Injection

```csharp
public class DebugApiEndpoints
{
    private readonly ISessionManager _sessionManager;
    private readonly IInputValidator _validator;
    private readonly IAuditLogger _auditLogger;
    private readonly ILogger<DebugApiEndpoints> _logger;
    
    public DebugApiEndpoints(
        ISessionManager sessionManager,
        IInputValidator validator,
        IAuditLogger auditLogger,
        ILogger<DebugApiEndpoints> logger)
    {
        _sessionManager = sessionManager;
        _validator = validator;
        _auditLogger = auditLogger;
        _logger = logger;
    }
}
```

### 3. Unit Testing with Mocks

```csharp
public class DebugEngineTests
{
    private readonly Mock<ITemplateParser> _mockParser;
    private readonly Mock<IInputDataLoader> _mockLoader;
    private readonly IDebugEngine _engine;
    
    public DebugEngineTests()
    {
        _mockParser = new Mock<ITemplateParser>();
        _mockLoader = new Mock<IInputDataLoader>();
        
        // Setup mocks
        _mockParser.Setup(p => p.Parse(It.IsAny<string>()))
            .Returns(new List<TemplateElement>());
        
        _engine = new DebugEngine(_mockParser.Object, _mockLoader.Object);
    }
    
    [Fact]
    public void Step_IncreasesElementIndex()
    {
        // Arrange
        _mockParser.Setup(p => p.Parse(It.IsAny<string>()))
            .Returns(CreateTestElements());
        
        // Act
        _engine.Step(StepAction.StepNext);
        
        // Assert
        Assert.True(_engine.State.CurrentElementIndex > 0);
    }
}
```

## Migration Path

### Phase 1: Extract Interfaces
1. Create interface definitions
2. Update existing classes to implement interfaces
3. No breaking changes to existing code

### Phase 2: Update Dependencies
1. Change constructor parameters to use interfaces
2. Update DI registration
3. Test thoroughly

### Phase 3: Refactor Implementations
1. Split large classes into smaller, focused implementations
2. Add decorator pattern for cross-cutting concerns
3. Improve testability

## Benefits

1. **Testability**: Easy to mock dependencies in unit tests
2. **Flexibility**: Swap implementations without changing consumers
3. **Maintainability**: Clear contracts between components
4. **Extensibility**: Add new implementations without modifying existing code
5. **Dependency Inversion**: High-level modules don't depend on low-level modules

## Next Steps

1. Create interface files in appropriate directories
2. Update existing classes to implement interfaces
3. Register services in DI container
4. Write unit tests using mocked interfaces
5. Document interface usage in code comments