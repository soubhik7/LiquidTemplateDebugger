# Dot Liquid Template Debugger

Professional-grade debugging environment for Liquid templates. Step through your logic line-by-line, visualize variable transformations in real-time, and validate outputs across JSON, XML, and CSV formats.

[![Version](https://img.shields.io/visual-studio-marketplace/v/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/SoubhikDevTools.dot-liquid-template-debugger)](https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger)

---

## ⚡ Why Use Dot Liquid Template Debugger?

Stop guessing why your templates aren't rendering correctly. This extension provides full visibility into the Liquid execution engine, allowing you to see exactly how your data is transformed instruction by instruction.

### 🔍 Deterministic Variable Tracking
See exactly how variables are modified by filters. No more wondering why a string was truncated or a number was rounded incorrectly.
![Variable Transformations](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-transformations.png)

### 🧩 Universal Data Support
Whether you're working with enterprise XML payloads, modern JSON APIs, or flat CSV files, the debugger handles them with native performance and syntax awareness.
![XML Debugging](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-xml-debugging.png)

---

## 🛠️ Core Capabilities

### 1. Interactive Step-by-Step Execution
Set breakpoints, step into loops, and watch the output panel build in real-time. Use standard debugging shortcuts (`F5`, `F10`, `F11`) for a familiar workflow.
![Full Debugger View](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-full-debugger.png)

### 2. Live Evaluation & Watches
Evaluate complex Liquid expressions on the fly and keep track of critical variables in the persistent Watch panel.
![Evaluation and Watches](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-evaluation.png)

### 3. Integrated Toolset
Search, copy, format, and validate your code directly within the active debug session.
![Editor Utilities](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-output-menu.png)

---

## 🚀 Quick Start in 60 Seconds

1.  **Install** the extension.
2.  **Open** a `.liquid` template.
3.  **Start Debugging**: Press `F5` or use the command palette (**Liquid: Start Debugging**).
    ![Command Palette](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-command-palette.png)
4.  **Load Data**: Click **Load Sample** to instantly see the debugger in action with pre-configured templates and data.
    ![Load Sample](https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-load-sample.png)

---

## ⚙️ Configuration & Customization

For persistent setups, create a `.vscode/launch.json`:

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

### Essential Settings

| Setting | Description |
| :--- | :--- |
| `liquid-debugger.start` | Launches the interactive debugger. |
| `liquid-debugger.loadData` | Programmatically loads a new data payload. |
| `liquid-debugger.showDebugger` | Toggles debugger panel visibility. |

---

## 🛡️ Privacy & Data Security

**Your data never leaves your machine.**
- **100% Local Execution**: All rendering and debugging happens entirely within your local environment.
- **No Data Collection**: We do not track or transmit your templates, input data, or outputs.
- **Secure Sandbox**: Protected by a strict Content Security Policy (CSP).

---

## 🤝 Support & Community

- **Found a bug?** [Open an Issue](https://github.com/soubhik7/LiquidTemplateDebugger/issues)
- **Contribute**: [GitHub Repository](https://github.com/soubhik7/LiquidTemplateDebugger)

_Developed with ❤️ for the Liquid Community by Soubhik and Bob._
