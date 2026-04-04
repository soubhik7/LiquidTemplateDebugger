using System;
using System.Collections.Generic;
using System.IO;
using System.Xml;
using System.Xml.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine;

public record ValidationResult(bool IsValid, string? ErrorMessage, int? SourceLineNumber);

public static class OutputValidator
{
    public static ValidationResult Validate(string output, string format, List<OutputRangeMapping> mappings)
    {
        if (string.IsNullOrWhiteSpace(output))
            return new ValidationResult(true, null, null);

        return format.ToLowerInvariant() switch
        {
            "json" => ValidateJson(output, mappings),
            "xml" => ValidateXml(output, mappings),
            "csv" => ValidateCsv(output, mappings),
            _ => new ValidationResult(false, $"Unknown validation format: {format}", null)
        };
    }

    private static ValidationResult ValidateJson(string output, List<OutputRangeMapping> mappings)
    {
        try
        {
            using var stringReader = new StringReader(output);
            using var jsonReader = new JsonTextReader(stringReader);
            while (jsonReader.Read())
            {
                // Verify all tokens
            }
            return new ValidationResult(true, null, null);
        }
        catch (JsonReaderException ex)
        {
            int charIndex = GetAbsoluteIndex(output, ex.LineNumber, ex.LinePosition);
            int? templateLine = ResolveTemplateLine(charIndex, mappings);
            return new ValidationResult(false, $"JSON Error: {ex.Message}", templateLine);
        }
        catch (Exception ex)
        {
            return new ValidationResult(false, $"JSON Error: {ex.Message}", null);
        }
    }

    private static ValidationResult ValidateXml(string output, List<OutputRangeMapping> mappings)
    {
        try
        {
            using var stringReader = new StringReader(output);
            var settings = new XmlReaderSettings { ConformanceLevel = ConformanceLevel.Document };
            using var xmlReader = XmlReader.Create(stringReader, settings);
            while (xmlReader.Read())
            {
                // Verify all tags
            }
            return new ValidationResult(true, null, null);
        }
        catch (XmlException ex)
        {
            int charIndex = GetAbsoluteIndex(output, ex.LineNumber, ex.LinePosition);
            int? templateLine = ResolveTemplateLine(charIndex, mappings);
            return new ValidationResult(false, $"XML Error: {ex.Message}", templateLine);
        }
        catch (Exception ex)
        {
            return new ValidationResult(false, $"XML Error: {ex.Message}", null);
        }
    }

    private static ValidationResult ValidateCsv(string output, List<OutputRangeMapping> mappings)
    {
        var lines = output.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        int expectedCols = -1;

        int absoluteIndex = 0;

        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            try
            {
                var cols = ParseCsvLine(line);
                if (line.Trim().Length > 0)
                {
                    if (expectedCols == -1)
                        expectedCols = cols.Count;
                    else if (cols.Count != expectedCols)
                        throw new Exception($"Expected {expectedCols} columns, found {cols.Count} columns.");
                }
            }
            catch (Exception ex)
            {
                // Usually position is at the start of the invalid line
                int? templateLine = ResolveTemplateLine(absoluteIndex, mappings);
                return new ValidationResult(false, $"CSV Error on line {i + 1}: {ex.Message}", templateLine);
            }

            absoluteIndex += line.Length;
            if (i < lines.Length - 1)
            {
                // Add the length of the newline, this is tricky because we split by multiple types
                // We'll approximate by finding the newline chars or simply adding 1 if it was \n
                int nextStart = output.IndexOf(lines[i + 1], absoluteIndex, StringComparison.Ordinal);
                if (nextStart >= 0)
                {
                    absoluteIndex = nextStart;
                }
            }
        }

        return new ValidationResult(true, null, null);
    }

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        int startPos = 0;
        
        for (int i = 0; i < line.Length; i++)
        {
            if (line[i] == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    i++; // escaped quote
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (line[i] == ',' && !inQuotes)
            {
                result.Add(line.Substring(startPos, i - startPos));
                startPos = i + 1;
            }
        }

        if (inQuotes)
            throw new Exception("Unclosed quote");

        result.Add(line.Substring(startPos));
        return result;
    }

    private static int GetAbsoluteIndex(string text, int lineNumber, int linePosition)
    {
        int currentLine = 1;
        int index = 0;
        while (currentLine < lineNumber && index < text.Length)
        {
            if (text[index] == '\n')
            {
                currentLine++;
            }
            index++;
        }
        
        // Add linePosition minus 1 since linePosition is 1-indexed.
        // Also cap it by text length.
        index += Math.Max(0, linePosition - 1);
        return Math.Min(index, text.Length - 1);
    }

    private static int? ResolveTemplateLine(int charIndex, List<OutputRangeMapping> mappings)
    {
        if (charIndex < 0) return null;

        foreach (var map in mappings)
        {
            if (charIndex >= map.StartIndex && charIndex < map.StartIndex + map.Length)
            {
                return map.TemplateLineNumber;
            }
        }

        // Fallback: If it's technically beyond mapping (end of string), return the closest previous mapping
        if (charIndex > 0)
        {
            for (int i = mappings.Count - 1; i >= 0; i--)
            {
                var map = mappings[i];
                if (map.StartIndex + map.Length <= charIndex)
                {
                    return map.TemplateLineNumber;
                }
            }
        }

        return null;
    }
}
