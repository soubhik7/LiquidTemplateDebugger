import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

function getNonce(): string {
    return randomBytes(16).toString('hex');
}

export class DebuggerPanel {
    public static currentPanel: DebuggerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _messageHandler: ((msg: any) => any) | undefined;

    public static createOrShow(extensionUri: vscode.Uri): DebuggerPanel {
        if (DebuggerPanel.currentPanel) {
            DebuggerPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return DebuggerPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel(
            'liquidDebugger', 'Liquid Debugger', vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist'),
                ]
            }
        );
        DebuggerPanel.currentPanel = new DebuggerPanel(panel, extensionUri);
        return DebuggerPanel.currentPanel;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtml(this._panel.webview, extensionUri);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (msg) => {
            if (this._messageHandler) {
                const result = await this._messageHandler(msg);
                if (msg.type === 'api' && result !== undefined) {
                    this._panel.webview.postMessage({ type: 'apiResponse', id: msg.id, result });
                }
            }
        }, null, this._disposables);
    }

    public setMessageHandler(handler: (msg: any) => Promise<any>): void {
        this._messageHandler = handler;
    }

    public postMessage(msg: any): void {
        this._panel.webview.postMessage(msg);
    }

    public dispose(): void {
        DebuggerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private _getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist', 'assets', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist', 'assets', 'index.css')
        );
        const nonce = getNonce();
        
        // Tightened CSP:
        // 1. style-src: Allowed CSP source (fonts/local CSS).
        // 2. script-src: Allowed CSP source and nonce-protected scripts.
        // 3. font-src: Allowed CSP source (local fonts).
        // 4. img-src: Allowed local resources and data: URIs (kept for flexibility).
        const csp = [
            `default-src 'none'`,
            `style-src ${webview.cspSource}`,
            `script-src ${webview.cspSource} 'nonce-${nonce}'`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource}`,
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquid Debugger</title>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
