using System.Text.Json;
using System.Text.Json.Serialization;
using DotLiquid;

namespace LiquidTemplateDebugger.Api;

/// <summary>
/// Custom JSON converter for DotLiquid Hash objects which don't serialize well by default.
/// Iterates hash.Keys and recursively serializes values with depth limiting.
/// </summary>
public class HashJsonConverter : JsonConverter<Hash>
{
    private const int MaxDepth = 10;

    public override Hash? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // We don't need to deserialize Hash from JSON
        throw new NotSupportedException("Deserializing Hash from JSON is not supported.");
    }

    public override void Write(Utf8JsonWriter writer, Hash value, JsonSerializerOptions options)
    {
        WriteHash(writer, value, options, 0);
    }

    private static void WriteHash(Utf8JsonWriter writer, Hash hash, JsonSerializerOptions options, int depth)
    {
        if (depth >= MaxDepth)
        {
            writer.WriteStringValue("[max depth reached]");
            return;
        }

        writer.WriteStartObject();

        foreach (var key in hash.Keys)
        {
            writer.WritePropertyName(options.PropertyNamingPolicy?.ConvertName(key) ?? key);
            WriteValue(writer, hash[key], options, depth + 1);
        }

        writer.WriteEndObject();
    }

    private static void WriteValue(Utf8JsonWriter writer, object? value, JsonSerializerOptions options, int depth)
    {
        if (depth >= MaxDepth)
        {
            writer.WriteStringValue("[max depth reached]");
            return;
        }

        switch (value)
        {
            case null:
                writer.WriteNullValue();
                break;
            case Hash hash:
                WriteHash(writer, hash, options, depth);
                break;
            case IList<object> list:
                writer.WriteStartArray();
                foreach (var item in list)
                    WriteValue(writer, item, options, depth + 1);
                writer.WriteEndArray();
                break;
            case string s:
                writer.WriteStringValue(s);
                break;
            case bool b:
                writer.WriteBooleanValue(b);
                break;
            case int i:
                writer.WriteNumberValue(i);
                break;
            case long l:
                writer.WriteNumberValue(l);
                break;
            case double d:
                writer.WriteNumberValue(d);
                break;
            case float f:
                writer.WriteNumberValue(f);
                break;
            case decimal dec:
                writer.WriteNumberValue(dec);
                break;
            default:
                writer.WriteStringValue(value.ToString());
                break;
        }
    }
}
