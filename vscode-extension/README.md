# Liquid Template Debugger for VS Code

A powerful VS Code extension for debugging Liquid templates with step-by-step execution, variable inspection, and format transformation support.

## Features

- **Step-by-step debugging** - Execute templates line by line
- **Variable inspection** - Deep dive into data structures
- **Breakpoints** - Pause execution at specific lines with optional conditions
- **Watch expressions** - Monitor values as the template executes
- **Format transformations** - Support for JSON, XML, CSV, and text formats
- **Azure Logic Apps compatible** - Input data wrapped in `content` property
- **Native VS Code integration** - Uses VS Code Debug Protocol

## Quick Start

1. Install the extension
2. Open a `.liquid` template file
3. Press F5 or use "Run > Start Debugging"
4. Select your input data file (JSON, XML, CSV, or text)
5. Step through your template execution

## Usage

### Starting a Debug Session

1. Open a Liquid template file
2. Right-click in the editor and select "Liquid: Start Debugging"
3. Choose your input data file
4. The debugger will pause at the first line

### Setting Breakpoints

Click in the gutter next to any line number to set a breakpoint. The debugger will pause when it reaches that line.

### Conditional Breakpoints

Right-click on a breakpoint and select "Edit Breakpoint" to add a condition. The debugger will only pause when the condition evaluates to true.

### Viewing Variables

Use the Variables panel in the Debug sidebar to inspect all variables and their values at the current execution point.

### Evaluating Expressions

Use the Debug Console or the debugger panel to evaluate Liquid expressions on the fly.

## Configuration

Create a `.vscode/launch.json` file in your workspace:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "liquid",
      "request": "launch",
      "name": "Debug Liquid Template",
      "template": "${file}",
      "data": "${workspaceFolder}/data.json",
      "format": "json",
      "stopOnEntry": true
    }
  ]
}
```

## Supported Formats

- **JSON** - Standard web data format
- **XML** - Enterprise and legacy systems
- **CSV** - Tabular data
- **Text** - Key-value pairs

## Requirements

- VS Code 1.85.0 or higher
- Node.js (bundled with extension)

## Extension Settings

This extension contributes the following settings:

- `liquid-debugger.start`: Start debugging the current Liquid template
- `liquid-debugger.loadData`: Load input data file
- `liquid-debugger.showDebugger`: Show debugger panel

## Known Issues

- Large templates may take longer to parse
- Complex nested objects may require multiple expansions in the Variables panel

## Release Notes

### 1.0.0

Initial release with core debugging features:
- Step-by-step execution
- Breakpoints and conditional breakpoints
- Variable inspection
- Format transformation support
- Azure Logic Apps compatibility