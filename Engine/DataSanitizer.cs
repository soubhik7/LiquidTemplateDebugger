using System.Text.RegularExpressions;
using System.Text.Json;
using LiquidTemplateDebugger.Models;
using Newtonsoft.Json.Linq;

namespace LiquidTemplateDebugger.Engine;

/// <summary>
/// Sanitizes data to remove sensitive information before sending to AI services
/// </summary>
public class DataSanitizer
{
    private readonly List<Regex> _sensitivePatterns;
    private readonly List<string> _sensitiveKeywords;

    public DataSanitizer(AIConfiguration? config = null)
    {
        var patterns = config?.SensitivePatterns ?? GetDefaultPatterns();
        _sensitivePatterns = patterns.Select(p => new Regex(p, RegexOptions.IgnoreCase | RegexOptions.Compiled)).ToList();
        
        _sensitiveKeywords = new List<string>
        {
            "password", "pwd", "secret", "token", "key", "apikey", "api_key",
            "authorization", "auth", "credential", "private", "confidential",
            "ssn", "social_security", "credit_card", "card_number", "cvv",
            "pin", "access_token", "refresh_token", "bearer"
        };
    }

    /// <summary>
    /// Sanitize input data by removing or masking sensitive information
    /// </summary>
    public SanitizationResult Sanitize(string data, string format)
    {
        var result = new SanitizationResult
        {
            SanitizedData = data,
            WasSanitized = false
        };

        try
        {
            switch (format.ToLowerInvariant())
            {
                case "json":
                    result = SanitizeJson(data);
                    break;
                case "xml":
                    result = SanitizeXml(data);
                    break;
                case "csv":
                    result = SanitizeCsv(data);
                    break;
                case "text":
                    result = SanitizeText(data);
                    break;
                default:
                    result = SanitizeText(data);
                    break;
            }
        }
        catch (Exception ex)
        {
            // If sanitization fails, fall back to text sanitization
            result = SanitizeText(data);
            result.SanitizedFields.Add(new SanitizedField
            {
                FieldPath = "root",
                Reason = $"Format parsing failed: {ex.Message}",
                SanitizationType = "text_fallback"
            });
        }

        return result;
    }

    private SanitizationResult SanitizeJson(string json)
    {
        var result = new SanitizationResult();
        
        try
        {
            var jToken = JToken.Parse(json);
            SanitizeJsonToken(jToken, "", result);
            result.SanitizedData = jToken.ToString(Newtonsoft.Json.Formatting.Indented);
            result.WasSanitized = result.SanitizedFields.Count > 0;
        }
        catch
        {
            // If JSON parsing fails, treat as text
            return SanitizeText(json);
        }

        return result;
    }

    private void SanitizeJsonToken(JToken token, string path, SanitizationResult result)
    {
        switch (token.Type)
        {
            case JTokenType.Object:
                var obj = (JObject)token;
                foreach (var prop in obj.Properties().ToList())
                {
                    var propPath = string.IsNullOrEmpty(path) ? prop.Name : $"{path}.{prop.Name}";
                    
                    // Check if property name is sensitive
                    if (IsSensitiveKey(prop.Name))
                    {
                        var originalValue = prop.Value.ToString();
                        prop.Value = JToken.FromObject("[REDACTED]");
                        result.SanitizedFields.Add(new SanitizedField
                        {
                            FieldPath = propPath,
                            Reason = $"Sensitive key name: {prop.Name}",
                            SanitizationType = "redacted"
                        });
                    }
                    else if (prop.Value.Type == JTokenType.String)
                    {
                        var strValue = prop.Value.ToString();
                        if (ContainsSensitivePattern(strValue))
                        {
                            prop.Value = JToken.FromObject("[REDACTED]");
                            result.SanitizedFields.Add(new SanitizedField
                            {
                                FieldPath = propPath,
                                Reason = "Matches sensitive pattern",
                                SanitizationType = "redacted"
                            });
                        }
                    }
                    else
                    {
                        SanitizeJsonToken(prop.Value, propPath, result);
                    }
                }
                break;

            case JTokenType.Array:
                var arr = (JArray)token;
                for (int i = 0; i < arr.Count; i++)
                {
                    SanitizeJsonToken(arr[i], $"{path}[{i}]", result);
                }
                break;
        }
    }

    private SanitizationResult SanitizeXml(string xml)
    {
        var result = new SanitizationResult();
        
        try
        {
            var doc = System.Xml.Linq.XDocument.Parse(xml);
            SanitizeXmlElement(doc.Root!, "", result);
            result.SanitizedData = doc.ToString();
            result.WasSanitized = result.SanitizedFields.Count > 0;
        }
        catch
        {
            return SanitizeText(xml);
        }

        return result;
    }

    private void SanitizeXmlElement(System.Xml.Linq.XElement element, string path, SanitizationResult result)
    {
        var elemPath = string.IsNullOrEmpty(path) ? element.Name.LocalName : $"{path}.{element.Name.LocalName}";

        // Check element name
        if (IsSensitiveKey(element.Name.LocalName))
        {
            element.Value = "[REDACTED]";
            result.SanitizedFields.Add(new SanitizedField
            {
                FieldPath = elemPath,
                Reason = $"Sensitive element name: {element.Name.LocalName}",
                SanitizationType = "redacted"
            });
        }
        else if (!string.IsNullOrWhiteSpace(element.Value) && !element.HasElements)
        {
            if (ContainsSensitivePattern(element.Value))
            {
                element.Value = "[REDACTED]";
                result.SanitizedFields.Add(new SanitizedField
                {
                    FieldPath = elemPath,
                    Reason = "Matches sensitive pattern",
                    SanitizationType = "redacted"
                });
            }
        }

        // Check attributes
        foreach (var attr in element.Attributes())
        {
            if (IsSensitiveKey(attr.Name.LocalName) || ContainsSensitivePattern(attr.Value))
            {
                attr.Value = "[REDACTED]";
                result.SanitizedFields.Add(new SanitizedField
                {
                    FieldPath = $"{elemPath}@{attr.Name.LocalName}",
                    Reason = "Sensitive attribute",
                    SanitizationType = "redacted"
                });
            }
        }

        // Recurse into child elements
        foreach (var child in element.Elements())
        {
            SanitizeXmlElement(child, elemPath, result);
        }
    }

    private SanitizationResult SanitizeCsv(string csv)
    {
        var result = new SanitizationResult();
        var lines = csv.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        
        if (lines.Length == 0)
        {
            result.SanitizedData = csv;
            return result;
        }

        var sanitizedLines = new List<string>();
        var headers = lines[0].Split(',').Select(h => h.Trim()).ToArray();
        sanitizedLines.Add(lines[0]); // Keep headers

        // Check which columns are sensitive
        var sensitiveColumns = new HashSet<int>();
        for (int i = 0; i < headers.Length; i++)
        {
            if (IsSensitiveKey(headers[i]))
            {
                sensitiveColumns.Add(i);
            }
        }

        // Sanitize data rows
        for (int rowIdx = 1; rowIdx < lines.Length; rowIdx++)
        {
            var values = lines[rowIdx].Split(',');
            for (int colIdx = 0; colIdx < values.Length; colIdx++)
            {
                if (sensitiveColumns.Contains(colIdx) || ContainsSensitivePattern(values[colIdx]))
                {
                    values[colIdx] = "[REDACTED]";
                    result.SanitizedFields.Add(new SanitizedField
                    {
                        FieldPath = $"Row{rowIdx}.{(colIdx < headers.Length ? headers[colIdx] : $"Col{colIdx}")}",
                        Reason = "Sensitive data",
                        SanitizationType = "redacted"
                    });
                }
            }
            sanitizedLines.Add(string.Join(",", values));
        }

        result.SanitizedData = string.Join(Environment.NewLine, sanitizedLines);
        result.WasSanitized = result.SanitizedFields.Count > 0;
        return result;
    }

    private SanitizationResult SanitizeText(string text)
    {
        var result = new SanitizationResult
        {
            SanitizedData = text
        };

        foreach (var pattern in _sensitivePatterns)
        {
            var matches = pattern.Matches(text);
            if (matches.Count > 0)
            {
                result.SanitizedData = pattern.Replace(result.SanitizedData, "[REDACTED]");
                result.SanitizedFields.Add(new SanitizedField
                {
                    FieldPath = "text",
                    Reason = $"Pattern match: {pattern}",
                    SanitizationType = "redacted"
                });
            }
        }

        result.WasSanitized = result.SanitizedFields.Count > 0;
        return result;
    }

    private bool IsSensitiveKey(string key)
    {
        return _sensitiveKeywords.Any(k => key.IndexOf(k, StringComparison.OrdinalIgnoreCase) >= 0);
    }

    private bool ContainsSensitivePattern(string value)
    {
        return _sensitivePatterns.Any(p => p.IsMatch(value));
    }

    private static List<string> GetDefaultPatterns()
    {
        return new List<string>
        {
            @"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", // Email
            @"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", // Phone (US format)
            @"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b", // Credit card
            @"\b\d{3}-\d{2}-\d{4}\b", // SSN
            @"\b[A-Za-z0-9]{32,}\b", // Long tokens
            @"Bearer\s+[A-Za-z0-9\-._~+/]+=*", // Bearer tokens
            @"(?i)api[_-]?key['""]?\s*[:=]\s*['""]?[A-Za-z0-9]{20,}", // API keys
        };
    }
}

// Made with Bob
