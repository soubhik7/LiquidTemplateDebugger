using System.Globalization;
using System.Xml.Linq;
using DotLiquid;
using LiquidTemplateDebugger.Models;
using LiquidTemplateDebugger.Engine.Interfaces;
using Newtonsoft.Json.Linq;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Loads input data from various formats (JSON, XML, CSV, key=value) and converts
/// to DotLiquid Hash objects with origin tracking.
/// </summary>
public class InputDataLoader : IInputDataLoader
{
    public (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromFile(string filePath)
    {
        var content = File.ReadAllText(filePath);
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        var format = extension switch
        {
            ".json" => "JSON",
            ".xml" => "XML",
            ".csv" => "CSV",
            _ => "TEXT"
        };

        return LoadFromString(content, format);
    }

    public (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromString(string content, string format)
    {
        var normalizedFormat = string.IsNullOrWhiteSpace(format) ? "TEXT" : format.Trim().ToUpperInvariant();

        var (hash, origins) = normalizedFormat switch
        {
            "JSON" => LoadJson(content, "JSON"),
            "XML" => LoadXml(content, "XML"),
            "CSV" => LoadCsv(content, "CSV"),
            "TEXT" => LoadKeyValue(content, "TEXT"),
            _ => throw new InvalidOperationException($"Unsupported input format '{format}'. Supported formats: JSON, XML, CSV, TEXT.")
        };

        // Wrap the data in a "content" property similar to Azure Logic Apps Liquid transformation
        return WrapInContentProperty(hash, origins);
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadJson(string json, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var token = JToken.Parse(json);

        if (token is not JObject jObj)
        {
            token = new JObject { ["value"] = token };
            jObj = (JObject)token;
        }

        FlattenAndTrackJson(jObj, string.Empty, origins, format);
        var hash = Hash.FromDictionary(ConvertObjectDictionary(jObj));
        return (hash, origins);
    }

    private void FlattenAndTrackJson(JToken token, string path, Dictionary<string, ValueOrigin> origins, string format)
    {
        switch (token)
        {
            case JObject obj:
                if (!string.IsNullOrEmpty(path))
                {
                    origins[path] = new ValueOrigin
                    {
                        SourcePath = path,
                        SourceFormat = format,
                        OriginalValue = "{Object}"
                    };
                }

                foreach (var prop in obj.Properties())
                {
                    var childPath = string.IsNullOrEmpty(path) ? prop.Name : $"{path}.{prop.Name}";
                    FlattenAndTrackJson(prop.Value, childPath, origins, format);
                }
                break;

            case JArray arr:
                origins[path] = new ValueOrigin
                {
                    SourcePath = path,
                    SourceFormat = format,
                    OriginalValue = $"[Array: {arr.Count} items]"
                };

                for (int i = 0; i < arr.Count; i++)
                {
                    var childPath = $"{path}[{i}]";
                    FlattenAndTrackJson(arr[i], childPath, origins, format);
                }
                break;

            case JValue value:
                origins[path] = new ValueOrigin
                {
                    SourcePath = path,
                    SourceFormat = format,
                    OriginalValue = value.Value
                };
                break;
        }
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadXml(string xml, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var doc = XDocument.Parse(xml, LoadOptions.PreserveWhitespace);

        if (doc.Root == null)
            return (Hash.FromDictionary(new Dictionary<string, object>()), origins);

        var rootPath = doc.Root.Name.LocalName;
        var converted = ConvertXmlElement(doc.Root, rootPath, origins, format);
        var wrapper = new Dictionary<string, object?> { [rootPath] = converted };

        return (Hash.FromDictionary(ConvertDictionaryToHashFriendly(wrapper)), origins);
    }

    private object? ConvertXmlElement(XElement element, string path, Dictionary<string, ValueOrigin> origins, string format)
    {
        var children = element.Elements().ToList();
        var hasAttributes = element.HasAttributes;
        var directText = string.Concat(element.Nodes().OfType<XText>().Select(t => t.Value)).Trim();

        if (children.Count == 0 && !hasAttributes)
        {
            var scalar = ParseLooseScalar(element.Value);
            origins[path] = new ValueOrigin
            {
                SourcePath = path,
                SourceFormat = format,
                OriginalValue = scalar
            };
            return scalar;
        }

        origins[path] = new ValueOrigin
        {
            SourcePath = path,
            SourceFormat = format,
            OriginalValue = "{Element}"
        };

        var dict = new Dictionary<string, object?>();

        foreach (var attr in element.Attributes())
        {
            var attrKey = $"@{attr.Name.LocalName}";
            var attrPath = $"{path}.{attrKey}";
            var attrValue = attr.Value;
            dict[attrKey] = attrValue;
            origins[attrPath] = new ValueOrigin
            {
                SourcePath = attrPath,
                SourceFormat = format,
                OriginalValue = attrValue
            };
        }

        foreach (var group in children.GroupBy(e => e.Name.LocalName))
        {
            var childPath = $"{path}.{group.Key}";
            var items = group.ToList();

            if (items.Count == 1)
            {
                dict[group.Key] = ConvertXmlElement(items[0], childPath, origins, format);
            }
            else
            {
                var list = new List<object?>();
                for (int i = 0; i < items.Count; i++)
                {
                    list.Add(ConvertXmlElement(items[i], $"{childPath}[{i}]", origins, format));
                }

                dict[group.Key] = list;
                origins[childPath] = new ValueOrigin
                {
                    SourcePath = childPath,
                    SourceFormat = format,
                    OriginalValue = $"[Array: {items.Count} items]"
                };
            }
        }

        if (!string.IsNullOrEmpty(directText))
        {
            dict["#text"] = ParseLooseScalar(directText);
            origins[$"{path}.#text"] = new ValueOrigin
            {
                SourcePath = $"{path}.#text",
                SourceFormat = format,
                OriginalValue = directText
            };
        }

        return dict;
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadKeyValue(string text, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var dict = new Dictionary<string, object?>();

        var lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        var valueLines = new List<string>();

        for (int i = 0; i < lines.Length; i++)
        {
            var rawLine = lines[i];
            var trimmed = rawLine.Trim();

            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#'))
                continue;

            var eqIdx = rawLine.IndexOf('=');
            if (eqIdx > 0)
            {
                var key = rawLine[..eqIdx].Trim();
                var value = rawLine[(eqIdx + 1)..].Trim();
                var parsedValue = ParseLooseScalar(value);
                dict[key] = parsedValue;
                origins[key] = new ValueOrigin
                {
                    SourcePath = key,
                    SourceFormat = format,
                    OriginalValue = parsedValue,
                    SourceLineNumber = i + 1
                };
            }
            else
            {
                valueLines.Add(rawLine);
            }
        }

        if (valueLines.Count > 0 || dict.Count == 0)
        {
            var scalarText = string.Join(Environment.NewLine, valueLines).Trim();
            dict["value"] = scalarText;
            origins["value"] = new ValueOrigin
            {
                SourcePath = "value",
                SourceFormat = format,
                OriginalValue = scalarText
            };
        }

        return (Hash.FromDictionary(ConvertDictionaryToHashFriendly(dict)), origins);
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadCsv(string csv, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var records = ParseCsvRecords(csv);

        if (records.Count == 0)
            return (Hash.FromDictionary(new Dictionary<string, object>()), origins);

        var headers = records[0]
            .Select((header, index) => string.IsNullOrWhiteSpace(header) ? $"column{index + 1}" : header.Trim())
            .ToList();

        var rows = new List<object>();
        for (int i = 1; i < records.Count; i++)
        {
            var record = records[i];
            var row = new Dictionary<string, object?>();

            for (int j = 0; j < headers.Count; j++)
            {
                var key = headers[j];
                var value = j < record.Count ? ParseCsvValue(record[j]) : null;
                row[key] = value;

                var path = $"rows[{i - 1}].{key}";
                origins[path] = new ValueOrigin
                {
                    SourcePath = path,
                    SourceFormat = format,
                    OriginalValue = value,
                    SourceLineNumber = i + 1
                };
            }

            rows.Add(Hash.FromDictionary(ConvertDictionaryToHashFriendly(row)));
        }

        origins["rows"] = new ValueOrigin
        {
            SourcePath = "rows",
            SourceFormat = format,
            OriginalValue = $"[Array: {rows.Count} items]"
        };

        var dict = new Dictionary<string, object>
        {
            ["rows"] = rows
        };

        return (Hash.FromDictionary(dict), origins);
    }

    private List<List<string>> ParseCsvRecords(string csv)
    {
        var records = new List<List<string>>();
        var currentRecord = new List<string>();
        var currentField = new System.Text.StringBuilder();
        var normalized = csv.Replace("\r\n", "\n").Replace('\r', '\n');
        var inQuotes = false;

        for (int i = 0; i < normalized.Length; i++)
        {
            var c = normalized[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < normalized.Length && normalized[i + 1] == '"')
                {
                    currentField.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }

                continue;
            }

            if (c == ',' && !inQuotes)
            {
                currentRecord.Add(currentField.ToString());
                currentField.Clear();
                continue;
            }

            if (c == '\n' && !inQuotes)
            {
                currentRecord.Add(currentField.ToString());
                currentField.Clear();

                if (currentRecord.Any(field => !string.IsNullOrEmpty(field)))
                    records.Add(currentRecord);

                currentRecord = new List<string>();
                continue;
            }

            currentField.Append(c);
        }

        currentRecord.Add(currentField.ToString());
        if (currentRecord.Any(field => !string.IsNullOrEmpty(field)))
            records.Add(currentRecord);

        if (inQuotes)
            throw new InvalidOperationException("CSV input parsing failed: unmatched quote detected.");

        return records;
    }

    private object? ParseCsvValue(string value)
    {
        var trimmed = value.Trim();

        if (trimmed.Length == 0)
            return null;

        if (string.Equals(trimmed, "null", StringComparison.OrdinalIgnoreCase))
            return null;

        if (bool.TryParse(trimmed, out var boolVal))
            return boolVal;

        if (long.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var longVal))
            return longVal;

        if (decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalVal))
            return decimalVal;

        return trimmed;
    }

    private object? ParseLooseScalar(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        if (string.Equals(value, "null", StringComparison.OrdinalIgnoreCase))
            return null;

        if (bool.TryParse(value, out var boolVal))
            return boolVal;

        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var longVal))
            return longVal;

        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalVal))
            return decimalVal;

        return value;
    }

    private static Dictionary<string, object> ConvertObjectDictionary(JObject obj)
    {
        var dict = new Dictionary<string, object>();
        foreach (var prop in obj.Properties())
        {
            dict[prop.Name] = ConvertJToken(prop.Value);
        }
        return dict;
    }

    private static object ConvertJToken(JToken token)
    {
        return token switch
        {
            JObject obj => Hash.FromDictionary(ConvertObjectDictionary(obj)),
            JArray arr => arr.Select(ConvertJToken).ToList(),
            JValue val => val.Value ?? "",
            _ => token.ToString()
        };
    }

    private static Dictionary<string, object> ConvertDictionaryToHashFriendly(Dictionary<string, object?> source)
    {
        return source.ToDictionary(
            kvp => kvp.Key,
            kvp => ConvertToHashFriendlyValue(kvp.Value));
    }

    private static object ConvertToHashFriendlyValue(object? value)
    {
        return value switch
        {
            null => "",
            Dictionary<string, object?> dict => Hash.FromDictionary(ConvertDictionaryToHashFriendly(dict)),
            IList<object?> list => list.Select(ConvertToHashFriendlyValue).ToList(),
            _ => value
        };
    }

    /// <summary>
    /// Wraps the input data in a "content" property, similar to Azure Logic Apps Liquid transformation.
    /// This allows templates to access data as {{ content.propertyName }} instead of {{ propertyName }}.
    /// </summary>
    private (Hash hash, Dictionary<string, ValueOrigin> origins) WrapInContentProperty(
        Hash originalHash,
        Dictionary<string, ValueOrigin> originalOrigins)
    {
        // Create new origins dictionary with "content." prefix
        var wrappedOrigins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        
        // Add origin for the content wrapper itself
        wrappedOrigins["content"] = new ValueOrigin
        {
            SourcePath = "content",
            SourceFormat = "wrapper",
            OriginalValue = "{Content Wrapper}"
        };

        // Prefix all existing origins with "content."
        foreach (var kvp in originalOrigins)
        {
            var newPath = $"content.{kvp.Key}";
            var origin = kvp.Value;
            
            // Update the source path to include content prefix
            wrappedOrigins[newPath] = new ValueOrigin
            {
                SourcePath = newPath,
                SourceFormat = origin.SourceFormat,
                OriginalValue = origin.OriginalValue,
                SourceLineNumber = origin.SourceLineNumber
            };
        }

        // Wrap the hash in a content property
        var wrappedDict = new Dictionary<string, object>
        {
            ["content"] = originalHash
        };

        var wrappedHash = Hash.FromDictionary(wrappedDict);
        
        return (wrappedHash, wrappedOrigins);
    }
    
    /// <summary>
    /// Get supported input formats.
    /// </summary>
    public IEnumerable<string> GetSupportedFormats()
    {
        return new[] { "JSON", "XML", "CSV", "TEXT" };
    }
    
    /// <summary>
    /// Detect format from content.
    /// </summary>
    public string DetectFormat(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return "TEXT";
        
        var trimmed = content.TrimStart();
        
        // Try JSON
        if (trimmed.StartsWith("{") || trimmed.StartsWith("["))
        {
            try
            {
                JToken.Parse(content);
                return "JSON";
            }
            catch { }
        }
        
        // Try XML
        if (trimmed.StartsWith("<"))
        {
            try
            {
                XDocument.Parse(content);
                return "XML";
            }
            catch { }
        }
        
        // Check for CSV (has commas and multiple lines)
        if (content.Contains(',') && content.Contains('\n'))
        {
            var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length > 1)
                return "CSV";
        }
        
        return "TEXT";
    }
}
