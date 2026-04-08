# 🔒 Security Quick Start Guide

## Overview

This guide helps you quickly implement essential security features for handling client data safely in the Liquid Template Debugger.

---

## ⚡ 5-Minute Security Setup (Minimum Viable Security)

### Step 1: Update appsettings.json

Add security configuration:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "LiquidTemplateDebugger.Security": "Information"
    }
  },
  "Security": {
    "AllowedDirectories": [
      "./samples",
      "./data"
    ],
    "AllowedOrigins": [],
    "MaxTemplateSize": 1000000,
    "MaxDataSize": 10000000
  },
  "AllowedHosts": "*"
}
```

### Step 2: Create Security Classes

Copy these files from the implementation checklist:
- `Security/InputValidator.cs`
- `Security/SecurityHeadersMiddleware.cs`
- `Security/ErrorHandlingMiddleware.cs`
- `Security/AuditLogger.cs`
- `Security/SecurityConfiguration.cs`

### Step 3: Update Program.cs

Replace your existing Program.cs configuration with:

```csharp
using LiquidTemplateDebugger.Security;

var builder = WebApplication.CreateBuilder(args);

// Register core services
builder.Services.AddSingleton<ITemplateParser, TemplateParser>();
builder.Services.AddSingleton<IInputDataLoader, InputDataLoader>();
builder.Services.AddSingleton<DebugSessionManager>();

// ⭐ ADD SECURITY SERVICES
builder.Services.AddSecurityServices(builder.Configuration, builder.Environment);

// Configure JSON serialization
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new HashJsonConverter());
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Configure Kestrel with security settings
builder.WebHost.ConfigureSecureKestrel(builder.Configuration);
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();

// ⭐ USE SECURITY MIDDLEWARE
app.UseSecurityMiddleware(app.Environment);

// Serve static files
app.UseStaticFiles();

// Map API endpoints
app.MapDebugApiEndpoints();

// Redirect root
app.MapGet("/", () => Results.Redirect("/index.html"));

app.Run();
```

### Step 4: Test Security

```bash
# Run the application
dotnet run

# Test rate limiting (should get 429 after many requests)
for i in {1..150}; do curl http://localhost:5050/api/state; done

# Test path traversal (should be blocked)
curl -X POST http://localhost:5050/api/load \
  -H "Content-Type: application/json" \
  -d '{"templatePath":"../../../etc/passwd","dataPath":"test.json"}'

# Check security headers
curl -I http://localhost:5050/
```

---

## 🎯 Security Levels

### Level 1: Basic Protection (5 minutes) ✅
- ✅ Input validation
- ✅ Rate limiting
- ✅ Security headers
- ✅ Error handling
- ✅ Audit logging

**Good for**: Development, internal tools, trusted networks

### Level 2: Production Ready (2-3 hours)
- ✅ Everything from Level 1
- ✅ HTTPS enforcement
- ✅ CORS configuration
- ✅ Request size limits
- ✅ Data encryption at rest

**Good for**: Production deployments, internet-facing applications

### Level 3: Enterprise Grade (1-2 days)
- ✅ Everything from Level 2
- ✅ JWT Authentication
- ✅ Role-based authorization
- ✅ Session management
- ✅ Advanced audit logging
- ✅ Intrusion detection

**Good for**: Multi-tenant SaaS, regulated industries, high-security requirements

---

## 🚨 Critical Security Checklist

Before deploying to production, ensure:

### Configuration
- [ ] Changed default JWT secret key (if using auth)
- [ ] Configured allowed CORS origins
- [ ] Set allowed file directories
- [ ] Configured HTTPS certificate
- [ ] Set appropriate rate limits
- [ ] Configured logging levels

### Network
- [ ] HTTPS enabled and enforced
- [ ] Firewall rules configured
- [ ] Only necessary ports exposed
- [ ] Load balancer configured (if applicable)

### Monitoring
- [ ] Audit logging enabled
- [ ] Error tracking configured
- [ ] Security alerts set up
- [ ] Log aggregation configured

### Testing
- [ ] Tested path traversal protection
- [ ] Tested rate limiting
- [ ] Tested XSS protection
- [ ] Tested large file handling
- [ ] Tested authentication (if enabled)
- [ ] Verified security headers

---

## 🔐 Common Security Scenarios

### Scenario 1: Internal Tool (Trusted Network)

**Configuration:**
```json
{
  "Security": {
    "AllowedDirectories": ["./data", "./templates"],
    "AllowedOrigins": ["http://localhost:3000"],
    "MaxTemplateSize": 5000000,
    "MaxDataSize": 50000000
  }
}
```

**Features to enable:**
- Input validation ✅
- Rate limiting (relaxed) ✅
- Basic audit logging ✅
- Security headers ✅

**Features to skip:**
- Authentication (use network security)
- HTTPS (if on internal network)
- Strict CORS

### Scenario 2: Public SaaS Application

**Configuration:**
```json
{
  "Security": {
    "AllowedDirectories": ["/app/user-data"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "MaxTemplateSize": 1000000,
    "MaxDataSize": 10000000
  },
  "Jwt": {
    "Key": "your-secure-key-here",
    "Issuer": "YourApp",
    "Audience": "YourApp.Client"
  }
}
```

**Features to enable:**
- All input validation ✅
- Strict rate limiting ✅
- JWT authentication ✅
- HTTPS enforcement ✅
- Strict CORS ✅
- Comprehensive audit logging ✅
- Data encryption ✅

### Scenario 3: Processing Sensitive Client Data

**Additional measures:**
- Enable data encryption at rest
- Implement data retention policies
- Add PII detection and masking
- Enable comprehensive audit trails
- Implement data access controls
- Add data anonymization for logs

**Configuration:**
```json
{
  "Security": {
    "AllowedDirectories": ["/secure/client-data"],
    "AllowedOrigins": ["https://secure.yourdomain.com"],
    "MaxTemplateSize": 500000,
    "MaxDataSize": 5000000,
    "EnableDataEncryption": true,
    "EnablePIIDetection": true,
    "DataRetentionDays": 30
  }
}
```

---

## 🛡️ Security Best Practices

### 1. Input Validation
```csharp
// ✅ GOOD: Validate before processing
var validation = validator.ValidateContent(content);
if (!validation.IsValid)
    return Results.BadRequest(new { error = validation.ErrorMessage });

// ❌ BAD: Process without validation
var data = LoadData(content);
```

### 2. Error Handling
```csharp
// ✅ GOOD: Generic error message
catch (Exception ex)
{
    logger.LogError(ex, "Error processing request");
    return Results.BadRequest(new { error = "An error occurred" });
}

// ❌ BAD: Expose internal details
catch (Exception ex)
{
    return Results.BadRequest(new { error = ex.ToString() });
}
```

### 3. Logging
```csharp
// ✅ GOOD: Log without sensitive data
logger.LogInformation("User {UserId} loaded template", userId);

// ❌ BAD: Log sensitive data
logger.LogInformation("User loaded template: {Content}", templateContent);
```

### 4. Rate Limiting
```csharp
// ✅ GOOD: Apply rate limiting to expensive operations
app.MapPost("/api/load", handler)
   .RequireRateLimiting("LoadEndpoint");

// ❌ BAD: No rate limiting on expensive operations
app.MapPost("/api/load", handler);
```

---

## 🔍 Security Testing

### Manual Testing Commands

```bash
# 1. Test path traversal
curl -X POST http://localhost:5050/api/load \
  -H "Content-Type: application/json" \
  -d '{"templatePath":"../../../etc/passwd","dataPath":"test.json"}'
# Expected: 400 Bad Request

# 2. Test XSS in template
curl -X POST http://localhost:5050/api/load \
  -H "Content-Type: application/json" \
  -d '{"templateContent":"<script>alert(1)</script>","dataContent":"{}"}'
# Expected: 400 Bad Request

# 3. Test rate limiting
for i in {1..150}; do 
  curl http://localhost:5050/api/state
done
# Expected: 429 Too Many Requests after ~100 requests

# 4. Test large payload
dd if=/dev/zero bs=1M count=100 | curl -X POST http://localhost:5050/api/load \
  -H "Content-Type: application/json" \
  --data-binary @-
# Expected: 413 Payload Too Large

# 5. Check security headers
curl -I http://localhost:5050/
# Expected: X-Content-Type-Options, X-Frame-Options, CSP headers
```

### Automated Security Scanning

```bash
# Install tools
dotnet tool install --global security-scan
dotnet tool install --global dotnet-outdated-tool

# Scan for vulnerabilities
dotnet list package --vulnerable --include-transitive

# Check for outdated packages
dotnet outdated

# Run OWASP dependency check
dependency-check --project LiquidDebugger --scan . --format HTML
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

1. **Rate Limit Violations**
   - Alert if > 100 violations/hour
   - Indicates potential DoS attack

2. **Failed Authentication Attempts**
   - Alert if > 10 failures/minute from same IP
   - Indicates brute force attack

3. **Path Traversal Attempts**
   - Alert on any occurrence
   - Indicates reconnaissance activity

4. **Large File Uploads**
   - Monitor file sizes
   - Alert on unusual patterns

5. **Error Rates**
   - Alert if error rate > 5%
   - May indicate attack or system issue

### Sample Alert Configuration (Application Insights)

```json
{
  "alerts": [
    {
      "name": "High Rate Limit Violations",
      "query": "traces | where message contains 'Rate limit exceeded' | summarize count() by bin(timestamp, 1h)",
      "threshold": 100,
      "severity": "Warning"
    },
    {
      "name": "Path Traversal Attempts",
      "query": "traces | where message contains 'Path traversal attempt'",
      "threshold": 1,
      "severity": "Critical"
    }
  ]
}
```

---

## 🆘 Incident Response

### If You Detect a Security Incident:

1. **Immediate Actions**
   - Stop the affected service if necessary
   - Block malicious IP addresses
   - Preserve logs for investigation

2. **Investigation**
   - Review audit logs
   - Identify scope of breach
   - Determine what data was accessed

3. **Remediation**
   - Patch vulnerabilities
   - Rotate compromised credentials
   - Update security rules

4. **Communication**
   - Notify affected users (if required)
   - Report to authorities (if required)
   - Document lessons learned

---

## 📚 Additional Resources

- [Full Implementation Checklist](./SECURITY_IMPLEMENTATION_CHECKLIST.md)
- [Detailed Security Documentation](./SECURITY.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [.NET Security Best Practices](https://docs.microsoft.com/en-us/dotnet/standard/security/)

---

## 💡 Need Help?

- Review the [Implementation Checklist](./SECURITY_IMPLEMENTATION_CHECKLIST.md) for detailed steps
- Check [SECURITY.md](./SECURITY.md) for comprehensive security documentation
- Consult OWASP guidelines for web application security
- Consider hiring a security consultant for sensitive deployments