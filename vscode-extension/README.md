<p align="center">
  <img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/ltdlogo2.png" width="180" alt="Dot Liquid Template Debugger V2 Logo"/>
</p>

<h1 align="center">Dot Liquid Template Debugger V2</h1>

<p align="center">
  <b>The industry-standard debugging environment for complex Liquid templates.</b><br>
  <i>Eliminate guesswork with deterministic, line-by-line execution and real-time visualization.</i>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger">
    <img src="https://img.shields.io/visual-studio-marketplace/v/SoubhikDevTools.dot-liquid-template-debugger?style=for-the-badge&color=007acc" alt="Version"/>
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger">
    <img src="https://img.shields.io/visual-studio-marketplace/i/SoubhikDevTools.dot-liquid-template-debugger?style=for-the-badge&color=4c1" alt="Installs"/>
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=SoubhikDevTools.dot-liquid-template-debugger">
    <img src="https://img.shields.io/visual-studio-marketplace/r/SoubhikDevTools.dot-liquid-template-debugger?style=for-the-badge&color=orange" alt="Rating"/>
  </a>
</p>

---

## Why Liquid Professionals Choose This?

Modern Liquid templates are often deceptively complex. Whether you are building Azure Logic Apps, Shopify themes, or Jekyll sites, our debugger provides the visibility you need to build with confidence.

| **Insight** | **Capability** |
| :--- | :--- |
| **Deterministic Tracking** | See exactly how variables are modified by filters in a step-by-step history. |
| **Multi-Format Native** | First-class support for **JSON**, **XML**, and **CSV** payloads with syntax-aware rendering. |
| **Enterprise Ready** | Handles massive payloads with local-first performance and zero data leakage. |

---

## High-Impact Features

### 1. Interactive Step-by-Step Execution
Set breakpoints, step into loops, and watch the output panel build in real-time. Use standard debugging shortcuts (`F5`, `F10`, `F11`) for a familiar workflow.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-full-debugger.png" width="800" alt="Full Debugger View"/>

> [!TIP]
> **Precision Breakpoint Management**: Use the dedicated breakpoint panel to manage complex execution paths and track hit counts across cycles.
> <img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-breakpoint.png" width="800" alt="Breakpoint Management"/>

### 2. Live Evaluation & State Monitoring
Evaluate complex Liquid expressions on the fly and keep track of critical variables in the persistent Watch panel.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-evaluation.png" width="800" alt="Evaluation and Watches"/>

### 3. Flexible Input Ecosystem
Getting your data into the debugger is seamless. We support modern workflows without requiring complex configuration:

*   **⚡ Drag & Drop**: Drag `.liquid`, `.json`, or `.xml` files directly into the setup modal.
*   **📋 Direct Paste**: Paste Liquid snippets and payloads instantly for rapid prototyping.
*   **📂 Local File Sync**: Sync with your workspace files for a persistent workflow.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-drag-drop-modal.png" width="800" alt="Drag and Drop / Paste Modal"/>

### 4. Integrated Developer Toolset
The integrated toolset provides quick access to beautification, validation, and cloning operations, ensuring your output is production-ready.

<div align="center">
  <img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-menu-bar.png" width="45%" style="margin-right: 2%;"/>
  <img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-template-menu.png" width="45%"/>
</div>

---

## Quick Start (60 Seconds)

1.  **Launch**: Press `F5` in a Liquid file or open the Command Palette (`Cmd+Shift+P`) and type `Liquid: Start Debugging`.
2.  **Configure**: Use the **Load Sample** button to see a pre-configured scenario or drag your own files into the modal.
3.  **Debug**: Step through the logic using the debug toolbar or keyboard shortcuts.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-command-palette.png" width="700" alt="Command Palette"/>

---

## Professional Configuration

For advanced teams, use a `.vscode/launch.json` for persistence:

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
      "format": "json"
    }
  ]
}
```

---

## 🔒 Security & Privacy

We take developer privacy seriously.
*   **Zero Egress**: Your code and data never leave your local machine.
*   **Secure Sandbox**: All rendering is contained within a restricted Content Security Policy (CSP).
*   **No Telemetry**: We do not track your templates or input data.

---

## Support & Community

- **Issue Tracker**: [Report a Bug](https://github.com/soubhik7/LiquidTemplateDebugger/issues)
- **Contribution**: [GitHub Repository](https://github.com/soubhik7/LiquidTemplateDebugger)

<p align="center">
  <i>Developed with ❤️ for the Liquid Community by Soubhik and Bob.</i>
</p>

