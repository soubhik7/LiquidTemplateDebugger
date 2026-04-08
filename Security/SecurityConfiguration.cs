// using System.Text;
// using Microsoft.AspNetCore.Authentication.JwtBearer;
// using Microsoft.IdentityModel.Tokens;
// using System.Threading.RateLimiting;

// namespace LiquidTemplateDebugger.Security;

// /// <summary>
// /// Centralized security configuration for the application.
// /// Call SecurityConfiguration.ConfigureServices() and SecurityConfiguration.ConfigureApp()
// /// in Program.cs to enable all security features.
// /// </summary>
// public static class SecurityConfiguration
// {
//     /// <summary>
//     /// Configure all security services in the DI container.
//     /// Add this to Program.cs before builder.Build()
//     /// </summary>
//     public static IServiceCollection AddSecurityServices(
//         this IServiceCollection services, 
//         IConfiguration configuration,
//         IWebHostEnvironment environment)
//     {
//         // Input validation
//         services.AddSingleton<IInputValidator, InputValidator>();
        
//         // Audit logging
//         services.AddSingleton<IAuditLogger, AuditLogger>();
        
//         // Rate limiting
//         services.AddRateLimiter(options =>
//         {
//             // Global rate limiter
//             options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
//             {
//                 var identifier = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                
//                 return RateLimitPartition.GetFixedWindowLimiter(identifier, _ => 
//                     new FixedWindowRateLimiterOptions
//                     {
//                         AutoReplenishment = true,
//                         PermitLimit = 100,
//                         Window = TimeSpan.FromMinutes(1)
//                     });
//             });
            
//             // Endpoint-specific rate limiters
//             options.AddPolicy("LoadEndpoint", context =>
//             {
//                 var identifier = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                
//                 return RateLimitPartition.GetSlidingWindowLimiter(identifier, _ => 
//                     new SlidingWindowRateLimiterOptions
//                     {
//                         AutoReplenishment = true,
//                         PermitLimit = 10,
//                         Window = TimeSpan.FromMinutes(1),
//                         SegmentsPerWindow = 6
//                     });
//             });
            
//             options.AddPolicy("ApiEndpoint", context =>
//             {
//                 var identifier = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                
//                 return RateLimitPartition.GetFixedWindowLimiter(identifier, _ => 
//                     new FixedWindowRateLimiterOptions
//                     {
//                         AutoReplenishment = true,
//                         PermitLimit = 50,
//                         Window = TimeSpan.FromMinutes(1)
//                     });
//             });
            
//             options.OnRejected = async (context, token) =>
//             {
//                 context.HttpContext.Response.StatusCode = 429;
//                 await context.HttpContext.Response.WriteAsJsonAsync(new
//                 {
//                     error = "Too many requests. Please try again later.",
//                     retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter) 
//                         ? (int)retryAfter.TotalSeconds 
//                         : 60
//                 }, cancellationToken: token);
//             };
//         });
        
//         // CORS
//         services.AddCors(options =>
//         {
//             options.AddPolicy("AllowedOrigins", policy =>
//             {
//                 var allowedOrigins = configuration
//                     .GetSection("Security:AllowedOrigins")
//                     .Get<string[]>() ?? Array.Empty<string>();
                
//                 if (environment.IsDevelopment())
//                 {
//                     // Development: allow localhost
//                     policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:5050")
//                           .AllowAnyMethod()
//                           .AllowAnyHeader();
//                 }
//                 else if (allowedOrigins.Length > 0)
//                 {
//                     // Production: specific origins only
//                     policy.WithOrigins(allowedOrigins)
//                           .WithMethods("GET", "POST", "PUT", "DELETE")
//                           .WithHeaders("Content-Type", "Authorization");
//                 }
//                 else
//                 {
//                     // Production without configuration: deny all
//                     policy.WithOrigins() // Empty = deny all
//                           .AllowAnyMethod()
//                           .AllowAnyHeader();
//                 }
//             });
//         });
        
//         // Authentication (optional - uncomment when ready to use)
//         /*
//         var jwtKey = configuration["Jwt:Key"];
//         if (!string.IsNullOrEmpty(jwtKey))
//         {
//             services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
//                 .AddJwtBearer(options =>
//                 {
//                     options.TokenValidationParameters = new TokenValidationParameters
//                     {
//                         ValidateIssuerSigningKey = true,
//                         IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
//                         ValidateIssuer = true,
//                         ValidIssuer = configuration["Jwt:Issuer"],
//                         ValidateAudience = true,
//                         ValidAudience = configuration["Jwt:Audience"],
//                         ValidateLifetime = true,
//                         ClockSkew = TimeSpan.Zero
//                     };
//                 });
            
//             services.AddAuthorization();
//             services.AddSingleton<IAuthenticationService, AuthenticationService>();
//         }
//         */
        
//         // Data protection
//         services.AddDataProtection()
//             .PersistKeysToFileSystem(new DirectoryInfo("./keys"))
//             .SetApplicationName("LiquidDebugger")
//             .SetDefaultKeyLifetime(TimeSpan.FromDays(90));
        
//         // Request size limits
//         services.Configure<FormOptions>(options =>
//         {
//             options.MultipartBodyLengthLimit = 50_000_000; // 50MB
//         });
        
//         return services;
//     }
    
//     /// <summary>
//     /// Configure security middleware in the application pipeline.
//     /// Add this to Program.cs after app.Build()
//     /// </summary>
//     public static IApplicationBuilder UseSecurityMiddleware(
//         this IApplicationBuilder app,
//         IWebHostEnvironment environment)
//     {
//         // Error handling (should be first)
//         app.UseMiddleware<ErrorHandlingMiddleware>();
        
//         // Security headers
//         app.UseMiddleware<SecurityHeadersMiddleware>();
        
//         // HTTPS redirection (production only)
//         if (!environment.IsDevelopment())
//         {
//             app.UseHttpsRedirection();
//             app.UseHsts();
//         }
        
//         // CORS
//         app.UseCors("AllowedOrigins");
        
//         // Rate limiting
//         app.UseRateLimiter();
        
//         // Authentication & Authorization (uncomment when ready)
//         // app.UseAuthentication();
//         // app.UseAuthorization();
        
//         return app;
//     }
    
//     /// <summary>
//     /// Configure Kestrel server options for security.
//     /// Add this to Program.cs when configuring WebHost
//     /// </summary>
//     public static IWebHostBuilder ConfigureSecureKestrel(
//         this IWebHostBuilder webHost,
//         IConfiguration configuration)
//     {
//         webHost.ConfigureKestrel(options =>
//         {
//             // Request size limits
//             options.Limits.MaxRequestBodySize = 50_000_000; // 50MB
            
//             // Connection limits
//             options.Limits.MaxConcurrentConnections = 100;
//             options.Limits.MaxConcurrentUpgradedConnections = 100;
            
//             // Timeouts
//             options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
//             options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
//         });
        
//         return webHost;
//     }
// }


