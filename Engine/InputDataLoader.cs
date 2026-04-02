using System.Xml.Linq;
using DotLiquid;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Loads input data from various formats (JSON, XML, key=value) and converts
/// to DotLiquid Hash objects with origin tracking.
/// </summary>
public class InputDataLoader
{
    public (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromFile(string filePath)
    {
        var content = File.ReadAllText(filePath);
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        var format = extension switch
        {
            ".json" => "JSON",
            ".xml" => "XML",
            _ => "TEXT"
        };

        return format switch
        {
            "JSON" => LoadJson(content, format),
            "XML" => LoadXml(content, format),
            _ => LoadKeyValue(content, format)
        };
    }

    public (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromString(string content, string format)
    {
        return format.ToUpperInvariant() switch
        {
            "JSON" => LoadJson(content, "JSON"),
            "XML" => LoadXml(content, "XML"),
            _ => LoadKeyValue(content, "TEXT")
        };
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadJson(string json, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var jObj = JObject.Parse(json);
        var dict = new Dictionary<string, object?>();

        FlattenAndTrackJson(jObj, "", dict, origins, format);

        var hash = Hash.FromDictionary(ConvertToLiquidCompatible(jObj));
        return (hash, origins);
    }

    private void FlattenAndTrackJson(JToken token, string path, Dictionary<string, object?> dict,
        Dictionary<string, ValueOrigin> origins, string format)
    {
        switch (token)
        {
            case JObject obj:
                foreach (var prop in obj.Properties())
                {
                    var childPath = string.IsNullOrEmpty(path) ? prop.Name : $"{path}.{prop.Name}";
                    FlattenAndTrackJson(prop.Value, childPath, dict, origins, format);
                }
                break;

            case JArray arr:
                for (int i = 0; i < arr.Count; i++)
                {
                    var childPath = $"{path}[{i}]";
                    FlattenAndTrackJson(arr[i], childPath, dict, origins, format);
                }
                origins[path] = new ValueOrigin
                {
                    SourcePath = path,
                    SourceFormat = format,
                    OriginalValue = $"[Array: {arr.Count} items]"
                };
                break;

            default:
                var value = ((JValue)token).Value;
                dict[path] = value;
                origins[path] = new ValueOrigin
                {
                    SourcePath = path,
                    SourceFormat = format,
                    OriginalValue = value
                };
                break;
        }
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadXml(string xml, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var doc = XDocument.Parse(xml);
        var dict = new Dictionary<string, object>();

        if (doc.Root != null)
        {
            var converted = ConvertXmlElement(doc.Root, doc.Root.Name.LocalName, origins, format);
            if (converted is Dictionary<string, object> rootDict)
            {
                var hash = Hash.FromDictionary(rootDict);
                return (hash, origins);
            }
            else
            {
                var wrapper = new Dictionary<string, object> { [doc.Root.Name.LocalName] = converted };
                var hash = Hash.FromDictionary(wrapper);
                return (hash, origins);
            }
        }

        return (Hash.FromDictionary(dict), origins);
    }

    private object ConvertXmlElement(XElement element, string path,
        Dictionary<string, ValueOrigin> origins, string format)
    {
        var children = element.Elements().ToList();

        if (children.Count == 0)
        {
            var value = element.Value;
            origins[path] = new ValueOrigin
            {
                SourcePath = path,
                SourceFormat = format,
                OriginalValue = value
            };
            return value;
        }

        var dict = new Dictionary<string, object>();
        var grouped = children.GroupBy(e => e.Name.LocalName);

        foreach (var group in grouped)
        {
            var items = group.ToList();
            var childPath = $"{path}.{group.Key}";

            if (items.Count > 1)
            {
                var list = new List<object>();
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
            else
            {
                dict[group.Key] = ConvertXmlElement(items[0], childPath, origins, format);
            }
        }

        // Also include attributes
        foreach (var attr in element.Attributes())
        {
            var attrPath = $"{path}.@{attr.Name.LocalName}";
            dict[$"@{attr.Name.LocalName}"] = attr.Value;
            origins[attrPath] = new ValueOrigin
            {
                SourcePath = attrPath,
                SourceFormat = format,
                OriginalValue = attr.Value
            };
        }

        return dict;
    }

    private (Hash hash, Dictionary<string, ValueOrigin> origins) LoadKeyValue(string text, string format)
    {
        var origins = new Dictionary<string, ValueOrigin>(StringComparer.OrdinalIgnoreCase);
        var dict = new Dictionary<string, object>();

        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        int lineNum = 0;
        foreach (var line in lines)
        {
            lineNum++;
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#'))
                continue;

            var eqIdx = trimmed.IndexOf('=');
            if (eqIdx > 0)
            {
                var key = trimmed[..eqIdx].Trim();
                var value = trimmed[(eqIdx + 1)..].Trim();
                dict[key] = value;
                origins[key] = new ValueOrigin
                {
                    SourcePath = key,
                    SourceFormat = format,
                    OriginalValue = value,
                    SourceLineNumber = lineNum
                };
            }
        }

        var hash = Hash.FromDictionary(dict);
        return (hash, origins);
    }

    private static Dictionary<string, object> ConvertToLiquidCompatible(JObject obj)
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
            JObject obj => Hash.FromDictionary(ConvertToLiquidCompatible(obj)),
            JArray arr => arr.Select(ConvertJToken).ToList(),
            JValue val => val.Value ?? "",
            _ => token.ToString()
        };
    }
}
