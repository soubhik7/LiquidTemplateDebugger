# Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the robust architecture defined in [ARCHITECTURE.md](ARCHITECTURE.md).

## Phase 1: Foundation (Week 1-2)

### 1.1 Update Project Dependencies

Add required NuGet packages to [`LiquidTemplateDebugger.csproj`](LiquidTemplateDebugger.csproj):

```bash
# Testing
dotnet add package xUnit
dotnet add package xunit.runner.visualstudio
dotnet add package Moq
dotnet add package FluentAssertions
dotnet add package Microsoft.AspNetCore.Mvc.Testing

# Security
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.AspNetCore.DataProtection
dotnet add package System.IdentityModel.Tokens.Jwt

# Monitoring
dotnet add package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add package Microsoft.ApplicationInsights.AspNetCore

# Caching
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis

# Database (if needed)
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
```

### 1.2 Create Directory Structure

```bash
mkdir -p Engine/Interfaces
mkdir -p Api/Interfaces
mkdir -p Security/Interfaces
mkdir -p Configuration/Interfaces
mkdir -p Tests/Unit
mkdir -p Tests/Integration
mkdir -p Tests/E2E
mkdir -p Tests/Performance
```

### 1.3 Implement Core Interfaces

Create interface files as defined in [INTERFACES.md](INTERFACES.md):

1. `Engine/Interfaces/IDebugEngine.cs`
2. `Engine/Interfaces/ITemplateParser.cs`
3. `Engine/Interfaces/IInputDataLoader.cs`
4. `Engine/Interfaces/IFormatConverter.cs`
5. `Engine/Interfaces/IOutputValidator.cs`
6. `Api/Interfaces/ISessionManager.cs`
7. `Security/Interfaces/IInputValidator.cs`
8. `Security/Interfaces/IAuditLogger.cs`
9. `Security/Interfaces/IDataProtectionService.cs`
10. `Configuration/Interfaces/IFeatureFlagService.cs`

## Phase 2: Refactor Existing Code (Week 3-4)

### 2.1 Update Existing Classes to Implement Interfaces

#### DebugEngine

```csharp
// Engine/DebugEngine.cs
public class DebugEngine : IDebugEngine
{
    private readonly ITemplateParser _parser;
    private readonly ILogger<DebugEngine> _logger;
    
    public DebugEngine(
        string templateContent,
        Hash inputData,
        Dictionary<string, ValueOrigin> origins,
        ITemplateParser parser,
        ILogger<DebugEngine> logger)
    {
        _parser = parser;
        _logger = logger;
        
        // Existing initialization code...
    }
    
    // Implement interface methods...
}
```

#### TemplateParser

```csharp
// Engine/TemplateParser.cs
public class TemplateParser : ITemplateParser
{
    private readonly ILogger<TemplateParser> _logger;
    
    public TemplateParser(ILogger<TemplateParser> logger)
    {
        _logger = logger;
    }
    
    public List<TemplateElement> Parse(string templateContent)
    {
        _logger.LogDebug("Parsing template with {Length} characters", templateContent.Length);
        // Existing parsing logic...
    }
    
    public ValidationResult ValidateSyntax(string templateContent)
    {
        try
        {
            Parse(templateContent);
            return ValidationResult.Success();
        }
        catch (Exception ex)
        {
            return ValidationResult.Failure(ex.Message);
        }
    }
    
    public (int line, int column) GetPosition(string template, int charIndex)
    {
        // Implementation...
    }
}
```

### 2.2 Update Dependency Injection

Modify [`Program.cs`](Program.cs):

```csharp
// Add services
builder.Services.AddSingleton<ITemplateParser, TemplateParser>();
builder.Services.AddSingleton<IInputDataLoader, InputDataLoader>();
builder.Services.AddSingleton<IFormatConverter, FormatConverter>();
builder.Services.AddSingleton<IOutputValidator, OutputValidator>();
builder.Services.AddScoped<ISessionManager, SessionManager>();
builder.Services.AddSingleton<IInputValidator, InputValidator>();
builder.Services.AddSingleton<IAuditLogger, AuditLogger>();
builder.Services.AddSingleton<IDataProtectionService, DataProtectionService>();
builder.Services.AddSingleton<IFeatureFlagService, FeatureFlagService>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddCheck<DebuggerHealthCheck>("debugger")
    .AddCheck("memory", () => /* memory check */);

// Add data protection
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("./keys"))
    .SetApplicationName("LiquidDebugger");
```

## Phase 3: Security Implementation (Week 5-6)

### 3.1 Implement Input Validation

Create [`Security/InputValidator.cs`](Security/InputValidator.cs) as defined in [SECURITY.md](SECURITY.md).

### 3.2 Add Authentication (Optional)

```csharp
// Program.cs
if (builder.Configuration.GetValue<bool>("Security:EnableAuthentication"))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
            };
        });
    
    app.UseAuthentication();
    app.UseAuthorization();
}
```

### 3.3 Add Rate Limiting

```csharp
// Program.cs
if (builder.Configuration.GetValue<bool>("Security:EnableRateLimiting"))
{
    builder.Services.AddRateLimiter(options =>
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
            context => /* rate limit configuration */);
    });
    
    app.UseRateLimiter();
}
```

### 3.4 Add Security Headers

```csharp
// Security/Middleware/SecurityHeadersMiddleware.cs
app.UseMiddleware<SecurityHeadersMiddleware>();
```

## Phase 4: Testing Infrastructure (Week 7-8)

### 4.1 Create Test Base Classes

```csharp
// Tests/TestBase.cs
public abstract class TestBase
{
    protected readonly ITestOutputHelper Output;
    
    protected TestBase(ITestOutputHelper output)
    {
        Output = output;
    }
    
    protected IDebugEngine CreateEngine(string template, string data)
    {
        var loader = new InputDataLoader();
        var parser = new TemplateParser(Mock.Of<ILogger<TemplateParser>>());
        var (hash, origins) = loader.LoadFromString(data, "JSON");
        return new DebugEngine(template, hash, origins, parser, 
            Mock.Of<ILogger<DebugEngine>>());
    }
}
```

### 4.2 Write Unit Tests

```csharp
// Tests/Unit/TemplateParserTests.cs
public class TemplateParserTests : TestBase
{
    private readonly ITemplateParser _parser;
    
    public TemplateParserTests(ITestOutputHelper output) : base(output)
    {
        _parser = new TemplateParser(Mock.Of<ILogger<TemplateParser>>());
    }
    
    [Fact]
    public void Parse_SimpleTemplate_ReturnsCorrectElements()
    {
        // Arrange
        var template = "Hello {{ name }}!";
        
        // Act
        var elements = _parser.Parse(template);
        
        // Assert
        elements.Should().HaveCount(3);
        elements[0].ElementType.Should().Be(TemplateElementType.Literal);
        elements[1].ElementType.Should().Be(TemplateElementType.Output);
        elements[1].Expression.Should().Be("name");
    }
}
```

### 4.3 Write Integration Tests

```csharp
// Tests/Integration/ApiEndpointsTests.cs
public class ApiEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    
    public ApiEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }
    
    [Fact]
    public async Task LoadEndpoint_ValidRequest_ReturnsSuccess()
    {
        // Arrange
        var request = new LoadRequest
        {
            TemplateContent = "Hello {{ content.name }}",
            DataContent = "{\"name\": \"World\"}",
            Format = "json"
        };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/load", request);
        
        // Assert
        response.Should().BeSuccessful();
    }
}
```

## Phase 5: Monitoring & Observability (Week 9)

### 5.1 Add Health Checks

```csharp
// Health/DebuggerHealthCheck.cs
public class DebuggerHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        // Implementation
    }
}
```

### 5.2 Add Structured Logging

```csharp
// Program.cs
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss.fff";
});

if (builder.Environment.IsProduction())
{
    builder.Logging.AddApplicationInsights();
}
```

### 5.3 Add Metrics

```csharp
// Monitoring/MetricsCollector.cs
public class MetricsCollector
{
    private readonly Counter<long> _requestCounter;
    private readonly Histogram<double> _requestDuration;
    
    public MetricsCollector(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("LiquidDebugger");
        _requestCounter = meter.CreateCounter<long>("requests_total");
        _requestDuration = meter.CreateHistogram<double>("request_duration_ms");
    }
}
```

## Phase 6: Feature Flags (Week 10)

### 6.1 Implement Feature Flag Service

```csharp
// Configuration/FeatureFlagService.cs
public class FeatureFlagService : IFeatureFlagService
{
    private readonly IConfiguration _config;
    private readonly IDistributedCache _cache;
    
    public bool IsEnabled(string featureName)
    {
        return _config.GetValue<bool>($"FeatureFlags:{featureName}");
    }
    
    public async Task<bool> IsEnabledAsync(string featureName)
    {
        // Check cache first, then config
        return IsEnabled(featureName);
    }
}
```

### 6.2 Use Feature Flags in Endpoints

```csharp
app.MapPost("/api/advanced-debug", async (request, IFeatureFlagService flags) =>
{
    if (!await flags.IsEnabledAsync("EnableAdvancedDebugging"))
        return Results.NotFound(new { error = "Feature not available" });
    
    // Implementation
});
```

## Phase 7: API Versioning (Week 11)

### 7.1 Create Versioned Endpoints

```csharp
// Api/V1/DebugApiEndpointsV1.cs
public static class DebugApiEndpointsV1
{
    public static void MapDebugApiEndpointsV1(this RouteGroupBuilder group)
    {
        group.MapPost("/load", async (LoadRequestV1 request) => { /* V1 logic */ });
    }
}

// Api/V2/DebugApiEndpointsV2.cs
public static class DebugApiEndpointsV2
{
    public static void MapDebugApiEndpointsV2(this RouteGroupBuilder group)
    {
        group.MapPost("/load", async (LoadRequestV2 request) => { /* V2 logic */ });
    }
}
```

### 7.2 Register Versioned Routes

```csharp
// Program.cs
var v1 = app.MapGroup("/api/v1");
v1.MapDebugApiEndpointsV1();

var v2 = app.MapGroup("/api/v2");
v2.MapDebugApiEndpointsV2();

// Default to latest
app.MapGroup("/api").MapDebugApiEndpointsV2();
```

## Phase 8: Documentation & Deployment (Week 12)

### 8.1 Add Swagger/OpenAPI

```csharp
// Program.cs
if (builder.Configuration.GetValue<bool>("FeatureFlags:EnableSwagger"))
{
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Liquid Template Debugger API",
            Version = "v1",
            Description = "API for debugging DotLiquid templates"
        });
    });
    
    app.UseSwagger();
    app.UseSwaggerUI();
}
```

### 8.2 Update Dockerfile

Ensure [`Dockerfile`](Dockerfile) follows best practices from [ARCHITECTURE.md](ARCHITECTURE.md).

### 8.3 Configure CI/CD

The CI/CD pipeline is already configured in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

## Testing Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage > 80%
- [ ] Security scan passes
- [ ] No vulnerable dependencies
- [ ] Performance tests pass
- [ ] Load tests pass
- [ ] Health checks working
- [ ] Logging configured
- [ ] Metrics collecting
- [ ] Feature flags working
- [ ] API versioning working
- [ ] Documentation complete

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Secrets stored securely
- [ ] Database migrations applied
- [ ] Health checks configured
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Load balancer configured
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] CDN configured (if applicable)

## Rollback Procedure

1. Identify the issue
2. Stop new deployments
3. Switch traffic to previous version (blue-green) or rollback deployment
4. Verify system stability
5. Investigate root cause
6. Fix and redeploy

## Support & Maintenance

### Regular Tasks

- **Daily**: Monitor logs and metrics
- **Weekly**: Review security alerts, update dependencies
- **Monthly**: Performance review, capacity planning
- **Quarterly**: Security audit, disaster recovery test

### Incident Response

1. Detect and alert
2. Assess severity
3. Contain and mitigate
4. Communicate with stakeholders
5. Resolve and recover
6. Post-mortem and lessons learned

## Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [Interface Definitions](INTERFACES.md)
- [Security Guide](SECURITY.md)
- [Testing Strategy](TESTING.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)

## Getting Help

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Security: security@example.com
- Support: support@example.com