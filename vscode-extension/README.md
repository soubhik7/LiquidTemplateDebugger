<div align="center">
  <img src="https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/ltdlogo.png" alt="Dot Liquid Template Debugger Logo" width="150"/>
  <h1>Dot Liquid Template Debugger</h1>
  <p><strong>A professional-grade debugging environment for Liquid templates.</strong></p>

[![Version](https://img.shields.io/visual-studio-marketplace/v/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)

</div>

Stop guessing why your templates aren't rendering correctly. Step through them line-by-line with full visibility into every variable transformation.

## Core Features

- **Instant Feedback**: See exactly what your template is doing as it executes.
- **Line-by-Line Execution**: Execute your templates instruction by instruction. Watch the output panel build in real-time as you step through loops and conditional branches.
- **Transformation History**: See exactly how variables are modified by filters (e.g., `{{ "hello" | capitalize | append: "!" }}`).
- **Multi-Format Support**: Native support for **JSON**, **XML**, and **CSV** data formats. Perfect for web APIs, enterprise systems, and raw data processing.
- **Azure Logic Apps Integration**: Seamlessly handle data wrapped in the Logic Apps `content` property.

---

## Quick Start

1. **Install** the extension from the VS Code Marketplace.
2. **Open** any `.liquid` template file.
3. **Start Debugging**: Press `F5` or open the command palette and type **"Liquid: Start Debugging"**.

   ![Command Palette Start](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-command-palette.png)

4. **Load Data**: The Debugger Panel will appear. Click **Load** to paste your Data.

   ![Debugger Controls](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-menu-bar.png)

   You can easily load XML or JSON data via the data modal:
   ![Data Loading](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-load-json.png)

   Not sure where to start? Just click **Load Sample** to instantly populate the debugger with sample templates and data!
   ![Load Sample](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-load-sample.png)

5. **Debug**: Use standard controls (`F10` for Step Over, `F5` for Continue) to explore your template.

> **Note:** Templates must end in `.liquid` and require VS Code 1.85.0 or higher.

---

### The Debugging Environment

![Full Debugger View - Light](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-full-debugger.png)
![Full Debugger View - Dark](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-full-debugger-dark.png)
_Complete overview of the template, input data, real-time output, and variable states with full Light and Dark mode support._

### Step-by-Step Execution

![Breakpoint and Execution](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-breakpoint.png)
_Pause execution on any line and inspect variables at that exact moment._

### Variable Transformations & Evaluation

![Evaluation and Watches](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-evaluation.png)
![Variable Transformations](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-transformations.png)
_Track how filters modify your variables step-by-step and evaluate expressions on the fly._

### XML Data Support

![XML Format](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-load-xml.png)
![XML Debugging](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-xml-debugging.png)
_First-class support for debugging complex XML payloads and evaluating their properties natively._

### Editor Utilities

![Template Controls](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-template-menu.png)
![Output Controls](https://github.com/soubhik7/LiquidTemplateDebugger/blob/main/vscode-extension/images/screenshot-output-menu.png)
_Easily search, copy, format, and validate your code right inline within your active debug session._

---

## Configuration (Optional)

Create a `.vscode/launch.json` for persistent configurations:

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

### Extension Settings

| Setting                        | Description                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `liquid-debugger.start`        | Launches the interactive debugger for the current file.             |
| `liquid-debugger.loadData`     | Programmatically loads a new data payload into the current session. |
| `liquid-debugger.showDebugger` | Toggles the visibility of the specialized liquid debugger panel.    |

---

## 🔒 Privacy & Data Security

Your data is your business. This extension is designed with a **Privacy-First Architecture**:

- **100% Local Execution**: All template rendering, variable tracking, and debugging logic happen entirely on your local machine.
- **No Data Collection**: We do not collect, track, or transmit your templates, input data, or generated output to any external services.
- **No External API Calls**: The debugger operates in a standalone mode and does not communicate with any remote servers or external APIs for processing.
- **Secure Sandbox**: The debugger UI is protected by a strict Content Security Policy (CSP), ensuring your data remains isolated and secure within VS Code.

---

## Support & Feedback

Encountered a bug or have a feature request?

- **Issues**: [GitHub Issues](https://github.com/soubhik1/liquid-template-debugger-pro/issues)
- **Repository**: [Source Code](https://github.com/soubhik1/liquid-template-debugger-pro)

---

_Developed by collaboration between Soubhik and Bob for the Liquid Community._
