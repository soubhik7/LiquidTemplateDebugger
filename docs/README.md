# DotLiquid Template Debugger

A step-by-step debugger for [DotLiquid](https://github.com/dotliquid/dotliquid) templates with comprehensive **format transformation** capabilities. Inspect variables, set breakpoints, trace data origins, and transform data between JSON, XML, CSV, and text formats.

## 🏗️ Architecture

This project follows a **robust, modular architecture** with:
- ✅ **Interface-based programming** for testability and flexibility
- ✅ **Dependency injection** for loose coupling
- ✅ **Comprehensive security** with input validation and rate limiting
- ✅ **Feature flags** for controlled rollouts
- ✅ **CI/CD pipeline** with automated testing and deployment
- ✅ **Monitoring & observability** with health checks and structured logging

📚 **See [ARCHITECTURE.md](ARCHITECTURE.md) for complete architectural documentation**

## Features

✨ **Step-by-step debugging** - Execute templates line by line
🔍 **Variable inspection** - Deep dive into data structures
🎯 **Breakpoints & watches** - Pause execution and monitor values
📊 **Data origin tracking** - Trace values back to their source
🔄 **Format transformations** - Convert between JSON, XML, CSV, and text
🔗 **Azure Logic Apps compatible** - Input data wrapped in `content` property
🌐 **Web-based UI** - Modern browser interface
🧪 **Comprehensive testing** - Built-in test suite

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)

## Build & Run

```bash
cd LiquidTemplateDebugger

# Build
dotnet build

# Run with template and data files
dotnet run -- <template-file> <data-file> [format]

# Run in interactive mode (load files from within the debugger)
dotnet run

# Run smoke tests
dotnet run -- --test
```

**Supported input formats:** JSON, XML, CSV, key=value text (auto-detected from file extension, or pass `json`/`xml`/`csv`/`text` as the third argument).

### Azure Logic Apps Compatibility

This debugger follows the **Azure Logic Apps Liquid template transformation** pattern, where input data is automatically wrapped in a `content` property. This means:

- Input data like `{"name": "John"}` becomes accessible as `{{ content.name }}`
- All variables from input must be accessed via the `content` prefix
- This matches the standard behavior of Liquid transformations in Azure Logic Apps

**Example:**

```json
// Input data
{
  "customer": {
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

```liquid
// Template - access via content wrapper
Order for {{ content.customer.name }}
Email: {{ content.customer.email }}
```

See `samples/order-content-wrapper.liquid` for a complete example.

## Format Transformations

The debugger now supports comprehensive data format transformations:

- **CSV ↔ JSON** - Convert tabular data to/from JSON
- **JSON ↔ XML** - Transform between JSON and XML structures
- **XML ↔ XML** - Restructure XML documents
- **CSV ↔ XML** - Convert CSV to XML and vice versa
- **Any format → Text** - Generate custom text output

See [FORMAT_TRANSFORMATIONS.md](FORMAT_TRANSFORMATIONS.md) for detailed examples and API usage.

### Quick Example: CSV to JSON

```bash
# Using sample files
dotnet run -- samples/csv-to-json.liquid samples/products.csv csv
```

**Input (products.csv):**
```csv
id,name,price,category
1,Widget A,29.99,Electronics
2,Widget B,49.99,Electronics
```

**Template (csv-to-json.liquid):**
```liquid
[
{% for item in rows %}
  {"id": {{ item.id }}, "name": "{{ item.name }}", "price": {{ item.price }}}{% unless forloop.last %},{% endunless %}
{% endfor %}
]
```

**Output:** Properly formatted JSON array

## End-to-End Debugging Example

### 1. Sample Files

**`samples/order.json`** — input data:

```json
{
  "customer": {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "tier": "gold"
  },
  "items": [
    { "name": "Widget A", "price": 29.99, "quantity": 2 },
    { "name": "Widget B", "price": 49.99, "quantity": 1 },
    { "name": "Gadget C", "price": 15.50, "quantity": 3 }
  ],
  "discount_percent": 10,
  "shipping": "express"
}
```

**`samples/order-content-wrapper.liquid`** — template (Azure Logic Apps compatible):

```liquid
Order Summary for {{ content.customer.name }}
Email: {{ content.customer.email | downcase }}
Tier: {{ content.customer.tier | upcase }}
==============================
{% for item in content.items %}
  {{ item.name }} - ${{ item.price }} x {{ item.quantity }}
{% endfor %}
------------------------------
{% assign total = 0 %}
{% for item in content.items %}
  {% assign line_total = item.price | times: item.quantity %}
  {% assign total = total | plus: line_total %}
{% endfor %}
Subtotal: ${{ total }}
{% if content.discount_percent > 0 %}
  {% assign discount_amount = total | times: content.discount_percent | divided_by: 100 %}
  Discount ({{ content.discount_percent }}%): -${{ discount_amount }}
  {% assign total = total | minus: discount_amount %}
{% endif %}
Total: ${{ total }}
Shipping: {{ content.shipping | capitalize }}
```

**Note:** All input data is accessed via the `content` wrapper, matching Azure Logic Apps behavior.

### 2. Start the Debugger

```
dotnet run -- samples/order-content-wrapper.liquid samples/order.json
```

Output:

```
  ╔══════════════════════════════════════════════╗
  ║   DotLiquid Template Debugger               ║
  ║   Step-by-step Liquid template execution     ║
  ╚══════════════════════════════════════════════╝

Type 'help' for available commands.
Loaded template: samples/order-content-wrapper.liquid
Loaded data: samples/order.json (.json)
Template has 45 elements across 22 lines

[Literal] Line 1
>  1| Order Summary for {{ customer.name }}
   2| Email: {{ customer.email | downcase }}
   3| Tier: {{ customer.tier | upcase }}
```

The debugger is paused at the first element of the template. The `>` marker shows your current position.

### 3. Step Through Execution

Use `step` (or `s`) to execute one element at a time:

```
dbg> step
[Output] Line 1
>  1| Order Summary for {{ content.customer.name }}
   2| Email: {{ content.customer.email | downcase }}
   3| Tier: {{ content.customer.tier | upcase }}
  Output: "Order Summary for "

dbg> step
[Literal] Line 1
>  1| Order Summary for {{ content.customer.name }}
   2| Email: {{ content.customer.email | downcase }}
   3| Tier: {{ content.customer.tier | upcase }}
  Output: "Alice Johnson"
```

Each step shows the element type (`[Literal]`, `[Output]`, `[Tag]`), the current line, and what was added to the output.

### 4. View All Variables

```
dbg> vars
Variables:
  content          [INPUT]    (Hash) {Hash: 4 keys}
```

The `content` variable contains all input data as nested properties.

Variables are color-coded by source:
- `[INPUT]` — from input data
- `[ASSIGN]` — created by `{% assign %}` in the template
- `[FOR]` — loop iteration variable
- `[CAPTURE]` — from `{% capture %}` blocks

### 5. Inspect a Variable

```
dbg> inspect content.customer
Inspecting: content.customer
----------------------------------------
  Scope:  input (depth: 0)
  Origin: content.customer (input)
  Type:   Hash
  Value:
    name: Alice Johnson
    email: alice@example.com
    tier: gold
```

Access nested properties using dot notation: `content.customer.name`, `content.items`, etc.

Deep-inspect nested objects, arrays, and their full structure.

### 6. Inspect the Current Line

Use `il` (inspect-line) to see every expression on the current line at once:

```
dbg> il
  Line 2: Email: {{ content.customer.email | downcase }}

  { content.customer.email | downcase }  content.customer.email = "alice@example.com"
    after filters: "alice@example.com"
    origin: content.customer [FROM INPUT]
```

This shows the raw value, the result after filters, and where the data came from.

### 7. Set Breakpoints

```
dbg> break 14
Breakpoint #1 set at line 14

dbg> continue
```

Execution runs until it hits line 14 (the `Subtotal` line), then pauses.

Conditional breakpoints:

```
dbg> break 6 item.price > 30
Breakpoint #2 set at line 6 when 'item.price > 30'
```

Manage breakpoints:

```
dbg> breakpoints        # list all
dbg> toggle 1           # enable/disable
dbg> delete 1           # remove
```

### 8. Watch Expressions

Set watches to track values as you step:

```
dbg> watch total
Watch #1: total = 0

dbg> step
  Watch #1 changed: total = 59.98
```

The debugger alerts you when a watched value changes.

```
dbg> watches            # list all watches
dbg> unwatch 1          # remove a watch
```

### 9. Trace Data Origin

See where a variable's value came from and how it was transformed:

```
dbg> origin total
Origin of 'total':
  Source path:   assign@line:9
  Source format: template
  Original val:  0
  Data source:   CREATED IN TEMPLATE

dbg> trace total
Trace for 'total':
  [ORIGIN] assign@line:9 (template)
           Value: 0
     |
  [ASSIGN] Line 12: total = total | plus: line_total
           0 -> 59.98
     |
  [ASSIGN] Line 12: total = total | plus: line_total
           59.98 -> 109.97
     |
  [CURRENT] 156.47
```

### 10. Evaluate Expressions

Evaluate any Liquid expression on the fly:

```
dbg> eval content.customer.name | upcase
=> "ALICE JOHNSON"

dbg> eval content.items.size
=> 3

dbg> eval total | divided_by: 2
=> 78.235
```

### 11. Step Over / Step Out

Skip entire blocks without stepping through every element:

```
dbg> stepover           # execute entire for/if block, stop after
dbg> stepout            # finish current scope and stop
```

### 12. View Output and Compare

```
dbg> output             # show output generated so far
dbg> render             # show full DotLiquid render for comparison
dbg> template           # show template with line numbers and breakpoints
```

### 13. Reset and Quit

```
dbg> reset              # restart execution from the beginning
dbg> quit               # exit the debugger
```

## Command Reference

| Command | Shortcut | Description |
|---|---|---|
| `step` | `s`, `n` | Execute next element |
| `stepin` | `si` | Step into block |
| `stepover` | `so` | Step over entire block |
| `stepout` | `sout` | Step out of current scope |
| `continue` | `c` | Run until breakpoint or end |
| `run <line>` | `r` | Run to specific line |
| `reset` | | Restart execution |
| `break <line> [cond]` | `bp` | Set breakpoint (optional condition) |
| `breakpoints` | `bps` | List all breakpoints |
| `delete <id>` | `del` | Remove breakpoint |
| `toggle <id>` | | Enable/disable breakpoint |
| `watch <expr>` | `w` | Add watch expression |
| `watches` | `ws` | List all watches |
| `unwatch <id>` | `uw` | Remove watch |
| `vars [filter]` | `v` | Show variables (optional name filter) |
| `inspect <var>` | `i` | Deep inspect a variable |
| `inspect-line` | `il` | Inspect all expressions on current line |
| `eval <expr>` | `e` | Evaluate a Liquid expression |
| `origin <var>` | `o` | Show where a value came from |
| `trace <var>` | `t` | Show full transformation history |
| `output` | `out` | Show output generated so far |
| `template` | `tpl` | Show template with line numbers |
| `context` | `ctx` | Show current position in template |
| `scope` | | Show scope stack |
| `state` | | Show full debugger state |
| `render` | | Show full DotLiquid render output |
| `set <key> <val>` | | Change display settings |
| `load <tpl> <data>` | `l` | Load template and data files |
| `help` | `h`, `?` | Show help |
| `quit` | `q`, `exit` | Exit debugger |

## Display Settings

```
dbg> set output_on_step true    # show output chunk after each step (default: on)
dbg> set vars_on_step true      # show variables after each step (default: off)
dbg> set scope_on_step true     # show scope after each step (default: on)
dbg> set context_lines 4        # lines of context around current line (default: 2)
```


## 📚 Architecture & Documentation

This project implements a comprehensive, production-ready architecture. See the following documents for details:

### Core Documentation
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture, design patterns, and principles
- **[INTERFACES.md](INTERFACES.md)** - Interface definitions and dependency injection guide
- **[SECURITY.md](SECURITY.md)** - Security implementation, threat model, and best practices
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation guide with 12-week plan
- **[ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md)** - Executive summary of all architectural decisions

### Deployment Documentation
- **[AZURE_DEPLOYMENT_MANUAL.md](AZURE_DEPLOYMENT_MANUAL.md)** - 📘 **Complete manual deployment guide** (Azure Portal, no CLI)
  - Detailed comparison: Azure Container Apps vs Azure Web App
  - Step-by-step instructions with screenshots guidance
  - Cost analysis and optimization tips
  - Security best practices and troubleshooting
- **[AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)** - Azure deployment using CLI commands

### Key Features
- ✅ **Modular Design** - Clear separation of concerns with interface-based programming
- ✅ **Dependency Injection** - All services registered in DI container for testability
- ✅ **Security First** - Input validation, rate limiting, audit logging
- ✅ **Feature Flags** - Control feature rollout without code changes
- ✅ **CI/CD Ready** - Automated build, test, security scan, and deployment
- ✅ **Monitoring** - Health checks, structured logging, metrics collection
- ✅ **Backward Compatible** - API versioning and migration strategies

### Configuration
The application uses a hierarchical configuration system:
1. [`appsettings.json`](appsettings.json) - Base configuration
2. [`appsettings.Development.json`](appsettings.Development.json) - Development overrides
3. [`appsettings.Production.json`](appsettings.Production.json) - Production settings
4. Environment variables - Runtime configuration
5. Command-line arguments - Override any setting

### Feature Flags
Control features via configuration without code changes:
```json
{
  "FeatureFlags": {
    "EnableAdvancedDebugging": true,
    "EnableFormatConversion": true,
    "EnableMultiSession": false,
    "EnableAuthentication": false
  }
}
```

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd LiquidTemplateDebugger

# Restore dependencies
dotnet restore

# Build
dotnet build

# Run tests (when implemented)
dotnet test

# Run application
dotnet run
```

### Contributing
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
2. Follow [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for development workflow
3. Ensure all tests pass and code coverage remains above 80%
4. Follow security guidelines in [SECURITY.md](SECURITY.md)
5. Submit pull requests with clear descriptions

## Project Structure

```
LiquidTemplateDebugger/
├── Program.cs                     Entry point and CLI argument handling
├── Models/DebugModels.cs          Data models (DebugState, TrackedVariable, Breakpoint, etc.)
├── Engine/TemplateParser.cs       Parses Liquid templates into debuggable elements
├── Engine/InputDataLoader.cs      Loads JSON, XML, key=value with origin tracking
├── Engine/DebugEngine.cs          Core engine: stepping, evaluation, filters, scopes
├── UI/DebuggerRepl.cs             Interactive terminal UI with colored output
├── Tests/SmokeTest.cs             Automated smoke tests (29 tests)
└── samples/                       Sample template and data files
```
