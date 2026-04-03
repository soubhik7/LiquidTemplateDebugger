using System.Globalization;
using System.Text;
using System.Xml.Linq;
using DotLiquid;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Converts between different data formats (JSON, XML, CSV, TEXT).
/// </summary>
public class FormatConverter
{
    /// <summary>
    /// Convert rendered output to specified format.
    /// </summary>
    public string ConvertOutput(string output, string targetFormat, string sourceFormat = "TEXT")
    {
        output ??= string.Empty;
        targetFormat = NormalizeFormat(targetFormat);
        sourceFormat = NormalizeFormat(sourceFormat);

        return targetFormat switch
        {
            "JSON" => ConvertToJson(output, sourceFormat),
            "XML" => ConvertToXml(output, sourceFormat),
            "CSV" => ConvertToCsv(output, sourceFormat),
            "TEXT" => ConvertToText(output, sourceFormat),
            _ => throw new InvalidOperationException($"Unsupported target format '{targetFormat}'. Supported formats: JSON, XML, CSV, TEXT.")
        };
    }

    /// <summary>
    /// Convert Hash/object to JSON string.
    /// </summary>
    public string ToJson(object data, bool formatted = true)
    {
        var settings = new JsonSerializerSettings
        {
            Formatting = formatted ? Formatting.Indented : Formatting.None,
            NullValueHandling = NullValueHandling.Include
        };

        return JsonConvert.SerializeObject(ConvertHashToObject(data), settings);
    }

    /// <summary>
    /// Convert Hash/object to XML string.
    /// </summary>
    public string ToXml(object data, string rootName = "root")
    {
        var normalizedRootName = SanitizeXmlName(string.IsNullOrWhiteSpace(rootName) ? "root" : rootName);
        var xDoc = new XDocument(new XDeclaration("1.0", "utf-8", null));
        var root = new XElement(normalizedRootName);

        AddToXmlElement(root, ConvertHashToObject(data));
        xDoc.Add(root);

        return xDoc.ToString();
    }

    /// <summary>
    /// Convert an object, array of objects, or scalar value to CSV string.
    /// </summary>
    public string ToCsv(object data)
    {
        var converted = ConvertHashToObject(data);

        if (TryExtractTabularRows(converted, out var rows))
        {
            return ArrayToCsv(rows);
        }

        if (converted is Dictionary<string, object?> dict)
        {
            return ArrayToCsv(new List<Dictionary<string, object?>> { dict });
        }

        return ScalarToCsv(converted);
    }

    private string ConvertToJson(string output, string sourceFormat)
    {
        if (sourceFormat == "JSON")
        {
            var parsedJson = JToken.Parse(output);
            return parsedJson.ToString(Formatting.Indented);
        }

        return sourceFormat switch
        {
            "XML" => ConvertXmlStringToJson(output),
            "CSV" => ConvertCsvStringToJson(output),
            "TEXT" => ConvertTextStringToJson(output),
            _ => ConvertTextStringToJson(output)
        };
    }

    private string ConvertToXml(string output, string sourceFormat)
    {
        if (sourceFormat == "XML")
        {
            var parsedXml = XDocument.Parse(output, LoadOptions.PreserveWhitespace);
            return parsedXml.ToString();
        }

        return sourceFormat switch
        {
            "JSON" => JsonToXml(JToken.Parse(output)),
            "CSV" => CsvToXml(output),
            "TEXT" => TextToXml(output),
            _ => TextToXml(output)
        };
    }

    private string ConvertToCsv(string output, string sourceFormat)
    {
        if (sourceFormat == "CSV")
            return NormalizeCsv(output);

        return sourceFormat switch
        {
            "JSON" => JsonToCsv(JToken.Parse(output)),
            "XML" => XmlToCsv(output),
            "TEXT" => TextToCsv(output),
            _ => TextToCsv(output)
        };
    }

    private string ConvertToText(string output, string sourceFormat)
    {
        return sourceFormat switch
        {
            "JSON" => JsonToText(JToken.Parse(output)),
            "XML" => XmlToText(output),
            "CSV" => CsvToText(output),
            "TEXT" => output,
            _ => output
        };
    }

    private string ConvertXmlStringToJson(string xml)
    {
        var doc = XDocument.Parse(xml, LoadOptions.PreserveWhitespace);
        if (doc.Root == null)
            throw new InvalidOperationException("XML conversion failed: document does not contain a root element.");

        var value = ConvertXmlElementToObject(doc.Root);
        var rootObject = new Dictionary<string, object?> { [doc.Root.Name.LocalName] = value };
        return JsonConvert.SerializeObject(rootObject, Formatting.Indented);
    }

    private string ConvertCsvStringToJson(string csv)
    {
        var rows = ParseCsv(csv);
        return JsonConvert.SerializeObject(new Dictionary<string, object?> { ["rows"] = rows }, Formatting.Indented);
    }

    private string ConvertTextStringToJson(string text)
    {
        var trimmed = text.Trim();

        if (string.IsNullOrEmpty(trimmed))
            return JsonConvert.SerializeObject(new { value = string.Empty }, Formatting.Indented);

        try
        {
            var parsed = JToken.Parse(trimmed);
            return parsed.ToString(Formatting.Indented);
        }
        catch
        {
            return JsonConvert.SerializeObject(ParseTextToStructuredObject(text), Formatting.Indented);
        }
    }

    private string CsvToXml(string csv)
    {
        var rows = ParseCsv(csv);
        var root = new Dictionary<string, object?> { ["rows"] = rows };
        return ToXml(root, "root");
    }

    private string TextToXml(string text)
    {
        var structured = ParseTextToStructuredObject(text);
        return ToXml(structured, "root");
    }

    private string JsonToCsv(JToken token)
    {
        if (token is JObject obj && obj.TryGetValue("rows", out var rowsToken))
        {
            return JsonToCsv(rowsToken!);
        }

        if (token is JArray array)
        {
            return JsonArrayToCsv(array);
        }

        if (token is JObject singleObject)
        {
            return JsonArrayToCsv(new JArray(singleObject));
        }

        return ScalarToCsv(((JValue)token).Value);
    }

    private string XmlToCsv(string xml)
    {
        var doc = XDocument.Parse(xml, LoadOptions.PreserveWhitespace);
        if (doc.Root == null)
            return string.Empty;

        var tabularData = TryExtractTabularRowsFromXml(doc.Root)
            ?? new List<Dictionary<string, object?>> { FlattenObjectToDictionary(ConvertXmlElementToObject(doc.Root)) };

        return ArrayToCsv(tabularData);
    }

    private string TextToCsv(string text)
    {
        var parsed = ParseTextToStructuredObject(text);

        if (TryExtractTabularRows(parsed, out var rows))
        {
            return ArrayToCsv(rows);
        }

        if (parsed is Dictionary<string, object?> dict)
        {
            return ArrayToCsv(new List<Dictionary<string, object?>> { dict });
        }

        return ScalarToCsv(parsed);
    }

    private string JsonToText(JToken token)
    {
        var sb = new StringBuilder();
        WriteTextLines(sb, string.Empty, ConvertJTokenToObject(token));
        return sb.ToString().TrimEnd();
    }

    private string XmlToText(string xml)
    {
        var doc = XDocument.Parse(xml, LoadOptions.PreserveWhitespace);
        if (doc.Root == null)
            return string.Empty;

        var sb = new StringBuilder();
        WriteTextLines(sb, doc.Root.Name.LocalName, ConvertXmlElementToObject(doc.Root));
        return sb.ToString().TrimEnd();
    }

    private string CsvToText(string csv)
    {
        var rows = ParseCsv(csv);
        var sb = new StringBuilder();

        for (int i = 0; i < rows.Count; i++)
        {
            foreach (var kvp in rows[i])
            {
                sb.AppendLine($"rows[{i}].{kvp.Key}={FormatScalar(kvp.Value)}");
            }
        }

        return sb.ToString().TrimEnd();
    }

    private string JsonToXml(JToken token, string elementName = "root")
    {
        var xDoc = new XDocument(new XDeclaration("1.0", "utf-8", null));
        var root = JsonTokenToXElement(token, SanitizeXmlName(elementName));
        xDoc.Add(root);
        return xDoc.ToString();
    }

    private XElement JsonTokenToXElement(JToken token, string name)
    {
        var element = new XElement(name);

        switch (token)
        {
            case JObject obj:
                foreach (var prop in obj.Properties())
                {
                    if (prop.Name.StartsWith("@", StringComparison.Ordinal))
                    {
                        element.SetAttributeValue(SanitizeXmlName(prop.Name[1..]), ConvertJValueToString(prop.Value));
                    }
                    else if (prop.Name == "#text")
                    {
                        element.Value = ConvertJValueToString(prop.Value);
                    }
                    else
                    {
                        element.Add(JsonTokenToXElement(prop.Value, SanitizeXmlName(prop.Name)));
                    }
                }
                break;

            case JArray array:
                foreach (var item in array)
                {
                    element.Add(JsonTokenToXElement(item, "item"));
                }
                break;

            case JValue val:
                element.Value = val.Value?.ToString() ?? string.Empty;
                break;
        }

        return element;
    }

    private string JsonArrayToCsv(JArray array)
    {
        if (array.Count == 0)
            return string.Empty;

        var rows = new List<Dictionary<string, object?>>();
        foreach (var item in array)
        {
            rows.Add(item switch
            {
                JObject obj => FlattenObjectToDictionary(ConvertJTokenToObject(obj)),
                _ => new Dictionary<string, object?> { ["value"] = ConvertJTokenToObject(item) }
            });
        }

        return ArrayToCsv(rows);
    }

    private string ArrayToCsv(List<Dictionary<string, object?>> rows)
    {
        if (rows.Count == 0)
            return string.Empty;

        var headers = new List<string>();
        foreach (var row in rows)
        {
            foreach (var key in row.Keys)
            {
                if (!headers.Contains(key, StringComparer.Ordinal))
                    headers.Add(key);
            }
        }

        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", headers.Select(EscapeCsvValue)));

        foreach (var row in rows)
        {
            var values = headers.Select(header =>
            {
                row.TryGetValue(header, out var value);
                return EscapeCsvValue(FormatScalar(value));
            });

            sb.AppendLine(string.Join(",", values));
        }

        return sb.ToString().TrimEnd();
    }

    private string ScalarToCsv(object? value)
    {
        return $"value{Environment.NewLine}{EscapeCsvValue(FormatScalar(value))}";
    }

    private string NormalizeCsv(string csv)
    {
        var rows = ParseCsv(csv);
        return ArrayToCsv(rows);
    }

    private List<Dictionary<string, object?>> ParseCsv(string csv)
    {
        var rows = new List<Dictionary<string, object?>>();
        var records = ParseCsvRecords(csv);

        if (records.Count == 0)
            return rows;

        var headers = records[0];
        if (headers.Count == 0)
            return rows;

        for (int i = 1; i < records.Count; i++)
        {
            var record = records[i];
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            for (int j = 0; j < headers.Count; j++)
            {
                var header = string.IsNullOrWhiteSpace(headers[j]) ? $"column{j + 1}" : headers[j];
                var value = j < record.Count ? ParseCsvScalar(record[j]) : null;
                row[header] = value;
            }

            rows.Add(row);
        }

        return rows;
    }

    private List<List<string>> ParseCsvRecords(string csv)
    {
        var records = new List<List<string>>();
        var currentRecord = new List<string>();
        var currentField = new StringBuilder();
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
            throw new InvalidOperationException("CSV conversion failed: unmatched quote detected.");

        return records;
    }

    private object? ParseCsvScalar(string value)
    {
        var trimmed = value.Trim();

        if (trimmed.Length == 0)
            return null;

        if (string.Equals(trimmed, "null", StringComparison.OrdinalIgnoreCase))
            return null;

        if (bool.TryParse(trimmed, out var boolValue))
            return boolValue;

        if (long.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var longValue))
            return longValue;

        if (decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue))
            return decimalValue;

        return trimmed;
    }

    private string EscapeCsvValue(string value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";

        return value;
    }

    private void AddToXmlElement(XElement parent, object? data)
    {
        switch (data)
        {
            case Dictionary<string, object?> dict:
                foreach (var kvp in dict)
                {
                    if (kvp.Key.StartsWith("@", StringComparison.Ordinal))
                    {
                        parent.SetAttributeValue(SanitizeXmlName(kvp.Key[1..]), FormatScalar(kvp.Value));
                        continue;
                    }

                    if (kvp.Key == "#text")
                    {
                        parent.Value = FormatScalar(kvp.Value);
                        continue;
                    }

                    if (kvp.Value is List<Dictionary<string, object?>> dictionaryList)
                    {
                        foreach (var item in dictionaryList)
                        {
                            var child = new XElement(SanitizeXmlName(kvp.Key));
                            AddToXmlElement(child, item);
                            parent.Add(child);
                        }

                        continue;
                    }

                    if (kvp.Value is IList<object?> objectList)
                    {
                        foreach (var item in objectList)
                        {
                            var child = new XElement(SanitizeXmlName(kvp.Key));
                            AddToXmlElement(child, item);
                            parent.Add(child);
                        }

                        continue;
                    }

                    var childElement = new XElement(SanitizeXmlName(kvp.Key));
                    AddToXmlElement(childElement, kvp.Value);
                    parent.Add(childElement);
                }
                break;

            case IList<object?> list:
                foreach (var item in list)
                {
                    var child = new XElement("item");
                    AddToXmlElement(child, item);
                    parent.Add(child);
                }
                break;

            default:
                parent.Value = FormatScalar(data);
                break;
        }
    }

    private object? ConvertXmlElementToObject(XElement element)
    {
        var children = element.Elements().ToList();
        var hasAttributes = element.HasAttributes;
        var hasText = !string.IsNullOrWhiteSpace(element.Value) && children.Count > 0;

        if (children.Count == 0 && !hasAttributes)
            return element.Value;

        var dict = new Dictionary<string, object?>();

        foreach (var attr in element.Attributes())
        {
            dict[$"@{attr.Name.LocalName}"] = attr.Value;
        }

        var groupedChildren = children.GroupBy(child => child.Name.LocalName);
        foreach (var group in groupedChildren)
        {
            var childItems = group.Select(ConvertXmlElementToObject).ToList();
            dict[group.Key] = childItems.Count == 1 ? childItems[0] : childItems;
        }

        if (hasAttributes && children.Count == 0)
        {
            dict["#text"] = element.Value;
        }
        else if (hasText)
        {
            dict["#text"] = string.Concat(element.Nodes().OfType<XText>().Select(t => t.Value)).Trim();
        }

        return dict;
    }

    private List<Dictionary<string, object?>>? TryExtractTabularRowsFromXml(XElement root)
    {
        var rowElements =
            root.Elements("row").ToList().Count > 0 ? root.Elements("row").ToList() :
            root.Elements("item").ToList().Count > 0 ? root.Elements("item").ToList() :
            root.Element("rows")?.Elements("row").ToList() ??
            root.Element("rows")?.Elements("item").ToList();

        if (rowElements == null || rowElements.Count == 0)
            return null;

        return rowElements
            .Select(row => FlattenObjectToDictionary(ConvertXmlElementToObject(row)))
            .ToList();
    }

    private bool TryExtractTabularRows(object? data, out List<Dictionary<string, object?>> rows)
    {
        rows = new List<Dictionary<string, object?>>();

        switch (data)
        {
            case Dictionary<string, object?> dict when dict.TryGetValue("rows", out var rowsValue):
                return TryExtractTabularRows(rowsValue, out rows);

            case IList<object?> list:
                foreach (var item in list)
                {
                    rows.Add(FlattenObjectToDictionary(item));
                }
                return rows.Count > 0;

            case IEnumerable<object?> enumerable:
                foreach (var item in enumerable)
                {
                    rows.Add(FlattenObjectToDictionary(item));
                }
                return rows.Count > 0;

            default:
                return false;
        }
    }

    private Dictionary<string, object?> FlattenObjectToDictionary(object? value, string prefix = "")
    {
        var result = new Dictionary<string, object?>();

        switch (value)
        {
            case Dictionary<string, object?> dict:
                foreach (var kvp in dict)
                {
                    var key = string.IsNullOrEmpty(prefix) ? kvp.Key : $"{prefix}.{kvp.Key}";
                    if (kvp.Value is Dictionary<string, object?> nestedDict)
                    {
                        foreach (var nested in FlattenObjectToDictionary(nestedDict, key))
                            result[nested.Key] = nested.Value;
                    }
                    else if (kvp.Value is IList<object?> list)
                    {
                        result[key] = JsonConvert.SerializeObject(list);
                    }
                    else
                    {
                        result[key] = kvp.Value;
                    }
                }
                break;

            case IDictionary<string, object> dict:
                foreach (var kvp in dict)
                {
                    var key = string.IsNullOrEmpty(prefix) ? kvp.Key : $"{prefix}.{kvp.Key}";
                    if (kvp.Value is IDictionary<string, object> nestedDict)
                    {
                        foreach (var nested in FlattenObjectToDictionary(nestedDict.ToDictionary(x => x.Key, x => (object?)x.Value), key))
                            result[nested.Key] = nested.Value;
                    }
                    else if (kvp.Value is IList<object> list)
                    {
                        result[key] = JsonConvert.SerializeObject(list.Select(ConvertHashToObject));
                    }
                    else
                    {
                        result[key] = kvp.Value;
                    }
                }
                break;

            default:
                result[string.IsNullOrEmpty(prefix) ? "value" : prefix] = value;
                break;
        }

        return result;
    }

    private object ParseTextToStructuredObject(string text)
    {
        var lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        var valueLines = new List<string>();

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrEmpty(line))
                continue;

            if (line.StartsWith('#'))
                continue;

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
            {
                valueLines.Add(rawLine);
                continue;
            }

            var key = line[..separatorIndex].Trim();
            var value = line[(separatorIndex + 1)..].Trim();
            dict[key] = ParseLooseScalar(value);
        }

        if (dict.Count == 0)
        {
            return new Dictionary<string, object?> { ["value"] = string.Join(Environment.NewLine, valueLines).Trim() };
        }

        if (valueLines.Count > 0)
        {
            dict["value"] = string.Join(Environment.NewLine, valueLines).Trim();
        }

        return dict;
    }

    private object? ParseLooseScalar(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        if (string.Equals(value, "null", StringComparison.OrdinalIgnoreCase))
            return null;

        if (bool.TryParse(value, out var boolValue))
            return boolValue;

        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var longValue))
            return longValue;

        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue))
            return decimalValue;

        return value;
    }

    private void WriteTextLines(StringBuilder sb, string path, object? value)
    {
        switch (value)
        {
            case Dictionary<string, object?> dict:
                foreach (var kvp in dict)
                {
                    var childPath = string.IsNullOrEmpty(path) ? kvp.Key : $"{path}.{kvp.Key}";
                    WriteTextLines(sb, childPath, kvp.Value);
                }
                break;

            case IList<object?> list:
                for (int i = 0; i < list.Count; i++)
                {
                    var childPath = $"{path}[{i}]";
                    WriteTextLines(sb, childPath, list[i]);
                }
                break;

            default:
                sb.AppendLine($"{path}={FormatScalar(value)}");
                break;
        }
    }

    private string FormatScalar(object? value)
    {
        return value switch
        {
            null => string.Empty,
            string str => str,
            bool boolValue => boolValue ? "true" : "false",
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? string.Empty
        };
    }

    private string SanitizeXmlName(string name)
    {
        var sanitized = new StringBuilder();
        foreach (var c in name)
        {
            if (char.IsLetterOrDigit(c) || c == '_' || c == '-')
                sanitized.Append(c);
            else
                sanitized.Append('_');
        }

        var result = sanitized.ToString();
        if (result.Length > 0 && !char.IsLetter(result[0]) && result[0] != '_')
            result = "_" + result;

        return string.IsNullOrEmpty(result) ? "item" : result;
    }

    private object? ConvertHashToObject(object? data)
    {
        return data switch
        {
            Hash hash => hash.ToDictionary(kvp => kvp.Key, kvp => ConvertHashToObject(kvp.Value)),
            System.Collections.IList list => list.Cast<object?>().Select(ConvertHashToObject).ToList(),
            _ => data
        };
    }

    private object? ConvertJTokenToObject(JToken token)
    {
        return token switch
        {
            JObject obj => obj.Properties().ToDictionary(
                prop => prop.Name,
                prop => ConvertJTokenToObject(prop.Value)),
            JArray arr => arr.Select(ConvertJTokenToObject).ToList(),
            JValue val => val.Value,
            _ => token.ToString()
        };
    }

    private string ConvertJValueToString(JToken token)
    {
        return token is JValue value ? value.Value?.ToString() ?? string.Empty : token.ToString(Formatting.None);
    }

    private string NormalizeFormat(string? format)
    {
        return string.IsNullOrWhiteSpace(format) ? "TEXT" : format.Trim().ToUpperInvariant();
    }
}

// Made with Bob
