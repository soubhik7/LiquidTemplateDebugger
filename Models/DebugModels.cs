namespace LiquidTemplateDebugger.Models;

/// <summary>
/// Represents the origin of a variable value - where in the source data it came from.
/// </summary>
public class ValueOrigin
{
    public string SourcePath { get; set; } = string.Empty;
    public string SourceFormat { get; set; } = string.Empty; // "JSON", "XML", "inline"
    public object? OriginalValue { get; set; }
    public int? SourceLineNumber { get; set; }
}

/// <summary>
/// Tracks a variable through its lifecycle, including transformations.
/// </summary>
public class TrackedVariable
{
    public string Name { get; set; } = string.Empty;
    public object? CurrentValue { get; set; }
    public string TypeName => CurrentValue?.GetType().Name ?? "null";
    public ValueOrigin Origin { get; set; } = new();
    public List<ValueTransformation> Transformations { get; } = new();
    public int ScopeDepth { get; set; }
    public string ScopeTag { get; set; } = "root"; // "root", "for", "capture", "assign", etc.
}

/// <summary>
/// Records a single transformation applied to a value.
/// </summary>
public class ValueTransformation
{
    public string TransformationType { get; set; } = string.Empty; // "filter", "assign", "capture", "for"
    public string Description { get; set; } = string.Empty;
    public object? ValueBefore { get; set; }
    public object? ValueAfter { get; set; }
    public int AtLine { get; set; }
    public string Expression { get; set; } = string.Empty;
}

/// <summary>
/// Represents a breakpoint set by the user.
/// </summary>
public class Breakpoint
{
    public int Id { get; set; }
    public int Line { get; set; }
    public string? Condition { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int HitCount { get; set; }
}

/// <summary>
/// Represents one parsed element of a Liquid template.
/// </summary>
public class TemplateElement
{
    public int LineNumber { get; set; }
    public int ColumnStart { get; set; }
    public int ColumnEnd { get; set; }
    public string RawText { get; set; } = string.Empty;
    public TemplateElementType ElementType { get; set; }
    public string? TagName { get; set; }
    public string? Expression { get; set; }
    public int Depth { get; set; }
    public int? ParentIndex { get; set; }
    public List<int> ChildIndices { get; } = new();
}

public enum TemplateElementType
{
    Literal,
    Output,       // {{ expression }}
    Tag,          // {% tag %}
    Comment,      // {% comment %}...{% endcomment %}
    RawBlock      // {% raw %}...{% endraw %}
}

/// <summary>
/// The current state of the debugger at a specific execution point.
/// </summary>
public class DebugState
{
    public int CurrentElementIndex { get; set; }
    public int CurrentLine { get; set; }
    public string CurrentExpression { get; set; } = string.Empty;
    public TemplateElementType CurrentElementType { get; set; }
    public Dictionary<string, TrackedVariable> Variables { get; } = new(StringComparer.OrdinalIgnoreCase);
    public string OutputSoFar { get; set; } = string.Empty;
    public string? LastOutputChunk { get; set; }
    public List<string> ScopeStack { get; } = new() { "root" };
    public bool IsComplete { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// A watch expression set by the user.
/// </summary>
public class WatchExpression
{
    public int Id { get; set; }
    public string Expression { get; set; } = string.Empty;
    public string? DisplayExpression { get; set; }
    public object? LastValue { get; set; }
    public bool HasChanged { get; set; }
}

public enum StepAction
{
    StepNext,     // Execute next element at current depth
    StepInto,     // Step into nested block (for, if, etc.)
    StepOver,     // Execute entire block and stop after
    StepOut,      // Execute until current scope ends
    Continue,     // Continue until breakpoint or end
    RunToLine     // Run to a specific line
}
