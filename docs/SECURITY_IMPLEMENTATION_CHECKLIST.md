# Security Implementation Checklist for Client Data Protection

## 🎯 Executive Summary

This checklist provides **immediate, actionable steps** to secure your Liquid Template Debugger for handling sensitive client data. Each item includes implementation priority and estimated effort.

---

## ⚠️ CRITICAL - Implement Immediately (Week 1)

### 1. Input Validation & Sanitization
**Risk**: Path traversal, injection attacks, DoS  
**Effort**: 4-8 hours

#### Implementation Steps:

**A. Create Input Validator Service**
```bash
# Create new file
mkdir -p Security
```

Create `Security/InputValidator.cs`:
```csharp
using System.Text.RegularExpressions;

namespace LiquidTemplateDebugger.Security;

public interface IInputValidator
{
    ValidationResult ValidateFilePath(string path);
    ValidationResult ValidateContent(string content, int maxSize = 10_000_000);
    ValidationResult ValidateFormat(string format);
    string SanitizeInput(string input);
}

public class InputValidator : IInputValidator
{
    private readonly ILogger<InputValidator> _logger;
    private readonly IConfiguration _config;
    
    public InputValidator(ILogger<InputValidator> logger, IConfiguration config)
    {
        _logger = logger;
        _config = config;
    }
    
    public ValidationResult ValidateFilePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return ValidationResult.Failure("Path cannot be empty");
        
        // Prevent path traversal
        if (path.Contains("..") || path.Contains("~"))
        {
            _logger.LogWarning("Path traversal attempt: {Path}", path);
            return ValidationResult.Failure("Invalid path: traversal not allowed");
        }
        
        // Normalize and validate
        try
        {
            var fullPath = Path.GetFullPath(path);
            var allowedDirs = _config.GetSection("Security:AllowedDirectories")
                .Get<string[]>() ?? Array.Empty<string>();
            
            if (allowedDirs.Length > 0)
            {
                var isAllowed = allowedDirs.Any(dir => 
                    fullPath.StartsWith(Path.GetFullPath(dir), 
                    StringComparison.OrdinalIgnoreCase));
                
                if (!isAllowed)
                {
                    _logger.LogWarning("Unauthorized directory access: {Path}", path);
                    return ValidationResult.Failure("Path not in allowed directory");
                }
            }
            
            return ValidationResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Path validation error: {Path}", path);
            return ValidationResult.Failure("Invalid path format");
        }
    }
    
    public ValidationResult ValidateContent(string content, int maxSize = 10_000_000)
    {
        if (string.IsNullOrEmpty(content))
            return ValidationResult.Success();
        
        if (content.Length > maxSize)
        {
            _logger.LogWarning("Content exceeds size limit: {Size} bytes", content.Length);
            return ValidationResult.Failure($"Content too large (max {maxSize:N0} bytes)");
        }
        
        // Check for suspicious patterns
        var suspiciousPatterns = new[]
        {
            @"<script[^>]*>",
            @"javascript:",
            @"on\w+\s*=",
            @"eval\s*\(",
            @"Function\s*\(",
            @"<iframe",
            @"<object",
            @"<embed"
        };
        
        foreach (var pattern in suspiciousPatterns)
        {
            if (Regex.IsMatch(content, pattern, RegexOptions.IgnoreCase))
            {
                _logger.LogWarning("Suspicious pattern in content: {Pattern}", pattern);
                return ValidationResult.Failure("Content contains potentially unsafe patterns");
            }
        }
        
        return ValidationResult.Success();
    }
    
    public ValidationResult ValidateFormat(string format)
    {
        var allowedFormats = new[] { "JSON", "XML", "CSV", "TEXT" };
        var normalized = format?.ToUpperInvariant() ?? "TEXT";
        
        if (!allowedFormats.Contains(normalized))
        {
            return ValidationResult.Failure($"Unsupported format: {format}");
        }
        
        return ValidationResult.Success();
    }
    
    public string SanitizeInput(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;
        
        // Remove control characters except newline, tab, carriage return
        var sanitized = new string(input.Where(c => 
            !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t').ToArray());
        
        return sanitized;
    }
}

public record ValidationResult(bool IsValid, string? ErrorMessage = null)
{
    public static ValidationResult Success() => new(true);
    public static ValidationResult Failure(string error) => new(false, error);
}
```

**B. Update Program.cs**
Add to dependency injection:
```csharp
builder.Services.AddSingleton<IInputValidator, InputValidator>();
```

**C. Update DebugApiEndpoints.cs**
Modify the `/api/load` endpoint:
```csharp
app.MapPost("/api/load", (LoadRequest request, DebugSessionManager manager, IInputValidator validator) =>
{
    try
    {
        if (!string.IsNullOrEmpty(request.TemplatePath))
        {
            var pathValidation = validator.ValidateFilePath(request.TemplatePath);
            if (!pathValidation.IsValid)
                return Results.BadRequest(new { error = pathValidation.ErrorMessage });
        }
        
        if (!string.IsNullOrEmpty(request.TemplateContent))
        {
            var contentValidation = validator.ValidateContent(request.TemplateContent, 1_000_000);
            if (!contentValidation.IsValid)
                return Results.BadRequest(new { error = contentValidation.ErrorMessage });
        }
        
        if (!string.IsNullOrEmpty(request.DataContent))
        {
            var dataValidation = validator.ValidateContent(request.DataContent, 10_000_000);
            if (!dataValidation.IsValid)
                return Results.BadRequest(new { error = dataValidation.ErrorMessage });
        }
        
        // Existing load logic...
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});
```

---

### 2. Rate Limiting
**Risk**: DoS attacks, resource exhaustion  
**Effort**: 2-3 hours

**A. Update Program.cs**
```csharp
using System.Threading.RateLimiting;

// Add before builder.Build()
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var identifier = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        return RateLimitPartition.GetFixedWindowLimiter(identifier, _ => 
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            });
    });
    
    options.AddPolicy("LoadEndpoint", context =>
    {
        var identifier = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        return RateLimitPartition.GetSlidingWindowLimiter(identifier, _ => 
            new SlidingWindowRateLimiterOptions
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
            error = "Too many requests. Please try again later.",
            retryAfter = 60
        }, cancellationToken: token);
    };
});

// Add after app.Build()
app.UseRateLimiter();
```

**B. Apply to endpoints**
```csharp
app.MapPost("/api/load", /* handler */)
   .RequireRateLimiting("LoadEndpoint");
```

---

### 3. Security Headers
**Risk**: XSS, clickjacking, MIME sniffing  
**Effort**: 1-2 hours

**A. Create Security Headers Middleware**
Create `Security/SecurityHeadersMiddleware.cs`:
```csharp
namespace LiquidTemplateDebugger.Security;

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
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        
        // Prevent clickjacking
        context.Response.Headers["X-Frame-Options"] = "DENY";
        
        // XSS protection
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
        
        // Referrer policy
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        
        // Content Security Policy
        context.Response.Headers["Content-Security-Policy"] = 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none'";
        
        // HSTS (only in production)
        if (!context.Request.Host.Host.Contains("localhost"))
        {
            context.Response.Headers["Strict-Transport-Security"] = 
                "max-age=31536000; includeSubDomains";
        }
        
        // Permissions Policy
        context.Response.Headers["Permissions-Policy"] = 
            "geolocation=(), microphone=(), camera=()";
        
        await _next(context);
    }
}
```

**B. Register in Program.cs**
```csharp
app.UseMiddleware<SecurityHeadersMiddleware>();
```

---

### 4. HTTPS Enforcement
**Risk**: Man-in-the-middle attacks, data interception  
**Effort**: 30 minutes

**Update Program.cs**
```csharp
// Add after builder.Build()
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}
```

**Update appsettings.Production.json**
```json
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://*:5051",
        "Certificate": {
          "Path": "/path/to/certificate.pfx",
          "Password": "certificate-password"
        }
      }
    }
  }
}
```

---

## 🔒 HIGH PRIORITY - Implement Week 2

### 5. Authentication & Authorization
**Risk**: Unauthorized access to sensitive data  
**Effort**: 8-12 hours

**A. Add JWT Authentication**
```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

**B. Create Authentication Service**
Create `Security/AuthenticationService.cs`:
```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace LiquidTemplateDebugger.Security;

public interface IAuthenticationService
{
    string GenerateToken(string userId, IEnumerable<string> roles);
    ClaimsPrincipal? ValidateToken(string token);
}

public class AuthenticationService : IAuthenticationService
{
    private readonly IConfiguration _config;
    
    public AuthenticationService(IConfiguration config)
    {
        _config = config;
    }
    
    public string GenerateToken(string userId, IEnumerable<string> roles)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured")));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
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
        var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured"));
        
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

**C. Update appsettings.json**
```json
{
  "Jwt": {
    "Key": "CHANGE-THIS-TO-A-SECURE-RANDOM-KEY-AT-LEAST-32-CHARACTERS",
    "Issuer": "LiquidDebugger",
    "Audience": "LiquidDebugger.Client"
  }
}
```

**D. Configure in Program.cs**
```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// After app.Build()
app.UseAuthentication();
app.UseAuthorization();
```

---

### 6. Audit Logging
**Risk**: No visibility into security events  
**Effort**: 4-6 hours

**A. Create Audit Logger**
Create `Security/AuditLogger.cs`:
```csharp
namespace LiquidTemplateDebugger.Security;

public interface IAuditLogger
{
    Task LogAccessAsync(string userId, string resource, string action, bool success = true);
    Task LogSecurityEventAsync(string eventType, string details, string? userId = null);
}

public class AuditLogger : IAuditLogger
{
    private readonly ILogger<AuditLogger> _logger;
    
    public AuditLogger(ILogger<AuditLogger> logger)
    {
        _logger = logger;
    }
    
    public Task LogAccessAsync(string userId, string resource, string action, bool success = true)
    {
        _logger.LogInformation(
            "AUDIT: User={UserId} Action={Action} Resource={Resource} Success={Success}",
            userId, action, resource, success);
        
        return Task.CompletedTask;
    }
    
    public Task LogSecurityEventAsync(string eventType, string details, string? userId = null)
    {
        _logger.LogWarning(
            "SECURITY: Event={EventType} Details={Details} User={UserId}",
            eventType, details, userId ?? "unknown");
        
        return Task.CompletedTask;
    }
}
```

**B. Register and use**
```csharp
builder.Services.AddSingleton<IAuditLogger, AuditLogger>();

// In endpoints
app.MapPost("/api/load", async (LoadRequest request, IAuditLogger audit) =>
{
    await audit.LogAccessAsync("user-id", "/api/load", "POST");
    // ... rest of handler
});
```

---

### 7. CORS Configuration
**Risk**: Unauthorized cross-origin requests  
**Effort**: 1 hour

**Update Program.cs**
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Security:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();
        
        if (builder.Environment.IsDevelopment())
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .WithMethods("GET", "POST", "PUT", "DELETE")
                  .WithHeaders("Content-Type", "Authorization");
        }
        else
        {
            // Production: require explicit configuration
            throw new InvalidOperationException(
                "CORS origins must be configured in production");
        }
    });
});

app.UseCors("AllowedOrigins");
```

---

## 📊 MEDIUM PRIORITY - Implement Week 3

### 8. Data Encryption at Rest
**Risk**: Sensitive data exposure if storage compromised  
**Effort**: 6-8 hours

```bash
dotnet add package Microsoft.AspNetCore.DataProtection
```

**Implementation in Program.cs**
```csharp
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("./keys"))
    .SetApplicationName("LiquidDebugger")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(90));
```

---

### 9. Request Size Limits
**Risk**: DoS via large payloads  
**Effort**: 1 hour

**Update Program.cs**
```csharp
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50_000_000; // 50MB
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 50_000_000; // 50MB
});
```

---

### 10. Error Handling & Information Disclosure
**Risk**: Sensitive information in error messages  
**Effort**: 2-3 hours

**Create Error Handler Middleware**
```csharp
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    
    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "An error occurred processing your request",
                requestId = context.TraceIdentifier
            });
        }
    }
}
```

---

## 🔧 Configuration Updates

### Update appsettings.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "LiquidTemplateDebugger": "Debug",
      "LiquidTemplateDebugger.Security": "Information"
    }
  },
  "Security": {
    "AllowedDirectories": [
      "./samples",
      "./uploads"
    ],
    "AllowedOrigins": [],
    "MaxTemplateSize": 1000000,
    "MaxDataSize": 10000000
  },
  "AllowedHosts": "*"
}
```

### Update appsettings.Production.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "LiquidTemplateDebugger.Security": "Information"
    }
  },
  "Security": {
    "AllowedDirectories": [
      "/app/data"
    ],
    "AllowedOrigins": [
      "https://yourdomain.com"
    ]
  },
  "AllowedHosts": "yourdomain.com"
}
```

---

## 📋 Deployment Checklist

### Before Production Deployment

- [ ] Change all default secrets and keys
- [ ] Configure HTTPS with valid certificate
- [ ] Set up firewall rules
- [ ] Configure allowed origins for CORS
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging
- [ ] Test rate limiting
- [ ] Verify authentication works
- [ ] Test with production-like data volumes
- [ ] Review all error messages for information disclosure
- [ ] Set up automated security scanning
- [ ] Document incident response procedures

### Environment Variables (Production)
```bash
export JWT_KEY="your-secure-random-key-here"
export ALLOWED_ORIGINS="https://yourdomain.com"
export ASPNETCORE_ENVIRONMENT="Production"
export ASPNETCORE_URLS="https://+:5051"
```

---

## 🔍 Security Testing

### Manual Testing Checklist
- [ ] Test path traversal attempts (`../../../etc/passwd`)
- [ ] Test XSS payloads in templates
- [ ] Test SQL injection patterns (if using database)
- [ ] Test rate limiting (exceed limits)
- [ ] Test authentication bypass attempts
- [ ] Test large file uploads (DoS)
- [ ] Test CORS with unauthorized origins
- [ ] Verify HTTPS redirect works
- [ ] Check security headers in responses

### Automated Security Scanning
```bash
# Install security scanning tools
dotnet tool install --global security-scan

# Run vulnerability scan
dotnet list package --vulnerable --include-transitive

# OWASP dependency check
dependency-check --project LiquidDebugger --scan .
```

---

## 📞 Security Contacts

- **Security Issues**: Report to security@yourcompany.com
- **Emergency**: Contact on-call team
- **Vulnerability Disclosure**: Follow responsible disclosure policy

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [.NET Security Best Practices](https://docs.microsoft.com/en-us/dotnet/standard/security/)
- [ASP.NET Core Security](https://docs.microsoft.com/en-us/aspnet/core/security/)

---

## 🔄 Regular Maintenance

### Weekly
- Review audit logs for suspicious activity
- Check for failed authentication attempts

### Monthly
- Update dependencies
- Review and rotate secrets
- Security scan for vulnerabilities

### Quarterly
- Security audit
- Penetration testing
- Review and update security policies