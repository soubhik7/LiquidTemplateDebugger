# How the Liquid Template Debugger Works

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Debugging Process](#debugging-process)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Format Transformation](#format-transformation)

---

## Overview

The **Liquid Template Debugger** is a web-based debugging tool for DotLiquid templates. It allows developers to:
- Step through template execution line-by-line
- Track variable values and transformations
- Set breakpoints and watch expressions
- Convert between different data formats (JSON, XML, CSV)
- Visualize data flow from input to output

The application runs as a local REST API server with a web-based UI, making it accessible through any modern browser.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (UI)                          │
│  - Template Editor                                           │
│  - Variable Inspector                                        │
│  - Output Viewer                                             │
│  - Debug Controls                                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP REST API
                     │ (JSON)
┌────────────────────▼────────────────────────────────────────┐
│              ASP.NET Core Web Server                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         API Layer (DebugApiEndpoints.cs)             │   │
│  │  - /api/load, /api/step, /api/state, etc.           │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │      Session Manager (DebugSessionManager.cs)        │   │
│  │  - Manages engine lifecycle                          │   │
│  │  - Handles reset/reload                              │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │         Debug Engine (DebugEngine.cs)                │   │
│  │  - Step-by-step execution                            │   │
│  │  - Variable tracking                                 │   │
│  │  - Breakpoint management                             │   │
│  └──────┬───────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────▼──────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ TemplateParser  │  │InputDataLoader│  │FormatConverter│  │
│  │ (Parse Liquid)  │  │(JSON/XML/CSV) │  │(Transform)    │  │
│  └─────────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. **Program.cs** - Application Entry Point

**Location**: [`Program.cs`](../Program.cs)

**Responsibilities**:
- Parse command-line arguments (port, test flags, file preloading)
- Configure ASP.NET Core web server
- Register dependency injection services
- Set up JSON serialization
- Auto-open browser on startup
- Serve static files from `wwwroot/`

**Key Features**:
```csharp
// Listen on configurable port (default: 5050)
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Register core services
builder.Services.AddSingleton<ITemplateParser, TemplateParser>();
builder.Services.AddSingleton<IInputDataLoader, InputDataLoader>();
builder.Services.AddSingleton<DebugSessionManager>();

// Map API endpoints
app.MapDebugApiEndpoints();
```

### 2. **DebugEngine.cs** - Core Debugging Engine

**Location**: [`Engine/DebugEngine.cs`](../Engine/DebugEngine.cs)

**Responsibilities**:
- Parse template into debuggable elements
- Execute template step-by-step
- Track variable state and transformations
- Manage breakpoints and watch expressions
- Handle control flow (if/else, loops, case/when)
- Track scope depth and execution context

**Key Data Structures**:
```csharp
// Execution state
private readonly List<TemplateElement> _elements;
private readonly DebugState _state;
private readonly Stack<ForLoopState> _forLoopStack;
private readonly Stack<(bool executing, bool branchTaken)> _executionStack;

// User-defined debugging aids
private readonly List<Breakpoint> _breakpoints;
private readonly List<WatchExpression> _watches;
```

**Step Actions**:
- `StepNext`: Execute next element
- `StepInto`: Step into nested blocks
- `StepOver`: Execute block without stepping through
- `StepOut`: Execute until current block exits
- `Continue`: Run until breakpoint or completion
- `RunToLine`: Execute until specific line

### 3. **DebugSessionManager.cs** - Session Lifecycle Manager

**Location**: [`Api/DebugSessionManager.cs`](../Api/DebugSessionManager.cs)

**Responsibilities**:
- Manage single debug session (singleton)
- Load templates and data from files or strings
- Reset execution while preserving breakpoints/watches
- Store session state for reload capability

**Key Methods**:
```csharp
// Load from content strings
public void Load(string templateContent, string dataContent, string format)

// Load from file paths
public void LoadFromFiles(string templatePath, string dataPath, string? format)

// Reset execution (recreate engine, restore breakpoints)
public void Reset()
```

### 4. **TemplateParser.cs** - Template Parsing

**Location**: [`Engine/TemplateParser.cs`](../Engine/TemplateParser.cs)

**Responsibilities**:
- Parse Liquid template into individual elements
- Track line numbers and column positions
- Identify element types (literal, output, tag, comment)
- Build parent-child relationships for nested blocks
- Handle whitespace control (`{{-`, `-}}`, `{%-`, `-%}`)

**Element Types**:
- **Literal**: Plain text
- **Output**: `{{ variable | filter }}`
- **Tag**: `{% if condition %}`, `{% for item in array %}`
- **Comment**: `{% comment %}...{% endcomment %}`
- **RawBlock**: `{% raw %}...{% endraw %}`

### 5. **InputDataLoader.cs** - Data Format Loading

**Location**: [`Engine/InputDataLoader.cs`](../Engine/InputDataLoader.cs)

**Responsibilities**:
- Load input data from multiple formats
- Convert to DotLiquid `Hash` objects
- Track data origin (source path, format, line number)
- Wrap data in `content` property (Azure Logic Apps compatibility)

**Supported Formats**:
- **JSON**: Parse with Newtonsoft.Json
- **XML**: Parse with System.Xml.Linq
- **CSV**: Parse with custom CSV parser
- **TEXT**: Parse key=value pairs

### 6. **FormatConverter.cs** - Format Transformation

**Location**: [`Engine/FormatConverter.cs`](../Engine/FormatConverter.cs)

**Responsibilities**:
- Convert between data formats
- Beautify/format output
- Handle nested objects and arrays
- Preserve data structure during conversion

**Conversion Matrix**:
```
     → JSON    XML     CSV     TEXT
JSON   ✓       ✓       ✓       ✓
XML    ✓       ✓       ✓       ✓
CSV    ✓       ✓       ✓       ✓
TEXT   ✓       ✓       ✓       ✓
```

### 7. **DebugApiEndpoints.cs** - REST API Layer

**Location**: [`Api/DebugApiEndpoints.cs`](../Api/DebugApiEndpoints.cs)

**Responsibilities**:
- Expose HTTP endpoints for all debug operations
- Handle request/response serialization
- Validate input and handle errors
- Convert internal models to DTOs

---

## Data Flow

### Loading a Template Session

```
1. User uploads template + data via UI
   ↓
2. POST /api/load
   {
     "templateContent": "{% for item in content.items %}...",
     "dataContent": "{\"items\": [...]}",
     "format": "JSON"
   }
   ↓
3. DebugSessionManager.Load()
   ↓
4. InputDataLoader.LoadFromString()
   - Parse JSON/XML/CSV
   - Create Hash object
   - Track value origins
   ↓
5. TemplateParser.Parse()
   - Tokenize template
   - Create TemplateElement list
   - Track line/column positions
   ↓
6. DebugEngine constructor
   - Initialize state
   - Set up variable tracking
   - Prepare for execution
   ↓
7. Return initial state to UI
   {
     "currentLine": 1,
     "variables": {...},
     "outputSoFar": "",
     "isComplete": false
   }
```

### Stepping Through Execution

```
1. User clicks "Step Next" in UI
   ↓
2. POST /api/step { "action": "next" }
   ↓
3. DebugEngine.Step(StepAction.StepNext)
   ↓
4. Process current element:
   - Literal → Append to output
   - Output → Evaluate expression, apply filters, append
   - Tag → Execute tag logic (assign, if, for, etc.)
   ↓
5. Update state:
   - Increment element index
   - Update current line
   - Track variable changes
   - Record transformations
   - Check breakpoints
   ↓
6. Return updated state to UI
   {
     "currentLine": 2,
     "variables": {"item": {...}},
     "outputSoFar": "...",
     "lastOutputChunk": "..."
   }
```

### Variable Tracking

```
Input Data → Initial Variables
   ↓
Template Execution:
   - {% assign x = y | filter %} → Track transformation
   - {% for item in array %} → Create loop variable
   - {{ variable | upcase }} → Track filter application
   ↓
TrackedVariable {
   Name: "item",
   CurrentValue: {...},
   Origin: {
      SourcePath: "content.items[0]",
      SourceFormat: "JSON",
      OriginalValue: {...}
   },
   Transformations: [
      {
         TransformationType: "filter",
         Description: "upcase",
         ValueBefore: "hello",
         ValueAfter: "HELLO",
         AtLine: 5
      }
   ],
   ScopeDepth: 1,
   ScopeTag: "for"
}
```

---

## Debugging Process

### Breakpoints

**Setting a Breakpoint**:
```
POST /api/breakpoint
{
  "line": 10,
  "condition": "item.price > 100"  // Optional
}
```

**Breakpoint Evaluation**:
1. Before executing each element, check if line has breakpoint
2. If breakpoint exists and is enabled:
   - Evaluate condition (if specified)
   - If condition is true or no condition, pause execution
   - Increment hit count
3. Return control to user

### Watch Expressions

**Adding a Watch**:
```
POST /api/watch
{
  "expression": "item.price * 1.1"
}
```

**Watch Evaluation**:
- Evaluated at each step
- Uses DotLiquid expression evaluator
- Returns current value or error
- Displayed in UI watch panel

### Variable Inspection

**Inspecting a Variable**:
```
POST /api/inspect
{
  "name": "item.price"
}
```

**Returns**:
```json
{
  "name": "item.price",
  "currentValue": "99.99",
  "rawValue": 99.99,
  "typeName": "Double",
  "scopeTag": "for",
  "scopeDepth": 1,
  "origin": {
    "sourcePath": "content.items[0].price",
    "sourceFormat": "JSON",
    "originalValue": 99.99
  },
  "transformations": [...]
}
```

---

## API Endpoints

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/load` | POST | Load template and data |
| `/api/load-sample` | POST | Load bundled sample files |
| `/api/state` | GET | Get current debug state |
| `/api/reset` | POST | Reset execution to start |

### Execution Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/step` | POST | Execute step action |
| `/api/render` | GET | Get full rendered output |

**Step Actions**:
```json
{
  "action": "next|into|over|out|continue|runtoline",
  "targetLine": 10  // For runtoline only
}
```

### Debugging Tools

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/breakpoint` | POST | Add breakpoint |
| `/api/breakpoint/{id}` | DELETE | Remove breakpoint |
| `/api/breakpoint/{id}/toggle` | POST | Toggle breakpoint enabled/disabled |
| `/api/watch` | POST | Add watch expression |
| `/api/watch/{id}` | DELETE | Remove watch |
| `/api/evaluate` | POST | Evaluate expression |
| `/api/inspect` | POST | Inspect variable details |

### Format Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/convert` | POST | Convert current output to different format |
| `/api/transform` | POST | Load, render, and convert in one call |
| `/api/validate` | POST | Validate output format |
| `/api/beautify` | POST | Format/beautify content |

---

## Frontend Integration

### UI Components

**Location**: [`wwwroot/index.html`](../wwwroot/index.html)

The single-page application includes:

1. **Toolbar**: Load, step controls, reset, theme toggle
2. **Template Panel**: Line-numbered template with breakpoints
3. **Variables Panel**: Filterable variable list with values
4. **Output Panel**: Real-time output with format conversion
5. **Watches Panel**: User-defined watch expressions
6. **Breakpoints Panel**: Active breakpoints list

### API Communication

**JavaScript Fetch Pattern**:
```javascript
async function stepNext() {
  const response = await fetch('/api/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'next' })
  });
  
  const state = await response.json();
  updateUI(state);
}
```

### State Updates

After each API call, the UI updates:
- Highlight current line in template
- Refresh variable table
- Append new output
- Update watch values
- Show execution status

---

## Format Transformation

### Input Format Detection

```csharp
var format = Path.GetExtension(dataPath).TrimStart('.').ToUpperInvariant();
// .json → JSON
// .xml  → XML
// .csv  → CSV
// other → TEXT
```

### JSON Processing

```csharp
// Parse JSON
var token = JToken.Parse(json);

// Track origins
FlattenAndTrackJson(token, "", origins, "JSON");

// Convert to Hash
var hash = Hash.FromDictionary(ConvertObjectDictionary(jObj));
```

### XML Processing

```csharp
// Parse XML
var doc = XDocument.Parse(xml);

// Convert to dictionary
var dict = XmlToDictionary(doc.Root);

// Track origins with line numbers
origins[path] = new ValueOrigin {
    SourcePath = path,
    SourceFormat = "XML",
    SourceLineNumber = element.LineNumber()
};
```

### CSV Processing

```csharp
// Parse CSV with header row
var lines = content.Split('\n');
var headers = ParseCsvLine(lines[0]);

// Create array of objects
var rows = new List<Dictionary<string, object>>();
for (int i = 1; i < lines.Length; i++) {
    var values = ParseCsvLine(lines[i]);
    var row = new Dictionary<string, object>();
    for (int j = 0; j < headers.Count; j++) {
        row[headers[j]] = values[j];
    }
    rows.Add(row);
}
```

### Output Conversion

```csharp
// Convert rendered output to target format
var converter = new FormatConverter();
var result = converter.ConvertOutput(
    output: engine.State.OutputSoFar,
    targetFormat: "XML",
    sourceFormat: "JSON"
);
```

---

## Advanced Features

### Scope Tracking

The engine maintains a scope stack to track variable visibility:

```csharp
// Entering a for loop
_state.ScopeStack.Add($"for:{variableName}");
_state.Variables[variableName] = new TrackedVariable {
    ScopeDepth = _state.ScopeStack.Count,
    ScopeTag = "for"
};

// Exiting the loop
_state.ScopeStack.RemoveAt(_state.ScopeStack.Count - 1);
```

### Conditional Execution

The execution stack tracks whether code should run:

```csharp
// {% if condition %}
if (conditionIsTrue) {
    _executionStack.Push((executing: true, branchTaken: true));
} else {
    _executionStack.Push((executing: false, branchTaken: false));
}

// {% elsif other_condition %}
if (!branchTaken && otherConditionIsTrue) {
    // Update top of stack
    _executionStack.Pop();
    _executionStack.Push((executing: true, branchTaken: true));
}
```

### Output Mapping

Track which template lines produced which output:

```csharp
_state.OutputMappings.Add(new OutputRangeMapping {
    OutputStartIndex = _state.OutputSoFar.Length,
    OutputEndIndex = _state.OutputSoFar.Length + chunk.Length,
    SourceLineNumber = currentLine,
    SourceExpression = expression
});
```

This enables:
- Click output to jump to source line
- Validate output format and show source line on error
- Understand data flow from input to output

---

## Error Handling

### Template Parsing Errors

```csharp
try {
    _elements = parser.Parse(templateSource);
} catch (Exception ex) {
    _state.ErrorMessage = $"Template parse error: {ex.Message}";
    _state.IsComplete = true;
}
```

### Runtime Errors

```csharp
try {
    var result = EvaluateExpression(expression);
} catch (Exception ex) {
    _state.ErrorMessage = $"Runtime error at line {currentLine}: {ex.Message}";
    _state.IsComplete = true;
}
```

### Format Validation

```csharp
var result = OutputValidator.Validate(output, format, outputMappings);
if (!result.IsValid) {
    return new ValidateResponseDto {
        IsValid = false,
        ErrorMessage = result.ErrorMessage,
        SourceLineNumber = result.SourceLineNumber
    };
}
```

---

## Performance Considerations

### Efficient Stepping

- Elements are pre-parsed once at load time
- Each step only processes one element
- State updates are incremental
- No full re-rendering between steps

### Memory Management

- Single session per server instance
- Old engine is garbage collected on reset
- Large templates are handled via streaming output
- Variable tracking uses weak references where possible

### API Response Size

- DTOs exclude unnecessary data
- Raw values are truncated for large objects
- Transformations list is capped
- Output is streamed for large renders

---

## Testing

### Test Modes

Run tests via command-line flags:

```bash
# Smoke test
dotnet run --test

# Bug reproduction test
dotnet run --bugtest

# XML transformation test
dotnet run --xmltest

# Format transformation test
dotnet run --formattest
```

### Test Files

**Location**: [`Tests/`](../Tests/)

- `SmokeTest.cs`: Basic functionality
- `BugReproTest.cs`: Regression tests
- `XmlToXmlComplexTest.cs`: Complex XML transformations
- `FormatTransformationTest.cs`: Format conversion tests

---

## Deployment

### Local Development

```bash
dotnet run --port 5050
# Opens browser at http://localhost:5050
```

### Docker

```bash
docker build -t liquid-debugger .
docker run -p 5050:5050 liquid-debugger
```

### Production

Set environment variables:
- `PORT`: Server port (default: 5050)
- `DOTNET_RUNNING_IN_CONTAINER`: Disable auto-browser open
- `RENDER`: Cloud deployment flag

---

## Summary

The Liquid Template Debugger provides a comprehensive debugging experience for DotLiquid templates through:

1. **Step-by-step execution** with full state visibility
2. **Variable tracking** with origin and transformation history
3. **Breakpoints and watches** for targeted debugging
4. **Format conversion** between JSON, XML, CSV, and TEXT
5. **Web-based UI** accessible from any browser
6. **REST API** for programmatic access

The architecture separates concerns cleanly:
- **Engine**: Core debugging logic
- **API**: HTTP interface
- **UI**: Visual debugging experience
- **Utilities**: Format conversion and validation

This design makes the debugger extensible, testable, and maintainable while providing a powerful tool for understanding and debugging Liquid templates.