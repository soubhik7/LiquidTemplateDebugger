using DotLiquid;
using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Tests;

/// <summary>
/// Tests for format transformation capabilities across JSON, XML, CSV, and TEXT.
/// </summary>
public static class FormatTransformationTest
{
    public static int Run()
    {
        int passed = 0;
        int failed = 0;

        void Assert(bool condition, string testName)
        {
            if (condition) { passed++; Console.WriteLine($"  PASS: {testName}"); }
            else { failed++; Console.WriteLine($"  FAIL: {testName}"); }
        }

        Console.WriteLine("\n=== Format Transformation Tests ===\n");

        var converter = new FormatConverter();
        var loader = new InputDataLoader();

        var json = """
        {
          "order": {
            "id": 1001,
            "customer": {
              "name": "Alice & Bob",
              "email": "alice@example.com"
            },
            "items": [
              {
                "sku": "A-1",
                "qty": 2,
                "price": 19.95,
                "notes": "Fragile, handle with care"
              },
              {
                "sku": "B-2",
                "qty": 1,
                "price": null,
                "notes": "Gift \"wrapped\""
              }
            ],
            "active": true,
            "comment": "Line1\\nLine2"
          }
        }
        """;

        var xml = """
        <catalog generated="2026-04-03">
          <product id="1">
            <name>Widget & Gear</name>
            <price>29.99</price>
            <active>true</active>
          </product>
          <product id="2">
            <name>Gadget</name>
            <price></price>
            <active>false</active>
          </product>
        </catalog>
        """;

        var csv = """"
        id,name,description,active,price
        1,"Widget, A","Line1
        Line2",true,29.99
        2,"Gadget ""Deluxe""","",false,null
        
        """";

        var text = """
        title=Quarterly Report
        attempts=3
        enabled=true
        notes=Contains commas, quotes "and" unicode ₹
        orphan freeform line
        """;

        // Test 1: CSV Input Loading with multiline field support
        Console.WriteLine("[Test 1] CSV Input Loading");
        {
            var (hash, origins) = loader.LoadFromString(csv, "CSV");
            Assert(hash != null, "Hash is not null");
            Assert(hash.ContainsKey("rows"), "Hash contains 'rows' key");

            var rows = hash["rows"] as List<object>;
            Assert(rows != null, "Rows is not null");
            Assert(rows?.Count == 2, "Has 2 rows");
        }
        Console.WriteLine();

        // Test 2: JSON Input Loading with nested structures
        Console.WriteLine("[Test 2] JSON Input Loading");
        {
            var (hash, origins) = loader.LoadFromString(json, "JSON");
            Assert(hash.ContainsKey("order"), "Hash contains root object");
            Assert(origins.ContainsKey("order.items"), "Origins track arrays");
            Assert(origins.ContainsKey("order.customer.name"), "Origins track nested values");
        }
        Console.WriteLine();

        // Test 3: XML Input Loading with attributes
        Console.WriteLine("[Test 3] XML Input Loading");
        {
            var (hash, origins) = loader.LoadFromString(xml, "XML");
            Assert(hash.ContainsKey("catalog"), "XML root preserved");
            Assert(origins.ContainsKey("catalog.@generated"), "XML attribute tracked");
            Assert(origins.ContainsKey("catalog.product"), "Repeated XML elements tracked as array");
        }
        Console.WriteLine();

        // Test 4: TEXT Input Loading with fallback value
        Console.WriteLine("[Test 4] TEXT Input Loading");
        {
            var (hash, origins) = loader.LoadFromString(text, "TEXT");
            Assert(hash.ContainsKey("title"), "Key=value field loaded");
            Assert(hash.ContainsKey("value"), "Freeform text preserved under value");
            Assert(origins.ContainsKey("value"), "Origin tracked for freeform value");
        }
        Console.WriteLine();

        // Test 5: JSON to JSON
        Console.WriteLine("[Test 5] JSON to JSON");
        {
            var output = converter.ConvertOutput(json, "JSON", "JSON");
            Assert(output.Contains("\"customer\""), "JSON remains structured");
            Assert(output.Contains("\"Alice & Bob\""), "Special characters preserved");
        }
        Console.WriteLine();

        // Test 6: JSON to XML
        Console.WriteLine("[Test 6] JSON to XML");
        {
            var output = converter.ConvertOutput(json, "XML", "JSON");
            Assert(output.Contains("<order>"), "XML contains order element");
            Assert(output.Contains("<items>"), "XML contains nested array container");
        }
        Console.WriteLine();

        // Test 7: JSON to CSV
        Console.WriteLine("[Test 7] JSON to CSV");
        {
            var input = """
            [
              { "id": 1, "name": "Alice", "tags": ["vip", "priority"] },
              { "id": 2, "name": "Bob", "tags": [] }
            ]
            """;
            var output = converter.ConvertOutput(input, "CSV", "JSON");
            Assert(output.Contains("id,name,tags"), "CSV headers generated");
            Assert(output.Contains("Alice"), "CSV contains first row");
        }
        Console.WriteLine();

        // Test 8: JSON to TEXT
        Console.WriteLine("[Test 8] JSON to TEXT");
        {
            var output = converter.ConvertOutput(json, "TEXT", "JSON");
            Assert(output.Contains("order.customer.name=Alice & Bob"), "Nested text path emitted");
            Assert(output.Contains("order.items[1].notes=Gift \"wrapped\""), "Escaped content preserved");
        }
        Console.WriteLine();

        // Test 9: XML to JSON
        Console.WriteLine("[Test 9] XML to JSON");
        {
            var output = converter.ConvertOutput(xml, "JSON", "XML");
            Assert(output.Contains("\"catalog\""), "Root wrapped in JSON");
            Assert(output.Contains("\"@generated\""), "Attributes preserved");
        }
        Console.WriteLine();

        // Test 10: XML to XML
        Console.WriteLine("[Test 10] XML to XML");
        {
            var output = converter.ConvertOutput(xml, "XML", "XML");
            Assert(output.Contains("<catalog"), "XML is normalized");
            Assert(output.Contains("generated=\"2026-04-03\""), "Attributes retained");
        }
        Console.WriteLine();

        // Test 11: XML to CSV
        Console.WriteLine("[Test 11] XML to CSV");
        {
            var output = converter.ConvertOutput(xml, "CSV", "XML");
            Assert(output.Contains("@id"), "Attributes flattened into CSV");
            Assert(output.Contains("Widget & Gear"), "Text values flattened into CSV");
        }
        Console.WriteLine();

        // Test 12: XML to TEXT
        Console.WriteLine("[Test 12] XML to TEXT");
        {
            var output = converter.ConvertOutput(xml, "TEXT", "XML");
            Assert(output.Contains("catalog.product[0].name=Widget & Gear"), "XML flattened to text");
            Assert(output.Contains("catalog.@generated=2026-04-03"), "XML attributes appear in text");
        }
        Console.WriteLine();

        // Test 13: CSV to JSON
        Console.WriteLine("[Test 13] CSV to JSON");
        {
            var output = converter.ConvertOutput(csv, "JSON", "CSV");
            Assert(output.Contains("\"rows\""), "CSV converted to rows array");
            Assert(output.Contains("\"description\": \"Line1\\nLine2\""), "Multiline CSV field preserved");
        }
        Console.WriteLine();

        // Test 14: CSV to XML
        Console.WriteLine("[Test 14] CSV to XML");
        {
            var output = converter.ConvertOutput(csv, "XML", "CSV");
            Assert(output.Contains("<rows>"), "CSV rows wrapped in XML");
            Assert(output.Contains("<name>Widget, A</name>"), "CSV values preserved in XML");
        }
        Console.WriteLine();

        // Test 15: CSV to CSV
        Console.WriteLine("[Test 15] CSV to CSV");
        {
            var output = converter.ConvertOutput(csv, "CSV", "CSV");
            Assert(output.Contains("\"Widget, A\""), "CSV escaping preserved");
            Assert(output.Contains("\"Line1\nLine2\""), "CSV multiline value normalized");
        }
        Console.WriteLine();

        // Test 16: CSV to TEXT
        Console.WriteLine("[Test 16] CSV to TEXT");
        {
            var output = converter.ConvertOutput(csv, "TEXT", "CSV");
            Assert(output.Contains("rows[0].name=Widget, A"), "CSV row flattened to text");
            Assert(output.Contains("rows[1].price="), "Null CSV value emitted as empty text");
        }
        Console.WriteLine();

        // Test 17: TEXT to JSON
        Console.WriteLine("[Test 17] TEXT to JSON");
        {
            var output = converter.ConvertOutput(text, "JSON", "TEXT");
            Assert(output.Contains("\"title\": \"Quarterly Report\""), "Text key/value converted to JSON");
            Assert(output.Contains("\"value\": \"orphan freeform line\""), "Freeform tail preserved");
        }
        Console.WriteLine();

        // Test 18: TEXT to XML
        Console.WriteLine("[Test 18] TEXT to XML");
        {
            var output = converter.ConvertOutput(text, "XML", "TEXT");
            Assert(output.Contains("<title>Quarterly Report</title>"), "Text key/value converted to XML");
            Assert(output.Contains("<value>orphan freeform line</value>"), "Freeform tail wrapped in XML");
        }
        Console.WriteLine();

        // Test 19: TEXT to CSV
        Console.WriteLine("[Test 19] TEXT to CSV");
        {
            var output = converter.ConvertOutput(text, "CSV", "TEXT");
            Assert(output.Contains("title,attempts,enabled,notes,value"), "TEXT object converted to CSV row");
            Assert(output.Contains("Quarterly Report"), "TEXT value included in CSV");
        }
        Console.WriteLine();

        // Test 20: TEXT to TEXT
        Console.WriteLine("[Test 20] TEXT to TEXT");
        {
            var output = converter.ConvertOutput(text, "TEXT", "TEXT");
            Assert(output.Contains("title=Quarterly Report"), "TEXT remains unchanged");
            Assert(output.Contains("orphan freeform line"), "Freeform content retained");
        }
        Console.WriteLine();

        // Test 21: Hash to JSON/XML/CSV helper methods
        Console.WriteLine("[Test 21] Object Helper Methods");
        {
            var data = Hash.FromDictionary(new Dictionary<string, object>
            {
                ["rows"] = new List<object>
                {
                    Hash.FromDictionary(new Dictionary<string, object>
                    {
                        ["id"] = 1,
                        ["name"] = "Alpha",
                        ["notes"] = "Hello, world"
                    }),
                    Hash.FromDictionary(new Dictionary<string, object>
                    {
                        ["id"] = 2,
                        ["name"] = "Beta",
                        ["notes"] = ""
                    })
                }
            });

            var jsonOutput = converter.ToJson(data);
            var xmlOutput = converter.ToXml(data);
            var csvOutput = converter.ToCsv(data);

            Assert(jsonOutput.Contains("\"rows\""), "ToJson serializes hash");
            Assert(xmlOutput.Contains("<rows>"), "ToXml serializes hash");
            Assert(csvOutput.Contains("id,name,notes"), "ToCsv serializes tabular hash");
        }
        Console.WriteLine();

        // Test 22: Template-driven CSV to JSON flow
        Console.WriteLine("[Test 22] CSV to JSON via Template");
        {
            var input = """
            name,age,city
            Alice,30,Kolkata
            """;

            var template = """[{ "name": "{{ rows[0].name }}", "age": {{ rows[0].age }}, "city": "{{ rows[0].city }}" }]""";

            var (hash, origins) = loader.LoadFromString(input, "CSV");
            var engine = new DebugEngine(template, hash, origins);

            while (!engine.State.IsComplete && string.IsNullOrEmpty(engine.State.ErrorMessage))
            {
                engine.Step(StepAction.Continue);
            }

            var output = engine.State.OutputSoFar;
            Assert(output.Contains("Alice"), "Template output contains transformed name");
            Assert(output.Contains("Kolkata"), "Template output contains transformed city");
        }
        Console.WriteLine();

        Console.WriteLine($"Results: {passed} passed, {failed} failed\n");
        return failed == 0 ? 0 : 1;
    }
}

// Made with Bob
