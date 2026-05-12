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
| **AI-Powered Mapping** | Generate complex transformations instantly with our built-in Gemini-powered mapper. |
| **Multi-Format Native** | First-class support for **JSON**, **XML**, and **CSV** payloads with syntax-aware rendering. |
| **Enterprise Ready** | Hardened with a rigorous security audit; local-first performance with zero data leakage. |

---

## High-Impact Features

### 1. Interactive Step-by-Step Execution
Set breakpoints, step into loops, and watch the output panel build in real-time. The interface features a premium glassmorphism design optimized for high-density information.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-full-debugger-v2.png" width="800" alt="Premium Debugger View V2"/>

> [!TIP]
> **Precision Breakpoint Management**: Use the dedicated breakpoint panel to manage complex execution paths and track hit counts across cycles.

### 2. NEW: AI Template Mapper (Gemini 1.5 Powered)
Struggling with a complex transformation? Describe your requirements in plain English, and our AI will generate a complete, valid Liquid template for you.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-ai-mapper.png" width="800" alt="AI Template Mapper"/>

*   **Requirement Import**: Import logic from documentation to populate prompts.
*   **Secure Sanitization**: Automatically redacts sensitive patterns (PII, tokens) before AI processing.
*   **One-Click Load**: Instantly load generated templates into the debugger for immediate testing.

### 3. Flexible Input Ecosystem
Getting your data into the debugger is seamless. We support modern workflows without requiring complex configuration:

*   **⚡ Drag & Drop**: Drag `.liquid`, `.json`, or `.xml` files directly into the setup modal.
*   **📋 Direct Paste**: Paste Liquid snippets and payloads instantly for rapid prototyping.
*   **📂 Local File Sync**: Sync with your workspace files for a persistent workflow.

<img src="https://raw.githubusercontent.com/soubhik7/LiquidTemplateDebugger/main/vscode-extension/images/screenshot-setup-modal.png" width="800" alt="Premium Setup Modal"/>

---

## Quick Start (60 Seconds)

1.  **Launch**: Press `F5` in a Liquid file or open the Command Palette (`Cmd+Shift+P`) and type `Liquid: Start Debugging`.
2.  **Configure**: Use the **Load Sample** button to see a pre-configured scenario or drag your own files into the modal.
3.  **Debug**: Step through the logic using the debug toolbar or keyboard shortcuts.

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
)
```

---

## 🔒 Enterprise-Grade Security

We take developer privacy and enterprise security seriously. The extension has undergone a **5-round security audit** to ensure the highest standards.

*   **Zero Egress**: Your code and data never leave your local machine (AI requests are opt-in and sanitized).
*   **Secure Secret Storage**: API keys are stored in VS Code's native `SecretStorage`, never in plaintext or `localStorage`.
*   **Sanitized AI Pipeline**: Multi-pass regex sanitization redacts PII/tokens before they ever hit the wire.
*   **Strict CSP**: Content Security Policy blocks all unauthorized scripts, images, and external connections.
*   **DoS Protection**: Strict 512KB/1MB size limits and expression length constraints prevent resource exhaustion.

---

## Support & Community

- **Issue Tracker**: [Report a Bug](https://github.com/soubhik7/LiquidTemplateDebugger/issues)
- **Contribution**: [GitHub Repository](https://github.com/soubhik7/LiquidTemplateDebugger)

<p align="center">
  <i>Developed with ❤️ for the Liquid Community by Soubhik and Bob.</i>
</p>

