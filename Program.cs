using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using LiquidTemplateDebugger.Api;
using LiquidTemplateDebugger.Tests;

// Handle --test flag before building web host
if (args.Length == 1 && args[0] == "--test")
{
    return SmokeTest.Run();
}
if (args.Length == 1 && args[0] == "--bugtest")
{
    return BugReproTest.Run();
}
if (args.Length == 1 && args[0] == "--xmltest")
{
    return XmlToXmlComplexTest.Run();
}
if (args.Length == 1 && args[0] == "--formattest")
{
    return FormatTransformationTest.Run();
}
// Parse port from args
var port = 5050;
var portEnv = Environment.GetEnvironmentVariable("PORT");
if (int.TryParse(portEnv, out int envPort))
{
    port = envPort;
}
string? preloadTemplate = null;
string? preloadData = null;
string? preloadFormat = null;

for (int i = 0; i < args.Length; i++)
{
    if (args[i] == "--port" && i + 1 < args.Length)
    {
        port = int.Parse(args[i + 1]);
        i++;
    }
    else if (args[i] is "--help" or "-h")
    {
        Console.WriteLine("DotLiquid Template Debugger - Web UI");
        Console.WriteLine();
        Console.WriteLine("Usage:");
        Console.WriteLine("  LiquidTemplateDebugger [options] [<template-file> <data-file> [format]]");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  --port <port>          Port to listen on (default: 5050)");
        Console.WriteLine("  --test                 Run smoke tests and exit");
        Console.WriteLine("  --bugtest              Run bug reproduction tests and exit");
        Console.WriteLine("  --xmltest              Run complex XML to XML transformation test and exit");
        Console.WriteLine("  --formattest           Run format transformation tests and exit");
        Console.WriteLine("  --help, -h             Show this help");
        Console.WriteLine();
        Console.WriteLine("If template and data files are provided, they are pre-loaded into the session.");
        return 0;
    }
    else if (preloadTemplate == null)
    {
        preloadTemplate = args[i];
    }
    else if (preloadData == null)
    {
        preloadData = args[i];
    }
    else if (preloadFormat == null)
    {
        preloadFormat = args[i];
    }
}

var builder = WebApplication.CreateBuilder(args);

// Register DebugSessionManager as singleton
builder.Services.AddSingleton<DebugSessionManager>();

// Configure JSON serialization
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new HashJsonConverter());
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Set the URL
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();

// Serve static files from wwwroot/
app.UseStaticFiles();

// Map API endpoints
app.MapDebugApiEndpoints();

// Redirect root to index.html
app.MapGet("/", () => Results.Redirect("/index.html"));

// Pre-load template/data if provided via CLI
if (preloadTemplate != null && preloadData != null)
{
    var manager = app.Services.GetRequiredService<DebugSessionManager>();
    if (File.Exists(preloadTemplate) && File.Exists(preloadData))
    {
        manager.LoadFromFiles(preloadTemplate, preloadData, preloadFormat);
        Console.WriteLine($"Pre-loaded: {preloadTemplate} + {preloadData}");
    }
    else
    {
        Console.Error.WriteLine($"Warning: Could not find template or data file.");
    }
}

var url = $"http://localhost:{port}";
Console.WriteLine($"DotLiquid Template Debugger running at {url}");

// Auto-open browser
var isContainerEnv = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true" 
                  || Environment.GetEnvironmentVariable("RENDER") == "true";
try
{
    if (!isContainerEnv && OperatingSystem.IsMacOS())
        Process.Start("open", url);
    else if (OperatingSystem.IsWindows())
        Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
    else if (OperatingSystem.IsLinux())
        Process.Start("xdg-open", url);
}
catch { /* Ignore if browser can't be opened */ }

app.Run();

return 0;
