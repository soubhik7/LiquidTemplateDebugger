import * as vscode from 'vscode';
import * as path from 'path';
import { DebuggerPanel } from './debuggerPanel';
import { DebugEngine } from './debugEngine';

// One engine per workspace — persists across panel open/close
const engine = new DebugEngine();

const SAMPLE_TEMPLATE = `{% assign baseTotal = content.numbers.price | Times: content.numbers.quantity %}
{% assign discountedTotal = baseTotal | Plus: content.numbers.discount %}
{% assign taxAmount = discountedTotal | Times: content.numbers.tax | DividedBy: 100 %}
{% assign grandTotal = discountedTotal | Plus: taxAmount %}
{% capture fullName %}{{ content.user.firstName | Strip }} {{ content.user.lastName | Strip }}{% endcapture %}
{
  "userSummary": {
    "id": "{{ content.user.id }}",
    "name": "{{ fullName | Strip }}",
    "email": "{{ content.user.email | Downcase }}"
  },
  "pricing": {
    "unitPrice": {{ content.numbers.price | Round: 2 }},
    "quantity": {{ content.numbers.quantity }},
    "baseTotal": {{ baseTotal | Round: 2 }},
    "discount": {{ content.numbers.discount }},
    "taxAmount": {{ taxAmount | Round: 2 }},
    "grandTotal": {{ grandTotal | Round: 2 }}
  }
}`;

const SAMPLE_DATA = JSON.stringify({
    content: {
        user: { id: 'u-1001', firstName: 'Soubhik', lastName: 'Mukherjee', email: 'SOUBHIK@EXAMPLE.COM' },
        numbers: { price: 99.567, quantity: 3, discount: -10, tax: 18 }
    }
}, null, 2);

export function activate(context: vscode.ExtensionContext) {

    // ── Command: open/show the Liquid Debugger panel ─────────────────────────
    const openPanelCmd = vscode.commands.registerCommand('liquid-debugger.start', async () => {
        const panel = DebuggerPanel.createOrShow(context.extensionUri);
        wirePanel(panel, context);

        // If a .liquid file is active, pre-fill the modal
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.fileName.endsWith('.liquid')) {
            const tplContent = editor.document.getText();
            // post a hint so the modal is pre-filled
            setTimeout(() => {
                panel.postMessage({ type: 'prefill', template: tplContent });
            }, 500);
        }
    });
    context.subscriptions.push(openPanelCmd);

    // ── Re-wire if panel already exists when extension reloads ───────────────
    if (DebuggerPanel.currentPanel) {
        wirePanel(DebuggerPanel.currentPanel, context);
    }
}

export function deactivate() {
    engine.reset();
}

// ── Wire panel message handler ────────────────────────────────────────────────

function wirePanel(panel: DebuggerPanel, _context: vscode.ExtensionContext): void {
    panel.setMessageHandler(async (msg: any) => {
        if (msg.type !== 'api') { return undefined; }
        const { method, path: urlPath, body } = msg;

        try {
            const result = await handleApiCall(method, urlPath, body);
            return result;
        } catch (err: any) {
            return { error: err.message ?? String(err) };
        }
    });
}

// ── API router (mirrors the ASP.NET backend's endpoints) ─────────────────────

async function handleApiCall(method: string, urlPath: string, body: any): Promise<any> {
    const GET  = method === 'GET';
    const POST = method === 'POST';
    const DEL  = method === 'DELETE';

    // GET /api/state
    if (GET && urlPath === '/api/state') {
        if (!engine.isLoaded()) { return { isLoaded: false }; }
        return engine.getWebUIState();
    }

    // POST /api/load
    if (POST && urlPath === '/api/load') {
        const { templateContent, dataContent, format } = body;
        await engine.initializeFromContent(templateContent, dataContent, format);
        return engine.getWebUIState();
    }

    // POST /api/load-sample
    if (POST && urlPath === '/api/load-sample') {
        await engine.initializeFromContent(SAMPLE_TEMPLATE, SAMPLE_DATA, 'json');
        return engine.getWebUIState();
    }

    // POST /api/step  { action: 'next' | 'into' | 'over' | 'out' | 'continue' }
    if (POST && urlPath === '/api/step') {
        const action: string = body?.action ?? 'next';
        if (action === 'continue') {
            await engine.continue();
        } else if (action === 'out') {
            await engine.stepOut();
        } else if (action === 'over') {
            await engine.stepOver();
        } else {
            await engine.step();   // next / into
        }
        return engine.getWebUIState();
    }

    // POST /api/reset
    if (POST && urlPath === '/api/reset') {
        await engine.reinitialize();
        return engine.getWebUIState();
    }

    // POST /api/evaluate  { expression }
    if (POST && urlPath === '/api/evaluate') {
        const expr: string = body?.expression ?? '';
        const value = await engine.evaluateExpression(expr);
        const transformations = await engine.extractTransformationsFromExpression(expr, engine.buildContext());
        const fmtValue = value === null || value === undefined ? 'nil' : String(value);
        const typeName = value === null || value === undefined ? 'Null'
            : Array.isArray(value) ? 'Array'
            : typeof value === 'object' ? 'Hash'
            : typeof value === 'boolean' ? 'Boolean'
            : typeof value === 'number' ? (Number.isInteger(value) ? 'Integer' : 'Double')
            : 'String';
        return { value: fmtValue, typeName, transformations };
    }

    // POST /api/validate  { format }
    if (POST && urlPath === '/api/validate') {
        return engine.validateOutput(body?.format ?? 'json');
    }

    // POST /api/breakpoint  { line, condition }
    if (POST && urlPath === '/api/breakpoint') {
        const bp = engine.setBreakpoint(body.line, body.condition ?? undefined);
        return { id: bp.id, line: bp.line };
    }

    // DELETE /api/breakpoint/:id
    if (DEL && urlPath.startsWith('/api/breakpoint/') && !urlPath.endsWith('/toggle')) {
        const id = Number(urlPath.split('/').pop());
        engine.removeBreakpoint(id);
        return { ok: true };
    }

    // POST /api/breakpoint/:id/toggle
    if (POST && urlPath.includes('/api/breakpoint/') && urlPath.endsWith('/toggle')) {
        const id = Number(urlPath.split('/')[3]);
        engine.toggleBreakpoint(id);
        return { ok: true };
    }

    // POST /api/watch  { expression }
    if (POST && urlPath === '/api/watch') {
        const w = await engine.addWatch(body.expression);
        return { id: w.id };
    }

    // DELETE /api/watch/:id
    if (DEL && urlPath.startsWith('/api/watch/')) {
        const id = Number(urlPath.split('/').pop());
        engine.removeWatch(id);
        return { ok: true };
    }
    // POST /api/clipboard/copy
    if (POST && urlPath === '/api/clipboard/copy') {
        const text = body?.text ?? '';
        await vscode.env.clipboard.writeText(text);
        return { ok: true };
    }

    return { error: `Unknown endpoint: ${method} ${urlPath}` };
}
