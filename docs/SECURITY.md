# Security Best Practices & Implementation Guide

## Overview

This document outlines security best practices, implementation guidelines, and threat mitigation strategies for the Liquid Template Debugger.

## Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions required for operations
3. **Fail Secure**: System fails to a secure state
4. **Complete Mediation**: Every access checked
5. **Open Design**: Security through design, not obscurity
6. **Separation of Privilege**: Multiple conditions for critical operations

## Threat Model

### Identified Threats

| Threat | Risk Level | Mitigation |
|--------|-----------|------------|
| Path Traversal | High | Input validation, path sanitization |
| Template Injection | High | Template parsing validation, sandboxing |
| DoS via Large Files | Medium | File size limits, rate limiting |
| XSS in Output | Medium | Output encoding, CSP headers |
| Unauthorized Access | High | Authentication, authorization |
| Data Exposure | High | Encryption, access controls |
| Dependency Vulnerabilities | Medium | Regular scanning, updates |

## Input Validation

### 1. File Path Validation

```csharp
// Security/InputValidator.cs
namespace LiquidTemplateDebugger.Security;

public class InputValidator : IInputValidator
{
    private readonly IConfiguration _config;
    private readonly ILogger<InputValidator> _logger;
    
    public InputValidator(IConfiguration config, ILogger<InputValidator> logger)
    {
        _config = config;
        _logger = logger;
    }
    
    public ValidationResult ValidateTemplatePath(string path)
    {
        // Prevent null or empty
        if (string.IsNullOrWhiteSpace(path))
            return ValidationResult.Failure("Path cannot be empty");
        
        // Prevent path traversal
        if (path.Contains("..") || path.Contains("~"))
        {
            _logger.LogWarning("Path traversal attempt detected: {Path}", path);
            return ValidationResult.Failure("Invalid path: path traversal not allowed");
        }
        
        // Normalize path
        var normalizedPath = Path.GetFullPath(path);
        
        // Check against allowed directories
        var allowedDirs = _config.GetSection("Security:AllowedDirectories").Get<string[]>() 
            ?? Array.Empty<string>();
        
        if (allowedDirs.Length > 0)
        {
            var isAllowed = allowedDirs.Any(dir => 
            {
                var fullDir = Path.GetFullPath(dir);
                return normalizedPath.StartsWith(fullDir, StringComparison.OrdinalIgnoreCase);
            });
            
            if (!isAllowed)
            {
                _logger.LogWarning("Access to unauthorized directory: {Path}", path);
                return ValidationResult.Failure("Path not in allowed directory");
            }
        }
        
        return ValidationResult.Success();
    }
    
    public ValidationResult ValidateTemplateContent(string content)
    {
        // Check size limit
        var maxSize = _config.GetValue<int>("Security:MaxTemplateSize", 1_000_000);
        if (content.Length > maxSize)
        {
            _logger.LogWarning("Template exceeds size limit: {Size} bytes", content.Length);
            return ValidationResult.Failure($"Template too large (max {maxSize} bytes)");
        }
        
        // Check for suspicious patterns
        var suspiciousPatterns = new[]
        {
            @"<script[^>]*>",
            @"javascript:",
            @"on\w+\s*=",
            @"eval\s*\(",
            @"Function\s*\("
        };
        
        foreach (var pattern in suspiciousPatterns)
        {
            if (Regex.IsMatch(content, pattern, RegexOptions.IgnoreCase))
            {
                _logger.LogWarning("Suspicious pattern detected in template: {Pattern}", pattern);
                return ValidationResult.Failure("Template contains suspicious content");
            }
        }
        
        return ValidationResult.Success();
    }
    
    public ValidationResult ValidateDataContent(string content, string format)
    {
        // Check size limit
        var maxSize = _config.GetValue<int>("Security:MaxDataSize", 10_000_000);
        if (content.Length > maxSize)
        {
            _logger.LogWarning("Data exceeds size limit: {Size} bytes", content.Length);
            return ValidationResult.Failure($"Data too large (max {maxSize} bytes)");
        }
        
        // Format-specific validation
        try
        {
            switch (format.ToUpperInvariant())
            {
                case "JSON":
                    JToken.Parse(content); // Validate JSON
                    break;
                case "XML":
                    XDocument.Parse(content); // Validate XML
                    break;
                case "CSV":
                    // Basic CSV validation
                    if (string.IsNullOrWhiteSpace(content))
                        return ValidationResult.Failure("CSV content is empty");
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invalid {Format} content", format);
            return ValidationResult.Failure($"Invalid {format} format: {ex.Message}");
        }
        
        return ValidationResult.Success();
    }
    
    public string Sanitize(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;
        
        // Remove control characters except newline and tab
        var sanitized = new string(input.Where(c => 
            !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t').ToArray());
        
        // Trim to reasonable length
        const int maxLength = 10000;
        if (sanitized.Length > maxLength)
            sanitized = sanitized.Substring(0, maxLength);
        
        return sanitized;
    }
}
```

### 2. API Endpoint Validation

```csharp
// Api/Middleware/ValidationMiddleware.cs
public class ValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IInputValidator _validator;
    
    public ValidationMiddleware(RequestDelegate next, IInputValidator validator)
    {
        _next = next;
        _validator = validator;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        // Validate request size
        if (context.Request.ContentLength > 50_000_000) // 50MB
        {
            context.Response.StatusCode = 413; // Payload Too Large
            await context.Response.WriteAsJsonAsync(new { error = "Request too large" });
            return;
        }
        
        await _next(context);
    }
}
```

## Authentication & Authorization

### 1. JWT Authentication

```csharp
// Security/JwtAuthenticationService.cs
public class JwtAuthenticationService
{
    private readonly IConfiguration _config;
    
    public JwtAuthenticationService(IConfiguration config)
    {
        _config = config;
    }
    
    public string GenerateToken(string userId, IEnumerable<string> roles)
    {
        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    
    public ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]);
        
        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);
            
            return principal;
        }
        catch
        {
            return null;
        }
    }
}
```

### 2. Authorization Policies

```csharp
// Program.cs
builder.Services.AddAuthorization(options =>
{
    // Basic access policy
    options.AddPolicy("DebugAccess", policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim("permission", "debug:read"));
    
    // Write access policy
    options.AddPolicy("DebugWrite", policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim("permission", "debug:write"));
    
    // Admin policy
    options.AddPolicy("AdminAccess", policy =>
        policy.RequireRole("Admin"));
});

// Apply to endpoints
app.MapPost("/api/load", 
    [Authorize(Policy = "DebugWrite")] 
    async (LoadRequest request, ISessionManager manager) => { ... });
```

## Rate Limiting

```csharp
// Program.cs
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    // Global rate limiter
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var userId = context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        
        return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1)
        });
    });
    
    // Endpoint-specific rate limiters
    options.AddPolicy("LoadEndpoint", context =>
    {
        var userId = context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        
        return RateLimitPartition.GetSlidingWindowLimiter(userId, _ => new SlidingWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 6
        });
    });
    
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests",
            retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter) 
                ? retryAfter.TotalSeconds 
                : 60
        }, cancellationToken: token);
    };
});

app.UseRateLimiter();

// Apply to specific endpoint
app.MapPost("/api/load", async (LoadRequest request) => { ... })
   .RequireRateLimiting("LoadEndpoint");
```

## CORS Configuration

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();
        
        if (allowedOrigins.Length == 0)
        {
            // Development: allow localhost
            policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
        else
        {
            // Production: specific origins only
            policy.WithOrigins(allowedOrigins)
                  .WithMethods("GET", "POST", "PUT", "DELETE")
                  .WithHeaders("Content-Type", "Authorization")
                  .AllowCredentials();
        }
    });
});

app.UseCors("AllowedOrigins");
```

## Security Headers

```csharp
// Security/Middleware/SecurityHeadersMiddleware.cs
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    
    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        // Prevent MIME type sniffing
        context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
        
        // Prevent clickjacking
        context.Response.Headers.Add("X-Frame-Options", "DENY");
        
        // Enable XSS protection
        context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
        
        // Referrer policy
        context.Response.Headers.Add("Referrer-Policy", "no-referrer");
        
        // Content Security Policy
        context.Response.Headers.Add("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none'");
        
        // HSTS (only in production)
        if (!context.Request.Host.Host.Contains("localhost"))
        {
            context.Response.Headers.Add("Strict-Transport-Security",
                "max-age=31536000; includeSubDomains; preload");
        }
        
        // Permissions Policy
        context.Response.Headers.Add("Permissions-Policy",
            "geolocation=(), microphone=(), camera=()");
        
        await _next(context);
    }
}

// Register in Program.cs
app.UseMiddleware<SecurityHeadersMiddleware>();
```

## Data Protection

### 1. Encryption Service

```csharp
// Security/DataProtectionService.cs
public class DataProtectionService : IDataProtectionService
{
    private readonly IDataProtector _protector;
    
    public DataProtectionService(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("LiquidDebugger.SessionData.v1");
    }
    
    public string Protect(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return string.Empty;
        
        return _protector.Protect(plainText);
    }
    
    public string Unprotect(string protectedText)
    {
        if (string.IsNullOrEmpty(protectedText))
            return string.Empty;
        
        try
        {
            return _protector.Unprotect(protectedText);
        }
        catch (CryptographicException)
        {
            throw new SecurityException("Failed to decrypt data");
        }
    }
    
    public string Hash(string data)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(data);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
    
    public bool VerifyHash(string data, string hash)
    {
        var computedHash = Hash(data);
        return computedHash == hash;
    }
}

// Register in Program.cs
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(@"./keys"))
    .SetApplicationName("LiquidDebugger")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(90));

builder.Services.AddSingleton<IDataProtectionService, DataProtectionService>();
```

### 2. Sensitive Data Handling

```csharp
// Models/SecureSession.cs
public class SecureSession
{
    private readonly IDataProtectionService _protection;
    
    public string SessionId { get; set; } = string.Empty;
    
    private string _encryptedData = string.Empty;
    
    public string TemplateContent
    {
        get => _protection.Unprotect(_encryptedData);
        set => _encryptedData = _protection.Protect(value);
    }
    
    public SecureSession(IDataProtectionService protection)
    {
        _protection = protection;
    }
}
```

## Audit Logging

```csharp
// Security/AuditLogger.cs
public class AuditLogger : IAuditLogger
{
    private readonly ILogger<AuditLogger> _logger;
    private readonly IConfiguration _config;
    
    public AuditLogger(ILogger<AuditLogger> logger, IConfiguration config)
    {
        _logger = logger;
        _config = config;
    }
    
    public async Task LogAccessAsync(string userId, string resource, string action, bool success = true)
    {
        var entry = new AuditLogEntry
        {
            Timestamp = DateTime.UtcNow,
            EventType = "Access",
            UserId = userId,
            Resource = resource,
            Action = action,
            Success = success
        };
        
        _logger.LogInformation(
            "AUDIT: User {UserId} {Action} {Resource} - {Success}",
            userId, action, resource, success ? "SUCCESS" : "FAILED");
        
        // Persist to database or external service
        await PersistAuditLogAsync(entry);
    }
    
    public async Task LogSecurityEventAsync(string eventType, string details, string? userId = null)
    {
        var entry = new AuditLogEntry
        {
            Timestamp = DateTime.UtcNow,
            EventType = eventType,
            UserId = userId ?? "system",
            Details = details,
            Success = false
        };
        
        _logger.LogWarning(
            "SECURITY EVENT: {EventType} - {Details} - User: {UserId}",
            eventType, details, userId ?? "unknown");
        
        await PersistAuditLogAsync(entry);
    }
    
    public async Task LogAuthenticationAsync(string userId, bool success, string? reason = null)
    {
        await LogAccessAsync(userId, "Authentication", "Login", success);
        
        if (!success)
        {
            await LogSecurityEventAsync("AuthenticationFailure", 
                $"Failed login attempt: {reason}", userId);
        }
    }
    
    public async Task LogAuthorizationAsync(string userId, string resource, bool granted, string? reason = null)
    {
        await LogAccessAsync(userId, resource, "Authorization", granted);
        
        if (!granted)
        {
            await LogSecurityEventAsync("AuthorizationDenied",
                $"Access denied to {resource}: {reason}", userId);
        }
    }
    
    private async Task PersistAuditLogAsync(AuditLogEntry entry)
    {
        // Implement persistence to database, file, or external service
        // For now, just log to structured logging
        await Task.CompletedTask;
    }
    
    public async Task<IEnumerable<AuditLogEntry>> QueryLogsAsync(AuditLogQuery query)
    {
        // Implement query logic
        return await Task.FromResult(Enumerable.Empty<AuditLogEntry>());
    }
}
```

## Dependency Security

### 1. Vulnerability Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  push:
    branches: [ main ]

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '10.0.x'
      
      - name: Check for vulnerable packages
        run: |
          dotnet list package --vulnerable --include-transitive
          if [ $? -ne 0 ]; then
            echo "Vulnerable packages found!"
            exit 1
          fi
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'LiquidDebugger'
          path: '.'
          format: 'HTML'
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: dependency-check-report.html
```

### 2. Package Update Policy

```bash
# scripts/update-dependencies.sh
#!/bin/bash

# Check for outdated packages
dotnet list package --outdated

# Update to latest patch versions (safe)
dotnet add package DotLiquid
dotnet add package Newtonsoft.Json

# Run tests after update
dotnet test

# If tests pass, commit
git add *.csproj
git commit -m "chore: update dependencies"
```

## Security Checklist

### Development
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] Secure password storage (hashing + salt)
- [ ] Sensitive data encrypted
- [ ] Error messages don't leak information
- [ ] Logging doesn't include sensitive data

### Deployment
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Authentication required
- [ ] Authorization policies defined
- [ ] Secrets in environment variables/vault
- [ ] Database credentials secured
- [ ] API keys rotated regularly

### Monitoring
- [ ] Audit logging enabled
- [ ] Security events monitored
- [ ] Failed login attempts tracked
- [ ] Unusual activity alerts configured
- [ ] Regular security reviews scheduled
- [ ] Incident response plan documented

## Incident Response

### 1. Detection
- Monitor audit logs for suspicious activity
- Set up alerts for security events
- Regular security assessments

### 2. Response
1. Identify the incident
2. Contain the threat
3. Eradicate the vulnerability
4. Recover systems
5. Document lessons learned

### 3. Communication
- Internal: Security team, management
- External: Affected users, authorities (if required)
- Public: Transparency about breach (if applicable)

## Security Contacts

- Security Team: security@example.com
- Vulnerability Reports: security-reports@example.com
- Emergency: +1-XXX-XXX-XXXX

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [.NET Security Best Practices](https://docs.microsoft.com/en-us/dotnet/standard/security/)