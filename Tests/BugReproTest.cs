using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Tests;

/// <summary>
/// Detailed bug reproduction tests comparing debugger output vs DotLiquid output.
/// </summary>
public static class BugReproTest
{
    public static int Run()
    {
        int passed = 0;
        int failed = 0;

        void CompareOutputs(string testName, string template, string jsonInput)
        {
            Console.WriteLine($"\n--- {testName} ---");
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString(jsonInput, "json");
            var engine = new DebugEngine(template, hash, origins);

            // Get DotLiquid's reference output
            var expected = engine.GetFullRender();

            // Step through the entire template
            engine.Step(StepAction.Continue);
            var actual = engine.State.OutputSoFar;

            Console.WriteLine($"  DotLiquid output: [{expected.Replace("\n","\\n")}]");
            Console.WriteLine($"  Debugger output:  [{actual.Replace("\n","\\n")}]");

            if (expected == actual)
            {
                passed++;
                Console.WriteLine($"  PASS: Outputs match");
            }
            else
            {
                failed++;
                Console.WriteLine($"  FAIL: Outputs differ!");
                // Show character-by-character difference
                int diffPos = -1;
                for (int i = 0; i < Math.Min(expected.Length, actual.Length); i++)
                {
                    if (expected[i] != actual[i]) { diffPos = i; break; }
                }
                if (diffPos >= 0)
                    Console.WriteLine($"  First diff at position {diffPos}: expected='{expected[diffPos]}' actual='{actual[diffPos]}'");
                else if (expected.Length != actual.Length)
                    Console.WriteLine($"  Length diff: expected={expected.Length} actual={actual.Length}");
            }
        }

        Console.WriteLine("=== Bug Reproduction Tests ===");

        // Test 1: JSON output template
        CompareOutputs("JSON Output Template",
            @"{
  ""name"": ""{{ name }}"",
  ""email"": ""{{ email }}""
}",
            @"{""name"": ""Alice"", ""email"": ""alice@test.com""}");

        // Test 2: JSON array output with for loop
        CompareOutputs("JSON Array with For Loop",
            @"{
  ""items"": [
    {% for item in items %}
    ""{{ item }}""{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ]
}",
            @"{""items"": [""apple"", ""banana"", ""cherry""]}");

        // Test 3: Conditional inside loop
        CompareOutputs("Conditional Inside Loop",
            @"{% for item in items %}{% if forloop.first %}[{% endif %}""{{ item.name }}"": {{ item.price }}{% unless forloop.last %}, {% endunless %}{% if forloop.last %}]{% endif %}{% endfor %}",
            @"{""items"": [{""name"":""A"",""price"":10},{""name"":""B"",""price"":20}]}");

        // Test 4: Assign + output in sequence
        CompareOutputs("Assign Then Output",
            @"{% assign greeting = ""Hello"" %}{{ greeting }} {{ name }}!",
            @"{""name"": ""World""}");

        // Test 5: Nested object access
        CompareOutputs("Nested Object Access",
            @"{{ user.name }} ({{ user.age }})",
            @"{""user"": {""name"": ""Bob"", ""age"": 25}}");

        // Test 6: Multiple filters
        CompareOutputs("Multiple Filters",
            @"{{ text | upcase | truncate: 10 }}",
            @"{""text"": ""hello world from liquid""}");

        // Test 7: For loop with literal separators (comma placement)
        CompareOutputs("For Loop Comma Separator",
            @"{% for item in items %}{{ item }}{% unless forloop.last %}, {% endunless %}{% endfor %}",
            @"{""items"": [""x"", ""y"", ""z""]}");

        // Test 8: If/else
        CompareOutputs("If/Else",
            @"{% if show %}YES{% else %}NO{% endif %}",
            @"{""show"": false}");

        // Test 9: Complex JSON template
        CompareOutputs("Complex JSON Generation",
            @"{
  ""order"": {
    ""customer"": ""{{ customer.name }}"",
    ""items"": [
      {% for item in items %}
      {
        ""name"": ""{{ item.name }}"",
        ""qty"": {{ item.quantity }}
      }{% unless forloop.last %},{% endunless %}
      {% endfor %}
    ]
  }
}",
            @"{""customer"":{""name"":""Alice""},""items"":[{""name"":""Widget"",""quantity"":2},{""name"":""Gadget"",""quantity"":1}]}");

        // Test 10: Unless tag
        CompareOutputs("Unless Tag",
            @"{% unless hidden %}VISIBLE{% endunless %}",
            @"{""hidden"": false}");

        // Test 11: for loop with forloop.last used for comma
        CompareOutputs("ForLoop Last for Comma",
            @"[{% for n in numbers %}{{ n }}{% if forloop.last == false %},{% endif %}{% endfor %}]",
            @"{""numbers"": [1, 2, 3]}");

        // Test 12: Capture block
        CompareOutputs("Capture Block",
            @"{% capture greeting %}Hello {{ name }}{% endcapture %}{{ greeting }}!",
            @"{""name"": ""World""}");

        // Test 13: Whitespace-sensitive JSON generation
        CompareOutputs("Whitespace Sensitive JSON",
            @"[{% for item in items %}""{{ item.name }}""{% unless forloop.last %},{% endunless %}{% endfor %}]",
            @"{""items"": [{""name"":""A""},{""name"":""B""},{""name"":""C""}]}");

        // Test 14: The sample order template
        CompareOutputs("Sample Order Template",
            @"Order Summary for {{ customer.name }}
Email: {{ customer.email | downcase }}
Tier: {{ customer.tier | upcase }}
==============================
{% for item in items %}
  {{ item.name }} - ${{ item.price }} x {{ item.quantity }}
{% endfor %}
------------------------------
{% assign total = 0 %}
{% for item in items %}
  {% assign line_total = item.price | times: item.quantity %}
  {% assign total = total | plus: line_total %}
{% endfor %}
Subtotal: ${{ total }}
{% if discount_percent > 0 %}
  {% assign discount_amount = total | times: discount_percent | divided_by: 100 %}
  Discount ({{ discount_percent }}%): -${{ discount_amount }}
  {% assign total = total | minus: discount_amount %}
{% endif %}
Total: ${{ total }}
Shipping: {{ shipping | capitalize }}",
            @"{""customer"":{""name"":""Alice Johnson"",""email"":""alice@example.com"",""tier"":""gold""},""items"":[{""name"":""Widget A"",""price"":29.99,""quantity"":2},{""name"":""Widget B"",""price"":49.99,""quantity"":1},{""name"":""Gadget C"",""price"":15.50,""quantity"":3}],""discount_percent"":10,""shipping"":""express""}");

        // Summary
        Console.WriteLine("\n" + new string('=', 40));
        Console.WriteLine($"Results: {passed} passed, {failed} failed, {passed + failed} total");

        return failed > 0 ? 1 : 0;
    }
}
