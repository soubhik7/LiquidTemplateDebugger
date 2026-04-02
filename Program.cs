using LiquidTemplateDebugger.UI;
using LiquidTemplateDebugger.Tests;

// Run smoke tests
if (args.Length == 1 && args[0] == "--test")
{
    return SmokeTest.Run();
}

var repl = new DebuggerRepl();

if (args.Length >= 2)
{
    // Usage: dotnet run -- <template-file> <data-file> [format]
    var templatePath = args[0];
    var dataPath = args[1];
    var format = args.Length > 2 ? args[2] : null;

    if (!File.Exists(templatePath))
    {
        Console.Error.WriteLine($"Template file not found: {templatePath}");
        return 1;
    }

    if (!File.Exists(dataPath))
    {
        Console.Error.WriteLine($"Data file not found: {dataPath}");
        return 1;
    }

    repl.Run(templatePath, dataPath, format);
}
else if (args.Length == 1 && args[0] is "--help" or "-h")
{
    Console.WriteLine("DotLiquid Template Debugger");
    Console.WriteLine();
    Console.WriteLine("Usage:");
    Console.WriteLine("  LiquidTemplateDebugger <template-file> <data-file> [format]");
    Console.WriteLine("  LiquidTemplateDebugger");
    Console.WriteLine();
    Console.WriteLine("Arguments:");
    Console.WriteLine("  template-file   Path to the Liquid template file");
    Console.WriteLine("  data-file       Path to the input data file (JSON, XML, or key=value)");
    Console.WriteLine("  format          Data format override: json, xml, text (auto-detected if omitted)");
    Console.WriteLine();
    Console.WriteLine("If no arguments are provided, starts in interactive mode.");
    Console.WriteLine("Use 'load <template> <data>' inside the debugger to load files.");
    return 0;
}
else
{
    // Interactive mode - user loads files via the REPL
    repl.Run(null, null, null);
}

return 0;
