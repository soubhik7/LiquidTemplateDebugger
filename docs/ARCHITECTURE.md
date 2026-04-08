# Liquid Template Debugger - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architectural Principles](#architectural-principles)
3. [System Architecture](#system-architecture)
4. [Design Patterns](#design-patterns)
5. [Security Architecture](#security-architecture)
6. [Testing Strategy](#testing-strategy)
7. [Deployment & CI/CD](#deployment--cicd)
8. [API Versioning](#api-versioning)
9. [Configuration Management](#configuration-management)
10. [Migration Strategy](#migration-strategy)
11. [Monitoring & Observability](#monitoring--observability)

---

## Overview

The Liquid Template Debugger is a step-by-step debugging tool for DotLiquid templates with comprehensive format transformation capabilities. This document outlines the architectural decisions, patterns, and best practices that ensure the system is maintainable, secure, scalable, and backward compatible.

### Core Capabilities
- Step-by-step template execution debugging
- Variable inspection and origin tracking
- Breakpoints and watch expressions
- Multi-format data transformation (JSON, XML, CSV, Text)
- Web-based API with browser UI
- Azure Logic Apps compatibility

### Technology Stack
- **Runtime**: .NET 10.0
- **Template Engine**: DotLiquid 2.3.197
- **JSON Processing**: Newtonsoft.Json 13.0.4
- **Web Framework**: ASP.NET Core Minimal APIs
- **Testing**: xUnit (to be implemented)

---

## Architectural Principles

### 1. Separation of Concerns (SoC)
Each component has a single, well-defined responsibility:
- **Models**: Data structures and domain entities
- **Engine**: Core debugging logic and template processing
- **Api**: HTTP endpoints and session management
- **Tests**: Automated validation

### 2. Interface-Based Programming
All major components expose interfaces to enable:
- Dependency injection
- Unit testing with mocks
- Implementation swapping without breaking consumers
- Clear contracts between layers

### 3. Dependency Injection (DI)
Services are registered in the DI container and injected where needed:
- Promotes loose coupling
- Enables testing
- Facilitates configuration management
- Supports multiple implementations

### 4. Immutability Where Possible
- Value objects are immutable
- State changes are explicit and tracked
- Reduces side effects and bugs

### 5. Fail-Fast Principle
- Validate inputs early
- Throw meaningful exceptions
- Provide clear error messages
- Log errors for debugging

### 6. Open/Closed Principle
- Open for extension (new features)
- Closed for modification (existing functionality)
- Use inheritance, composition, and plugins

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Browser    │  │   CLI Tool   │  │  API Client  │       │
│  │     UI       │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (ASP.NET)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         DebugApiEndpoints (REST Controllers)         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    DebugSessionManager (Session State Management)    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         DtoConverter (Data Transfer Objects)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Service Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DebugEngine (Core Debugging & Execution Engine)     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TemplateParser (Liquid Template Parsing)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  InputDataLoader (Multi-Format Data Loading)         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FormatConverter (Format Transformation)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OutputValidator (Output Format Validation)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Data Access
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Models (Domain Entities & DTOs)              │   │
│  │  - DebugState, TrackedVariable, Breakpoint           │   │
│  │  - TemplateElement, ValueOrigin, etc.                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### API Layer
- **DebugApiEndpoints**: REST API endpoints for all debugging operations
- **DebugSessionManager**: Manages session lifecycle, state persistence, reset capability
- **DtoConverter**: Converts internal models to API-friendly DTOs
- **Dtos**: Data Transfer Objects for API requests/responses

#### Business Logic Layer
- **DebugEngine**: Core debugging engine with stepping, evaluation, breakpoints
- **TemplateParser**: Parses Liquid templates into debuggable elements
- **InputDataLoader**: Loads and converts JSON/XML/CSV/Text to DotLiquid Hash
- **FormatConverter**: Transforms output between different formats
- **OutputValidator**: Validates output format correctness

#### Data Layer
- **Models**: Domain entities representing debugger state, variables, breakpoints, etc.

---

## Design Patterns

### 1. Singleton Pattern
**Usage**: [`DebugSessionManager`](Api/DebugSessionManager.cs)

```csharp
// Registered as singleton in DI container
builder.Services.AddSingleton<DebugSessionManager>();
```

**Rationale**: Single-user web debugger requires one session per application instance.

**Future Enhancement**: Convert to scoped service with session ID for multi-user support.

### 2. Factory Pattern
**Usage**: [`InputDataLoader`](Engine/InputDataLoader.cs) creates different parsers based on format

```csharp
var (hash, origins) = normalizedFormat switch
{
    "JSON" => LoadJson(content, "JSON"),
    "XML" => LoadXml(content, "XML"),
    "CSV" => LoadCsv(content, "CSV"),
    "TEXT" => LoadKeyValue(content, "TEXT"),
    _ => throw new InvalidOperationException($"Unsupported format")
};
```

**Rationale**: Encapsulates format-specific parsing logic.

### 3. Strategy Pattern
**Usage**: [`StepAction`](Models/DebugModels.cs:109) enum with different stepping strategies

```csharp
public enum StepAction
{
    StepNext,     // Execute next element
    StepInto,     // Step into nested block
    StepOver,     // Execute entire block
    StepOut,      // Execute until scope ends
    Continue,     // Continue until breakpoint
    RunToLine     // Run to specific line
}
```

**Rationale**: Different execution strategies without modifying core engine.

### 4. Builder Pattern
**Usage**: [`DtoConverter.BuildFullState()`](Api/DtoConverter.cs) constructs complex DTOs

**Rationale**: Simplifies creation of complex response objects.

### 5. Repository Pattern (To Be Implemented)
**Future**: Abstract data persistence for sessions, breakpoints, and configuration

```csharp
public interface ISessionRepository
{
    Task<DebugSession?> GetSessionAsync(string sessionId);
    Task SaveSessionAsync(DebugSession session);
    Task DeleteSessionAsync(string sessionId);
}
```

### 6. Decorator Pattern (To Be Implemented)
**Future**: Add logging, caching, validation to services

```csharp
public class LoggingDebugEngineDecorator : IDebugEngine
{
    private readonly IDebugEngine _inner;
    private readonly ILogger _logger;
    
    public void Step(StepAction action, int? targetLine = null)
    {
        _logger.LogInformation("Stepping: {Action}", action);
        _inner.Step(action, targetLine);
    }
}
```

---

## Security Architecture

See [SECURITY.md](SECURITY.md) for detailed security implementation.

### Key Security Principles

1. **Input Validation**: All user inputs validated before processing
2. **Authentication & Authorization**: JWT-based auth for API access
3. **Rate Limiting**: Prevent abuse and DoS attacks
4. **CORS Configuration**: Restrict cross-origin requests
5. **Data Protection**: Encrypt sensitive data at rest and in transit
6. **Security Headers**: Implement security headers (CSP, X-Frame-Options, etc.)
7. **Audit Logging**: Track all security-relevant events
8. **Dependency Scanning**: Regular vulnerability checks

---

## Testing Strategy

See [TESTING.md](TESTING.md) for comprehensive testing documentation.

### Test Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests │  (10%)
                    │   (Slow)    │
                    └─────────────┘
                ┌───────────────────┐
                │ Integration Tests │  (20%)
                │    (Medium)       │
                └───────────────────┘
        ┌───────────────────────────────┐
        │        Unit Tests             │  (70%)
        │         (Fast)                │
        └───────────────────────────────┘
```

### Coverage Targets
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Key user workflows validated
- **Performance Tests**: Load and stress testing

---

## Deployment & CI/CD

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment procedures.

### CI/CD Pipeline Stages

1. **Build**: Compile and restore dependencies
2. **Test**: Run unit, integration, and E2E tests
3. **Code Quality**: Linting, static analysis, security scanning
4. **Package**: Build Docker image
5. **Deploy**: Deploy to staging/production
6. **Monitor**: Health checks and smoke tests

### Deployment Strategies
- **Blue-Green**: Zero-downtime deployments
- **Canary**: Gradual rollout with monitoring
- **Rolling**: Sequential server updates

---

## API Versioning

### Versioning Strategy

**Approach**: URL-based versioning with backward compatibility

```
/api/v1/load    - Version 1 (current)
/api/v2/load    - Version 2 (future)
/api/load       - Latest version (alias)
```

### Semantic Versioning

**Format**: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Deprecation Policy

- Announce deprecation 6 months before removal
- Mark deprecated endpoints with `[Obsolete]` attribute
- Provide migration guide
- Support deprecated endpoints for at least 12 months

---

## Configuration Management

### Configuration Hierarchy

1. `appsettings.json` (defaults)
2. `appsettings.{Environment}.json` (environment-specific)
3. Environment variables (deployment-specific)
4. Command-line arguments (runtime overrides)
5. Azure Key Vault / Secrets Manager (sensitive data)

### Feature Flags

Enable/disable features without code changes:

```json
{
  "FeatureFlags": {
    "EnableAdvancedDebugging": true,
    "EnableFormatConversion": true,
    "EnableMultiSession": false
  }
}
```

---

## Migration Strategy

### Database Migrations
- Use Entity Framework Core migrations
- Version all schema changes
- Test migrations in staging first
- Maintain rollback scripts

### Data Migrations
- Separate data migrations from schema migrations
- Run data migrations during maintenance windows
- Validate data integrity after migration

### Backward Compatibility
- Maintain API compatibility for at least 2 major versions
- Use adapter pattern for legacy API support
- Provide migration tools for breaking changes

---

## Monitoring & Observability

### Health Checks
- `/health` endpoint for liveness probes
- `/health/ready` endpoint for readiness probes
- Component-level health checks

### Logging
- Structured logging with correlation IDs
- Log levels: Debug, Info, Warning, Error, Critical
- Centralized log aggregation

### Metrics
- Request count and duration
- Error rates
- Resource utilization (CPU, memory)
- Custom business metrics

### Tracing
- Distributed tracing with OpenTelemetry
- Request flow visualization
- Performance bottleneck identification

---

## Next Steps

1. Implement interface-based programming (see [INTERFACES.md](INTERFACES.md))
2. Set up comprehensive testing (see [TESTING.md](TESTING.md))
3. Implement security best practices (see [SECURITY.md](SECURITY.md))
4. Configure CI/CD pipeline (see [DEPLOYMENT.md](DEPLOYMENT.md))
5. Add monitoring and observability (see [MONITORING.md](MONITORING.md))

---

## References

- [DotLiquid Documentation](https://github.com/dotliquid/dotliquid)
- [ASP.NET Core Best Practices](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/best-practices)
- [.NET Architecture Guides](https://dotnet.microsoft.com/learn/dotnet/architecture-guides)
- [Azure Well-Architected Framework](https://docs.microsoft.com/en-us/azure/architecture/framework/)