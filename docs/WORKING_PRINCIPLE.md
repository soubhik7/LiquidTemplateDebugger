# DotLiquid Template Debugger — Working Principle & Architecture

## How It Works (In Brief)

> This application takes a **Liquid template** and its **input data** (JSON/XML), parses the template into individual executable elements (tags, outputs, literals) using a regex-based tokenizer, and then walks through them **one element at a time** — like a code debugger stepping through instructions. At each step, it evaluates expressions, applies filters, tracks every variable's current value and origin (where it came from in the source data), and builds up the rendered output incrementally. The entire engine is exposed via a local REST API, letting a browser-based frontend visualize the template, variables, output, breakpoints, and watches in real time.

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Breakdown](#component-breakdown)
   - [Template Parser](#1-template-parser)
   - [Input Data Loader](#2-input-data-loader)
   - [Debug Engine](#3-debug-engine-core)
   - [Session Manager](#4-session-manager)
   - [Web API Layer](#5-web-api-layer)
   - [Frontend (Web UI)](#6-frontend-web-ui)
4. [Execution Flow — Step by Step](#execution-flow--step-by-step)
5. [Data Models](#data-models)
6. [Supported Liquid Features](#supported-liquid-features)
7. [Example Walkthrough](#example-walkthrough)

---

## Overview

The **DotLiquid Template Debugger** is a line-by-line, stepping debugger for [Liquid templates](https://shopify.github.io/liquid/) — the templating language used by Shopify, Jekyll, and many other platforms. It allows developers to:

- **Step through** a Liquid template one element at a time (like a code debugger)
- **Inspect variables** at each step — see current values, types, origins, and transformations
- **Set breakpoints** (optionally conditional) on specific template lines
- **Add watch expressions** to monitor values across steps
- **Trace data origin** — see exactly where each variable value came from (JSON path, XML node, etc.)
- **Track transformations** — see every filter and assignment that modified a value

The project is built with **C# / .NET 9** and the **DotLiquid** NuGet package, exposing itself as a web application with an ASP.NET Minimal API backend and an HTML/CSS/JS single-page frontend.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Web UI)                             │
│  index.html — Template viewer, variable inspector, output panel     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTP REST (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ASP.NET Minimal API                             │
│  DebugApiEndpoints.cs — /api/load, /api/step, /api/state, etc.      │
│  Dtos.cs — Request/response records                                 │
│  DtoConverter.cs — Engine models → JSON-safe DTOs                   │
│  HashJsonConverter.cs — Custom serializer for DotLiquid Hash        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   DebugSessionManager                               │
│  Singleton — holds current DebugEngine instance                     │
│  Manages load / reset / breakpoint+watch persistence                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌──────────────┐ ┌──────────┐ ┌───────────────┐
     │TemplateParser│ │InputData │ │  DebugEngine  │
     │              │ │  Loader  │ │  (core)       │
     │Regex-based   │ │JSON/XML/ │ │Step execution │
     │tokenizer     │ │key=value │ │Variable track │
     │→ elements    │ │→ Hash +  │ │Breakpoints    │
     │with line/col │ │  Origins │ │Watches        │
     └──────────────┘ └──────────┘ └───────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  DotLiquid   │
                                   │  (NuGet)     │
                                   │  Used for    │
                                   │  full-render │
                                   │  comparison  │
                                   └──────────────┘
```

---

## Component Breakdown

### 1. Template Parser

**File:** `Engine/TemplateParser.cs`

**What it does:** Converts a raw Liquid template string into a flat list of `TemplateElement` objects, each annotated with line number, column range, depth, and type.

**How it works:**

1. A compiled regex (`LiquidTokenRegex`) tokenizes the template by matching `{{ ... }}` output tags and `{% ... %}` control tags.
2. Any text between tokens is captured as a **Literal** element.
3. Each token is classified:
   - `{{ expression }}` → `TemplateElementType.Output`
   - `{% tagName args %}` → `TemplateElementType.Tag` (or `Comment` / `RawBlock`)
4. A **depth tracker** maintains nesting depth:
   - Block-open tags (`if`, `for`, `capture`, etc.) increment depth.
   - Block-close tags (`endif`, `endfor`, etc.) decrement depth.
   - Middle tags (`else`, `elsif`, `when`) temporarily reduce depth then re-increment.
5. A **line map** (array of byte offsets for each `\n`) enables O(log n) line/column lookup for any character position.

**Output:** An ordered `List<TemplateElement>` — the "instruction list" the debug engine will walk through.

```
Template Source                     Parsed Elements
─────────────────                   ────────────────
"Hello {{ name }}\n"       →       [0] Literal: "Hello ", line 1, depth 0
                                    [1] Output: "name",   line 1, depth 0
                                    [2] Literal: "\n",     line 1, depth 0
"{% if active %}\n"        →       [3] Tag(if): "active", line 2, depth 0
"  Yes\n"                  →       [4] Literal: "  Yes\n", line 3, depth 1
"{% endif %}"              →       [5] Tag(endif): "",     line 4, depth 0
```

---

### 2. Input Data Loader

**File:** `Engine/InputDataLoader.cs`

**What it does:** Reads input data (the JSON/XML/text that feeds the template) and produces two things:
1. A DotLiquid `Hash` — the context object the template variables resolve against.
2. A `Dictionary<string, ValueOrigin>` — a map from every data path (e.g., `customer.name`, `items[0].price`) to its origin metadata.

**Supported formats:**

| Format | Parser | Path Style |
|--------|--------|------------|
| JSON   | Newtonsoft `JObject` | `customer.name`, `items[0].price` |
| XML    | `System.Xml.Linq` | `root.element.child`, `root.element[0]` |
| Text   | Line-based `key=value` | flat `key` |

**Origin tracking** is important because it lets the debugger display: _"This variable `customer.name` came from JSON path `customer.name`, original value was `Alice Johnson`"._

---

### 3. Debug Engine (Core)

**File:** `Engine/DebugEngine.cs` (~1,243 lines)

This is the heart of the application. It is a **virtual machine** that interprets the parsed element list one element at a time, maintaining full state.

#### 3.1 Initialization

When constructed, the engine:
1. Parses the template via `TemplateParser` → flat element list
2. Populates `DebugState.Variables` with all top-level input data keys, each wrapped in a `TrackedVariable` with origin metadata

#### 3.2 Stepping Model

The `Step(StepAction, targetLine?)` method is the single entry point for advancing execution. It supports six actions:

| Action | Behavior |
|--------|----------|
| **StepNext** | Execute the current element, advance index by 1 |
| **StepInto** | Same as StepNext (goes into nested blocks) |
| **StepOver** | Execute the current block-opening tag and everything inside it until the block closes, then stop |
| **StepOut** | Execute until the current scope (e.g., a `for` loop body) ends |
| **Continue** | Execute until a breakpoint is hit or template ends |
| **RunToLine** | Execute until reaching a specific line number |

#### 3.3 Element Execution

Each element type is executed differently:

- **Literal**: Appends raw text to `OutputSoFar`.
- **Output** (`{{ expr }}`): Evaluates the expression (including filters), converts to string, appends to output.
- **Tag**: Dispatches to specialized handlers:

| Tag | Handler | Effect |
|-----|---------|--------|
| `assign` | `ExecuteAssign` | Evaluates RHS expression, creates/updates `TrackedVariable`, records transformation |
| `capture` | `ExecuteCapture` | Scans ahead to `endcapture`, evaluates all content inside, stores as string variable |
| `if` / `unless` | `ExecuteConditional` | Evaluates condition, pushes result onto scope stack |
| `for` | `ExecuteForStart` | Resolves collection, pushes `ForLoopState`, sets loop variable + `forloop` helper |
| `endfor` | `ExecuteForEnd` | Increments loop index; if more items, jumps back to loop start; else pops state |
| `increment` / `decrement` | `ExecuteIncrement/Decrement` | Outputs current counter value, then increments/decrements |
| `case` / `when` | Scope tracking | Pushes/checks scope |
| `endif`, `endunless`, etc. | Scope pop | Removes innermost scope entry |

#### 3.4 Expression Evaluation

`EvaluateExpression(string)` handles the full Liquid expression pipeline:

```
"product.name |    upcase      | truncate: 20"
     │                │               │
     ▼                ▼               ▼
  Resolve         Apply filter    Apply filter
  variable        "upcase"        "truncate: 20"
```

Steps:
1. **Literal detection**: String quotes, numbers, booleans, nil → return directly
2. **Pipe splitting**: `SplitByPipes()` splits by `|` while respecting string quotes and parentheses
3. **Variable resolution**: `ResolveVariable()` navigates dot-separated paths (e.g., `customer.name`) through `Hash`, `IDictionary`, and reflection
4. **Filter application**: Each filter after the first `|` is applied via `ApplyFilter()`, which supports **40+ Liquid filters** (string manipulation, math, array operations, date formatting, etc.)

#### 3.5 Condition Evaluation

`EvaluateCondition(string)` handles:
- **Logical operators**: `and`, `or` (recursive splitting)
- **Comparison operators**: `==`, `!=`, `<>`, `>`, `<`, `>=`, `<=`, `contains`
- **Truthiness check**: nil/null/false/0/empty-string → falsy; everything else → truthy

#### 3.6 For Loop Mechanics

The `for` loop is implemented with a **stack-based state machine**:

```
┌─ ForLoopState ────────────────────┐
│  VariableName: "item"             │
│  Items: [Widget A, Widget B, ...] │
│  CurrentIndex: 0                  │
│  LoopStartElementIndex: 5         │
│  LoopEndElementIndex: 12          │
└───────────────────────────────────┘
```

- On `{% for item in items %}`: Push state, set `item` to items[0], set `forloop` helpers (index, first, last, length)
- On `{% endfor %}`: Increment index. If more items → jump back to start. If done → pop state, clean up variables.

The `forloop` helper object provides: `forloop.index` (1-based), `forloop.index0` (0-based), `forloop.first`, `forloop.last`, `forloop.length`, `forloop.rindex`, `forloop.rindex0`.

#### 3.7 Breakpoints & Watches

- **Breakpoints**: Stored as a list of `(Id, Line, Condition?, IsEnabled, HitCount)`. Checked during `Continue` mode execution. Conditional breakpoints evaluate their condition expression.
- **Watches**: Stored as a list of `(Id, Expression, LastValue, HasChanged)`. Re-evaluated after every step via `UpdateWatches()`. The `HasChanged` flag highlights when a value changes between steps.

---

### 4. Session Manager

**File:** `Api/DebugSessionManager.cs`

A **singleton** service that:
- Holds the current `DebugEngine` instance
- Stores the original template + data strings for **reset** capability
- Saves and restores breakpoints/watches across resets (so users don't lose them)

The session flow:
```
Load(template, data, format)
     │
     ▼
InputDataLoader → (Hash, Origins)
     │
     ▼
new DebugEngine(template, hash, origins)
     │
     ▼
Restore any saved breakpoints/watches
```

---

### 5. Web API Layer

**Files:** `Api/DebugApiEndpoints.cs`, `Api/Dtos.cs`, `Api/DtoConverter.cs`, `Api/HashJsonConverter.cs`

ASP.NET Minimal API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/load` | Load template + data (inline content or file paths) |
| `POST /api/load-sample` | Load the bundled `order.liquid` + `order.json` sample |
| `GET /api/state` | Get current full debugger state |
| `POST /api/step` | Execute a step action (next/into/over/out/continue/runToLine) |
| `POST /api/reset` | Reset execution to the beginning |
| `POST /api/breakpoint` | Add a breakpoint at a line |
| `DELETE /api/breakpoint/{id}` | Remove a breakpoint |
| `POST /api/breakpoint/{id}/toggle` | Enable/disable a breakpoint |
| `POST /api/watch` | Add a watch expression |
| `DELETE /api/watch/{id}` | Remove a watch |
| `POST /api/evaluate` | Evaluate an arbitrary expression in current context |
| `POST /api/inspect` | Deep-inspect a variable (full origin + transformation history) |
| `GET /api/render` | Get the full DotLiquid-rendered output for comparison |

**DTO Layer:** Engine models (`DebugState`, `TrackedVariable`, etc.) are converted to JSON-safe `record` DTOs by `DtoConverter`. The `HashJsonConverter` handles DotLiquid's `Hash` type, which doesn't serialize natively with `System.Text.Json`.

---

### 6. Frontend (Web UI)

**File:** `wwwroot/index.html` (single-page application)

The browser-based UI communicates with the backend via `fetch()` calls to the REST API. It provides:
- **Template viewer** with line numbers and current-line highlighting
- **Step controls** (Next, Into, Over, Out, Continue, Reset)
- **Variable inspector** with type, value, scope, and origin information
- **Output panel** showing the rendered output built up so far
- **Breakpoint management** (click to toggle on template lines)
- **Watch panel** for monitoring expressions

---

## Execution Flow — Step by Step

Here's the complete lifecycle from user action to displayed result:

```
1. User loads template + data via the Web UI
   │
   ▼
2. Frontend POST /api/load { templateContent, dataContent, format }
   │
   ▼
3. DebugSessionManager.Load()
   ├── InputDataLoader parses data → Hash + Origins
   └── new DebugEngine(template, hash, origins)
       ├── TemplateParser.Parse() → List<TemplateElement>
       └── InitializeVariablesFromInput() → populate DebugState.Variables
   │
   ▼
4. API returns FullStateDto (template, elements, initial state, breakpoints, watches)
   │
   ▼
5. Frontend renders template with line numbers, shows initial variables

   ═══════ Debugging Loop ═══════

6. User clicks "Step Next" (or other action)
   │
   ▼
7. Frontend POST /api/step { action: "next" }
   │
   ▼
8. DebugEngine.Step(StepAction.StepNext)
   ├── ExecuteCurrentElement()
   │   ├── Literal → append to output
   │   ├── Output → evaluate expression → append to output
   │   └── Tag → execute tag-specific logic (assign, for, if, etc.)
   ├── AdvanceToNext() → increment element index
   └── UpdateWatches() → re-evaluate all watch expressions
   │
   ▼
9. API returns updated FullStateDto
   │
   ▼
10. Frontend updates:
    ├── Highlight current line in template
    ├── Update variable table (values, types, origins)
    ├── Update output panel
    ├── Update watch values (highlight changes)
    └── Show any error messages

   ═══════ Repeat 6-10 until IsComplete ═══════
```

---

## Data Models

### Core Models (`Models/DebugModels.cs`)

```
DebugState
├── CurrentElementIndex : int        — which element we're on
├── CurrentLine : int                — source line number
├── CurrentExpression : string       — the raw text being executed
├── CurrentElementType : enum        — Literal/Output/Tag/Comment/RawBlock
├── Variables : Dict<string, TrackedVariable>
├── OutputSoFar : string             — accumulated rendered output
├── LastOutputChunk : string?        — what the last step added
├── ScopeStack : List<string>        — ["root", "for:item", "if:total > 100"]
├── IsComplete : bool                — finished?
└── ErrorMessage : string?

TrackedVariable
├── Name : string
├── CurrentValue : object?
├── TypeName : string                — e.g. "String", "Int64", "Hash"
├── Origin : ValueOrigin             — where the value came from
├── Transformations : List<ValueTransformation>  — history of changes
├── ScopeDepth : int
└── ScopeTag : string                — "input", "assign", "for", "capture"

ValueOrigin
├── SourcePath : string              — e.g. "customer.name", "assign@line:9"
├── SourceFormat : string            — "JSON", "XML", "template", "builtin"
├── OriginalValue : object?
└── SourceLineNumber : int?

ValueTransformation
├── TransformationType : string      — "assign", "filter"
├── Description : string             — "Assigned via: total = 0"
├── ValueBefore / ValueAfter : object?
├── AtLine : int
└── Expression : string
```

### Template Element

```
TemplateElement
├── LineNumber, ColumnStart, ColumnEnd   — location in source
├── RawText : string                     — original text
├── ElementType : enum                   — Literal/Output/Tag/Comment/RawBlock
├── TagName : string?                    — "if", "for", "assign", etc.
├── Expression : string?                 — tag arguments or output expression
├── Depth : int                          — nesting level
├── ParentIndex : int?                   — index of enclosing block
└── ChildIndices : List<int>             — indices of children
```

---

## Supported Liquid Features

### Tags
`assign`, `capture`, `if`, `elsif`, `else`, `unless`, `for`, `endfor`, `case`, `when`, `increment`, `decrement`, `comment`, `raw`, `break`, `continue`

### Filters (40+)

| Category | Filters |
|----------|---------|
| **String** | `upcase`, `downcase`, `capitalize`, `strip`, `lstrip`, `rstrip`, `strip_html`, `strip_newlines`, `newline_to_br`, `escape`, `url_encode`, `url_decode`, `append`, `prepend`, `truncate`, `truncatewords`, `replace`, `replace_first`, `remove`, `remove_first`, `split` |
| **Math** | `plus`, `minus`, `times`, `divided_by`, `modulo`, `abs`, `ceil`, `floor`, `round` |
| **Array** | `size`, `reverse`, `first`, `last`, `sort`, `uniq`, `join`, `map`, `where`, `compact`, `concat` |
| **Date** | `date` (with strftime-style format specifiers) |
| **Other** | `default` |

### Operators
`==`, `!=`, `<>`, `>`, `<`, `>=`, `<=`, `contains`, `and`, `or`

---

## Example Walkthrough

Given this template and data:

**Template (`order.liquid`):**
```liquid
Order Summary for {{ customer.name }}
{% assign total = 0 %}
{% for item in items %}
  {{ item.name }} - ${{ item.price }}
{% endfor %}
Total: ${{ total }}
```

**Data (`order.json`):**
```json
{
  "customer": { "name": "Alice Johnson" },
  "items": [
    { "name": "Widget A", "price": 29.99 },
    { "name": "Widget B", "price": 49.99 }
  ]
}
```

**Debugging execution (step by step):**

| Step | Element | Action | Output Added | Variables Changed |
|------|---------|--------|-------------|-------------------|
| 1 | `Order Summary for ` | Literal | `Order Summary for ` | — |
| 2 | `{{ customer.name }}` | Output | `Alice Johnson` | — |
| 3 | `\n` | Literal | newline | — |
| 4 | `{% assign total = 0 %}` | Tag:assign | — | `total = 0` (origin: assign@line:2) |
| 5 | `\n` | Literal | newline | — |
| 6 | `{% for item in items %}` | Tag:for | — | `item = {Widget A}`, `forloop = {index:1, first:true, ...}` |
| 7 | `  ` | Literal | spaces | — |
| 8 | `{{ item.name }}` | Output | `Widget A` | — |
| 9 | ` - $` | Literal | ` - $` | — |
| 10 | `{{ item.price }}` | Output | `29.99` | — |
| 11 | `\n` | Literal | newline | — |
| 12 | `{% endfor %}` | Tag:endfor | — | `item = {Widget B}`, `forloop.index = 2` (loop continues) |
| 13 | `  ` | Literal | spaces | — |
| 14 | `{{ item.name }}` | Output | `Widget B` | — |
| ... | ... continues | ... | ... | ... |
| N | `{% endfor %}` | Tag:endfor | — | Loop complete; `item` and `forloop` removed |
| N+1 | `Total: $` | Literal | `Total: $` | — |
| N+2 | `{{ total }}` | Output | `0` | — |

At every step, the user can inspect any variable, see its origin (JSON path or template line), see its transformation history, and see the accumulated output.

---

## Key Design Decisions

1. **Custom interpreter, not DotLiquid's execution**: The engine reimplements Liquid evaluation from scratch rather than hooking into DotLiquid's `Template.Render()`. This provides full control over stepping, variable tracking, and transformation history. DotLiquid is only used for `GetFullRender()` comparison.

2. **Flat element list**: The parser produces a flat list (not a tree), making index-based stepping trivial. Depth metadata on each element enables step-over and step-out logic.

3. **Origin tracking from load**: Every value in the input data is tagged with its source path at load time. This enables "data lineage" — tracing a rendered value back to its original JSON key or XML element.

4. **Singleton session**: The `DebugSessionManager` is a singleton, meaning only one debugging session at a time. This simplified the design for the primary use case of a single developer debugging locally.

5. **Breakpoint/watch persistence**: Breakpoints and watches survive `Reset()` calls by being saved/restored in the session manager, so users don't lose their debugging setup when re-running.
