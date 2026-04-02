# DotLiquid Template Debugger

A step-by-step debugger for [DotLiquid](https://github.com/dotliquid/dotliquid) templates. Inspect variables, set breakpoints, trace data origins, and watch values change — all from your terminal.

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

**Supported input formats:** JSON, XML, key=value text (auto-detected from file extension, or pass `json`/`xml`/`text` as the third argument).

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

**`samples/order.liquid`** — template:

```liquid
Order Summary for {{ customer.name }}
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
Shipping: {{ shipping | capitalize }}
```

### 2. Start the Debugger

```
dotnet run -- samples/order.liquid samples/order.json
```

Output:

```
  ╔══════════════════════════════════════════════╗
  ║   DotLiquid Template Debugger               ║
  ║   Step-by-step Liquid template execution     ║
  ╚══════════════════════════════════════════════╝

Type 'help' for available commands.
Loaded template: samples/order.liquid
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
>  1| Order Summary for {{ customer.name }}
   2| Email: {{ customer.email | downcase }}
   3| Tier: {{ customer.tier | upcase }}
  Output: "Order Summary for "

dbg> step
[Literal] Line 1
>  1| Order Summary for {{ customer.name }}
   2| Email: {{ customer.email | downcase }}
   3| Tier: {{ customer.tier | upcase }}
  Output: "Alice Johnson"
```

Each step shows the element type (`[Literal]`, `[Output]`, `[Tag]`), the current line, and what was added to the output.

### 4. View All Variables

```
dbg> vars
Variables:
  customer         [INPUT]    (Hash) {Hash: 3 keys}
  discount_percent [INPUT]    (Int64) 10
  items            [INPUT]    (List`1) [Array: 3 items]
  shipping         [INPUT]    (String) "express"
```

Variables are color-coded by source:
- `[INPUT]` — from input data
- `[ASSIGN]` — created by `{% assign %}` in the template
- `[FOR]` — loop iteration variable
- `[CAPTURE]` — from `{% capture %}` blocks

### 5. Inspect a Variable

```
dbg> inspect customer
Inspecting: customer
----------------------------------------
  Scope:  input (depth: 0)
  Origin: customer (input)
  Type:   Hash
  Value:
    name: Alice Johnson
    email: alice@example.com
    tier: gold
```

Deep-inspect nested objects, arrays, and their full structure.

### 6. Inspect the Current Line

Use `il` (inspect-line) to see every expression on the current line at once:

```
dbg> il
  Line 2: Email: {{ customer.email | downcase }}

  { customer.email | downcase }  customer.email = "alice@example.com"
    after filters: "alice@example.com"
    origin: customer [FROM INPUT]
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
dbg> eval customer.name | upcase
=> "ALICE JOHNSON"

dbg> eval items.size
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
