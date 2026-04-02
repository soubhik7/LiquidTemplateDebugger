using System.Text;
using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.UI;

/// <summary>
/// Interactive terminal-based debugger UI with colored output and REPL commands.
/// </summary>
public class DebuggerRepl
{
    private DebugEngine? _engine;
    private string _templateSource = "";
    private bool _showOutputOnStep = true;
    private bool _showVariablesOnStep = false;
    private bool _showScopeOnStep = true;
    private int _contextLines = 2;

    public void Run(string? templatePath, string? dataPath, string? dataFormat)
    {
        PrintBanner();

        if (templatePath != null && dataPath != null)
        {
            LoadSession(templatePath, dataPath, dataFormat);
        }

        while (true)
        {
            Console.Write("\n");
            WriteColored("dbg> ", ConsoleColor.Green);
            var input = Console.ReadLine()?.Trim();

            if (string.IsNullOrEmpty(input)) continue;

            var parts = input.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var command = parts[0].ToLowerInvariant();
            var args = parts.Length > 1 ? parts[1] : "";

            try
            {
                var shouldExit = HandleCommand(command, args);
                if (shouldExit) break;
            }
            catch (Exception ex)
            {
                WriteLineColored($"Error: {ex.Message}", ConsoleColor.Red);
            }
        }
    }

    private bool HandleCommand(string command, string args)
    {
        switch (command)
        {
            case "load" or "l":
                HandleLoad(args);
                break;
            case "step" or "s" or "n":
                HandleStep(StepAction.StepNext);
                break;
            case "stepin" or "si":
                HandleStep(StepAction.StepInto);
                break;
            case "stepover" or "so":
                HandleStep(StepAction.StepOver);
                break;
            case "stepout" or "sout":
                HandleStep(StepAction.StepOut);
                break;
            case "continue" or "c":
                HandleStep(StepAction.Continue);
                break;
            case "run" or "r":
                HandleRun(args);
                break;
            case "break" or "bp":
                HandleBreakpoint(args);
                break;
            case "breakpoints" or "bps":
                ListBreakpoints();
                break;
            case "delete" or "del":
                HandleDeleteBreakpoint(args);
                break;
            case "toggle":
                HandleToggleBreakpoint(args);
                break;
            case "watch" or "w":
                HandleWatch(args);
                break;
            case "watches" or "ws":
                ListWatches();
                break;
            case "unwatch" or "uw":
                HandleUnwatch(args);
                break;
            case "vars" or "v":
                ShowVariables(args);
                break;
            case "inspect" or "i":
                InspectVariable(args);
                break;
            case "inspect-line" or "il":
                InspectCurrentLine();
                break;
            case "eval" or "e":
                EvaluateExpression(args);
                break;
            case "origin" or "o":
                ShowOrigin(args);
                break;
            case "trace" or "t":
                ShowTrace(args);
                break;
            case "output" or "out":
                ShowOutput();
                break;
            case "template" or "tpl":
                ShowTemplate();
                break;
            case "context" or "ctx":
                ShowContext();
                break;
            case "scope":
                ShowScope();
                break;
            case "state":
                ShowFullState();
                break;
            case "render":
                ShowFullRender();
                break;
            case "reset":
                HandleReset();
                break;
            case "set":
                HandleSet(args);
                break;
            case "help" or "h" or "?":
                ShowHelp();
                break;
            case "quit" or "q" or "exit":
                return true;
            default:
                WriteLineColored($"Unknown command: {command}. Type 'help' for available commands.", ConsoleColor.Yellow);
                break;
        }
        return false;
    }

    private void LoadSession(string templatePath, string dataPath, string? dataFormat)
    {
        _templateSource = File.ReadAllText(templatePath);
        var loader = new InputDataLoader();

        var (hash, origins) = dataFormat != null
            ? loader.LoadFromString(File.ReadAllText(dataPath), dataFormat)
            : loader.LoadFromFile(dataPath);

        _engine = new DebugEngine(_templateSource, hash, origins);

        WriteLineColored($"Loaded template: {templatePath}", ConsoleColor.Cyan);
        WriteLineColored($"Loaded data: {dataPath} ({dataFormat ?? Path.GetExtension(dataPath)})", ConsoleColor.Cyan);
        WriteLineColored($"Template has {_engine.Elements.Count} elements across {GetLineCount()} lines", ConsoleColor.Cyan);
        Console.WriteLine();
        ShowContext();
    }

    private void HandleLoad(string args)
    {
        var paths = args.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        if (paths.Length < 2)
        {
            WriteLineColored("Usage: load <template-path> <data-path> [format]", ConsoleColor.Yellow);
            WriteLineColored("  format: json, xml, text (auto-detected from extension if omitted)", ConsoleColor.Gray);
            return;
        }

        var format = paths.Length > 2 ? paths[2] : null;
        LoadSession(paths[0], paths[1], format);
    }

    private void HandleStep(StepAction action)
    {
        if (_engine == null)
        {
            WriteLineColored("No template loaded. Use 'load <template> <data>' first.", ConsoleColor.Yellow);
            return;
        }

        if (_engine.State.IsComplete)
        {
            WriteLineColored("Template execution complete. Use 'reset' to restart or 'output' to see results.", ConsoleColor.Yellow);
            return;
        }

        var state = _engine.Step(action);

        if (state.ErrorMessage != null)
        {
            WriteLineColored($"ERROR: {state.ErrorMessage}", ConsoleColor.Red);
        }

        if (state.IsComplete)
        {
            WriteLineColored("-- Execution complete --", ConsoleColor.Green);
            if (state.LastOutputChunk != null)
                ShowLastOutput(state);
            Console.WriteLine();
            WriteLineColored("Final output:", ConsoleColor.Cyan);
            Console.WriteLine(state.OutputSoFar);
            return;
        }

        // Show current position
        ShowContext();

        if (_showOutputOnStep && state.LastOutputChunk != null)
            ShowLastOutput(state);

        if (_showVariablesOnStep)
            ShowVariables("");

        if (_showScopeOnStep && _engine.State.ScopeStack.Count > 1)
            ShowScope();

        // Show watches
        ShowWatchChanges();
    }

    private void HandleRun(string args)
    {
        if (int.TryParse(args, out var line))
        {
            if (_engine == null) { WriteLineColored("No template loaded.", ConsoleColor.Yellow); return; }
            _engine.Step(StepAction.RunToLine, line);
            ShowContext();
        }
        else
        {
            WriteLineColored("Usage: run <line-number>", ConsoleColor.Yellow);
        }
    }

    private void HandleBreakpoint(string args)
    {
        if (_engine == null) { WriteLineColored("No template loaded.", ConsoleColor.Yellow); return; }

        var parts = args.Split(' ', 2);
        if (!int.TryParse(parts[0], out var line))
        {
            WriteLineColored("Usage: break <line> [condition]", ConsoleColor.Yellow);
            return;
        }

        var condition = parts.Length > 1 ? parts[1] : null;
        var bp = _engine.AddBreakpoint(line, condition);
        WriteLineColored($"Breakpoint #{bp.Id} set at line {bp.Line}" +
            (condition != null ? $" when '{condition}'" : ""), ConsoleColor.Magenta);
    }

    private void ListBreakpoints()
    {
        if (_engine == null || _engine.Breakpoints.Count == 0)
        {
            WriteLineColored("No breakpoints set.", ConsoleColor.Gray);
            return;
        }

        WriteLineColored("Breakpoints:", ConsoleColor.Magenta);
        foreach (var bp in _engine.Breakpoints)
        {
            var status = bp.IsEnabled ? "enabled" : "disabled";
            var cond = bp.Condition != null ? $" when '{bp.Condition}'" : "";
            WriteLineColored($"  #{bp.Id} line {bp.Line} [{status}]{cond} (hits: {bp.HitCount})",
                bp.IsEnabled ? ConsoleColor.White : ConsoleColor.DarkGray);
        }
    }

    private void HandleDeleteBreakpoint(string args)
    {
        if (_engine == null) return;
        if (int.TryParse(args, out var id))
        {
            if (_engine.RemoveBreakpoint(id))
                WriteLineColored($"Breakpoint #{id} removed.", ConsoleColor.Magenta);
            else
                WriteLineColored($"No breakpoint with id #{id}.", ConsoleColor.Yellow);
        }
        else WriteLineColored("Usage: delete <breakpoint-id>", ConsoleColor.Yellow);
    }

    private void HandleToggleBreakpoint(string args)
    {
        if (_engine == null) return;
        if (int.TryParse(args, out var id))
        {
            _engine.ToggleBreakpoint(id);
            WriteLineColored($"Breakpoint #{id} toggled.", ConsoleColor.Magenta);
        }
        else WriteLineColored("Usage: toggle <breakpoint-id>", ConsoleColor.Yellow);
    }

    private void HandleWatch(string args)
    {
        if (_engine == null) { WriteLineColored("No template loaded.", ConsoleColor.Yellow); return; }
        if (string.IsNullOrWhiteSpace(args))
        {
            WriteLineColored("Usage: watch <expression>", ConsoleColor.Yellow);
            return;
        }

        var watch = _engine.AddWatch(args);
        WriteLineColored($"Watch #{watch.Id}: {args} = {FormatValue(watch.LastValue)}", ConsoleColor.DarkCyan);
    }

    private void ListWatches()
    {
        if (_engine == null || _engine.Watches.Count == 0)
        {
            WriteLineColored("No watches set.", ConsoleColor.Gray);
            return;
        }

        WriteLineColored("Watches:", ConsoleColor.DarkCyan);
        foreach (var w in _engine.Watches)
        {
            var changed = w.HasChanged ? " *CHANGED*" : "";
            WriteLineColored($"  #{w.Id} {w.Expression} = {FormatValue(w.LastValue)}{changed}",
                w.HasChanged ? ConsoleColor.Yellow : ConsoleColor.White);
        }
    }

    private void HandleUnwatch(string args)
    {
        if (_engine == null) return;
        if (int.TryParse(args, out var id))
        {
            if (_engine.RemoveWatch(id))
                WriteLineColored($"Watch #{id} removed.", ConsoleColor.DarkCyan);
            else
                WriteLineColored($"No watch with id #{id}.", ConsoleColor.Yellow);
        }
        else WriteLineColored("Usage: unwatch <watch-id>", ConsoleColor.Yellow);
    }

    private void ShowVariables(string filter)
    {
        if (_engine == null) return;

        var vars = _engine.State.Variables;
        if (!string.IsNullOrWhiteSpace(filter))
        {
            vars = new Dictionary<string, TrackedVariable>(
                vars.Where(kv => kv.Key.Contains(filter, StringComparison.OrdinalIgnoreCase)),
                StringComparer.OrdinalIgnoreCase);
        }

        if (vars.Count == 0)
        {
            WriteLineColored("No variables in scope.", ConsoleColor.Gray);
            return;
        }

        WriteLineColored("Variables:", ConsoleColor.Cyan);
        var maxNameLen = vars.Keys.Max(k => k.Length);

        foreach (var (name, variable) in vars.OrderBy(kv => kv.Value.ScopeDepth).ThenBy(kv => kv.Key))
        {
            var scopeIndicator = variable.ScopeTag switch
            {
                "input" => "[INPUT]",
                "assign" => "[ASSIGN]",
                "capture" => "[CAPTURE]",
                "for" => "[FOR]",
                "increment" => "[INCR]",
                "decrement" => "[DECR]",
                _ => "[ROOT]"
            };

            var color = variable.ScopeTag switch
            {
                "input" => ConsoleColor.Green,
                "assign" => ConsoleColor.Yellow,
                "capture" => ConsoleColor.DarkYellow,
                "for" => ConsoleColor.Magenta,
                _ => ConsoleColor.White
            };

            var indent = new string(' ', variable.ScopeDepth * 2);
            WriteColored($"  {indent}{name.PadRight(maxNameLen)} ", ConsoleColor.White);
            WriteColored($"{scopeIndicator,-10} ", color);
            WriteColored($"({variable.TypeName}) ", ConsoleColor.DarkGray);
            WriteLineColored(FormatValue(variable.CurrentValue, 60), ConsoleColor.White);
        }
    }

    private void InspectVariable(string name)
    {
        if (_engine == null || string.IsNullOrWhiteSpace(name)) return;

        name = name.Trim();

        // Try to resolve through the engine
        var value = _engine.Evaluate(name);

        if (value == null && !_engine.State.Variables.ContainsKey(name))
        {
            // Try case-insensitive partial match against variable names
            var matches = _engine.State.Variables.Keys
                .Where(k => k.Contains(name, StringComparison.OrdinalIgnoreCase))
                .ToList();

            // Also search current line's expressions for variables containing this text
            var currentIdx = _engine.State.CurrentElementIndex;
            if (currentIdx < _engine.Elements.Count)
            {
                var currentLine = _engine.Elements[currentIdx].LineNumber;
                var lineElements = _engine.Elements
                    .Where(e => e.LineNumber == currentLine && e.Expression != null)
                    .ToList();

                foreach (var el in lineElements)
                {
                    var baseVar = el.Expression!.Split('|')[0].Trim();
                    if (baseVar.Contains(name, StringComparison.OrdinalIgnoreCase)
                        && !matches.Contains(baseVar.Split('.')[0], StringComparer.OrdinalIgnoreCase))
                    {
                        matches.Add(baseVar);
                    }
                }
            }

            if (matches.Count > 0)
            {
                WriteLineColored($"Variable '{name}' not found. Did you mean:", ConsoleColor.Yellow);
                foreach (var m in matches.Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    var val = _engine.Evaluate(m);
                    WriteColored($"  {m}", ConsoleColor.White);
                    WriteLineColored($" = {FormatValue(val, 60)}", ConsoleColor.Gray);
                }
                WriteLineColored("\nTip: use Liquid variable names (e.g. customer.email), or 'il' to inspect the current line.", ConsoleColor.DarkGray);
            }
            else
            {
                WriteLineColored($"Variable '{name}' not found.", ConsoleColor.Yellow);
                WriteLineColored("Use 'vars' to see available variables, or 'il' to inspect the current line.", ConsoleColor.DarkGray);
            }
            return;
        }

        WriteLineColored($"Inspecting: {name}", ConsoleColor.Cyan);
        Console.WriteLine(new string('-', 40));

        TrackedVariable? tracked = null;
        _engine.State.Variables.TryGetValue(name.Split('.')[0], out tracked);

        if (tracked != null)
        {
            WriteColored("  Scope:  ", ConsoleColor.Gray);
            WriteLineColored($"{tracked.ScopeTag} (depth: {tracked.ScopeDepth})", ConsoleColor.White);
            WriteColored("  Origin: ", ConsoleColor.Gray);
            WriteLineColored($"{tracked.Origin.SourcePath} ({tracked.Origin.SourceFormat})", ConsoleColor.Green);
            WriteColored("  Type:   ", ConsoleColor.Gray);
            WriteLineColored(tracked.TypeName, ConsoleColor.White);
        }

        WriteColored("  Value:  ", ConsoleColor.Gray);

        if (value is DotLiquid.Hash hash)
        {
            Console.WriteLine();
            PrintHashIndented(hash, "    ");
        }
        else if (value is IList<object> list)
        {
            Console.WriteLine($"[Array: {list.Count} items]");
            for (int i = 0; i < Math.Min(list.Count, 20); i++)
            {
                WriteColored($"    [{i}] ", ConsoleColor.DarkGray);
                Console.WriteLine(FormatValue(list[i], 80));
            }
            if (list.Count > 20)
                WriteLineColored($"    ... and {list.Count - 20} more", ConsoleColor.DarkGray);
        }
        else
        {
            Console.WriteLine(FormatValue(value, 200));
        }

        // Show transformation history
        if (tracked != null && tracked.Transformations.Count > 0)
        {
            Console.WriteLine();
            WriteLineColored("  Transformation history:", ConsoleColor.DarkCyan);
            foreach (var t in tracked.Transformations)
            {
                WriteColored($"    Line {t.AtLine}: ", ConsoleColor.DarkGray);
                WriteColored($"[{t.TransformationType}] ", ConsoleColor.Yellow);
                WriteLineColored(t.Description, ConsoleColor.White);
                WriteColored($"      Before: ", ConsoleColor.DarkGray);
                WriteLineColored(FormatValue(t.ValueBefore, 50), ConsoleColor.DarkRed);
                WriteColored($"      After:  ", ConsoleColor.DarkGray);
                WriteLineColored(FormatValue(t.ValueAfter, 50), ConsoleColor.DarkGreen);
            }
        }
    }

    private void InspectCurrentLine()
    {
        if (_engine == null) { WriteLineColored("No template loaded.", ConsoleColor.Yellow); return; }

        var currentIdx = _engine.State.CurrentElementIndex;
        if (currentIdx >= _engine.Elements.Count)
        {
            WriteLineColored("Execution complete, no current line.", ConsoleColor.Yellow);
            return;
        }

        var currentLine = _engine.Elements[currentIdx].LineNumber;
        var lineElements = _engine.Elements
            .Where(e => e.LineNumber == currentLine)
            .ToList();

        // Show the line itself
        var lines = _templateSource.Split('\n');
        if (currentLine <= lines.Length)
        {
            WriteColored($"  Line {currentLine}: ", ConsoleColor.DarkGray);
            WriteLineColored(lines[currentLine - 1].Trim(), ConsoleColor.White);
        }
        Console.WriteLine();

        // Collect and display all expressions on this line
        var expressionsSeen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var el in lineElements)
        {
            if (el.ElementType == TemplateElementType.Output && el.Expression != null)
            {
                var fullExpr = el.Expression;
                var baseVar = fullExpr.Split('|')[0].Trim();

                WriteColored($"  {{ {fullExpr} }}", ConsoleColor.Cyan);

                var rawValue = _engine.Evaluate(baseVar);
                var filteredValue = _engine.Evaluate(fullExpr);

                if (fullExpr != baseVar)
                {
                    // Has filters - show before and after
                    WriteColored($"  {baseVar} = ", ConsoleColor.Gray);
                    WriteLineColored(FormatValue(rawValue, 50), ConsoleColor.White);
                    WriteColored($"    after filters: ", ConsoleColor.DarkGray);
                    WriteLineColored(FormatValue(filteredValue, 50), ConsoleColor.DarkGreen);
                }
                else
                {
                    WriteColored($" = ", ConsoleColor.Gray);
                    WriteLineColored(FormatValue(filteredValue, 60), ConsoleColor.White);
                }

                // Track the root variable for origin display
                var rootVar = baseVar.Split('.')[0];
                if (!expressionsSeen.Contains(rootVar))
                {
                    expressionsSeen.Add(rootVar);
                    if (_engine.State.Variables.TryGetValue(rootVar, out var tracked))
                    {
                        var sourceLabel = tracked.ScopeTag == "input" ? "FROM INPUT" : "TEMPLATE";
                        WriteColored($"    origin: ", ConsoleColor.DarkGray);
                        WriteLineColored($"{tracked.Origin.SourcePath} [{sourceLabel}]",
                            tracked.ScopeTag == "input" ? ConsoleColor.Green : ConsoleColor.Yellow);
                    }
                }
                Console.WriteLine();
            }
            else if (el.ElementType == TemplateElementType.Tag && el.TagName != null && el.Expression != null)
            {
                WriteColored($"  {{% {el.TagName} {el.Expression} %}}", ConsoleColor.Cyan);
                Console.WriteLine();

                // For assign tags, show the right-hand side value
                if (el.TagName == "assign")
                {
                    var assignMatch = System.Text.RegularExpressions.Regex.Match(el.Expression, @"^(\w+)\s*=\s*(.+)$");
                    if (assignMatch.Success)
                    {
                        var lhs = assignMatch.Groups[1].Value;
                        var rhs = assignMatch.Groups[2].Value.Trim();
                        var rhsValue = _engine.Evaluate(rhs);
                        WriteColored($"    {lhs} will be assigned: ", ConsoleColor.DarkGray);
                        WriteLineColored(FormatValue(rhsValue, 60), ConsoleColor.White);
                    }
                }
                Console.WriteLine();
            }
        }

        if (!lineElements.Any(e => e.ElementType is TemplateElementType.Output or TemplateElementType.Tag))
        {
            WriteLineColored("  (literal text - no expressions on this line)", ConsoleColor.DarkGray);
        }
    }

    private void EvaluateExpression(string expression)
    {
        if (_engine == null || string.IsNullOrWhiteSpace(expression)) return;

        var result = _engine.Evaluate(expression);
        WriteColored("=> ", ConsoleColor.Gray);
        WriteLineColored(FormatValue(result, 200), ConsoleColor.White);
    }

    private void ShowOrigin(string varName)
    {
        if (_engine == null || string.IsNullOrWhiteSpace(varName)) return;

        varName = varName.Trim();
        if (!_engine.State.Variables.TryGetValue(varName, out var tracked))
        {
            WriteLineColored($"Variable '{varName}' not found.", ConsoleColor.Yellow);
            return;
        }

        WriteLineColored($"Origin of '{varName}':", ConsoleColor.Cyan);
        WriteColored("  Source path:   ", ConsoleColor.Gray);
        WriteLineColored(tracked.Origin.SourcePath, ConsoleColor.Green);
        WriteColored("  Source format: ", ConsoleColor.Gray);
        WriteLineColored(tracked.Origin.SourceFormat, ConsoleColor.White);
        WriteColored("  Original val:  ", ConsoleColor.Gray);
        WriteLineColored(FormatValue(tracked.Origin.OriginalValue, 100), ConsoleColor.White);
        if (tracked.Origin.SourceLineNumber.HasValue)
        {
            WriteColored("  Source line:   ", ConsoleColor.Gray);
            WriteLineColored(tracked.Origin.SourceLineNumber.Value.ToString(), ConsoleColor.White);
        }

        var isFromInput = tracked.ScopeTag == "input";
        WriteColored("  Data source:   ", ConsoleColor.Gray);
        WriteLineColored(isFromInput ? "FROM INPUT DATA" : "CREATED IN TEMPLATE", isFromInput ? ConsoleColor.Green : ConsoleColor.Yellow);
    }

    private void ShowTrace(string varName)
    {
        if (_engine == null || string.IsNullOrWhiteSpace(varName)) return;

        varName = varName.Trim();
        if (!_engine.State.Variables.TryGetValue(varName, out var tracked))
        {
            WriteLineColored($"Variable '{varName}' not found.", ConsoleColor.Yellow);
            return;
        }

        WriteLineColored($"Trace for '{varName}':", ConsoleColor.Cyan);

        // Show origin
        var isInput = tracked.ScopeTag == "input";
        WriteColored("  [ORIGIN] ", isInput ? ConsoleColor.Green : ConsoleColor.Yellow);
        WriteLineColored($"{tracked.Origin.SourcePath} ({tracked.Origin.SourceFormat})", ConsoleColor.White);
        WriteColored("           Value: ", ConsoleColor.DarkGray);
        WriteLineColored(FormatValue(tracked.Origin.OriginalValue, 80), ConsoleColor.White);

        // Show each transformation
        for (int i = 0; i < tracked.Transformations.Count; i++)
        {
            var t = tracked.Transformations[i];
            Console.WriteLine("     |");
            WriteColored($"  [{t.TransformationType.ToUpperInvariant()}] ", ConsoleColor.Yellow);
            WriteLineColored($"Line {t.AtLine}: {t.Expression}", ConsoleColor.White);
            WriteColored("           ", ConsoleColor.DarkGray);
            WriteColored(FormatValue(t.ValueBefore, 30), ConsoleColor.DarkRed);
            WriteColored(" -> ", ConsoleColor.Gray);
            WriteLineColored(FormatValue(t.ValueAfter, 30), ConsoleColor.DarkGreen);
        }

        Console.WriteLine("     |");
        WriteColored("  [CURRENT] ", ConsoleColor.Cyan);
        WriteLineColored(FormatValue(tracked.CurrentValue, 80), ConsoleColor.White);
    }

    private void ShowOutput()
    {
        if (_engine == null) return;
        WriteLineColored("Output so far:", ConsoleColor.Cyan);
        Console.WriteLine(new string('-', 40));
        Console.WriteLine(_engine.State.OutputSoFar);
        Console.WriteLine(new string('-', 40));
    }

    private void ShowTemplate()
    {
        if (_engine == null) return;
        WriteLineColored("Template:", ConsoleColor.Cyan);
        Console.WriteLine(new string('-', 40));

        var lines = _templateSource.Split('\n');
        var currentLine = _engine.State.CurrentLine;
        var breakpointLines = new HashSet<int>(_engine.Breakpoints.Where(b => b.IsEnabled).Select(b => b.Line));
        var maxWidth = lines.Length.ToString().Length;

        for (int i = 0; i < lines.Length; i++)
        {
            var lineNum = i + 1;
            var isCurrent = lineNum == currentLine;
            var hasBreakpoint = breakpointLines.Contains(lineNum);

            var prefix = isCurrent ? ">" : " ";
            var bpMarker = hasBreakpoint ? "*" : " ";

            WriteColored($"{prefix}{bpMarker}{lineNum.ToString().PadLeft(maxWidth)}| ",
                isCurrent ? ConsoleColor.Yellow : hasBreakpoint ? ConsoleColor.Red : ConsoleColor.DarkGray);
            WriteLineColored(lines[i], isCurrent ? ConsoleColor.Yellow : ConsoleColor.White);
        }

        Console.WriteLine(new string('-', 40));
    }

    private void ShowContext()
    {
        if (_engine == null || _engine.State.IsComplete) return;

        var currentIdx = _engine.State.CurrentElementIndex;
        if (currentIdx >= _engine.Elements.Count) return;

        var currentElement = _engine.Elements[currentIdx];
        var currentLine = currentElement.LineNumber;
        var lines = _templateSource.Split('\n');
        var breakpointLines = new HashSet<int>(_engine.Breakpoints.Where(b => b.IsEnabled).Select(b => b.Line));
        var maxWidth = lines.Length.ToString().Length;

        // Show element info
        WriteColored($"[{currentElement.ElementType}] ", ConsoleColor.DarkCyan);
        WriteColored($"Line {currentLine}", ConsoleColor.White);
        if (currentElement.TagName != null)
            WriteColored($" ({currentElement.TagName})", ConsoleColor.DarkYellow);
        Console.WriteLine();

        // Show surrounding lines
        var startLine = Math.Max(1, currentLine - _contextLines);
        var endLine = Math.Min(lines.Length, currentLine + _contextLines);

        for (int i = startLine; i <= endLine; i++)
        {
            var isCurrent = i == currentLine;
            var hasBreakpoint = breakpointLines.Contains(i);
            var prefix = isCurrent ? ">" : " ";
            var bpMarker = hasBreakpoint ? "*" : " ";

            WriteColored($"{prefix}{bpMarker}{i.ToString().PadLeft(maxWidth)}| ",
                isCurrent ? ConsoleColor.Yellow : hasBreakpoint ? ConsoleColor.Red : ConsoleColor.DarkGray);
            WriteLineColored(lines[i - 1], isCurrent ? ConsoleColor.Yellow : ConsoleColor.Gray);
        }
    }

    private void ShowScope()
    {
        if (_engine == null) return;
        WriteColored("Scope: ", ConsoleColor.DarkCyan);
        WriteLineColored(string.Join(" > ", _engine.State.ScopeStack), ConsoleColor.White);
    }

    private void ShowFullState()
    {
        if (_engine == null) return;

        WriteLineColored("=== Debugger State ===", ConsoleColor.Cyan);
        Console.WriteLine();

        ShowContext();
        Console.WriteLine();

        ShowScope();
        Console.WriteLine();

        ShowVariables("");
        Console.WriteLine();

        if (_engine.Watches.Count > 0)
        {
            ListWatches();
            Console.WriteLine();
        }

        if (_engine.Breakpoints.Count > 0)
        {
            ListBreakpoints();
            Console.WriteLine();
        }

        ShowOutput();
    }

    private void ShowFullRender()
    {
        if (_engine == null) return;

        WriteLineColored("Full DotLiquid render:", ConsoleColor.Cyan);
        Console.WriteLine(new string('-', 40));
        Console.WriteLine(_engine.GetFullRender());
        Console.WriteLine(new string('-', 40));
    }

    private void HandleReset()
    {
        if (_engine == null) return;

        // Re-create the engine with the same data
        var loader = new InputDataLoader();
        _engine = new DebugEngine(_templateSource, _engine.InputData, _engine.Origins);
        WriteLineColored("Session reset. Execution restarted from the beginning.", ConsoleColor.Cyan);
        ShowContext();
    }

    private void HandleSet(string args)
    {
        var parts = args.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            WriteLineColored("Settings: output_on_step, vars_on_step, scope_on_step, context_lines", ConsoleColor.Gray);
            WriteLineColored("Usage: set <setting> <value>", ConsoleColor.Yellow);
            return;
        }

        switch (parts[0].ToLowerInvariant())
        {
            case "output_on_step":
                _showOutputOnStep = parts[1].ToLowerInvariant() is "true" or "on" or "1";
                WriteLineColored($"output_on_step = {_showOutputOnStep}", ConsoleColor.Gray);
                break;
            case "vars_on_step":
                _showVariablesOnStep = parts[1].ToLowerInvariant() is "true" or "on" or "1";
                WriteLineColored($"vars_on_step = {_showVariablesOnStep}", ConsoleColor.Gray);
                break;
            case "scope_on_step":
                _showScopeOnStep = parts[1].ToLowerInvariant() is "true" or "on" or "1";
                WriteLineColored($"scope_on_step = {_showScopeOnStep}", ConsoleColor.Gray);
                break;
            case "context_lines":
                if (int.TryParse(parts[1], out var n))
                {
                    _contextLines = Math.Max(0, Math.Min(20, n));
                    WriteLineColored($"context_lines = {_contextLines}", ConsoleColor.Gray);
                }
                break;
            default:
                WriteLineColored($"Unknown setting: {parts[0]}", ConsoleColor.Yellow);
                break;
        }
    }

    private void ShowLastOutput(DebugState state)
    {
        if (state.LastOutputChunk != null)
        {
            var display = state.LastOutputChunk.Replace("\n", "\\n").Replace("\r", "\\r").Replace("\t", "\\t");
            if (display.Length > 80) display = display[..77] + "...";
            WriteColored("  Output: ", ConsoleColor.DarkGray);
            WriteLineColored($"\"{display}\"", ConsoleColor.DarkGreen);
        }
    }

    private void ShowWatchChanges()
    {
        if (_engine == null) return;
        foreach (var w in _engine.Watches.Where(w => w.HasChanged))
        {
            WriteColored($"  Watch #{w.Id} changed: ", ConsoleColor.Yellow);
            WriteLineColored($"{w.Expression} = {FormatValue(w.LastValue)}", ConsoleColor.White);
        }
    }

    private void PrintHashIndented(DotLiquid.Hash hash, string indent)
    {
        foreach (var key in hash.Keys)
        {
            WriteColored($"{indent}{key}: ", ConsoleColor.Gray);
            var value = hash[key];
            if (value is DotLiquid.Hash nested)
            {
                Console.WriteLine();
                PrintHashIndented(nested, indent + "  ");
            }
            else if (value is IList<object> list)
            {
                Console.WriteLine($"[{list.Count} items]");
                for (int i = 0; i < Math.Min(list.Count, 5); i++)
                {
                    WriteColored($"{indent}  [{i}] ", ConsoleColor.DarkGray);
                    Console.WriteLine(FormatValue(list[i], 60));
                }
                if (list.Count > 5)
                    WriteLineColored($"{indent}  ... and {list.Count - 5} more", ConsoleColor.DarkGray);
            }
            else
            {
                Console.WriteLine(FormatValue(value, 80));
            }
        }
    }

    private int GetLineCount() => _templateSource.Split('\n').Length;

    private static string FormatValue(object? value, int maxLength = 40)
    {
        if (value == null) return "nil";
        var str = value switch
        {
            bool b => b.ToString().ToLowerInvariant(),
            string s => $"\"{s}\"",
            DotLiquid.Hash h => $"{{Hash: {h.Keys.Count()} keys}}",
            IList<object> l => $"[Array: {l.Count} items]",
            _ => value.ToString() ?? "nil"
        };

        if (str != null && str.Length > maxLength)
            str = str[..(maxLength - 3)] + "...";
        return str ?? "nil";
    }

    private static void WriteColored(string text, ConsoleColor color)
    {
        var prev = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.Write(text);
        Console.ForegroundColor = prev;
    }

    private static void WriteLineColored(string text, ConsoleColor color)
    {
        var prev = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.WriteLine(text);
        Console.ForegroundColor = prev;
    }

    private void ShowHelp()
    {
        WriteLineColored("DotLiquid Template Debugger - Commands", ConsoleColor.Cyan);
        Console.WriteLine(new string('=', 50));

        WriteLineColored("\nExecution:", ConsoleColor.Yellow);
        Console.WriteLine("  step, s, n          Step to next element");
        Console.WriteLine("  stepin, si          Step into block");
        Console.WriteLine("  stepover, so        Step over block");
        Console.WriteLine("  stepout, sout       Step out of current scope");
        Console.WriteLine("  continue, c         Continue until breakpoint/end");
        Console.WriteLine("  run <line>          Run to specific line");
        Console.WriteLine("  reset               Restart execution");

        WriteLineColored("\nBreakpoints:", ConsoleColor.Yellow);
        Console.WriteLine("  break <line> [cond] Set breakpoint (optional condition)");
        Console.WriteLine("  breakpoints, bps    List all breakpoints");
        Console.WriteLine("  delete <id>         Remove breakpoint");
        Console.WriteLine("  toggle <id>         Enable/disable breakpoint");

        WriteLineColored("\nWatches:", ConsoleColor.Yellow);
        Console.WriteLine("  watch <expr>        Add watch expression");
        Console.WriteLine("  watches, ws         List all watches");
        Console.WriteLine("  unwatch <id>        Remove watch");

        WriteLineColored("\nInspection:", ConsoleColor.Yellow);
        Console.WriteLine("  vars [filter]       Show variables (optional name filter)");
        Console.WriteLine("  inspect <var>       Deep inspect a variable");
        Console.WriteLine("  inspect-line, il    Inspect all expressions on current line");
        Console.WriteLine("  eval <expr>         Evaluate a Liquid expression");
        Console.WriteLine("  origin <var>        Show where a variable's value came from");
        Console.WriteLine("  trace <var>         Show full transformation trace");

        WriteLineColored("\nDisplay:", ConsoleColor.Yellow);
        Console.WriteLine("  output, out         Show output generated so far");
        Console.WriteLine("  template, tpl       Show full template with line numbers");
        Console.WriteLine("  context, ctx        Show current position in template");
        Console.WriteLine("  scope               Show current scope stack");
        Console.WriteLine("  state               Show full debugger state");
        Console.WriteLine("  render              Show DotLiquid full render output");

        WriteLineColored("\nSettings:", ConsoleColor.Yellow);
        Console.WriteLine("  set <name> <value>  Change display settings");
        Console.WriteLine("  load <tpl> <data>   Load template and data files");

        WriteLineColored("\nOther:", ConsoleColor.Yellow);
        Console.WriteLine("  help, h, ?          Show this help");
        Console.WriteLine("  quit, q, exit       Exit debugger");
    }

    private void PrintBanner()
    {
        WriteLineColored(@"
  ╔══════════════════════════════════════════════╗
  ║   DotLiquid Template Debugger               ║
  ║   Step-by-step Liquid template execution     ║
  ╚══════════════════════════════════════════════╝
", ConsoleColor.Cyan);
        WriteLineColored("Type 'help' for available commands.", ConsoleColor.Gray);
    }
}
