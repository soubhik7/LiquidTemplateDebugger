using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Api;

/// <summary>
/// Extension method registering all debug API endpoints on the WebApplication.
/// </summary>
public static class DebugApiEndpoints
{
    public static void MapDebugApiEndpoints(this WebApplication app)
    {
        // Load template + data from body content
        app.MapPost("/api/load", (LoadRequest request, DebugSessionManager manager) =>
        {
            try
            {
                if (!string.IsNullOrEmpty(request.TemplatePath) && !string.IsNullOrEmpty(request.DataPath))
                {
                    manager.LoadFromFiles(request.TemplatePath, request.DataPath, request.Format);
                }
                else if (!string.IsNullOrEmpty(request.TemplateContent) && !string.IsNullOrEmpty(request.DataContent))
                {
                    var format = request.Format ?? "json";
                    manager.Load(request.TemplateContent, request.DataContent, format);
                }
                else
                {
                    return Results.BadRequest(new { error = "Provide either TemplateContent+DataContent or TemplatePath+DataPath." });
                }

                return Results.Ok(DtoConverter.BuildFullState(manager));
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // Load bundled sample files
        app.MapPost("/api/load-sample", (DebugSessionManager manager) =>
        {
            try
            {
                // Look for samples relative to the app base directory
                var basePath = AppContext.BaseDirectory;
                var templatePath = FindFile(basePath, "samples/order.liquid");
                var dataPath = FindFile(basePath, "samples/order.json");

                if (templatePath == null || dataPath == null)
                    return Results.BadRequest(new { error = "Sample files not found." });

                manager.LoadFromFiles(templatePath, dataPath, "json");
                return Results.Ok(DtoConverter.BuildFullState(manager));
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // Get current state
        app.MapGet("/api/state", (DebugSessionManager manager) =>
        {
            return Results.Ok(DtoConverter.BuildFullState(manager));
        });

        // Step action
        app.MapPost("/api/step", (StepRequest request, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            var action = request.Action?.ToLowerInvariant() switch
            {
                "next" => StepAction.StepNext,
                "into" => StepAction.StepInto,
                "over" => StepAction.StepOver,
                "out" => StepAction.StepOut,
                "continue" => StepAction.Continue,
                "runtoline" => StepAction.RunToLine,
                _ => StepAction.StepNext
            };

            manager.Engine.Step(action, request.TargetLine);
            return Results.Ok(DtoConverter.BuildFullState(manager));
        });

        // Reset execution
        app.MapPost("/api/reset", (DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded)
                return Results.BadRequest(new { error = "No session loaded." });

            manager.Reset();
            return Results.Ok(DtoConverter.BuildFullState(manager));
        });

        // Add breakpoint
        app.MapPost("/api/breakpoint", (AddBreakpointRequest request, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            var bp = manager.Engine.AddBreakpoint(request.Line, request.Condition);
            return Results.Ok(DtoConverter.ConvertBreakpoint(bp));
        });

        // Remove breakpoint
        app.MapDelete("/api/breakpoint/{id}", (int id, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            if (manager.Engine.RemoveBreakpoint(id))
                return Results.Ok(new { removed = true });
            return Results.NotFound(new { error = $"Breakpoint #{id} not found." });
        });

        // Toggle breakpoint
        app.MapPost("/api/breakpoint/{id}/toggle", (int id, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            manager.Engine.ToggleBreakpoint(id);
            return Results.Ok(DtoConverter.BuildFullState(manager));
        });

        // Add watch
        app.MapPost("/api/watch", (AddWatchRequest request, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            var watch = manager.Engine.AddWatch(request.Expression);
            return Results.Ok(DtoConverter.ConvertWatch(watch));
        });

        // Remove watch
        app.MapDelete("/api/watch/{id}", (int id, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            if (manager.Engine.RemoveWatch(id))
                return Results.Ok(new { removed = true });
            return Results.NotFound(new { error = $"Watch #{id} not found." });
        });

        // Evaluate expression
        app.MapPost("/api/evaluate", (EvalRequest request, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            try
            {
                var result = manager.Engine.Evaluate(request.Expression);
                return Results.Ok(new EvalResultDto(
                    Expression: request.Expression,
                    Value: DtoConverter.FormatValue(result),
                    TypeName: result?.GetType().Name ?? "null",
                    Error: null
                ));
            }
            catch (Exception ex)
            {
                return Results.Ok(new EvalResultDto(
                    Expression: request.Expression,
                    Value: null,
                    TypeName: null,
                    Error: ex.Message
                ));
            }
        });

        // Inspect variable
        app.MapPost("/api/inspect", (InspectRequest request, DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            try
            {
                var value = manager.Engine.Evaluate(request.Name);
                var rootName = request.Name.Split('.')[0];
                manager.Engine.State.Variables.TryGetValue(rootName, out var tracked);

                return Results.Ok(new InspectResultDto(
                    Name: request.Name,
                    CurrentValue: DtoConverter.FormatValue(value),
                    RawValue: DtoConverter.SerializeRawValue(value, 0),
                    TypeName: value?.GetType().Name ?? "null",
                    ScopeTag: tracked?.ScopeTag,
                    ScopeDepth: tracked?.ScopeDepth,
                    Origin: tracked != null ? DtoConverter.ConvertOrigin(tracked.Origin) : null,
                    Transformations: tracked?.Transformations.Select(DtoConverter.ConvertTransformation).ToList() ?? new(),
                    Error: null
                ));
            }
            catch (Exception ex)
            {
                return Results.Ok(new InspectResultDto(
                    Name: request.Name,
                    CurrentValue: null,
                    RawValue: null,
                    TypeName: null,
                    ScopeTag: null,
                    ScopeDepth: null,
                    Origin: null,
                    Transformations: new(),
                    Error: ex.Message
                ));
            }
        });

        // Full DotLiquid render
        app.MapGet("/api/render", (DebugSessionManager manager) =>
        {
            if (!manager.IsLoaded || manager.Engine == null)
                return Results.BadRequest(new { error = "No session loaded." });

            return Results.Ok(new { output = manager.Engine.GetFullRender() });
        });
    }

    /// <summary>
    /// Find a file by searching up from the base directory.
    /// </summary>
    private static string? FindFile(string basePath, string relativePath)
    {
        // Try relative to base path
        var path = Path.Combine(basePath, relativePath);
        if (File.Exists(path)) return path;

        // Try walking up directories
        var dir = basePath;
        for (int i = 0; i < 5; i++)
        {
            dir = Path.GetDirectoryName(dir);
            if (dir == null) break;
            path = Path.Combine(dir, relativePath);
            if (File.Exists(path)) return path;
        }

        // Try current working directory
        path = Path.Combine(Directory.GetCurrentDirectory(), relativePath);
        if (File.Exists(path)) return path;

        return null;
    }
}
