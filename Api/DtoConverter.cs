using DotLiquid;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Api;

/// <summary>
/// Static conversion methods to transform engine models into API DTOs.
/// </summary>
public static class DtoConverter
{
    /// <summary>
    /// Build the master FullStateDto from the session manager, called after every mutating action.
    /// </summary>
    public static FullStateDto BuildFullState(DebugSessionManager manager)
    {
        if (!manager.IsLoaded || manager.Engine == null)
        {
            return new FullStateDto(
                IsLoaded: false,
                TemplateSource: null,
                Elements: new List<TemplateElementDto>(),
                State: null,
                Breakpoints: new List<BreakpointDto>(),
                Watches: new List<WatchDto>()
            );
        }

        var engine = manager.Engine;

        return new FullStateDto(
            IsLoaded: true,
            TemplateSource: engine.TemplateSource,
            Elements: engine.Elements.Select((e, i) => ConvertElement(e, i)).ToList(),
            State: ConvertState(engine.State, engine),
            Breakpoints: engine.Breakpoints.Select(ConvertBreakpoint).ToList(),
            Watches: engine.Watches.Select(ConvertWatch).ToList()
        );
    }

    public static DebugStateDto ConvertState(DebugState state, Engine.DebugEngine engine)
    {
        return new DebugStateDto(
            CurrentElementIndex: state.CurrentElementIndex,
            CurrentLine: state.CurrentLine,
            CurrentExpression: state.CurrentExpression,
            CurrentElementType: state.CurrentElementType.ToString(),
            OutputSoFar: state.OutputSoFar,
            LastOutputChunk: state.LastOutputChunk,
            ScopeStack: state.ScopeStack.ToList(),
            IsComplete: state.IsComplete,
            ErrorMessage: state.ErrorMessage,
            Variables: state.Variables.Values
                .OrderBy(v => v.ScopeDepth)
                .ThenBy(v => v.Name, StringComparer.OrdinalIgnoreCase)
                .Select(ConvertVariable)
                .ToList()
        );
    }

    public static VariableDto ConvertVariable(TrackedVariable variable)
    {
        return new VariableDto(
            Name: variable.Name,
            CurrentValue: FormatValue(variable.CurrentValue),
            RawValue: SerializeRawValue(variable.CurrentValue, 0),
            TypeName: variable.TypeName,
            ScopeTag: variable.ScopeTag,
            ScopeDepth: variable.ScopeDepth,
            Origin: ConvertOrigin(variable.Origin),
            Transformations: variable.Transformations.Select(ConvertTransformation).ToList()
        );
    }

    public static OriginDto ConvertOrigin(ValueOrigin origin)
    {
        return new OriginDto(
            SourcePath: origin.SourcePath,
            SourceFormat: origin.SourceFormat,
            OriginalValue: FormatValue(origin.OriginalValue),
            SourceLineNumber: origin.SourceLineNumber
        );
    }

    public static TransformationDto ConvertTransformation(ValueTransformation t)
    {
        return new TransformationDto(
            TransformationType: t.TransformationType,
            Description: t.Description,
            ValueBefore: FormatValue(t.ValueBefore),
            ValueAfter: FormatValue(t.ValueAfter),
            AtLine: t.AtLine,
            Expression: t.Expression
        );
    }

    public static TemplateElementDto ConvertElement(TemplateElement element, int index)
    {
        return new TemplateElementDto(
            Index: index,
            LineNumber: element.LineNumber,
            ColumnStart: element.ColumnStart,
            ColumnEnd: element.ColumnEnd,
            RawText: element.RawText,
            ElementType: element.ElementType.ToString(),
            TagName: element.TagName,
            Expression: element.Expression,
            Depth: element.Depth,
            ParentIndex: element.ParentIndex,
            ChildIndices: element.ChildIndices.ToList()
        );
    }

    public static BreakpointDto ConvertBreakpoint(Breakpoint bp)
    {
        return new BreakpointDto(
            Id: bp.Id,
            Line: bp.Line,
            Condition: bp.Condition,
            IsEnabled: bp.IsEnabled,
            HitCount: bp.HitCount
        );
    }

    public static WatchDto ConvertWatch(WatchExpression w)
    {
        return new WatchDto(
            Id: w.Id,
            Expression: w.Expression,
            CurrentValue: FormatValue(w.LastValue),
            TypeName: w.LastValue?.GetType().Name ?? "null",
            HasChanged: w.HasChanged
        );
    }

    /// <summary>
    /// Safe string representation for display. Handles Hash, List, primitives, null.
    /// </summary>
    public static string FormatValue(object? value)
    {
        return value switch
        {
            null => "nil",
            bool b => b.ToString().ToLowerInvariant(),
            string s => s,
            DateTime dt => dt.ToString("yyyy-MM-ddTHH:mm:ss"),
            DateTimeOffset dto => dto.ToString("yyyy-MM-ddTHH:mm:sszzz"),
            Hash h => $"{{Hash: {h.Keys.Count()} keys}}",
            IList<object> l => $"[Array: {l.Count} items]",
            _ => value.ToString() ?? "nil"
        };
    }

    /// <summary>
    /// Recursive object → dict/list conversion for tree expansion in the UI.
    /// Depth-limited to 10.
    /// </summary>
    public static object? SerializeRawValue(object? value, int depth)
    {
        if (depth >= 10) return "[max depth]";

        return value switch
        {
            null => null,
            string s => s,
            bool b => b,
            DateTime dt => dt.ToString("yyyy-MM-ddTHH:mm:ss"),
            DateTimeOffset dto => dto.ToString("yyyy-MM-ddTHH:mm:sszzz"),
            int i => i,
            long l => l,
            double d => d,
            float f => f,
            decimal dec => dec,
            Hash hash => hash.Keys.ToDictionary(
                k => k,
                k => SerializeRawValue(hash[k], depth + 1)
            ),
            IList<object> list => list.Select(item => SerializeRawValue(item, depth + 1)).ToList(),
            IDictionary<string, object> dict => dict.ToDictionary(
                kv => kv.Key,
                kv => SerializeRawValue(kv.Value, depth + 1)
            ),
            _ => value.ToString()
        };
    }
}
