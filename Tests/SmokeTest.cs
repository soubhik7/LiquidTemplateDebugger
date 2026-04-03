using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Tests;

/// <summary>
/// Non-interactive smoke test that verifies the debugger engine can parse,
/// step through, and produce output from a template.
/// </summary>
public static class SmokeTest
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

        Console.WriteLine("=== DotLiquid Debugger Smoke Tests ===\n");

        // Test 1: Template parsing
        Console.WriteLine("[Test 1] Template Parser");
        {
            var parser = new TemplateParser();
            var elements = parser.Parse("Hello {{ name }}!");
            Assert(elements.Count == 3, "Parses into 3 elements (literal, output, literal)");
            Assert(elements[0].ElementType == TemplateElementType.Literal, "First is literal");
            Assert(elements[1].ElementType == TemplateElementType.Output, "Second is output");
            Assert(elements[1].Expression == "name", "Output expression is 'name'");
            Assert(elements[2].ElementType == TemplateElementType.Literal, "Third is literal");
        }
        Console.WriteLine();

        // Test 2: Simple template execution
        Console.WriteLine("[Test 2] Simple Output Execution");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"name\": \"World\"}", "json");
            var engine = new DebugEngine("Hello {{ content.name }}!", hash, origins);

            Assert(!engine.State.IsComplete, "Not complete initially");
            Assert(engine.Elements.Count == 3, "Has 3 elements");

            engine.Step(StepAction.StepNext); // literal "Hello "
            Assert(engine.State.OutputSoFar == "Hello ", "After step 1: output is 'Hello '");

            engine.Step(StepAction.StepNext); // output {{ content.name }}
            Assert(engine.State.OutputSoFar == "Hello World", "After step 2: output is 'Hello World'");

            engine.Step(StepAction.StepNext); // literal "!"
            Assert(engine.State.OutputSoFar == "Hello World!", "After step 3: output is 'Hello World!'");
            Assert(engine.State.IsComplete, "Execution is complete");
        }
        Console.WriteLine();

        // Test 3: Variable tracking
        Console.WriteLine("[Test 3] Variable Tracking & Origin");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"greeting\": \"Hello\"}", "json");
            var engine = new DebugEngine("{% assign msg = content.greeting %}{{ msg }}", hash, origins);

            Assert(engine.State.Variables.ContainsKey("content"), "content wrapper variable exists from input");
            Assert(engine.State.Variables["content"].ScopeTag == "input", "content origin is 'input'");

            // Step through assign tag
            engine.Step(StepAction.StepNext);
            Assert(engine.State.Variables.ContainsKey("msg"), "msg variable created after assign");
            Assert(engine.State.Variables["msg"].ScopeTag == "assign", "msg origin is 'assign'");
            Assert(engine.State.Variables["msg"].CurrentValue?.ToString() == "Hello", "msg value is 'Hello'");
        }
        Console.WriteLine();

        // Test 4: For loop
        Console.WriteLine("[Test 4] For Loop Execution");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"items\": [\"A\", \"B\", \"C\"]}", "json");
            var engine = new DebugEngine("{% for item in content.items %}{{ item }}{% endfor %}", hash, origins);

            // Run to completion
            engine.Step(StepAction.Continue);
            Assert(engine.State.IsComplete, "Execution completes");
            Assert(engine.State.OutputSoFar == "ABC", "Output is 'ABC'");
        }
        Console.WriteLine();

        // Test 5: Filters
        Console.WriteLine("[Test 5] Filter Execution");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"text\": \"hello world\"}", "json");
            var engine = new DebugEngine("{{ content.text | upcase }}", hash, origins);

            engine.Step(StepAction.Continue);
            Assert(engine.State.OutputSoFar == "HELLO WORLD", "upcase filter works");
        }
        Console.WriteLine();

        // Test 6: Breakpoints
        Console.WriteLine("[Test 6] Breakpoints");
        {
            var template = "Line1\n{{ content.name }}\nLine3";
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"name\": \"Test\"}", "json");
            var engine = new DebugEngine(template, hash, origins);

            engine.AddBreakpoint(2);
            engine.Step(StepAction.Continue);
            Assert(engine.State.CurrentLine == 2, "Stopped at breakpoint on line 2");
            Assert(!engine.State.IsComplete, "Not complete - stopped at breakpoint");
        }
        Console.WriteLine();

        // Test 7: Watch expressions
        Console.WriteLine("[Test 7] Watch Expressions");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"x\": 10}", "json");
            var engine = new DebugEngine("{% assign x = content.x %}{% assign x = 20 %}{{ x }}", hash, origins);

            var watch = engine.AddWatch("x");
            engine.Step(StepAction.StepNext); // first assign
            Assert(watch.LastValue?.ToString() == "10", "Initial watch value is 10");

            engine.Step(StepAction.StepNext); // second assign
            Assert(engine.Watches[0].HasChanged, "Watch detects change after assign");
        }
        Console.WriteLine();

        // Test 8: JSON input loading
        Console.WriteLine("[Test 8] JSON Input Loading");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString(
                "{\"user\": {\"name\": \"Alice\", \"age\": 30}, \"tags\": [\"a\", \"b\"]}",
                "json");

            Assert(origins.ContainsKey("content.user.name"), "Tracks origin of content.user.name");
            Assert(origins["content.user.name"].OriginalValue?.ToString() == "Alice", "Origin value is correct");
        }
        Console.WriteLine();

        // Test 9: XML input loading
        Console.WriteLine("[Test 9] XML Input Loading");
        {
            var loader = new InputDataLoader();
            var xml = "<root><name>Bob</name><age>25</age></root>";
            var (hash, origins) = loader.LoadFromString(xml, "xml");

            Assert(origins.ContainsKey("content.root.name"), "Tracks origin of content.root.name");
        }
        Console.WriteLine();

        // Test 10: Conditionals
        Console.WriteLine("[Test 10] Conditional Execution");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"show\": true}", "json");
            var engine = new DebugEngine("{% if content.show %}YES{% endif %}", hash, origins);

            engine.Step(StepAction.Continue);
            Assert(engine.State.OutputSoFar.Contains("YES"), "Conditional output rendered");
        }
        Console.WriteLine();

        // Test 11: Full render comparison
        Console.WriteLine("[Test 11] Full Render via DotLiquid");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"name\": \"DotLiquid\"}", "json");
            var engine = new DebugEngine("Hello {{ content.name }}!", hash, origins);

            var fullRender = engine.GetFullRender();
            Assert(fullRender == "Hello DotLiquid!", "DotLiquid renders correctly");
        }
        Console.WriteLine();

        // Test 12: Step over
        Console.WriteLine("[Test 12] Step Over Block");
        {
            var loader = new InputDataLoader();
            var (hash, origins) = loader.LoadFromString("{\"items\": [\"x\", \"y\"]}", "json");
            var engine = new DebugEngine("{% for item in content.items %}{{ item }}{% endfor %}Done", hash, origins);

            engine.Step(StepAction.StepOver); // Should skip entire for block
            Assert(engine.State.OutputSoFar.Contains("xy"), "Step over executes the for block");
        }
        Console.WriteLine();

        // Summary
        Console.WriteLine(new string('=', 40));
        Console.WriteLine($"Results: {passed} passed, {failed} failed, {passed + failed} total");

        return failed > 0 ? 1 : 0;
    }
}
