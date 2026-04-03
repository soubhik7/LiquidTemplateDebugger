using System.Text.RegularExpressions;
using DotLiquid;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Core debugging engine that executes Liquid template elements one at a time,
/// tracking variable state, scope, and data origin at each step.
/// </summary>
public class DebugEngine
{
    private readonly List<TemplateElement> _elements;
    private readonly string _templateSource;
    private readonly Hash _inputData;
    private readonly Dictionary<string, ValueOrigin> _origins;
    private readonly DebugState _state;
    private readonly List<Breakpoint> _breakpoints = new();
    private readonly List<WatchExpression> _watches = new();
    private readonly Dictionary<string, object?> _localAssignments = new(StringComparer.OrdinalIgnoreCase);
    private int _nextBreakpointId = 1;
    private int _nextWatchId = 1;

    // For loop state tracking
    private readonly Stack<ForLoopState> _forLoopStack = new();

    // Case/when value tracking
    private readonly Stack<object?> _caseValueStack = new();

    // Conditional execution stack: tracks whether the current code path is active.
    // Each entry is (executing, branchTaken).
    // 'executing' = should elements in this scope be run?
    // 'branchTaken' = has any branch (if/elsif) in this conditional already matched?
    private readonly Stack<(bool executing, bool branchTaken)> _executionStack = new();

    /// <summary>
    /// Returns true if we should currently be executing elements (all enclosing scopes are active).
    /// </summary>
    private bool IsExecuting => _executionStack.Count == 0 || _executionStack.All(e => e.executing);

    public DebugState State => _state;
    public IReadOnlyList<TemplateElement> Elements => _elements;
    public IReadOnlyList<Breakpoint> Breakpoints => _breakpoints;
    public IReadOnlyList<WatchExpression> Watches => _watches;
    public string TemplateSource => _templateSource;
    public Hash InputData => _inputData;
    public Dictionary<string, ValueOrigin> Origins => _origins;

    private class ForLoopState
    {
        public string VariableName { get; set; } = string.Empty;
        public string CollectionExpression { get; set; } = string.Empty;
        public List<object> Items { get; set; } = new();
        public int CurrentIndex { get; set; }
        public int LoopStartElementIndex { get; set; }
        public int LoopEndElementIndex { get; set; }
    }

    public DebugEngine(string templateSource, Hash inputData, Dictionary<string, ValueOrigin> origins)
    {
        _templateSource = templateSource;
        _inputData = inputData;
        _origins = origins;
        _state = new DebugState();

        var parser = new TemplateParser();
        _elements = parser.Parse(templateSource);

        // Initialize variables from input data
        InitializeVariablesFromInput(inputData, "", origins);
    }

    private void InitializeVariablesFromInput(Hash hash, string prefix, Dictionary<string, ValueOrigin> origins)
    {
        foreach (var key in hash.Keys)
        {
            var path = string.IsNullOrEmpty(prefix) ? key : $"{prefix}.{key}";
            var value = hash[key];

            var origin = origins.ContainsKey(path) ? origins[path] : new ValueOrigin
            {
                SourcePath = path,
                SourceFormat = "input",
                OriginalValue = value
            };

            _state.Variables[key] = new TrackedVariable
            {
                Name = key,
                CurrentValue = value,
                Origin = origin,
                ScopeDepth = 0,
                ScopeTag = "input"
            };
        }
    }

    /// <summary>
    /// Execute one step and return the updated state.
    /// </summary>
    public DebugState Step(StepAction action = StepAction.StepNext, int? targetLine = null)
    {
        if (_state.IsComplete || _state.CurrentElementIndex >= _elements.Count)
        {
            _state.IsComplete = true;
            return _state;
        }

        switch (action)
        {
            case StepAction.StepNext:
                ExecuteCurrentElement();
                AdvanceToNext();
                break;

            case StepAction.StepInto:
                ExecuteCurrentElement();
                AdvanceStepInto();
                break;

            case StepAction.StepOver:
                ExecuteStepOver();
                break;

            case StepAction.StepOut:
                ExecuteStepOut();
                break;

            case StepAction.Continue:
                ExecuteUntilBreakpointOrEnd();
                break;

            case StepAction.RunToLine:
                if (targetLine.HasValue)
                    ExecuteUntilLine(targetLine.Value);
                break;
        }

        UpdateWatches();
        return _state;
    }

    private void ExecuteCurrentElement()
    {
        if (_state.CurrentElementIndex >= _elements.Count)
        {
            _state.IsComplete = true;
            return;
        }

        var element = _elements[_state.CurrentElementIndex];
        _state.CurrentLine = element.LineNumber;
        _state.CurrentExpression = element.RawText.Trim();
        _state.CurrentElementType = element.ElementType;
        _state.LastOutputChunk = null;

        try
        {
            // Tags that control flow (if/else/elsif/endif/unless/endunless/case/when/endcase)
            // must always be processed even when skipping, so the execution stack stays in sync.
            if (element.ElementType == TemplateElementType.Tag)
            {
                var tagName = element.TagName?.ToLowerInvariant() ?? "";
                if (IsFlowControlTag(tagName))
                {
                    ExecuteTag(element);
                    return;
                }
            }

            // For all other elements, skip if we're in a false branch
            if (!IsExecuting)
                return;

            switch (element.ElementType)
            {
                case TemplateElementType.Literal:
                    ExecuteLiteral(element);
                    break;
                case TemplateElementType.Output:
                    ExecuteOutput(element);
                    break;
                case TemplateElementType.Tag:
                    ExecuteTag(element);
                    break;
                case TemplateElementType.Comment:
                    // Comments produce no output; just skip
                    break;
                case TemplateElementType.RawBlock:
                    // Raw blocks are output as-is
                    break;
            }
        }
        catch (Exception ex)
        {
            _state.ErrorMessage = $"Error at line {element.LineNumber}: {ex.Message}";
        }
    }

    /// <summary>
    /// Returns true for tags that affect conditional flow and must always be evaluated
    /// even when inside a skipped branch, to keep the execution stack balanced.
    /// </summary>
    private static bool IsFlowControlTag(string tagName)
    {
        return tagName is "if" or "unless" or "elsif" or "else" or "endif" or "endunless"
            or "case" or "when" or "endcase";
    }

    private void ExecuteLiteral(TemplateElement element)
    {
        _state.OutputSoFar += element.RawText;
        _state.LastOutputChunk = element.RawText;
    }

    private void ExecuteOutput(TemplateElement element)
    {
        var expression = element.Expression ?? "";
        var result = EvaluateExpression(expression);
        var rendered = result?.ToString() ?? "";

        _state.OutputSoFar += rendered;
        _state.LastOutputChunk = rendered;
    }

    private void ExecuteTag(TemplateElement element)
    {
        var tagName = element.TagName?.ToLowerInvariant() ?? "";
        var args = element.Expression ?? "";

        switch (tagName)
        {
            // --- Flow control tags (always processed, even when skipping) ---
            case "if":
                ExecuteIf(args, element);
                break;
            case "unless":
                ExecuteUnless(args, element);
                break;
            case "elsif":
                ExecuteElsif(args, element);
                break;
            case "else":
                ExecuteElse(element);
                break;
            case "endif":
            case "endunless":
                ExecuteEndIf(element);
                break;
            case "case":
                ExecuteCase(args, element);
                break;
            case "when":
                ExecuteWhen(args, element);
                break;
            case "endcase":
                ExecuteEndCase(element);
                break;

            // --- All other tags: only run if we're in an active branch ---
            case "assign":
                ExecuteAssign(args, element);
                break;
            case "capture":
                ExecuteCapture(args, element);
                break;
            case "for":
                ExecuteForStart(args, element);
                break;
            case "endfor":
                ExecuteForEnd(element);
                break;
            case "endcapture":
                if (_state.ScopeStack.Count > 1)
                    _state.ScopeStack.RemoveAt(_state.ScopeStack.Count - 1);
                break;
            case "increment":
                ExecuteIncrement(args, element);
                break;
            case "decrement":
                ExecuteDecrement(args, element);
                break;
            case "break":
            case "continue":
                // Loop control
                break;
        }
    }

    private void ExecuteAssign(string args, TemplateElement element)
    {
        var match = Regex.Match(args, @"^(\w+)\s*=\s*(.+)$", RegexOptions.Singleline);
        if (!match.Success) return;

        var varName = match.Groups[1].Value;
        var expression = match.Groups[2].Value.Trim();
        var value = EvaluateExpression(expression);

        var previousValue = _state.Variables.ContainsKey(varName) ? _state.Variables[varName].CurrentValue : null;
        var originPath = TryResolveOriginPath(expression);

        _state.Variables[varName] = new TrackedVariable
        {
            Name = varName,
            CurrentValue = value,
            Origin = originPath != null && _origins.ContainsKey(originPath)
                ? _origins[originPath]
                : new ValueOrigin { SourcePath = $"assign@line:{element.LineNumber}", SourceFormat = "template", OriginalValue = value },
            ScopeDepth = _state.ScopeStack.Count - 1,
            ScopeTag = "assign"
        };

        _state.Variables[varName].Transformations.Add(new ValueTransformation
        {
            TransformationType = "assign",
            Description = $"Assigned via: {args.Trim()}",
            ValueBefore = previousValue,
            ValueAfter = value,
            AtLine = element.LineNumber,
            Expression = args.Trim()
        });

        _localAssignments[varName] = value;
    }

    private void ExecuteCapture(string args, TemplateElement element)
    {
        var varName = args.Trim();
        _state.ScopeStack.Add($"capture:{varName}");

        // Find the endcapture to collect content
        var capturedContent = new System.Text.StringBuilder();
        int depth = 1;
        int idx = _state.CurrentElementIndex + 1;

        while (idx < _elements.Count && depth > 0)
        {
            var el = _elements[idx];
            if (el.TagName?.ToLowerInvariant() == "capture") depth++;
            else if (el.TagName?.ToLowerInvariant() == "endcapture") depth--;

            if (depth > 0)
            {
                if (el.ElementType == TemplateElementType.Literal)
                    capturedContent.Append(el.RawText);
                else if (el.ElementType == TemplateElementType.Output)
                {
                    var val = EvaluateExpression(el.Expression ?? "");
                    capturedContent.Append(val?.ToString() ?? "");
                }
            }
            idx++;
        }

        var captured = capturedContent.ToString();
        _state.Variables[varName] = new TrackedVariable
        {
            Name = varName,
            CurrentValue = captured,
            Origin = new ValueOrigin { SourcePath = $"capture@line:{element.LineNumber}", SourceFormat = "template", OriginalValue = captured },
            ScopeDepth = _state.ScopeStack.Count - 1,
            ScopeTag = "capture"
        };

        // Skip forward past the endcapture so elements aren't executed again
        // idx is already 1 past the endcapture element
        _state.CurrentElementIndex = idx - 1; // Point to endcapture; AdvanceToNext will move past it
    }

    // ==================== Conditional Flow Control ====================

    private void ExecuteIf(string args, TemplateElement element)
    {
        var condition = args.Trim();
        bool result;

        // If we're already skipping an outer block, push a "skip" frame and don't evaluate
        if (!IsExecuting)
        {
            _executionStack.Push((false, true)); // skip, mark as "branch taken" so else won't fire
            _state.ScopeStack.Add($"if:{condition}=skipped");
            return;
        }

        result = EvaluateCondition(condition);
        _executionStack.Push((result, result)); // executing if true, branchTaken if true
        _state.ScopeStack.Add($"if:{condition}={result}");
    }

    private void ExecuteUnless(string args, TemplateElement element)
    {
        var condition = args.Trim();
        bool result;

        if (!IsExecuting)
        {
            _executionStack.Push((false, true));
            _state.ScopeStack.Add($"unless:{condition}=skipped");
            return;
        }

        result = !EvaluateCondition(condition); // unless is negated if
        _executionStack.Push((result, result));
        _state.ScopeStack.Add($"unless:{condition}={result}");
    }

    private void ExecuteElsif(string args, TemplateElement element)
    {
        if (_executionStack.Count == 0) return;

        var (_, branchTaken) = _executionStack.Pop();

        // If a previous branch was already taken, skip this one
        if (branchTaken)
        {
            _executionStack.Push((false, true));
            return;
        }

        // Check if we're inside a skipped outer scope
        // (need to check remaining stack)
        if (!IsExecutingWithout()) // all other frames are executing
        {
            _executionStack.Push((false, false));
            return;
        }

        var condition = args.Trim();
        var result = EvaluateCondition(condition);
        _executionStack.Push((result, result));
    }

    private void ExecuteElse(TemplateElement element)
    {
        if (_executionStack.Count == 0) return;

        var (_, branchTaken) = _executionStack.Pop();

        // If a previous branch was already taken, skip the else
        if (branchTaken)
        {
            _executionStack.Push((false, true));
            return;
        }

        // Check if outer scopes are active
        if (!IsExecutingWithout())
        {
            _executionStack.Push((false, false));
            return;
        }

        // No branch taken yet and outer scope is active → execute else
        _executionStack.Push((true, true));
    }

    private void ExecuteEndIf(TemplateElement element)
    {
        if (_executionStack.Count > 0)
            _executionStack.Pop();

        if (_state.ScopeStack.Count > 1)
            _state.ScopeStack.RemoveAt(_state.ScopeStack.Count - 1);
    }

    private void ExecuteCase(string args, TemplateElement element)
    {
        var expr = args.Trim();

        if (!IsExecuting)
        {
            // Nested inside a skipped block
            _executionStack.Push((false, true));
            _state.ScopeStack.Add($"case:{expr}=skipped");
            return;
        }

        var value = EvaluateExpression(expr);
        // Store the case value for when tags to compare against
        // We push a "skip" frame; 'when' tags will activate the right branch
        _executionStack.Push((false, false));
        _state.ScopeStack.Add($"case:{expr}");

        // Store the case value for when evaluation
        _caseValueStack.Push(value);
    }

    private void ExecuteWhen(string args, TemplateElement element)
    {
        if (_executionStack.Count == 0) return;

        var (_, branchTaken) = _executionStack.Pop();

        if (branchTaken)
        {
            // A previous when already matched
            _executionStack.Push((false, true));
            return;
        }

        if (!IsExecutingWithout() || _caseValueStack.Count == 0)
        {
            _executionStack.Push((false, false));
            return;
        }

        var caseValue = _caseValueStack.Peek();
        var whenValue = EvaluateExpression(args.Trim());
        var matches = Equals(caseValue, whenValue);

        _executionStack.Push((matches, matches));
    }

    private void ExecuteEndCase(TemplateElement element)
    {
        if (_executionStack.Count > 0)
            _executionStack.Pop();
        if (_caseValueStack.Count > 0)
            _caseValueStack.Pop();

        if (_state.ScopeStack.Count > 1)
            _state.ScopeStack.RemoveAt(_state.ScopeStack.Count - 1);
    }

    /// <summary>
    /// Check if all frames EXCEPT the top are executing.
    /// Used by elsif/else to see if the outer scope is active.
    /// </summary>
    private bool IsExecutingWithout()
    {
        return _executionStack.All(e => e.executing);
    }

    private void ExecuteForStart(string args, TemplateElement element)
    {
        var match = Regex.Match(args, @"^(\w+)\s+in\s+(.+)$");
        if (!match.Success) return;

        var varName = match.Groups[1].Value;
        var collectionExpr = match.Groups[2].Value.Trim();
        var collection = EvaluateExpression(collectionExpr);

        var items = new List<object>();
        if (collection is IEnumerable<object> enumerable)
            items.AddRange(enumerable);
        else if (collection is System.Collections.IEnumerable ie)
        {
            foreach (var item in ie)
                items.Add(item);
        }

        // Find the matching endfor
        int endForIdx = FindMatchingEndTag(_state.CurrentElementIndex, "for", "endfor");

        var loopState = new ForLoopState
        {
            VariableName = varName,
            CollectionExpression = collectionExpr,
            Items = items,
            CurrentIndex = 0,
            LoopStartElementIndex = _state.CurrentElementIndex,
            LoopEndElementIndex = endForIdx
        };

        _forLoopStack.Push(loopState);

        if (items.Count > 0)
        {
            SetForLoopVariable(loopState);
            _state.ScopeStack.Add($"for:{varName}");
        }
    }

    private void ExecuteForEnd(TemplateElement element)
    {
        if (_forLoopStack.Count == 0)
        {
            if (_state.ScopeStack.Count > 1)
                _state.ScopeStack.RemoveAt(_state.ScopeStack.Count - 1);
            return;
        }

        var loopState = _forLoopStack.Peek();
        loopState.CurrentIndex++;

        if (loopState.CurrentIndex < loopState.Items.Count)
        {
            // Continue loop - jump back to start
            SetForLoopVariable(loopState);
            _state.CurrentElementIndex = loopState.LoopStartElementIndex; // Will be incremented by AdvanceToNext
        }
        else
        {
            // Loop complete
            _forLoopStack.Pop();
            if (_state.ScopeStack.Count > 1)
                _state.ScopeStack.RemoveAt(_state.ScopeStack.Count - 1);

            // Clean up loop variable
            _state.Variables.Remove(loopState.VariableName);
            _state.Variables.Remove("forloop");
        }
    }

    private void SetForLoopVariable(ForLoopState loopState)
    {
        var currentItem = loopState.Items[loopState.CurrentIndex];
        var originPath = $"{loopState.CollectionExpression}[{loopState.CurrentIndex}]";

        _state.Variables[loopState.VariableName] = new TrackedVariable
        {
            Name = loopState.VariableName,
            CurrentValue = currentItem,
            Origin = _origins.ContainsKey(originPath) ? _origins[originPath] : new ValueOrigin
            {
                SourcePath = originPath,
                SourceFormat = "loop",
                OriginalValue = currentItem
            },
            ScopeDepth = _state.ScopeStack.Count,
            ScopeTag = "for"
        };

        // Set forloop helper object
        var forloop = Hash.FromDictionary(new Dictionary<string, object>
        {
            ["index"] = loopState.CurrentIndex + 1,
            ["index0"] = loopState.CurrentIndex,
            ["first"] = loopState.CurrentIndex == 0,
            ["last"] = loopState.CurrentIndex == loopState.Items.Count - 1,
            ["length"] = loopState.Items.Count,
            ["rindex"] = loopState.Items.Count - loopState.CurrentIndex,
            ["rindex0"] = loopState.Items.Count - loopState.CurrentIndex - 1,
        });

        _state.Variables["forloop"] = new TrackedVariable
        {
            Name = "forloop",
            CurrentValue = forloop,
            Origin = new ValueOrigin { SourcePath = "forloop", SourceFormat = "builtin" },
            ScopeDepth = _state.ScopeStack.Count,
            ScopeTag = "for"
        };
    }

    private void ExecuteIncrement(string args, TemplateElement element)
    {
        var varName = args.Trim();
        int current = 0;
        if (_state.Variables.ContainsKey(varName) && _state.Variables[varName].CurrentValue is int intVal)
            current = intVal;
        else if (_state.Variables.ContainsKey(varName) && _state.Variables[varName].CurrentValue is long longVal)
            current = (int)longVal;

        _state.OutputSoFar += current.ToString();
        _state.LastOutputChunk = current.ToString();

        _state.Variables[varName] = new TrackedVariable
        {
            Name = varName,
            CurrentValue = current + 1,
            Origin = new ValueOrigin { SourcePath = $"increment@line:{element.LineNumber}", SourceFormat = "template" },
            ScopeDepth = 0,
            ScopeTag = "increment"
        };
    }

    private void ExecuteDecrement(string args, TemplateElement element)
    {
        var varName = args.Trim();
        int current = 0;
        if (_state.Variables.ContainsKey(varName) && _state.Variables[varName].CurrentValue is int intVal)
            current = intVal;
        else if (_state.Variables.ContainsKey(varName) && _state.Variables[varName].CurrentValue is long longVal)
            current = (int)longVal;

        current--;
        _state.OutputSoFar += current.ToString();
        _state.LastOutputChunk = current.ToString();

        _state.Variables[varName] = new TrackedVariable
        {
            Name = varName,
            CurrentValue = current,
            Origin = new ValueOrigin { SourcePath = $"decrement@line:{element.LineNumber}", SourceFormat = "template" },
            ScopeDepth = 0,
            ScopeTag = "decrement"
        };
    }

    private object? EvaluateExpression(string expression)
    {
        if (string.IsNullOrWhiteSpace(expression))
            return null;

        // Handle string literals
        if ((expression.StartsWith('"') && expression.EndsWith('"')) ||
            (expression.StartsWith('\'') && expression.EndsWith('\'')))
        {
            return expression[1..^1];
        }

        // Handle numeric literals
        if (long.TryParse(expression, out var longResult))
            return longResult;
        if (double.TryParse(expression, out var doubleResult))
            return doubleResult;

        // Handle boolean literals
        if (expression.Equals("true", StringComparison.OrdinalIgnoreCase))
            return true;
        if (expression.Equals("false", StringComparison.OrdinalIgnoreCase))
            return false;
        if (expression.Equals("nil", StringComparison.OrdinalIgnoreCase) ||
            expression.Equals("null", StringComparison.OrdinalIgnoreCase))
            return null;

        // Handle filters: expression | filter1 | filter2
        var parts = SplitByPipes(expression);
        var baseExpr = parts[0].Trim();
        var value = ResolveVariable(baseExpr);

        for (int i = 1; i < parts.Count; i++)
        {
            value = ApplyFilter(value, parts[i].Trim());
        }

        return value;
    }

    private List<string> SplitByPipes(string expression)
    {
        var parts = new List<string>();
        int depth = 0;
        bool inString = false;
        char stringChar = '"';
        int start = 0;

        for (int i = 0; i < expression.Length; i++)
        {
            var c = expression[i];
            if (inString)
            {
                if (c == stringChar) inString = false;
                continue;
            }

            if (c == '"' || c == '\'')
            {
                inString = true;
                stringChar = c;
            }
            else if (c == '(') depth++;
            else if (c == ')') depth--;
            else if (c == '|' && depth == 0)
            {
                parts.Add(expression[start..i]);
                start = i + 1;
            }
        }

        parts.Add(expression[start..]);
        return parts;
    }

    private object? ResolveVariable(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;

        // Handle string/numeric/bool literals
        if ((path.StartsWith('"') && path.EndsWith('"')) || (path.StartsWith('\'') && path.EndsWith('\'')))
            return path[1..^1];
        if (long.TryParse(path, out var l)) return l;
        if (double.TryParse(path, out var d)) return d;
        if (path.Equals("true", StringComparison.OrdinalIgnoreCase)) return true;
        if (path.Equals("false", StringComparison.OrdinalIgnoreCase)) return false;
        if (path.Equals("nil", StringComparison.OrdinalIgnoreCase)) return null;

        var segments = path.Split('.');
        var rootName = segments[0].Trim();

        object? current = null;

        // Check tracked variables first
        if (_state.Variables.ContainsKey(rootName))
            current = _state.Variables[rootName].CurrentValue;
        else if (_inputData.ContainsKey(rootName))
            current = _inputData[rootName];

        // Navigate nested paths
        for (int i = 1; i < segments.Length && current != null; i++)
        {
            var segment = segments[i].Trim();

            // Handle array index: items[0]
            var arrMatch = Regex.Match(segment, @"^(\w+)\[(\d+)\]$");
            if (arrMatch.Success)
            {
                segment = arrMatch.Groups[1].Value;
                var idx = int.Parse(arrMatch.Groups[2].Value);
                current = GetMember(current, segment);
                if (current is IList<object> list && idx < list.Count)
                    current = list[idx];
                else if (current is System.Collections.IList ilist && idx < ilist.Count)
                    current = ilist[idx];
                continue;
            }

            current = GetMember(current, segment);
        }

        // Handle array index on root: items[0]
        var rootArrMatch = Regex.Match(rootName, @"^(\w+)\[(\d+)\]$");
        if (rootArrMatch.Success && current == null)
        {
            var name = rootArrMatch.Groups[1].Value;
            var idx = int.Parse(rootArrMatch.Groups[2].Value);
            if (_state.Variables.ContainsKey(name))
                current = _state.Variables[name].CurrentValue;
            else if (_inputData.ContainsKey(name))
                current = _inputData[name];

            if (current is IList<object> list && idx < list.Count)
                current = list[idx];
            else if (current is System.Collections.IList ilist && idx < ilist.Count)
                current = ilist[idx];
        }

        return current;
    }

    private static object? GetMember(object? obj, string member)
    {
        if (obj == null) return null;

        if (obj is Hash hash && hash.ContainsKey(member))
            return hash[member];

        if (obj is IDictionary<string, object> dict && dict.ContainsKey(member))
            return dict[member];

        if (obj is IDictionary<string, object?> ndict && ndict.ContainsKey(member))
            return ndict[member];

        // Handle "size" and "first"/"last" on collections
        if (member == "size" && obj is System.Collections.ICollection col)
            return col.Count;
        if (member == "size" && obj is string str)
            return str.Length;
        if (member == "first" && obj is System.Collections.IList fList && fList.Count > 0)
            return fList[0];
        if (member == "last" && obj is System.Collections.IList lList && lList.Count > 0)
            return lList[lList.Count - 1];

        // Reflection fallback
        var prop = obj.GetType().GetProperty(member, System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase);
        if (prop != null)
            return prop.GetValue(obj);

        return null;
    }

    private object? ApplyFilter(object? input, string filterExpr)
    {
        var match = Regex.Match(filterExpr, @"^(\w+)(?:\s*:\s*(.+))?$");
        if (!match.Success) return input;

        var filterName = match.Groups[1].Value.ToLowerInvariant();
        var filterArgs = match.Groups[2].Success ? match.Groups[2].Value.Trim() : null;

        return filterName switch
        {
            "upcase" => input?.ToString()?.ToUpperInvariant(),
            "downcase" => input?.ToString()?.ToLowerInvariant(),
            "capitalize" => Capitalize(input?.ToString()),
            "strip" => input?.ToString()?.Trim(),
            "lstrip" => input?.ToString()?.TrimStart(),
            "rstrip" => input?.ToString()?.TrimEnd(),
            "strip_html" => Regex.Replace(input?.ToString() ?? "", "<[^>]*>", ""),
            "strip_newlines" => input?.ToString()?.Replace("\n", "")?.Replace("\r", ""),
            "newline_to_br" => input?.ToString()?.Replace("\n", "<br />\n"),
            "escape" => System.Net.WebUtility.HtmlEncode(input?.ToString()),
            "url_encode" => System.Net.WebUtility.UrlEncode(input?.ToString()),
            "url_decode" => System.Net.WebUtility.UrlDecode(input?.ToString()),
            "size" => GetSize(input),
            "reverse" => ReverseValue(input),
            "first" => GetFirst(input),
            "last" => GetLast(input),
            "sort" => SortValue(input),
            "uniq" => UniqValue(input),
            "join" => JoinValue(input, filterArgs),
            "split" => SplitValue(input, filterArgs),
            "replace" => ReplaceValue(input, filterArgs),
            "replace_first" => ReplaceFirstValue(input, filterArgs),
            "remove" => RemoveValue(input, filterArgs),
            "remove_first" => RemoveFirstValue(input, filterArgs),
            "append" => AppendValue(input, filterArgs),
            "prepend" => PrependValue(input, filterArgs),
            "truncate" => TruncateValue(input, filterArgs),
            "truncatewords" => TruncateWordsValue(input, filterArgs),
            "default" => input == null || (input is string s && string.IsNullOrEmpty(s)) ? EvaluateExpression(filterArgs ?? "") : input,
            "plus" => MathOp(input, filterArgs, (a, b) => a + b),
            "minus" => MathOp(input, filterArgs, (a, b) => a - b),
            "times" => MathOp(input, filterArgs, (a, b) => a * b),
            "divided_by" => MathOp(input, filterArgs, (a, b) => b != 0 ? a / b : 0),
            "modulo" => MathOp(input, filterArgs, (a, b) => b != 0 ? a % b : 0),
            "abs" => input is IConvertible c ? Math.Abs(Convert.ToDouble(c)) : input,
            "ceil" => input is IConvertible c2 ? Math.Ceiling(Convert.ToDouble(c2)) : input,
            "floor" => input is IConvertible c3 ? Math.Floor(Convert.ToDouble(c3)) : input,
            "round" => input is IConvertible c4 ? Math.Round(Convert.ToDouble(c4)) : input,
            "map" => MapValue(input, filterArgs),
            "where" => WhereValue(input, filterArgs),
            "compact" => CompactValue(input),
            "concat" => ConcatValue(input, filterArgs),
            "date" => FormatDate(input, filterArgs),
            _ => input // Unknown filter - pass through
        };
    }

    // Filter helper implementations
    private static string? Capitalize(string? s)
        => s == null ? null : s.Length == 0 ? s : char.ToUpper(s[0]) + s[1..];

    private static object? GetSize(object? input) => input switch
    {
        string s => s.Length,
        System.Collections.ICollection c => c.Count,
        System.Collections.IEnumerable e => e.Cast<object>().Count(),
        _ => 0
    };

    private static object? ReverseValue(object? input)
    {
        if (input is string s) return new string(s.Reverse().ToArray());
        if (input is IList<object> list) { var rev = list.ToList(); rev.Reverse(); return rev; }
        return input;
    }

    private static object? GetFirst(object? input)
    {
        if (input is IList<object> list && list.Count > 0) return list[0];
        if (input is System.Collections.IList il && il.Count > 0) return il[0];
        return input;
    }

    private static object? GetLast(object? input)
    {
        if (input is IList<object> list && list.Count > 0) return list[^1];
        if (input is System.Collections.IList il && il.Count > 0) return il[il.Count - 1];
        return input;
    }

    private static object? SortValue(object? input)
    {
        if (input is IList<object> list) return list.OrderBy(x => x?.ToString()).ToList();
        return input;
    }

    private static object? UniqValue(object? input)
    {
        if (input is IList<object> list) return list.Distinct().ToList();
        return input;
    }

    private object? JoinValue(object? input, string? args)
    {
        var sep = args != null ? EvaluateExpression(args)?.ToString() ?? ", " : ", ";
        if (input is IEnumerable<object> list) return string.Join(sep, list);
        return input?.ToString();
    }

    private object? SplitValue(object? input, string? args)
    {
        var sep = args != null ? EvaluateExpression(args)?.ToString() ?? "" : "";
        return input?.ToString()?.Split(sep).Select(s => (object)s).ToList();
    }

    private object? ReplaceValue(object? input, string? args)
    {
        if (args == null) return input;
        var parts = ParseFilterArgs(args, 2);
        if (parts.Count < 2) return input;
        return input?.ToString()?.Replace(parts[0], parts[1]);
    }

    private object? ReplaceFirstValue(object? input, string? args)
    {
        if (args == null) return input;
        var parts = ParseFilterArgs(args, 2);
        if (parts.Count < 2) return input;
        var s = input?.ToString() ?? "";
        var idx = s.IndexOf(parts[0], StringComparison.Ordinal);
        if (idx >= 0) return s[..idx] + parts[1] + s[(idx + parts[0].Length)..];
        return s;
    }

    private object? RemoveValue(object? input, string? args)
    {
        if (args == null) return input;
        var val = EvaluateExpression(args)?.ToString() ?? "";
        return input?.ToString()?.Replace(val, "");
    }

    private object? RemoveFirstValue(object? input, string? args)
    {
        if (args == null) return input;
        var val = EvaluateExpression(args)?.ToString() ?? "";
        var s = input?.ToString() ?? "";
        var idx = s.IndexOf(val, StringComparison.Ordinal);
        if (idx >= 0) return s[..idx] + s[(idx + val.Length)..];
        return s;
    }

    private object? AppendValue(object? input, string? args)
    {
        var val = args != null ? EvaluateExpression(args)?.ToString() ?? "" : "";
        return (input?.ToString() ?? "") + val;
    }

    private object? PrependValue(object? input, string? args)
    {
        var val = args != null ? EvaluateExpression(args)?.ToString() ?? "" : "";
        return val + (input?.ToString() ?? "");
    }

    private static object? TruncateValue(object? input, string? args)
    {
        var s = input?.ToString() ?? "";
        var length = 50;
        var ellipsis = "...";
        if (args != null)
        {
            var argParts = args.Split(',');
            if (int.TryParse(argParts[0].Trim(), out var l)) length = l;
            if (argParts.Length > 1) ellipsis = EvaluateExpressionStatic(argParts[1].Trim()) ?? "...";
        }
        if (s.Length <= length) return s;
        // DotLiquid includes the ellipsis in the total length
        var truncLen = Math.Max(0, length - ellipsis.Length);
        return s[..truncLen] + ellipsis;
    }

    private static string? EvaluateExpressionStatic(string expr)
    {
        expr = expr.Trim();
        if ((expr.StartsWith('"') && expr.EndsWith('"')) || (expr.StartsWith('\'') && expr.EndsWith('\'')))
            return expr[1..^1];
        return expr;
    }

    private static object? TruncateWordsValue(object? input, string? args)
    {
        var s = input?.ToString() ?? "";
        var count = 15;
        if (args != null && int.TryParse(args.Split(',')[0].Trim(), out var c)) count = c;
        var words = s.Split(' ');
        if (words.Length <= count) return s;
        return string.Join(' ', words.Take(count)) + "...";
    }

    private object? MathOp(object? input, string? args, Func<double, double, double> op)
    {
        try
        {
            var a = Convert.ToDouble(input);
            var b = args != null ? Convert.ToDouble(EvaluateExpression(args.Trim())) : 0;
            return op(a, b);
        }
        catch { return input; }
    }

    private object? MapValue(object? input, string? args)
    {
        if (input is not IEnumerable<object> list || args == null) return input;
        var prop = EvaluateExpression(args)?.ToString() ?? args.Trim(' ', '"', '\'');
        return list.Select(item => GetMember(item, prop)).ToList();
    }

    private object? WhereValue(object? input, string? args)
    {
        if (input is not IEnumerable<object> list || args == null) return input;
        var parts = ParseFilterArgs(args, 2);
        if (parts.Count == 0) return input;
        var prop = parts[0];
        var targetVal = parts.Count > 1 ? parts[1] : null;

        return list.Where(item =>
        {
            var val = GetMember(item, prop);
            if (targetVal == null) return val != null && !val.Equals(false);
            return val?.ToString() == targetVal;
        }).ToList();
    }

    private static object? CompactValue(object? input)
    {
        if (input is IList<object> list) return list.Where(x => x != null).ToList();
        return input;
    }

    private object? ConcatValue(object? input, string? args)
    {
        if (input is not IList<object> list1 || args == null) return input;
        var other = EvaluateExpression(args);
        if (other is IList<object> list2) return list1.Concat(list2).ToList();
        return input;
    }

    private static object? FormatDate(object? input, string? args)
    {
        // Basic date formatting
        if (input == null || args == null) return input;
        if (input.ToString() == "now" || input.ToString() == "today")
            input = DateTime.Now;

        if (input is DateTime dt)
        {
            var format = args.Trim(' ', '"', '\'')
                .Replace("%Y", "yyyy").Replace("%m", "MM").Replace("%d", "dd")
                .Replace("%H", "HH").Replace("%M", "mm").Replace("%S", "ss")
                .Replace("%B", "MMMM").Replace("%b", "MMM")
                .Replace("%A", "dddd").Replace("%a", "ddd");
            return dt.ToString(format);
        }

        if (DateTime.TryParse(input.ToString(), out var parsed))
            return FormatDate(parsed, args);

        return input;
    }

    private List<string> ParseFilterArgs(string args, int expectedCount)
    {
        var parts = new List<string>();
        bool inString = false;
        char stringChar = '"';
        int start = 0;

        for (int i = 0; i <= args.Length; i++)
        {
            if (i == args.Length || (!inString && args[i] == ','))
            {
                var part = args[start..i].Trim();
                // Evaluate the expression (handles quotes, variables, etc.)
                var evaluated = EvaluateExpression(part);
                parts.Add(evaluated?.ToString() ?? "");
                start = i + 1;
                if (parts.Count >= expectedCount) break;
            }
            else if (args[i] == '"' || args[i] == '\'')
            {
                if (inString && args[i] == stringChar) inString = false;
                else if (!inString) { inString = true; stringChar = args[i]; }
            }
        }

        return parts;
    }

    private bool EvaluateCondition(string condition)
    {
        condition = condition.Trim();

        // Handle "and" / "or" combinators
        var orParts = Regex.Split(condition, @"\s+or\s+");
        if (orParts.Length > 1)
            return orParts.Any(p => EvaluateCondition(p));

        var andParts = Regex.Split(condition, @"\s+and\s+");
        if (andParts.Length > 1)
            return andParts.All(p => EvaluateCondition(p));

        // Handle comparison operators
        var compMatch = Regex.Match(condition, @"^(.+?)\s*(==|!=|<>|>=|<=|>|<|contains)\s*(.+)$");
        if (compMatch.Success)
        {
            var left = EvaluateExpression(compMatch.Groups[1].Value.Trim());
            var op = compMatch.Groups[2].Value.Trim();
            var right = EvaluateExpression(compMatch.Groups[3].Value.Trim());

            return op switch
            {
                "==" => Equals(left, right),
                "!=" or "<>" => !Equals(left, right),
                ">" => CompareValues(left, right) > 0,
                "<" => CompareValues(left, right) < 0,
                ">=" => CompareValues(left, right) >= 0,
                "<=" => CompareValues(left, right) <= 0,
                "contains" => left?.ToString()?.Contains(right?.ToString() ?? "") ?? false,
                _ => false
            };
        }

        // Simple truthy check
        var value = EvaluateExpression(condition);
        return IsTruthy(value);
    }

    private static bool IsTruthy(object? value)
    {
        if (value == null) return false;
        if (value is bool b) return b;
        if (value is string s) return !string.IsNullOrEmpty(s);
        if (value is int i) return i != 0;
        if (value is long l) return l != 0;
        if (value is double d) return d != 0;
        return true;
    }

    private static int CompareValues(object? left, object? right)
    {
        try
        {
            var l = Convert.ToDouble(left);
            var r = Convert.ToDouble(right);
            return l.CompareTo(r);
        }
        catch
        {
            return string.Compare(left?.ToString(), right?.ToString(), StringComparison.Ordinal);
        }
    }

    private static new bool Equals(object? left, object? right)
    {
        if (left == null && right == null) return true;
        if (left == null || right == null) return false;
        if (left.ToString() == right.ToString()) return true;
        try { return Convert.ToDouble(left) == Convert.ToDouble(right); }
        catch { return false; }
    }

    private string? TryResolveOriginPath(string expression)
    {
        var parts = SplitByPipes(expression);
        var basePath = parts[0].Trim();

        // Direct variable reference
        if (_origins.ContainsKey(basePath))
            return basePath;

        // Dotted path
        var segments = basePath.Split('.');
        var path = string.Join(".", segments);
        if (_origins.ContainsKey(path))
            return path;

        return null;
    }

    private int FindMatchingEndTag(int startIndex, string openTag, string closeTag)
    {
        int depth = 1;
        for (int i = startIndex + 1; i < _elements.Count; i++)
        {
            var el = _elements[i];
            if (el.TagName?.ToLowerInvariant() == openTag) depth++;
            else if (el.TagName?.ToLowerInvariant() == closeTag) depth--;
            if (depth == 0) return i;
        }
        return _elements.Count - 1;
    }

    private void AdvanceToNext()
    {
        _state.CurrentElementIndex++;
        if (_state.CurrentElementIndex >= _elements.Count)
            _state.IsComplete = true;
    }

    private void AdvanceStepInto()
    {
        // Step into goes to the very next element (including children)
        AdvanceToNext();
    }

    private void ExecuteStepOver()
    {
        var currentElement = _elements[_state.CurrentElementIndex];
        var currentDepth = currentElement.Depth;
        var forLoopDepthBefore = _forLoopStack.Count;

        ExecuteCurrentElement();
        AdvanceToNext();

        // If it was a block-opening tag, execute everything inside until the block is fully complete
        if (currentElement.TagName != null && IsBlockOpenTag(currentElement.TagName))
        {
            while (!_state.IsComplete && _state.CurrentElementIndex < _elements.Count)
            {
                var el = _elements[_state.CurrentElementIndex];

                // For "for" loops: keep going until the loop stack returns to original depth
                if (currentElement.TagName.Equals("for", StringComparison.OrdinalIgnoreCase))
                {
                    if (_forLoopStack.Count < forLoopDepthBefore + 1)
                        break;
                }
                else if (el.Depth <= currentDepth && el.TagName != null && IsBlockCloseTag(el.TagName))
                {
                    ExecuteCurrentElement();
                    AdvanceToNext();
                    break;
                }

                ExecuteCurrentElement();
                AdvanceToNext();
            }
        }
    }

    private void ExecuteStepOut()
    {
        if (_state.ScopeStack.Count <= 1)
        {
            // At root scope, just continue to end
            ExecuteUntilBreakpointOrEnd();
            return;
        }

        var targetDepth = _state.ScopeStack.Count - 2;

        while (!_state.IsComplete && _state.CurrentElementIndex < _elements.Count)
        {
            ExecuteCurrentElement();
            AdvanceToNext();

            if (_state.ScopeStack.Count <= targetDepth + 1)
                break;
        }
    }

    private void ExecuteUntilBreakpointOrEnd()
    {
        while (!_state.IsComplete && _state.CurrentElementIndex < _elements.Count)
        {
            var el = _elements[_state.CurrentElementIndex];
            if (IsBreakpointHit(el.LineNumber))
            {
                // Update state to reflect the breakpoint location
                _state.CurrentLine = el.LineNumber;
                _state.CurrentExpression = el.RawText.Trim();
                _state.CurrentElementType = el.ElementType;
                break;
            }

            ExecuteCurrentElement();
            AdvanceToNext();
        }
    }

    private void ExecuteUntilLine(int targetLine)
    {
        while (!_state.IsComplete && _state.CurrentElementIndex < _elements.Count)
        {
            var el = _elements[_state.CurrentElementIndex];
            if (el.LineNumber >= targetLine)
                break;

            ExecuteCurrentElement();
            AdvanceToNext();
        }
    }

    private bool IsBreakpointHit(int line)
    {
        var bp = _breakpoints.FirstOrDefault(b => b.Line == line && b.IsEnabled);
        if (bp != null)
        {
            bp.HitCount++;

            // Check condition if any
            if (bp.Condition != null)
            {
                try { return EvaluateCondition(bp.Condition); }
                catch { return true; }
            }
            return true;
        }
        return false;
    }

    private static bool IsBlockOpenTag(string tagName)
    {
        return tagName.ToLowerInvariant() is "if" or "unless" or "for" or "case" or "capture" or "comment" or "raw" or "tablerow";
    }

    private static bool IsBlockCloseTag(string tagName)
    {
        return tagName.ToLowerInvariant().StartsWith("end");
    }

    private void UpdateWatches()
    {
        foreach (var watch in _watches)
        {
            var newValue = EvaluateExpression(watch.Expression);
            watch.HasChanged = !Equals(watch.LastValue, newValue);
            watch.LastValue = newValue;
        }
    }

    // Public API for breakpoints and watches

    public Breakpoint AddBreakpoint(int line, string? condition = null)
    {
        var bp = new Breakpoint { Id = _nextBreakpointId++, Line = line, Condition = condition };
        _breakpoints.Add(bp);
        return bp;
    }

    public bool RemoveBreakpoint(int id) => _breakpoints.RemoveAll(b => b.Id == id) > 0;
    public void ToggleBreakpoint(int id)
    {
        var bp = _breakpoints.FirstOrDefault(b => b.Id == id);
        if (bp != null) bp.IsEnabled = !bp.IsEnabled;
    }

    public WatchExpression AddWatch(string expression)
    {
        var watch = new WatchExpression { Id = _nextWatchId++, Expression = expression };
        watch.LastValue = EvaluateExpression(expression);
        _watches.Add(watch);
        return watch;
    }

    public bool RemoveWatch(int id) => _watches.RemoveAll(w => w.Id == id) > 0;

    public object? Evaluate(string expression) => EvaluateExpression(expression);

    /// <summary>
    /// Evaluate an expression step by step through the filter pipeline.
    /// Returns a list of (step description, intermediate value) pairs.
    /// </summary>
    public List<(string step, object? value)> EvaluateExpressionSteps(string expression)
    {
        var results = new List<(string step, object? value)>();

        if (string.IsNullOrWhiteSpace(expression))
            return results;

        var parts = SplitByPipes(expression);
        var baseExpr = parts[0].Trim();
        var value = ResolveVariable(baseExpr);

        results.Add((baseExpr, value));

        for (int i = 1; i < parts.Count; i++)
        {
            var filterExpr = parts[i].Trim();
            value = ApplyFilter(value, filterExpr);
            results.Add((filterExpr, value));
        }

        return results;
    }

    /// <summary>
    /// Get the DotLiquid-rendered output of the full template for comparison.
    /// </summary>
    public string GetFullRender()
    {
        var template = Template.Parse(_templateSource);
        return template.Render(_inputData);
    }
}
