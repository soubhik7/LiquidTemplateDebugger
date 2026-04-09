import * as vscode from 'vscode';

export class DebuggerPanel {
    public static currentPanel: DebuggerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DebuggerPanel.currentPanel) {
            DebuggerPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'liquidDebugger',
            'Liquid Template Debugger',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        DebuggerPanel.currentPanel = new DebuggerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'step':
                        vscode.commands.executeCommand('workbench.action.debug.stepOver');
                        break;
                    case 'continue':
                        vscode.commands.executeCommand('workbench.action.debug.continue');
                        break;
                    case 'evaluate':
                        this._evaluateExpression(message.expression);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        DebuggerPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private async _evaluateExpression(expression: string) {
        const session = vscode.debug.activeDebugSession;
        if (session) {
            const result = await session.customRequest('evaluate', {
                expression,
                context: 'watch'
            });
            this._panel.webview.postMessage({
                command: 'evaluationResult',
                result: result.result
            });
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Liquid Template Debugger';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquid Template Debugger</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .section {
            margin-bottom: 30px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 5px;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            margin-top: 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .output-box {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 15px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 400px;
            overflow-y: auto;
        }
        .variable-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .variable-item {
            padding: 8px;
            margin-bottom: 5px;
            background-color: var(--vscode-editor-background);
            border-radius: 3px;
            display: flex;
            justify-content: space-between;
        }
        .variable-name {
            font-weight: bold;
            color: var(--vscode-symbolIcon-variableForeground);
        }
        .variable-value {
            color: var(--vscode-debugTokenExpression-stringForeground);
        }
        .eval-input {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            margin-bottom: 10px;
        }
        .eval-result {
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Liquid Template Debugger</h1>
        
        <div class="section">
            <h2>Controls</h2>
            <div class="controls">
                <button onclick="step()">▶️ Step</button>
                <button onclick="continueExecution()">⏩ Continue</button>
                <button onclick="restart()">🔄 Restart</button>
            </div>
        </div>

        <div class="section">
            <h2>Current Output</h2>
            <div class="output-box" id="output">(No output yet)</div>
        </div>

        <div class="section">
            <h2>Variables</h2>
            <ul class="variable-list" id="variables">
                <li>Use the Debug sidebar to view variables</li>
            </ul>
        </div>

        <div class="section">
            <h2>Evaluate Expression</h2>
            <input type="text" class="eval-input" id="evalInput" placeholder="Enter Liquid expression (e.g., content.customer.name)">
            <button onclick="evaluate()">Evaluate</button>
            <div class="eval-result" id="evalResult" style="display: none;"></div>
        </div>

        <div class="section">
            <h2>Quick Tips</h2>
            <ul>
                <li>Set breakpoints by clicking in the gutter of your .liquid file</li>
                <li>Use the Debug sidebar to view variables and call stack</li>
                <li>Step through execution to see how your template processes data</li>
                <li>Evaluate expressions to test Liquid filters and logic</li>
            </ul>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function step() {
            vscode.postMessage({ command: 'step' });
        }

        function continueExecution() {
            vscode.postMessage({ command: 'continue' });
        }

        function restart() {
            vscode.postMessage({ command: 'restart' });
        }

        function evaluate() {
            const input = document.getElementById('evalInput');
            const expression = input.value.trim();
            if (expression) {
                vscode.postMessage({ 
                    command: 'evaluate',
                    expression: expression
                });
            }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'evaluationResult':
                    const resultDiv = document.getElementById('evalResult');
                    resultDiv.textContent = 'Result: ' + message.result;
                    resultDiv.style.display = 'block';
                    break;
                case 'updateOutput':
                    document.getElementById('output').textContent = message.output || '(No output yet)';
                    break;
            }
        });

        document.getElementById('evalInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                evaluate();
            }
        });
    </script>
</body>
</html>`;
    }
}

// Made with Bob
