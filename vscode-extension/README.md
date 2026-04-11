# Dot Liquid Template Debugger for VS Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/SoubhikDevTools.dot-liquid-templatcleare-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)

**A professional-grade debugging environment for Liquid templates.** Stop guessing why your templates aren't rendering correctly—step through them line-by-line with full visibility into every variable transformation.

---

## Why Liquid Debugger?

Debugging Liquid templates (especially complex ones for Dot Liquid or Azure Logic Apps) can be frustrating. Standard out-of-the-box experiences offer little more than syntax highlighting.

This extension transforms VS Code into a first-class Liquid development environment, providing:
- **Instant Feedback**: See exactly what your template is doing as it executes.
- **Data Traceability**: Track how filters modify your variables step-by-step.
- **Enterprise Ready**: Built-in support for JSON, XML, and CSV data formats.

---

## Core Features

### Line-by-Line Execution
Execute your templates instruction by instruction. Watch the output panel build in real-time as you step through loops and conditional branches.

### Transformation History
> [!TIP]
> **Unique Feature!** Most debuggers only show current values. Our engine records the history of every filter applied. See exactly how `{{ "hello" | capitalize | append: "!" }}` was derived.

### Advanced Breakpoints
- **Standard Breakpoints**: Pause execution on any line.
- **Conditional Breakpoints**: Pause only when a specific Liquid expression evaluates to true (e.g., `item.price > 100`).

### Multi-Format Support
Debug your templates using real-world data payloads:
- **JSON**: Perfect for web APIs and modern applications.
- **XML**: Native support for enterprise systems and SOAP services.
- **CSV/Text**: Tabular and raw data processing.

### Azure Logic Apps Integration
Seamlessly handle data wrapped in the Logic Apps `content` property. The debugger automatically detects and adapts to your input structure.

---

## Quick Start

1. **Install** the extension from the VS Code Marketplace.
2. **Open** any `.liquid` template file.
3. **Start Debugging**:
   - Press `F5` or right-click in the editor and select **"Liquid: Start Debugging"**.
4. **Load Data**:
   - The Debugger Panel will appear. Click **Load** to paste your JSON/XML data or drop a file.
5. **Debug**: Use standard controls (`F10` for Step Over, `F5` for Continue) to explore your template.

---

## Configuration

While "Start Debugging" works out of the box, you can create a `.vscode/launch.json` for persistent configurations:

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

---

## Extension Settings

| Setting | Description |
|---------|-------------|
| `liquid-debugger.start` | Launches the interactive debugger for the current file. |
| `liquid-debugger.loadData` | Programmatically loads a new data payload into the current session. |
| `liquid-debugger.showDebugger` | Toggles the visibility of the specialized liquid debugger panel. |

---

## Requirements

- **VS Code**: 1.85.0 or higher
- **File Extensions**: Templates must end in `.liquid`.

---

## Support & Feedback

Encountered a bug or have a feature request?
- **Issues**: [Github Issues](https://github.com/soubhik1/liquid-template-debugger-pro/issues)
- **Repository**: [Source Code](https://github.com/soubhik1/liquid-template-debugger-pro)

---
*Developed by collaboration between Soubhik and Bob❤️ for the Liquid Community.*