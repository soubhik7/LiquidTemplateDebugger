using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine.Interfaces;

/// <summary>
/// Core debugging engine interface for template execution and debugging operations.
/// </summary>
public interface IDebugEngine
{
    /// <summary>
    /// Current execution state of the debugger.
    /// </summary>
    DebugState State { get; }
    
    /// <summary>
    /// All parsed template elements.
    /// </summary>
    List<TemplateElement> Elements { get; }
    
    /// <summary>
    /// All active breakpoints.
    /// </summary>
    List<Breakpoint> Breakpoints { get; }
    
    /// <summary>
    /// All active watch expressions.
    /// </summary>
    List<WatchExpression> Watches { get; }
    
    /// <summary>
    /// Whether execution has completed.
    /// </summary>
    bool IsComplete { get; }
    
    /// <summary>
    /// Execute one or more steps based on the action.
    /// </summary>
    void Step(StepAction action, int? targetLine = null);
    
    /// <summary>
    /// Reset execution to the beginning.
    /// </summary>
    void Reset();
    
    /// <summary>
    /// Add a breakpoint at the specified line.
    /// </summary>
    Breakpoint AddBreakpoint(int line, string? condition = null);
    
    /// <summary>
    /// Remove a breakpoint by ID.
    /// </summary>
    bool RemoveBreakpoint(int id);
    
    /// <summary>
    /// Toggle a breakpoint's enabled state.
    /// </summary>
    void ToggleBreakpoint(int id);
    
    /// <summary>
    /// Check if execution should break at the specified line.
    /// </summary>
    bool ShouldBreakAt(int line);
    
    /// <summary>
    /// Add a watch expression.
    /// </summary>
    WatchExpression AddWatch(string expression);
    
    /// <summary>
    /// Remove a watch expression by ID.
    /// </summary>
    bool RemoveWatch(int id);
    
    /// <summary>
    /// Update all watch expressions with current values.
    /// </summary>
    void UpdateWatches();
    
    /// <summary>
    /// Evaluate a Liquid expression in the current context.
    /// </summary>
    object? Evaluate(string expression);
    
    /// <summary>
    /// Get the full rendered output using DotLiquid's standard rendering.
    /// </summary>
    string GetFullRender();
    
    /// <summary>
    /// Get a tracked variable by name.
    /// </summary>
    TrackedVariable? GetVariable(string name);
    
    /// <summary>
    /// Get all tracked variables.
    /// </summary>
    Dictionary<string, TrackedVariable> GetAllVariables();
}


