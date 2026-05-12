using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Api;

/// <summary>
/// Singleton wrapping the DebugEngine lifecycle. Manages loading, resetting,
/// and storing session state for the single-user web debugger.
/// </summary>
public class DebugSessionManager
{
    public DebugEngine? Engine { get; private set; }
    public bool IsLoaded => Engine != null;

    // Stored for reset capability
    public string? TemplateSource { get; private set; }
    public string? DataContent { get; private set; }
    public string? DataFormat { get; private set; }

    private readonly List<(int line, string? condition)> _savedBreakpoints = new();
    private readonly List<string> _savedWatches = new();

    /// <summary>
    /// Load from raw content strings.
    /// </summary>
    public void Load(string templateContent, string dataContent, string format)
    {
        // Validate template syntax and root-level content rules
        var parser = new TemplateParser();
        var validation = parser.ValidateSyntax(templateContent);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        TemplateSource = templateContent;
        DataContent = dataContent;
        DataFormat = format;

        var loader = new InputDataLoader();
        var (hash, origins) = loader.LoadFromString(dataContent, format);
        Engine = new DebugEngine(templateContent, hash, origins);

        // Re-add any saved breakpoints and watches
        RestoreBreakpointsAndWatches();
    }

    /// <summary>
    /// Load from file paths.
    /// </summary>
    public void LoadFromFiles(string templatePath, string dataPath, string? format)
    {
        var templateContent = File.ReadAllText(templatePath);
        var dataContent = File.ReadAllText(dataPath);
        var effectiveFormat = format ?? Path.GetExtension(dataPath).TrimStart('.').ToUpperInvariant();
        if (string.IsNullOrEmpty(effectiveFormat)) effectiveFormat = "JSON";

        Load(templateContent, dataContent, effectiveFormat);
    }

    /// <summary>
    /// Reset execution — recreate engine from stored strings, re-add breakpoints and watches.
    /// </summary>
    public void Reset()
    {
        if (TemplateSource == null || DataContent == null || DataFormat == null)
            return;

        // Save current breakpoints and watches before reset
        SaveBreakpointsAndWatches();

        var loader = new InputDataLoader();
        var (hash, origins) = loader.LoadFromString(DataContent, DataFormat);
        Engine = new DebugEngine(TemplateSource, hash, origins);

        RestoreBreakpointsAndWatches();
    }

    private void SaveBreakpointsAndWatches()
    {
        if (Engine == null) return;

        _savedBreakpoints.Clear();
        foreach (var bp in Engine.Breakpoints)
            _savedBreakpoints.Add((bp.Line, bp.Condition));

        _savedWatches.Clear();
        foreach (var w in Engine.Watches)
            _savedWatches.Add(w.Expression);
    }

    private void RestoreBreakpointsAndWatches()
    {
        if (Engine == null) return;

        foreach (var (line, condition) in _savedBreakpoints)
            Engine.AddBreakpoint(line, condition);

        foreach (var expr in _savedWatches)
            Engine.AddWatch(expr);
    }
}
