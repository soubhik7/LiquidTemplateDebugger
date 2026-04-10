import * as vscode from 'vscode';

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
            'liquidDebugger', '🔍 Liquid Debugger', vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        DebuggerPanel.currentPanel = new DebuggerPanel(panel);
        return DebuggerPanel.currentPanel;
    }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.webview.html = this._getHtml();
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
        while (this._disposables.length) { const d = this._disposables.pop(); if (d) { d.dispose(); } }
    }

    private _getHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DotLiquid Template Debugger</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root, [data-theme="dark"] {
  --bg: #1e1e2e; --bg-surface: #252536; --bg-panel: #2a2a3d; --bg-hover: #33334a;
  --bg-active: #3d3d5c; --border: #3b3b54; --border-light: #4a4a66;
  --text: #e0e0f0; --text-dim: #9090b0; --text-muted: #6a6a8a;
  --accent: #7c6ff7; --accent-glow: #9d93fa; --accent-bg: rgba(124,111,247,0.12);
  --blue: #6cb6ff; --purple: #c792ea; --green: #98c379; --yellow: #e5c07b;
  --orange: #d19a66; --red: #e06c75; --magenta: #c678dd; --cyan: #56b6c2;
  --bp-red: #ff4b4b; --bp-red-glow: rgba(255,75,75,0.3);
  --current-line: rgba(229,192,123,0.12); --current-line-border: #e5c07b;
  --font-mono: 'JetBrains Mono', monospace; --font-ui: 'Inter', sans-serif;
  --radius: 8px; --radius-sm: 4px; --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
[data-theme="light"] {
  --bg: #f8f9fa; --bg-surface: #ffffff; --bg-panel: #f1f3f5; --bg-hover: #e9ecef;
  --bg-active: #dee2e6; --border: #ced4da; --border-light: #adb5bd;
  --text: #212529; --text-dim: #495057; --text-muted: #868e96;
  --accent: #5c7cfa; --accent-glow: #748ffc; --accent-bg: rgba(92,124,250,0.1);
  --blue: #228be6; --purple: #be4bdb; --green: #40c057; --yellow: #f59f00;
  --orange: #fd7e14; --red: #fa5252; --magenta: #e64980; --cyan: #15aabf;
  --bp-red: #f03e3e; --bp-red-glow: rgba(240,62,62,0.2);
  --current-line: rgba(245,159,0,0.15); --current-line-border: #f59f00;
}
* { margin:0; padding:0; box-sizing:border-box; transition: background-color var(--transition), border-color var(--transition), color var(--transition); }
html, body { height:100%; font-family:var(--font-ui); background:var(--bg); color:var(--text); overflow:hidden; }
button { font-family:var(--font-ui); cursor:pointer; border:none; outline:none; transition:all var(--transition); }
input, textarea, select { font-family:var(--font-mono); background:var(--bg); color:var(--text); border:1px solid var(--border); border-radius:var(--radius-sm); padding:6px 10px; outline:none; transition:border var(--transition); }
input:focus, textarea:focus, select:focus { border-color:var(--accent); }
/* ── Hide all scrollbars but keep scroll functionality ── */

/* Firefox */
* {
  scrollbar-width: none;        /* hides scrollbar */
  -ms-overflow-style: none;     /* IE/Edge legacy */
}

/* Chrome, Safari, Edge */
*::-webkit-scrollbar {
  display: none;
}
#app { display:flex; flex-direction:column; height:100vh; }
#toolbar { display:flex; align-items:center; gap:6px; padding:8px 12px; background:var(--bg-surface); border-bottom:1px solid var(--border); flex-shrink:0; z-index:10; }
.toolbar-group { display:flex; gap:4px; align-items:center; }
.toolbar-sep { width:1px; height:24px; background:var(--border); margin:0 6px; }
.btn { padding:6px 14px; border-radius:var(--radius-sm); font-size:13px; font-weight:500; background:var(--bg-panel); color:var(--text-dim); border:1px solid var(--border); }
.btn:hover { background:var(--bg-hover); color:var(--text); border-color:var(--border-light); }
.btn:active { background:var(--bg-active); transform:scale(0.97); }
.btn-primary { background:var(--accent); color:#fff; border-color:var(--accent); }
.btn-primary:hover { background:var(--accent-glow); }
.btn:disabled { opacity:0.35; cursor:not-allowed; pointer-events:none; }
.btn .shortcut { font-size:10px; opacity:0.5; margin-left:4px; }
.toolbar-status { margin-left:auto; font-size:12px; color:var(--text-muted); }
.status-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
.status-running { background:rgba(152,195,121,0.15); color:var(--green); }
.status-complete { background:rgba(86,182,194,0.15); color:var(--cyan); }
.status-idle { background:rgba(144,144,176,0.1); color:var(--text-muted); }
#main { display:flex; flex-direction:row; flex:1; overflow:hidden; }
.col { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.panel { display:flex; flex-direction:column; border:1px solid var(--border); overflow:hidden; background:var(--bg-surface); }
.panel-header { display:flex; align-items:center; padding:6px 12px; background:var(--bg-panel); border-bottom:1px solid var(--border); font-size:12px; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.5px; flex-shrink:0; gap:8px; }
.panel-header .badge { font-size:10px; padding:1px 6px; border-radius:8px; background:var(--accent-bg); color:var(--accent); }
.panel-body { flex:1; overflow:hidden; position:relative; display:flex; flex-direction:column; }
#template-panel .panel-body { font-family:var(--font-mono); font-size:13px; line-height:1.7; padding:0; }
.template-line { display:flex; min-height:22px; padding-right:12px; }
.template-line:hover { background:var(--bg-hover); }
.template-line.current { background:var(--current-line); }
.line-gutter { width:60px; min-width:60px; display:flex; align-items:center; justify-content:flex-end; padding-right:4px; gap:2px; user-select:none; flex-shrink:0; }
.line-number { color:var(--text-muted); font-size:12px; min-width:24px; text-align:right; }
.line-bp-area { width:16px; height:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:50%; flex-shrink:0; }
.line-bp-area:hover { background:var(--bp-red-glow); }
.line-bp-dot { width:10px; height:10px; border-radius:50%; background:var(--bp-red); display:none; box-shadow:0 0 6px var(--bp-red-glow); }
.line-bp-area.has-bp .line-bp-dot { display:block; }
.line-bp-area.disabled-bp .line-bp-dot { opacity:0.35; }
.line-arrow { width:14px; color:var(--yellow); font-weight:700; font-size:14px; display:flex; align-items:center; }
.line-content { flex:1; white-space:pre; padding-left:8px; }
.line-content .tok-output { color:var(--blue); }
.line-content .tok-tag { color:var(--purple); }
.line-content .tok-comment { color:var(--text-muted); font-style:italic; }
#vars-panel .panel-body { padding:0; }
#vars-body { overflow:auto; flex: 1; }
.var-filter { padding:6px 8px; border-bottom:1px solid var(--border); }
.var-filter input { width:100%; font-size:12px; padding:4px 8px; }
.var-table { width:100%; border-collapse:collapse; font-size:12px; }
.var-table th { text-align:left; padding:4px 10px; font-weight:600; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.3px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg-panel); z-index:1; }
.var-table td { padding:4px 10px; border-bottom:1px solid rgba(59,59,84,0.4); vertical-align:top; }
.var-table tr:hover { background:var(--bg-hover); cursor:pointer; }
.var-name { font-family:var(--font-mono); font-weight:500; color:var(--text); }
.var-value { font-family:var(--font-mono); color:var(--text-dim); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.scope-badge { display:inline-block; padding:1px 6px; border-radius:8px; font-size:10px; font-weight:600; letter-spacing:0.3px; }
.scope-input,.scope-global { background:rgba(152,195,121,0.15); color:var(--green); }
.scope-assign { background:rgba(229,192,123,0.15); color:var(--yellow); }
.scope-for { background:rgba(198,120,221,0.15); color:var(--magenta); }
.scope-capture { background:rgba(209,154,102,0.15); color:var(--orange); }
.scope-increment, .scope-decrement { background:rgba(86,182,194,0.15); color:var(--cyan); }
.scope-root { background:rgba(144,144,176,0.1); color:var(--text-muted); }
.var-detail { background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); margin:4px 10px 8px; padding:8px 12px; font-size:12px; }
.var-detail h4 { color:var(--accent); font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.3px; }
.var-detail pre { font-family:var(--font-mono); font-size:11px; color:var(--text-dim); white-space:pre-wrap; word-break:break-all; max-height:200px; overflow:auto; }
.var-detail .origin-info { margin-top:6px; color:var(--text-muted); font-size:11px; }
.var-detail .origin-info span { color:var(--green); }
.transformation { margin-top:4px; padding:6px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:11px; }
.tf-type { color:var(--magenta); font-weight:600; }
.tf-before { color:var(--red); text-decoration:line-through; }
.tf-after { color:var(--green); font-weight:600; }
#output-panel .panel-body { font-family:var(--font-mono); font-size:13px; padding:0; }
#output-body { padding:10px 14px; white-space:pre-wrap; word-break:break-word; overflow:auto; flex:1; }
.scope-breadcrumb { display:flex; gap:4px; align-items:center; padding:4px 12px; font-size:11px; color:var(--text-muted); border-bottom:1px solid var(--border); background:var(--bg-panel); flex-shrink:0; flex-wrap:wrap; }
.scope-breadcrumb span { padding:1px 6px; border-radius:8px; background:var(--accent-bg); color:var(--accent); font-size:10px; }
.scope-breadcrumb .sep { background:none; color:var(--text-muted); font-size:10px; }
.output-last-chunk { background:rgba(152,195,121,0.12); border-left:2px solid var(--green); padding-left:4px; display:inline; }
#wb-panel .panel-body { padding:0; display:flex; flex-direction:column; }
.wb-tabs { display:flex; border-bottom:1px solid var(--border); flex-shrink:0; background:var(--bg-panel); }
.wb-tab { flex:1; padding:6px; text-align:center; font-size:12px; font-weight:500; color:var(--text-muted); cursor:pointer; border-bottom:2px solid transparent; transition:all var(--transition); }
.wb-tab:hover { color:var(--text); }
.wb-tab.active { color:var(--accent); border-bottom-color:var(--accent); }
.wb-content { flex:1; overflow:auto; }
.wb-section { display:none; padding:0; }
.wb-section.active { display:block; }
.wb-add-row { display:flex; gap:4px; padding:6px 8px; border-bottom:1px solid var(--border); }
.wb-add-row input { flex:1; font-size:12px; padding:4px 8px; }
.wb-add-row button { font-size:12px; padding:4px 10px; }
.wb-list { list-style:none; }
.wb-list li { display:flex; align-items:center; gap:6px; padding:5px 10px; font-size:12px; border-bottom:1px solid rgba(59,59,84,0.3); }
.wb-list li:hover { background:var(--bg-hover); }
.wb-list .wb-expr { font-family:var(--font-mono); color:var(--text); flex:1; }
.wb-list .wb-val { font-family:var(--font-mono); color:var(--text-dim); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wb-list .wb-changed { color:var(--yellow); font-weight:700; }
.wb-list .wb-remove { color:var(--text-muted); cursor:pointer; font-size:14px; }
.wb-list .wb-remove:hover { color:var(--red); }
.wb-list .wb-toggle { cursor:pointer; font-size:14px; }
.bp-line { font-family:var(--font-mono); color:var(--bp-red); font-weight:500; }
.bp-condition { color:var(--text-muted); font-style:italic; font-size:11px; }
.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:100; display:flex; align-items:center; justify-content:center; }
.modal-overlay.hidden { display:none; }
.modal { background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; width:680px; max-width:90vw; max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
.modal-header { padding:20px 24px 0; }
.modal-header h2 { font-size:20px; font-weight:700; background:linear-gradient(135deg,var(--accent),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.modal-header p { color:var(--text-muted); font-size:13px; margin-top:4px; }
.modal-body { padding:16px 24px; }
.modal-body label { display:block; font-size:12px; font-weight:600; color:var(--text-dim); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.3px; }
.modal-body textarea { width:100%; height:140px; resize:vertical; font-size:12px; margin-bottom:12px; border-radius:var(--radius); }
.modal-body select { width:100%; font-size:13px; padding:8px 10px; margin-bottom:12px; border-radius:var(--radius); }
.modal-footer { padding:12px 24px 20px; display:flex; gap:8px; justify-content:flex-end; }
.modal-footer .btn { padding:8px 20px; font-size:14px; }
.drop-zone { border:2px dashed var(--border); border-radius:var(--radius); padding:20px; text-align:center; color:var(--text-muted); font-size:13px; margin-bottom:12px; cursor:pointer; transition:all var(--transition); }
.drop-zone:hover, .drop-zone.drag-over { border-color:var(--accent); color:var(--accent); background:var(--accent-bg); }
.tooltip { position:fixed; z-index:200; background:var(--bg-panel); border:1px solid var(--border-light); border-radius:var(--radius); padding:10px 14px; font-size:12px; max-width:400px; box-shadow:0 8px 30px rgba(0,0,0,0.4); pointer-events:none; }
.tooltip .tt-expr { font-family:var(--font-mono); color:var(--blue); font-weight:600; margin-bottom:6px; }
.tooltip .tt-step { display:flex; gap:8px; padding:2px 0; font-family:var(--font-mono); font-size:11px; }
.tooltip .tt-step .tt-label { color:var(--text-muted); min-width:80px; }
.tooltip .tt-step .tt-value { color:var(--text); }
.tooltip .tt-origin { margin-top:4px; font-size:11px; color:var(--text-muted); }
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); gap:12px; padding:20px; text-align:center; }
.empty-state .icon { font-size:40px; opacity:0.3; }
.empty-state p { font-size:13px; }
.search-highlight { background:rgba(229,192,123,0.3); border-radius:2px; padding:0 2px; }
.search-match-count { font-size:10px; color:var(--text-muted); margin-left:4px; }
@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
.animate-in { animation:fadeIn 0.2s ease; }
@keyframes copySuccess { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
.copy-success { animation:copySuccess 0.3s ease; }
.hidden { display: none !important; }
.editor-area { width:100%; height:100%; border:none; resize:none; background:var(--bg); color:var(--text); font-family:var(--font-mono); font-size:13px; line-height:1.6; padding:12px; outline:none; tab-size:4; display:block; }
.editor-area:focus { background:var(--bg-surface); }
.btn-edit-active { background:var(--accent-bg); color:var(--accent); border-color:var(--accent); }
.resizer-v { width:4px; cursor:col-resize; background:transparent; flex-shrink:0; z-index:10; transition:background 0.2s; }
.resizer-h { height:4px; cursor:row-resize; background:transparent; flex-shrink:0; z-index:10; transition:background 0.2s; }
.resizer-v:hover, .resizer-v.dragging { background:var(--accent); }
.resizer-h:hover, .resizer-h.dragging { background:var(--accent); }
#toast-container { position:fixed; bottom:24px; right:24px; z-index:1000; display:flex; flex-direction:column; gap:10px; pointer-events:none; }
.toast { min-width:300px; max-width:450px; background:var(--bg-panel); border:1px solid var(--border-light); border-radius:var(--radius); padding:16px; box-shadow:0 12px 40px rgba(0,0,0,0.5); display:flex; flex-direction:column; gap:4px; pointer-events:auto; animation:toastIn 0.3s cubic-bezier(0.18,0.89,0.32,1.28) forwards; position:relative; overflow:hidden; }
.toast-header { display:flex; align-items:center; gap:8px; font-weight:700; font-size:13px; }
.toast-body { font-size:12px; color:var(--text-dim); line-height:1.5; white-space:pre-wrap; }
.toast-close { position:absolute; top:8px; right:8px; color:var(--text-muted); cursor:pointer; font-size:16px; opacity:0.5; }
.toast-close:hover { opacity:1; }
.toast-progress { position:absolute; bottom:0; left:0; height:3px; background:var(--accent); width:100%; transform-origin:left; animation:toastProgress linear forwards; }
.toast-success { border-left:4px solid var(--green); }
.toast-success .toast-header { color:var(--green); }
.toast-error { border-left:4px solid var(--red); }
.toast-error .toast-header { color:var(--red); }
.toast-info { border-left:4px solid var(--blue); }
.toast-info .toast-header { color:var(--blue); }
@keyframes toastIn { from{opacity:0;transform:translateX(40px) scale(0.9)} to{opacity:1;transform:translateX(0) scale(1)} }
@keyframes toastOut { from{opacity:1;transform:translateX(0) scale(1)} to{opacity:0;transform:translateX(40px) scale(0.9)} }
@keyframes toastProgress { from{transform:scaleX(1)} to{transform:scaleX(0)} }
.debug-group { display:flex; align-items:center; gap:8px; background:var(--bg-panel); padding:2px 8px; border-radius:var(--radius); border:1px solid var(--border); }
.debug-item { display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer; color:var(--text-dim); transition:all var(--transition); padding:4px 8px; border-radius:var(--radius-sm); }
.debug-item:hover:not(.disabled) { background:var(--bg-hover); color:var(--text); }
.debug-item.disabled { opacity:0.3; cursor:not-allowed; }
.fkey { background:var(--bg-surface); border:1px solid var(--border-light); border-radius:3px; padding:0px 4px; font-family:var(--font-mono); font-weight:700; color:var(--accent); font-size:9px; min-width:24px; text-align:center; }
.flbl { font-weight:500; }
</style>
</head>
<body>
<div id="toast-container"></div>
<div id="app">
  <div id="toolbar">
    <div class="toolbar-group">
      <button class="btn btn-primary" id="btn-load" onclick="showLoadModal()">📂 Load</button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="debug-group">
      <div class="debug-item" id="fbtn-continue" onclick="doStep('continue')"><span class="fkey">F5</span> <span class="flbl">Continue</span></div>
      <div class="debug-item" id="fbtn-bp" onclick="toggleBPAtCurrentLine()"><span class="fkey">F9</span> <span class="flbl">Breakpoint</span></div>
      <div class="debug-item" id="fbtn-step" onclick="doStep('over')"><span class="fkey">F10</span> <span class="flbl">Over</span></div>
      <div class="debug-item" id="fbtn-into" onclick="doStep('into')"><span class="fkey">F11</span> <span class="flbl">Into</span></div>
      <div class="debug-item" id="fbtn-out" onclick="doStep('out')"><span class="fkey">⇧F11</span> <span class="flbl">Out</span></div>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="btn" id="btn-reset" onclick="doReset()" disabled><span class="fkey" style="margin-right:4px">⌃⇧F5</span> Reset</button>
    </div>
    <div class="toolbar-status">
      <button class="btn" id="btn-theme" onclick="toggleTheme()" title="Toggle Theme" style="margin-right:12px;padding:6px 10px;">🌓</button>
      <span id="status-badge" class="status-badge status-idle">No session</span>
    </div>
  </div>
  <div id="main">
    <div class="col" style="width:33.33%;" id="col1">
      <div class="panel" id="template-panel" style="flex:1;">
        <div class="panel-header">
          Template <span class="badge" id="tpl-info"></span>
          <div style="margin-left:auto;display:flex;gap:4px;align-items:center;">
            <input type="text" id="template-search" placeholder="Search template..." style="width:150px;font-size:11px;padding:3px 6px;height:24px;" oninput="searchInTemplate()">
            <button class="btn" id="btn-edit-tpl" style="padding:4px 8px;font-size:11px;height:24px;" onclick="toggleTemplateEdit()">✎ Edit</button>
            <button class="btn" style="padding:4px 8px;font-size:11px;height:24px;" onclick="copyTemplate(event)">📋 Copy</button>
          </div>
        </div>
        <div class="panel-body" id="template-body-container" style="position:relative;">
          <div id="template-view" style="height:100%;overflow:auto;">
            <div id="template-body"><div class="empty-state"><div class="icon">📄</div><p>Load a template to start debugging</p></div></div>
          </div>
          <textarea id="template-editor" class="editor-area hidden" placeholder="Enter your Liquid template here..." onkeydown="handleEditorTab(event)"></textarea>
        </div>
      </div>
    </div>
    <div class="resizer-v" id="rv1"></div>
    <div class="col" style="width:33.33%;" id="col2">
      <div class="panel" id="input-panel" style="height:50%;">
        <div class="panel-header">
          Input Data &nbsp;<span style="text-transform:none;font-weight:normal;color:var(--text-muted);" id="input-format-lbl"></span>
          <div style="margin-left:auto;display:flex;gap:4px;align-items:center;">
            <button class="btn" id="btn-beautify-input" style="padding:4px 8px;font-size:11px;height:24px;" onclick="beautifyInput()">✨ Beautify</button>
            <button class="btn" id="btn-edit-data" style="padding:4px 8px;font-size:11px;height:24px;" onclick="toggleInputEdit()">✎ Edit</button>
          </div>
        </div>
        <div class="panel-body" style="padding:0;">
          <textarea id="data-editor" readonly class="editor-area" style="font-size:12px;" onkeydown="handleEditorTab(event)"></textarea>
        </div>
      </div>
      <div class="resizer-h" id="rh1"></div>
      <div class="panel" id="output-panel" style="flex:1;">
        <div class="scope-breadcrumb" id="scope-bar"></div>
        <div class="panel-header">
          Output
          <div style="margin-left:auto;display:flex;gap:4px;align-items:center;">
            <select id="validate-format" style="font-size:11px;padding:3px 6px;height:24px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);outline:none;">
              <option value="json">JSON</option><option value="xml">XML</option><option value="csv">CSV</option>
            </select>
            <button class="btn" style="padding:4px 8px;font-size:11px;height:24px;" onclick="validateOutput()">✔ Validate</button>
            <button class="btn" id="btn-beautify-output" style="padding:4px 8px;font-size:11px;height:24px;" onclick="beautifyOutput()">✨ Beautify</button>
            <input type="text" id="output-search" placeholder="Search output..." style="width:130px;font-size:11px;padding:3px 6px;height:24px;" oninput="searchInOutput()">
            <button class="btn" style="padding:4px 8px;font-size:11px;height:24px;" onclick="copyOutput(event)">📋 Copy</button>
          </div>
        </div>
        <div class="panel-body" id="output-body"><div class="empty-state"><div class="icon">📝</div><p>Output will appear here as you step</p></div></div>
      </div>
    </div>
    <div class="resizer-v" id="rv2"></div>
    <div class="col" style="flex:1;" id="col3">
      <div class="panel" id="vars-panel" style="height:60%;">
        <div class="panel-header">Variables <span class="badge" id="vars-count"></span></div>
        <div class="var-filter"><input type="text" id="var-search" placeholder="Filter variables..." oninput="renderVariables()"></div>
        <div class="panel-body" id="vars-body"><div class="empty-state"><div class="icon">📊</div><p>Variables will appear here</p></div></div>
      </div>
      <div class="resizer-h" id="rh2"></div>
      <div class="panel" id="wb-panel" style="flex:1;">
        <div class="panel-header">Watches &amp; Breakpoints</div>
        <div class="panel-body">
          <div class="wb-tabs">
            <div class="wb-tab active" onclick="switchWBTab('watches')">Watches</div>
            <div class="wb-tab" onclick="switchWBTab('breakpoints')">Breakpoints</div>
            <div class="wb-tab" onclick="switchWBTab('eval')">Evaluate</div>
          </div>
          <div class="wb-content">
            <div class="wb-section active" id="sec-watches">
              <div class="wb-add-row">
                <input type="text" id="watch-input" placeholder="Expression to watch..." onkeydown="if(event.key==='Enter')addWatch()">
                <button class="btn" onclick="addWatch()">+ Add</button>
              </div>
              <div class="wb-list" id="watch-list" style="overflow-y:auto; flex:1"></div>
            </div>
            <div class="wb-section" id="sec-breakpoints">
              <ul class="wb-list" id="bp-list"></ul>
            </div>
            <div class="wb-section" id="sec-eval">
              <div class="wb-add-row">
                <input type="text" id="eval-input" placeholder="Evaluate expression..." onkeydown="if(event.key==='Enter')evalExpr()">
                <button class="btn" onclick="evalExpr()">Eval</button>
              </div>
              <div id="eval-result" style="padding:8px 12px;font-family:var(--font-mono);font-size:12px;color:var(--text-dim);"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Load Modal -->
<div class="modal-overlay hidden" id="load-modal">
  <div class="modal animate-in">
    <div class="modal-header">
      <h2>Load Template &amp; Data</h2>
      <p>Paste your Liquid template and input data to start debugging</p>
    </div>
    <div class="modal-body">
      <div class="drop-zone" id="drop-zone" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleDrop(event)">
        Drop .liquid and .json/.xml files here, or click to browse
        <input type="file" id="file-input" multiple style="display:none" onchange="handleFiles(this.files)">
      </div>
      <label for="tpl-textarea">Template</label>
      <textarea id="tpl-textarea" placeholder="{% for item in items %}&#10;  {{ item.name }}&#10;{% endfor %}"></textarea>
      <label for="data-textarea">Data</label>
      <textarea id="data-textarea" placeholder='{"items": [{"name": "Widget"}]}'></textarea>
      <label for="format-select">Data Format</label>
      <select id="format-select"><option value="json">JSON</option><option value="xml">XML</option><option value="text">Key=Value</option></select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="loadSample()">📦 Load Sample</button>
      <button class="btn" onclick="hideLoadModal()">Cancel</button>
      <button class="btn btn-primary" onclick="loadFromModal()">▶ Start Debugging</button>
    </div>
  </div>
</div>
<div class="tooltip" id="tooltip" style="display:none"></div>

<script>
// ── VS Code API bridge — replaces fetch('/api/...') ───────────────────────────
const vscode = acquireVsCodeApi();
let _pendingRequests = {};
let _reqId = 0;

function api(method, path, body) {
  return new Promise((resolve) => {
    const id = ++_reqId;
    _pendingRequests[id] = resolve;
    vscode.postMessage({ type: 'api', id, method, path, body: body || null });
  });
}

window.addEventListener('message', ev => {
  const msg = ev.data;
  if (msg.type === 'apiResponse' && _pendingRequests[msg.id]) {
    _pendingRequests[msg.id](msg.result);
    delete _pendingRequests[msg.id];
  }
  // Direct state push from extension (e.g. after DAP step)
  if (msg.type === 'stateUpdate') { applyState(msg.state); }
  // Handle prefill from extension context
  if (msg.type === 'prefill' && msg.template) {
    const tplEl = document.getElementById('tpl-textarea');
    if (tplEl) { tplEl.value = msg.template; }
  }
});

// ── Everything below is identical to the web UI ───────────────────────────────
let state = null;
let expandedVars = new Set();
let expandedWatches = new Set();

function initTheme() {
  const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', saved);
}
initTheme();

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta); return ok;
}

async function copyTemplate(e) {
  if (!state || !state.templateSource) return;
  const ok = await copyToClipboard(state.templateSource);
  if (ok) { const b = e.target.closest('button'); const t = b.innerHTML; b.innerHTML = '✓ Copied!'; b.classList.add('copy-success'); setTimeout(() => { b.innerHTML = t; b.classList.remove('copy-success'); }, 2000); }
}

async function copyOutput(e) {
  const out = state?.state?.outputSoFar || ''; if (!out) return;
  const ok = await copyToClipboard(out);
  if (ok) { const b = e.target.closest('button'); const t = b.innerHTML; b.innerHTML = '✓ Copied!'; b.classList.add('copy-success'); setTimeout(() => { b.innerHTML = t; b.classList.remove('copy-success'); }, 2000); }
}

function showToast(message, type = 'info', title = '', duration = 6000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type + ' animate-in';
  if (!title) { title = type.charAt(0).toUpperCase() + type.slice(1); if (type==='success') title='✓ '+title; if (type==='error') title='✕ '+title; }
  toast.innerHTML = '<div class="toast-header">' + title + '</div><div class="toast-body">' + message + '</div><div class="toast-close">×</div><div class="toast-progress" style="animation-duration:' + duration + 'ms"></div>';
  container.appendChild(toast);
  const close = () => { toast.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); };
  toast.querySelector('.toast-close').onclick = close;
  const to = setTimeout(close, duration);
  toast.onmouseenter = () => { toast.querySelector('.toast-progress').style.animationPlayState = 'paused'; clearTimeout(to); };
}

function applyState(s) {
  const isInit = !state && s && s.isLoaded;
  const dataChanged = state && s && (state.dataContent !== s.dataContent || state.dataFormat !== s.dataFormat);
  state = s;
  updateToolbar(); renderTemplate(); renderVariables(); renderOutput(); renderWatches(); renderBreakpoints(); renderScopeBar();
  if (isInit || dataChanged || (s && s.isLoaded && !document.getElementById('data-editor').value)) { renderInput(); }
}

function renderInput() {
  if (!state || !state.isLoaded) return;
  const el = document.getElementById('data-editor');
  if (state.dataContent) { el.value = state.dataContent; document.getElementById('input-format-lbl').textContent = '(' + (state.dataFormat || 'JSON').toUpperCase() + ')'; }
}

function updateToolbar() {
  const loaded = state && state.isLoaded;
  const complete = loaded && state.state && state.state.isComplete;
  ['fbtn-step','fbtn-into','fbtn-out','fbtn-continue','fbtn-bp','btn-reset'].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) {
        if (el.tagName === 'BUTTON') el.disabled = !loaded || (id !== 'btn-reset' && complete);
        else el.classList.toggle('disabled', !loaded || complete); 
    }
  });
  const badge = document.getElementById('status-badge');
  if (!loaded) { badge.textContent='No session'; badge.className='status-badge status-idle'; }
  else if (complete) { badge.textContent='Complete'; badge.className='status-badge status-complete'; }
  else { badge.textContent='Line '+(state.state?.currentLine||0); badge.className='status-badge status-running'; }
  document.getElementById('tpl-info').textContent = loaded ? state.elements.length + ' elements' : '';
  document.getElementById('vars-count').textContent = (loaded && state.state) ? state.state.variables.length : '';
}

function renderTemplate() {
  const body = document.getElementById('template-body');
  if (!state || !state.isLoaded || !state.templateSource) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><p>Load a template to start debugging</p></div>'; return;
  }
  const lines = state.templateSource.split('\\n');
  const curLine = state.state ? (state.state.currentElementIndex < state.elements.length ? state.elements[state.state.currentElementIndex]?.lineNumber : -1) : -1;
  const bpLines = {}; if (state.breakpoints) state.breakpoints.forEach(bp => { bpLines[bp.line] = bp; });
  let html = '';
  lines.forEach((line, i) => {
    const ln = i + 1;
    const isCur = ln === curLine && state.state && !state.state.isComplete;
    const bp = bpLines[ln];
    const bpClass = bp ? (bp.isEnabled ? 'has-bp' : 'has-bp disabled-bp') : '';
    html += '<div class="template-line' + (isCur?' current':'') + '" data-line="' + ln + '">';
    html += '<div class="line-gutter">';
    html += '<div class="line-bp-area ' + bpClass + '" onclick="toggleBP(' + ln + ')" oncontextmenu="conditionalBP(event,' + ln + ')"><div class="line-bp-dot"></div></div>';
    html += '<span class="line-number">' + ln + '</span>';
    html += '<span class="line-arrow">' + (isCur?'▶':' ') + '</span>';
    html += '</div>';
    html += '<span class="line-content">' + highlightSyntax(escapeHtml(line)) + '</span>';
    html += '</div>';
  });
  body.innerHTML = html;
  if (curLine > 0) { const el = body.querySelector('.template-line.current'); if (el) el.scrollIntoView({ block:'center', behavior:'smooth' }); }
  body.querySelectorAll('.tok-output').forEach(el => { el.addEventListener('mouseenter', showExprTooltip); el.addEventListener('mouseleave', hideTooltip); });
}

function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function highlightSyntax(line) {
  line = line.replace(/(\\{\\{-?\\s*)(.*?)(\\s*-?\\}\\})/g, '<span class="tok-output" data-expr="$2">$1$2$3</span>');
  line = line.replace(/(\\{%-?\\s*)(.*?)(\\s*-?%\\})/g, '<span class="tok-tag">$1$2$3</span>');
  return line;
}

async function showExprTooltip(e) {
  if (!state || !state.isLoaded) return;
  const expr = e.target.getAttribute('data-expr'); if (!expr) return;
  try {
    const result = await api('POST', '/api/evaluate', { expression: expr });
    const tt = document.getElementById('tooltip');
    let html = '<div class="tt-expr">{{ ' + escapeHtml(expr) + ' }}</div>';
    html += '<div class="tt-step"><span class="tt-label">Value:</span><span class="tt-value">' + escapeHtml(result.value||'nil') + '</span></div>';
    html += '<div class="tt-step"><span class="tt-label">Type:</span><span class="tt-value">' + escapeHtml(result.typeName||'') + '</span></div>';
    const base = expr.split('|')[0].trim().split('.')[0];
    const v = state.state?.variables?.find(v => v.name.toLowerCase()===base.toLowerCase());
    if (v) { html += '<div class="tt-origin"><span class="scope-badge scope-' + v.scopeTag + '">' + v.scopeTag.toUpperCase() + '</span> ' + escapeHtml(v.origin?.sourcePath||'') + '</div>'; }
    tt.innerHTML = html;
    const rect = e.target.getBoundingClientRect();
    tt.style.left = Math.min(rect.left, window.innerWidth - 420) + 'px';
    tt.style.top = (rect.bottom + 6) + 'px';
    tt.style.display = 'block';
  } catch {}
}
function hideTooltip() { document.getElementById('tooltip').style.display = 'none'; }

function renderVariables() {
  const body = document.getElementById('vars-body');
  if (!state || !state.isLoaded || !state.state || !state.state.variables.length) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No variables in scope</p></div>';
    return;
  }
  const filter = document.getElementById('var-search').value.toLowerCase();
  let vars = state.state.variables;
  if (filter) vars = vars.filter(v => v.name.toLowerCase().includes(filter) || (v.currentValue||'').toLowerCase().includes(filter));

  let html = '<table class="var-table"><thead><tr><th>Name</th><th>Scope</th><th>Value</th><th>Type</th></tr></thead><tbody>';
  vars.forEach(v => {
    const badgeClass = 'scope-' + (v.scopeTag || '');
    html += '<tr onclick="toggleVarExpand(\\'' + v.name + '\\')">';
    html += '<td class="var-name">' + escapeHtml(v.name) + '</td>';
    html += '<td><span class="scope-badge ' + badgeClass + '">' + escapeHtml(v.scopeTag || '').toUpperCase() + '</span></td>';
    html += '<td class="var-value" title="' + escapeHtml(v.currentValue || '') + '">' + escapeHtml(truncate(v.currentValue || '', 50)) + '</td>';
    html += '<td style="color:var(--text-muted);font-size:11px;">' + escapeHtml(v.typeName || '') + '</td>';
    html += '</tr>';
    if (expandedVars.has(v.name)) {
      html += '<tr><td colspan="4">';
      html += '<div class="var-detail animate-in">';
      html += '<h4>Value</h4><pre>' + formatRawValue(v.rawValue) + '</pre>';
      if (v.origin) { html += '<div class="origin-info">Origin: <span>' + escapeHtml(v.origin.sourcePath || '') + '</span> (' + escapeHtml(v.origin.sourceFormat || '') + ')</div>'; }
      if (v.transformations && v.transformations.length) {
        html += '<h4 style="margin-top:8px">Transformations</h4>';
        v.transformations.forEach((t, index) => {
          html += '<div class="transformation">';
          if (t.operator && t.operator !== '') {
            const leftVarName = index === 0 ? escapeHtml(t.baseExpr || 'value') : 'result';
            html += '<div style="color:var(--accent);font-weight:600;margin-bottom:4px;font-family:var(--font-mono);font-size:12px;">' + escapeHtml(v.name) + ' = ' + leftVarName + ' ' + t.operator + ' ' + escapeHtml(t.rightVar || '') + '</div>';
            html += '<span class="tf-before" style="text-decoration:none;">' + escapeHtml(String(t.before ?? 'nil')) + ' ' + t.operator + ' ' + escapeHtml(String(t.rightValue ?? 'nil')) + '</span>';
            html += ' → ';
            html += '<span class="tf-after">' + escapeHtml(String(t.after ?? 'nil')) + '</span>';
          } else {
            html += '<span class="tf-type">[' + (t.type || 'FILTER').toUpperCase() + ']</span> ';
            html += escapeHtml(t.name || '');
            html += '<br>';
            html += '<span class="tf-before">' + escapeHtml(String(t.before ?? 'nil')) + '</span>';
            html += ' → ';
            html += '<span class="tf-after">' + escapeHtml(String(t.after ?? 'nil')) + '</span>';
          }
          html += '</div>';
        });
      }
      if (v.history && v.history.length) {
        html += '<h4 style="margin-top:8px">History</h4>';
        v.history.forEach(h => {
          html += '<div class="transformation">';
          html += '<span class="tf-type">[LINE ' + h.line + ']</span><br>';
          html += '<span class="tf-before">' + escapeHtml(String(h.oldValue ?? h.before ?? 'nil')) + '</span>';
          html += ' → ';
          html += '<span class="tf-after">' + escapeHtml(String(h.newValue ?? h.after ?? 'nil')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></td></tr>';
    }
  });
  html += '</tbody></table>';
  body.innerHTML = html;
}

function toggleVarExpand(name) {
  if (expandedVars.has(name)) expandedVars.delete(name); else expandedVars.add(name);
  renderVariables();
}

function formatRawValue(val, depth) {
  depth = depth || 0;
  if (val === null || val === undefined) return 'nil';
  if (typeof val === 'string') return escapeHtml(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  const indent = '  '.repeat(depth);
  const indent2 = '  '.repeat(depth + 1);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return '[\\n' + val.map((v,i) => indent2 + formatRawValue(v, depth+1)).join(',\\n') + '\\n' + indent + ']';
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    return '{\\n' + keys.map(k => indent2 + escapeHtml(k) + ': ' + formatRawValue(val[k], depth+1)).join(',\\n') + '\\n' + indent + '}';
  }
  return escapeHtml(String(val));
}

function truncate(s, n) { return s && s.length > n ? s.substring(0, n-3) + '...' : s; }

function renderOutput() {
  const body = document.getElementById('output-body');
  if (!state || !state.isLoaded || !state.state) { body.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>Output will appear here</p></div>'; return; }
  const out = state.state.outputSoFar || '';
  const last = state.state.lastOutputChunk;
  if (!out) { body.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>No output yet — step to generate</p></div>'; return; }
  if (last && out.endsWith(last)) {
    const before = out.substring(0, out.length - last.length);
    body.innerHTML = escapeHtml(before) + '<span class="output-last-chunk">' + escapeHtml(last) + '</span>';
  } else { body.innerHTML = escapeHtml(out); }
}

function renderScopeBar() {
  const bar = document.getElementById('scope-bar');
  if (!state || !state.state || !state.state.scopeStack) { bar.innerHTML = ''; return; }
  bar.innerHTML = state.state.scopeStack.map((s,i) => (i>0?'<span class="sep">›</span>':'')+'<span>'+escapeHtml(s)+'</span>').join('');
}

function switchWBTab(tab) {
  document.querySelectorAll('.wb-tab').forEach((t,i) => t.classList.toggle('active', ['watches','breakpoints','eval'][i]===tab));
  document.querySelectorAll('.wb-section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-'+tab).classList.add('active');
}

function renderWatches() {
  const list = document.getElementById('watch-list');
  if (!state || !state.watches || !state.watches.length) { 
      list.innerHTML = '<div style="color:var(--text-muted);display:flex;justify-content:center;padding:12px;">No watches</div>'; 
      return; 
  }
  let html = '<table class="var-table" style="width:100%"><tbody>';
  state.watches.forEach(w => {
      html += '<tr onclick="toggleWatchExpand(' + w.id + ')">';
      html += '<td class="var-name" style="width:40%">' + escapeHtml(w.displayExpression || w.expression) + '</td>';
      html += '<td class="var-value ' + (w.hasChanged ? 'wb-changed' : '') + '" style="width:40%" title="' + escapeHtml(w.currentValue || 'nil') + '">' + escapeHtml(truncate(w.currentValue || 'nil', 50)) + '</td>';
      html += '<td style="color:var(--text-muted);font-size:11px;width:15%">' + escapeHtml(w.typeName || '') + '</td>';
      html += '<td style="width:5%;text-align:right;"><span class="wb-remove" onclick="event.stopPropagation(); removeWatch(' + w.id + ')">✕</span></td>';
      html += '</tr>';

      if (expandedWatches.has(w.id)) {
          html += '<tr><td colspan="4">';
          html += '<div class="var-detail animate-in">';
          html += '<h4>Value</h4><pre>' + formatRawValue(w.rawValue) + '</pre>';
          if (w.transformations && w.transformations.length) {
              html += '<h4 style="margin-top:8px">Transformations</h4>';
              w.transformations.forEach((t, index) => {
                  html += '<div class="transformation">';
                  if (t.operator && t.operator !== '') {
                      const leftVarName = index === 0 ? escapeHtml(t.baseExpr || 'value') : 'result';
                      html += '<div style="color:var(--accent);font-weight:600;margin-bottom:4px;font-family:var(--font-mono);font-size:12px;">' + escapeHtml(w.expression) + ' = ' + leftVarName + ' ' + t.operator + ' ' + escapeHtml(t.rightVar || '') + '</div>';
                      html += '<span class="tf-before" style="text-decoration:none;">' + escapeHtml(String(t.before ?? 'nil')) + ' ' + t.operator + ' ' + escapeHtml(String(t.rightValue ?? 'nil')) + '</span>';
                      html += ' → ';
                      html += '<span class="tf-after">' + escapeHtml(String(t.after ?? 'nil')) + '</span>';
                  } else {
                      html += '<span class="tf-type">[' + (t.type || 'FILTER').toUpperCase() + ']</span> ';
                      html += escapeHtml(t.name || '');
                      html += '<br>';
                      html += '<span class="tf-before">' + escapeHtml(String(t.before ?? 'nil')) + '</span>';
                      html += ' → ';
                      html += '<span class="tf-after">' + escapeHtml(String(t.after ?? 'nil')) + '</span>';
                  }
                  html += '</div>';
              });
          }
          html += '</div></td></tr>';
      }
  });
  html += '</tbody></table>';
  list.innerHTML = html;
}

function toggleWatchExpand(id) {
  if (expandedWatches.has(id)) expandedWatches.delete(id); else expandedWatches.add(id);
  renderWatches();
}

function renderBreakpoints() {
  const list = document.getElementById('bp-list');
  if (!state || !state.breakpoints || !state.breakpoints.length) { list.innerHTML = '<li style="color:var(--text-muted);justify-content:center;">No breakpoints set — click line gutter to add</li>'; return; }
  list.innerHTML = state.breakpoints.map(bp =>
    '<li><span class="wb-toggle" onclick="toggleBPById('+bp.id+')">'+(bp.isEnabled?'🔴':'⚪')+'</span>'
    +'<span class="bp-line">Line '+bp.line+'</span>'+(bp.condition?'<span class="bp-condition">if '+escapeHtml(bp.condition)+'</span>':'')
    +'<span style="margin-left:auto;color:var(--text-muted);font-size:11px;">hits: '+bp.hitCount+'</span>'
    +'<span class="wb-remove" onclick="removeBP('+bp.id+')">✕</span></li>'
  ).join('');
}

function handleEditorTab(e) {
  if (e.key==='Tab') { e.preventDefault(); const s=e.target.selectionStart,en=e.target.selectionEnd; e.target.value=e.target.value.substring(0,s)+'  '+e.target.value.substring(en); e.target.selectionStart=e.target.selectionEnd=s+2; }
}

function toggleTemplateEdit() {
  const view=document.getElementById('template-view'), editor=document.getElementById('template-editor'), btn=document.getElementById('btn-edit-tpl');
  const isEditing=!editor.classList.contains('hidden');
  if (isEditing) { applyInPlaceEdits(); }
  else { editor.value=state?.templateSource||''; view.classList.add('hidden'); editor.classList.remove('hidden'); btn.innerHTML='▶ Apply'; btn.classList.add('btn-edit-active'); editor.focus(); }
}

function toggleInputEdit() {
  const editor=document.getElementById('data-editor'), btn=document.getElementById('btn-edit-data');
  if (!editor.readOnly) { applyInPlaceEdits(); }
  else { editor.readOnly=false; btn.innerHTML='▶ Apply'; btn.classList.add('btn-edit-active'); editor.focus(); }
}

async function applyInPlaceEdits() {
  const tpl = document.getElementById('template-view').classList.contains('hidden') ? document.getElementById('template-editor').value : (state?.templateSource||'');
  const data = document.getElementById('data-editor').value;
  const format = state?.dataFormat || 'json';
  if (!tpl||!data) { showToast('Template and Data cannot be empty','error'); return; }
  const s = await api('POST','/api/load',{templateContent:tpl,dataContent:data,format});
  if (s.error) { showToast(s.error,'error','Load Failed'); return; }
  document.getElementById('template-view').classList.remove('hidden'); document.getElementById('template-editor').classList.add('hidden');
  document.getElementById('btn-edit-tpl').innerHTML='✎ Edit'; document.getElementById('btn-edit-tpl').classList.remove('btn-edit-active');
  document.getElementById('data-editor').readOnly=true; document.getElementById('btn-edit-data').innerHTML='✎ Edit'; document.getElementById('btn-edit-data').classList.remove('btn-edit-active');
  expandedVars.clear(); expandedWatches.clear(); applyState(s); showToast('Changes applied and debugging restarted','success');
}

async function doStep(action) { const s = await api('POST','/api/step',{action}); applyState(s); }

async function toggleBPAtCurrentLine() {
  if (!state || !state.isLoaded || !state.state || state.state.isComplete) return;
  const line = state.state.currentLine;
  if (line > 0) await toggleBP(line);
}

async function doReset() { const s = await api('POST','/api/reset'); expandedVars.clear(); expandedWatches.clear(); applyState(s); }

async function toggleBP(line) {
  if (!state || !state.isLoaded) return;
  const existing = state.breakpoints.find(bp => bp.line===line);
  if (existing) { await api('DELETE','/api/breakpoint/'+existing.id); } else { await api('POST','/api/breakpoint',{line,condition:null}); }
  const s = await api('GET','/api/state'); applyState(s);
}

function conditionalBP(e, line) {
  e.preventDefault();
  const cond = prompt('Breakpoint condition (Liquid expression):');
  if (cond!==null) { api('POST','/api/breakpoint',{line,condition:cond||null}).then(()=>api('GET','/api/state').then(s=>applyState(s))); }
}

async function toggleBPById(id) { await api('POST','/api/breakpoint/'+id+'/toggle'); const s=await api('GET','/api/state'); applyState(s); }
async function removeBP(id) { await api('DELETE','/api/breakpoint/'+id); const s=await api('GET','/api/state'); applyState(s); }

async function addWatch() {
  const input=document.getElementById('watch-input'); const expr=input.value.trim();
  if (!expr||!state||!state.isLoaded) return;
  await api('POST','/api/watch',{expression:expr}); input.value='';
  const s=await api('GET','/api/state'); applyState(s);
}

async function removeWatch(id) { await api('DELETE','/api/watch/'+id); const s=await api('GET','/api/state'); applyState(s); }

async function evalExpr() {
  const input=document.getElementById('eval-input'); const expr=input.value.trim();
  if (!expr||!state||!state.isLoaded) return;
  const result=await api('POST','/api/evaluate',{expression:expr});
  const el=document.getElementById('eval-result');
  if (result.error) { el.innerHTML='<span style="color:var(--red)">Error: '+escapeHtml(result.error)+'</span>'; }
  else { el.innerHTML='<span style="color:var(--text-muted)">=&gt;</span> <span style="color:var(--text)">'+escapeHtml(result.value||'nil')+'</span> <span style="color:var(--text-muted)">('+escapeHtml(result.typeName||'')+')</span>'; }
}

async function validateOutput() {
  if (!state || !state.isLoaded) return;
  const format = document.getElementById('validate-format').value;
  try {
    const result = await api('POST', '/api/validate', { format });
    if (result.error) {
      showToast(result.error, 'error', 'Validation Error');
      return;
    }
    if (result.isValid) {
      showToast(\`Output is valid \${format.toUpperCase()}\`, 'success');
    } else {
      let msg = result.errorMessage;
      if (result.sourceLineNumber) {
        msg += '\\n\\nIssue was likely introduced at template line: ' + result.sourceLineNumber;
        const el = document.querySelector(\`.template-line[data-line="\${result.sourceLineNumber}"]\`);
        if (el) {
          el.scrollIntoView({ block:'center', behavior:'smooth' });
          el.style.transition = 'background-color 0.3s';
          el.style.backgroundColor = 'rgba(255, 75, 75, 0.4)';
          setTimeout(() => el.style.backgroundColor = '', 8000);
        }
      }
      showToast(msg, 'error', 'Validation Failed', 10000);
    }
  } catch(err) {
    showToast(err.message, 'error', 'Failed to validate');
  }
}

async function beautifyInput() {
  const editor=document.getElementById('data-editor'); const content=editor.value.trim();
  const format=(state?.dataFormat||'json').toLowerCase(); if (!content) { showToast('No input data to beautify','info'); return; }
  try { editor.value=beautifyContent(content,format); showToast('Input formatted as '+format.toUpperCase(),'success'); } catch(err) { showToast('Failed to beautify: '+err.message,'error'); }
}

async function beautifyOutput() {
  if (!state||!state.isLoaded||!state.state) { showToast('No output to beautify','info'); return; }
  const out=state.state.outputSoFar||''; if (!out.trim()) { showToast('Output is empty','info'); return; }
  const format=detectFormat(out);
  try { document.getElementById('output-body').innerHTML=escapeHtml(beautifyContent(out,format)); showToast('Output formatted as '+format.toUpperCase(),'success'); } catch(err) { showToast('Failed to beautify: '+err.message,'error'); }
}

function detectFormat(s) {
  const t=s.trim();
  if ((t.startsWith('{')&&t.endsWith('}')||(t.startsWith('[')&&t.endsWith(']')))) { try{JSON.parse(t);return 'json';}catch{} }
  if (t.startsWith('<')&&t.includes('>')) return 'xml';
  if (t.includes(',')&&t.split('\\n').length>1) return 'csv';
  return 'text';
}

function beautifyContent(content, format) {
  if (format==='json') { 
    let cleaned = content.replace(/,\s*([\]}])/g, '$1').replace(/:\s*,/g, ': null,').replace(/:\s*}/g, ': null}');
    return JSON.stringify(JSON.parse(cleaned),null,2); 
  }
  if (format==='xml') { const d=new DOMParser().parseFromString(content,'text/xml'); if(d.querySelector('parsererror')) throw new Error('Invalid XML'); return fmtXml(d.documentElement,0); }
  return content;
}

function fmtXml(node, level) {
  const pad='  '.repeat(level), pad2='  '.repeat(level+1);
  if (node.nodeType===Node.TEXT_NODE) { const t=node.textContent.trim(); return t||''; }
  if (node.nodeType!==Node.ELEMENT_NODE) return '';
  let r=pad+'<'+node.nodeName;
  if (node.attributes) for(let i=0;i<node.attributes.length;i++){const a=node.attributes[i];r+=' '+a.name+'="'+a.value+'"';}
  const ch=Array.from(node.childNodes).filter(c=>c.nodeType===Node.ELEMENT_NODE||(c.nodeType===Node.TEXT_NODE&&c.textContent.trim()));
  if (!ch.length) return r+' />';
  r+='>';
  if (ch.length===1&&ch[0].nodeType===Node.TEXT_NODE) return r+ch[0].textContent.trim()+'</'+node.nodeName+'>';
  r+='\\n';
  for(const c of node.childNodes){const f=fmtXml(c,level+1);if(f)r+=f+'\\n';}
  return r+pad+'</'+node.nodeName+'>';
}

function searchInTemplate() {
  const q=document.getElementById('template-search').value;
  if (!q||!state||!state.isLoaded) { renderTemplate(); return; }
  renderTemplate();
  let count=0;
  document.querySelectorAll('#template-body .line-content').forEach(el => {
    const text=el.textContent||'';
    if (text.toLowerCase().includes(q.toLowerCase())) {
      el.innerHTML=text.replace(new RegExp(escapeRegex(q),'gi'),m=>'<span class="search-highlight">'+m+'</span>'); count++;
    }
  });
  const hdr=document.querySelector('#template-panel .panel-header');
  let sp=hdr.querySelector('.search-match-count'); if(!sp){sp=document.createElement('span');sp.className='search-match-count';hdr.appendChild(sp);}
  sp.textContent=count>0?count+' matches':'';
}

function searchInOutput() {
  const q=document.getElementById('output-search').value;
  if (!q||!state||!state.isLoaded) { renderOutput(); return; }
  renderOutput();
  const body=document.getElementById('output-body');
  const text=body.textContent||'';
  if (text.includes(q)) body.innerHTML=escapeHtml(text).replace(new RegExp(escapeRegex(escapeHtml(q)),'gi'),m=>'<span class="search-highlight">'+m+'</span>');
}

function escapeRegex(s) { return s.split('').map(function(c){return '.+*?^=!:{}'+'()|[]\\\\'.indexOf(c)>=0?'\\\\'+c:c;}).join(''); }

function showLoadModal() { document.getElementById('load-modal').classList.remove('hidden'); }
function hideLoadModal() { document.getElementById('load-modal').classList.add('hidden'); }
document.getElementById('drop-zone').addEventListener('click', ()=>document.getElementById('file-input').click());

function handleDrop(e) { e.preventDefault(); e.target.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); }

function handleFiles(files) {
  for(const f of files){
    const r=new FileReader(); r.onload=ev=>{
      const c=ev.target.result;
      if(f.name.endsWith('.liquid')||f.name.endsWith('.html')) document.getElementById('tpl-textarea').value=c;
      else { document.getElementById('data-textarea').value=c; if(f.name.endsWith('.xml')) document.getElementById('format-select').value='xml'; else if(f.name.endsWith('.json')) document.getElementById('format-select').value='json'; }
    }; r.readAsText(f);
  }
}

async function loadFromModal() {
  const tpl=document.getElementById('tpl-textarea').value, data=document.getElementById('data-textarea').value, format=document.getElementById('format-select').value;
  if (!tpl||!data) { showToast('Please provide both template and data','error'); return; }
  const s=await api('POST','/api/load',{templateContent:tpl,dataContent:data,format});
  if (s.error) { showToast(s.error,'error','Load Failed'); return; }
  expandedVars.clear(); expandedWatches.clear(); hideLoadModal(); applyState(s);
}

async function loadSample() {
  const s=await api('POST','/api/load-sample');
  if (s && !s.error) { expandedVars.clear(); expandedWatches.clear(); hideLoadModal(); applyState(s); }
}

document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  if (e.key==='F10') { e.preventDefault(); doStep('over'); }
  else if (e.key==='F11'&&e.shiftKey) { e.preventDefault(); doStep('out'); }
  else if (e.key==='F11') { e.preventDefault(); doStep('into'); }
  else if (e.key==='F9') { e.preventDefault(); toggleBPAtCurrentLine(); }
  else if (e.key==='F5' && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); doReset(); }
  else if (e.key==='F5') { e.preventDefault(); doStep('continue'); }
});

function setupVerticalResizer(rid, pid, nid) {
  const rz=document.getElementById(rid), prev=document.getElementById(pid), next=document.getElementById(nid); if(!rz||!prev||!next) return;
  rz.addEventListener('mousedown', e=>{
    e.preventDefault(); document.body.style.cursor='col-resize'; rz.classList.add('dragging');
    const cw=prev.parentElement.clientWidth, sx=e.clientX, pw=prev.getBoundingClientRect().width, nw=next.getBoundingClientRect().width;
    function mm(e){const dx=e.clientX-sx; if(pw+dx>50&&nw-dx>50){prev.style.flex='0 0 '+((pw+dx)/cw*100)+'%';next.style.flex='0 0 '+((nw-dx)/cw*100)+'%';}}
    function mu(){document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);rz.classList.remove('dragging');document.body.style.cursor='default';}
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
  });
}

function setupHorizontalResizer(rid, pid, nid) {
  const rz=document.getElementById(rid), prev=document.getElementById(pid), next=document.getElementById(nid); if(!rz||!prev||!next) return;
  rz.addEventListener('mousedown', e=>{
    e.preventDefault(); document.body.style.cursor='row-resize'; rz.classList.add('dragging');
    const ch=prev.parentElement.clientHeight, sy=e.clientY, ph=prev.getBoundingClientRect().height, nh=next.getBoundingClientRect().height;
    function mm(e){const dy=e.clientY-sy; if(ph+dy>30&&nh-dy>30){prev.style.flex='0 0 '+((ph+dy)/ch*100)+'%';next.style.flex='0 0 '+((nh-dy)/ch*100)+'%';}}
    function mu(){document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);rz.classList.remove('dragging');document.body.style.cursor='default';}
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
  });
}

(async function init() {
  setupVerticalResizer('rv1','col1','col2'); setupVerticalResizer('rv2','col2','col3');
  setupHorizontalResizer('rh1','input-panel','output-panel'); setupHorizontalResizer('rh2','vars-panel','wb-panel');
  const s=await api('GET','/api/state');
  if (s && s.isLoaded) applyState(s); else showLoadModal();
})();
</script>
</body>
</html>`;
    }
}
