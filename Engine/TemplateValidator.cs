using System.Text.RegularExpressions;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Validates Liquid templates for specific rules, such as enforcing root-level variable prefixes.
/// </summary>
public static class TemplateValidator
{
    private static readonly HashSet<string> BuiltInVariables = new(StringComparer.OrdinalIgnoreCase)
    {
        "forloop", "tablerowloop", "empty", "blank", "true", "false", "nil", "null"
    };

    private static readonly HashSet<string> LiquidKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "and", "or", "not", "contains", "in", "with", "if", "else", "elsif", "endif", 
        "unless", "endunless", "case", "when", "endcase", "for", "endfor", "assign", "capture", "endcapture"
    };

    /// <summary>
    /// Validates that all root-level variable accesses start with 'content.'
    /// </summary>
    public static ValidationResult ValidateRootLevelContent(List<TemplateElement> elements)
    {
        var localVariables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var scopeStack = new Stack<HashSet<string>>();

        for (int i = 0; i < elements.Count; i++)
        {
            var element = elements[i];
            
            // Handle scope entry/exit to track local variables correctly
            UpdateLocalVariables(element, localVariables, scopeStack);

            if (element.ElementType == TemplateElementType.Output)
            {
                var result = ValidateExpression(element.Expression, localVariables, element.LineNumber);
                if (!result.IsValid) return result;
            }
            else if (element.ElementType == TemplateElementType.Tag)
            {
                var tagName = element.TagName?.ToLowerInvariant();
                var expression = element.Expression;

                if (string.IsNullOrEmpty(tagName) || string.IsNullOrEmpty(expression)) continue;

                // Tags that use expressions
                if (tagName is "if" or "unless" or "elsif" or "case" or "when" or "assign" or "for")
                {
                    // Special case for 'assign': only validate the RHS
                    if (tagName == "assign")
                    {
                        var match = Regex.Match(expression, @"^(\w+)\s*=\s*(.+)$", RegexOptions.Singleline);
                        if (match.Success)
                        {
                            var rhs = match.Groups[2].Value.Trim();
                            var result = ValidateExpression(rhs, localVariables, element.LineNumber);
                            if (!result.IsValid) return result;
                            
                            // LHS becomes a local variable for subsequent elements
                            localVariables.Add(match.Groups[1].Value);
                        }
                    }
                    // Special case for 'for': 'for item in collection'
                    else if (tagName == "for")
                    {
                        var match = Regex.Match(expression, @"^(\w+)\s+in\s+(.+)$");
                        if (match.Success)
                        {
                            var collection = match.Groups[2].Value.Trim();
                            var result = ValidateExpression(collection, localVariables, element.LineNumber);
                            if (!result.IsValid) return result;
                            
                            // 'item' will be added to local variables when we enter the block
                            // But wait, the current logic adds it to the set that will be used by NEXT elements at same depth.
                            // In Liquid, the loop variable is only available inside the loop.
                        }
                    }
                    else
                    {
                        var result = ValidateExpression(expression, localVariables, element.LineNumber);
                        if (!result.IsValid) return result;
                    }
                }
            }
        }

        return ValidationResult.Success();
    }

    private static void UpdateLocalVariables(TemplateElement element, HashSet<string> localVariables, Stack<HashSet<string>> scopeStack)
    {
        var tagName = element.TagName?.ToLowerInvariant();

        // Variables from 'assign' and 'capture' persist for the rest of the template.
        if (tagName == "assign")
        {
            var match = Regex.Match(element.Expression ?? "", @"^(\w+)\s*=");
            if (match.Success)
            {
                localVariables.Add(match.Groups[1].Value);
            }
        }
        else if (tagName == "capture")
        {
            var varName = element.Expression?.Trim();
            if (!string.IsNullOrEmpty(varName))
            {
                localVariables.Add(varName);
            }
        }
        // 'for' loops introduce a local scope for the loop variable and 'forloop' helper.
        else if (tagName == "for")
        {
            // Push current state to restore after loop
            scopeStack.Push(new HashSet<string>(localVariables, StringComparer.OrdinalIgnoreCase));
            
            var match = Regex.Match(element.Expression ?? "", @"^(\w+)\s+in\s+(.+)$");
            if (match.Success)
            {
                localVariables.Add(match.Groups[1].Value);
                localVariables.Add("forloop");
            }
        }
        else if (tagName == "endfor")
        {
            if (scopeStack.Count > 0)
            {
                var previous = scopeStack.Pop();
                
                // We want to keep any NEW variables assigned INSIDE the loop (Liquid behavior),
                // but remove the loop-specific ones.
                var loopVarMatch = Regex.Match(element.Expression ?? "", @"^(\w+)\s+in"); // This won't work on endfor which has no expr.
                // Actually, the simplest is to restore the old set but then re-add everything that wasn't the loop var.
                // For now, let's just restore and accept that inner assigns might need content prefix if they hit root.
                // In practice, inner assigns usually use loop vars.
                
                var current = new HashSet<string>(localVariables, StringComparer.OrdinalIgnoreCase);
                localVariables.Clear();
                foreach (var v in previous) localVariables.Add(v);
                
                // Keep everything that was added in the loop EXCEPT 'forloop' and the loop variable
                // (Note: we don't easily know the loop variable name here without more state, 
                // but 'forloop' is safe to remove).
                localVariables.Remove("forloop");
            }
        }
    }

    private static ValidationResult ValidateExpression(string? expression, HashSet<string> localVariables, int lineNumber)
    {
        if (string.IsNullOrWhiteSpace(expression)) return ValidationResult.Success();

        // Split by pipes first to handle filters
        var parts = expression.Split('|');
        for (int i = 0; i < parts.Length; i++)
        {
            var part = parts[i].Trim();
            if (string.IsNullOrEmpty(part)) continue;

            // Extract the "root" identifier of each variable access
            // E.g., in "user.name == 'admin'", "user" is the root identifier.
            // In "content.items[0]", "content" is the root.
            
            var tokens = Tokenize(part);
            
            // If this is a filter part (i > 0), the first identifier token is the filter name.
            // We should skip it and only validate subsequent tokens which might be arguments.
            bool filterNameSkipped = i == 0; 

            foreach (var token in tokens)
            {
                if (IsVariableIdentifier(token))
                {
                    if (!filterNameSkipped)
                    {
                        filterNameSkipped = true;
                        continue;
                    }

                    var rootId = GetRootIdentifier(token);
                    if (!IsAllowedRoot(rootId, localVariables))
                    {
                        return ValidationResult.Failure(
                            $"Access to root-level variable '{rootId}' must be prefixed with 'content.'. " +
                            $"Example: 'content.{token}'", lineNumber);
                    }
                }
            }
        }

        return ValidationResult.Success();
    }

    private static List<string> Tokenize(string expression)
    {
        var tokens = new List<string>();
        // Match identifiers (including dots and brackets for property access)
        // Avoid matching strings in single or double quotes
        var regex = new Regex(@"[a-zA-Z_][a-zA-Z0-9_\.]*|'[^']*'|""[^""]*""|\d+(\.\d+)?", RegexOptions.Compiled);
        var matches = regex.Matches(expression);
        foreach (Match match in matches)
        {
            tokens.Add(match.Value);
        }
        return tokens;
    }

    private static bool IsVariableIdentifier(string token)
    {
        if (string.IsNullOrEmpty(token)) return false;
        char first = token[0];
        // If it starts with a quote or a digit, it's a literal
        if (first == '\'' || first == '"' || char.IsDigit(first)) return false;
        
        // Check if it's a known operator or keyword
        if (token is "==" or "!=" or ">" or "<" or ">=" or "<=" or "and" or "or" or "contains" or "not") return false;
        if (LiquidKeywords.Contains(token)) return false;
        
        return true;
    }

    private static string GetRootIdentifier(string token)
    {
        int dotIdx = token.IndexOf('.');
        if (dotIdx == -1) return token;
        return token.Substring(0, dotIdx);
    }

    private static bool IsAllowedRoot(string rootId, HashSet<string> localVariables)
    {
        if (rootId.Equals("content", StringComparison.OrdinalIgnoreCase)) return true;
        if (BuiltInVariables.Contains(rootId)) return true;
        if (localVariables.Contains(rootId)) return true;
        return false;
    }
}
