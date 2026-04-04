using System.Text.RegularExpressions;
using LiquidTemplateDebugger.Models;
using LiquidTemplateDebugger.Engine.Interfaces;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Parses a Liquid template into individual debuggable elements with line/column tracking.
/// </summary>
public class TemplateParser : ITemplateParser
{
    // Matches {{ output }}, {% tag %}, and {%- tag -%} variations
    private static readonly Regex LiquidTokenRegex = new(
        @"(\{\{-?\s*.*?\s*-?\}\}|\{%-?\s*.*?\s*-?%\})",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex OutputRegex = new(
        @"^\{\{-?\s*(.*?)\s*-?\}\}$",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex TagRegex = new(
        @"^\{%-?\s*(\w+)(.*?)\s*-?%\}$",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly HashSet<string> BlockOpenTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "if", "unless", "for", "case", "capture", "comment", "raw",
        "tablerow", "block", "ifchanged"
    };

    private static readonly HashSet<string> BlockCloseTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "endif", "endunless", "endfor", "endcase", "endcapture",
        "endcomment", "endraw", "endtablerow", "endblock", "endifchanged"
    };

    private static readonly HashSet<string> BlockMiddleTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "else", "elsif", "when"
    };

    public List<TemplateElement> Parse(string template)
    {
        var elements = new List<TemplateElement>();
        var lineMap = BuildLineMap(template);
        int currentPos = 0;
        int depth = 0;
        var depthStack = new Stack<int>(); // Track parent element indices

        var matches = LiquidTokenRegex.Matches(template);

        foreach (Match match in matches)
        {
            // Add literal text before this token
            if (match.Index > currentPos)
            {
                var literalText = template[currentPos..match.Index];
                if (!string.IsNullOrEmpty(literalText))
                {
                    var (line, col) = GetLineAndColumn(lineMap, currentPos);
                    elements.Add(new TemplateElement
                    {
                        LineNumber = line,
                        ColumnStart = col,
                        ColumnEnd = col + literalText.Length,
                        RawText = literalText,
                        ElementType = TemplateElementType.Literal,
                        Depth = depth
                    });
                }
            }

            // Process the token
            var tokenText = match.Value;
            var (tokenLine, tokenCol) = GetLineAndColumn(lineMap, match.Index);

            var outputMatch = OutputRegex.Match(tokenText);
            if (outputMatch.Success)
            {
                elements.Add(new TemplateElement
                {
                    LineNumber = tokenLine,
                    ColumnStart = tokenCol,
                    ColumnEnd = tokenCol + tokenText.Length,
                    RawText = tokenText,
                    ElementType = TemplateElementType.Output,
                    Expression = outputMatch.Groups[1].Value.Trim(),
                    Depth = depth
                });
            }
            else
            {
                var tagMatch = TagRegex.Match(tokenText);
                if (tagMatch.Success)
                {
                    var tagName = tagMatch.Groups[1].Value.ToLowerInvariant();
                    var tagArgs = tagMatch.Groups[2].Value.Trim();

                    var elementType = tagName == "comment"
                        ? TemplateElementType.Comment
                        : tagName == "raw"
                            ? TemplateElementType.RawBlock
                            : TemplateElementType.Tag;

                    // Handle depth changes
                    if (BlockCloseTags.Contains(tagName))
                    {
                        depth = Math.Max(0, depth - 1);
                    }
                    else if (BlockMiddleTags.Contains(tagName))
                    {
                        // else/elsif/when are at the depth of the parent block
                        depth = Math.Max(0, depth - 1);
                    }

                    var element = new TemplateElement
                    {
                        LineNumber = tokenLine,
                        ColumnStart = tokenCol,
                        ColumnEnd = tokenCol + tokenText.Length,
                        RawText = tokenText,
                        ElementType = elementType,
                        TagName = tagName,
                        Expression = tagArgs,
                        Depth = depth
                    };

                    if (depthStack.Count > 0)
                    {
                        element.ParentIndex = depthStack.Peek();
                        elements[depthStack.Peek()].ChildIndices.Add(elements.Count);
                    }

                    elements.Add(element);

                    if (BlockOpenTags.Contains(tagName))
                    {
                        depthStack.Push(elements.Count - 1);
                        depth++;
                    }
                    else if (BlockCloseTags.Contains(tagName) && depthStack.Count > 0)
                    {
                        depthStack.Pop();
                    }
                    else if (BlockMiddleTags.Contains(tagName))
                    {
                        depth++;
                    }
                }
            }

            currentPos = match.Index + match.Length;
        }

        // Add any trailing literal text
        if (currentPos < template.Length)
        {
            var literalText = template[currentPos..];
            if (!string.IsNullOrEmpty(literalText))
            {
                var (line, col) = GetLineAndColumn(lineMap, currentPos);
                elements.Add(new TemplateElement
                {
                    LineNumber = line,
                    ColumnStart = col,
                    ColumnEnd = col + literalText.Length,
                    RawText = literalText,
                    ElementType = TemplateElementType.Literal,
                    Depth = depth
                });
            }
        }

        return elements;
    }
    
    /// <summary>
    /// Validate template syntax without full parsing.
    /// </summary>
    public ValidationResult ValidateSyntax(string templateContent)
    {
        try
        {
            Parse(templateContent);
            return Models.ValidationResult.Success();
        }
        catch (Exception ex)
        {
            return Models.ValidationResult.Failure(ex.Message);
        }
    }
    
    /// <summary>
    /// Get line and column information for a character position.
    /// </summary>
    public (int line, int column) GetPosition(string template, int charIndex)
    {
        var lineMap = BuildLineMap(template);
        return GetLineAndColumn(lineMap, charIndex);
    }

    /// <summary>
    /// Returns the original template with line numbers prepended.
    /// </summary>
    public static string GetNumberedTemplate(string template)
    {
        var lines = template.Split('\n');
        var maxWidth = lines.Length.ToString().Length;
        return string.Join('\n', lines.Select((l, i) =>
            $"{(i + 1).ToString().PadLeft(maxWidth)}| {l}"));
    }

    private static List<int> BuildLineMap(string text)
    {
        var lineStarts = new List<int> { 0 };
        for (int i = 0; i < text.Length; i++)
        {
            if (text[i] == '\n')
                lineStarts.Add(i + 1);
        }
        return lineStarts;
    }

    private static (int line, int column) GetLineAndColumn(List<int> lineMap, int position)
    {
        int line = 1;
        for (int i = lineMap.Count - 1; i >= 0; i--)
        {
            if (position >= lineMap[i])
            {
                line = i + 1;
                return (line, position - lineMap[i] + 1);
            }
        }
        return (line, position + 1);
    }
}
