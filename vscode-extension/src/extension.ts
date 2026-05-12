import * as vscode from 'vscode';
import * as path from 'path';
import { DebuggerPanel } from './debuggerPanel';
import { DebugEngine } from './debugEngine';
import { AIProvider } from './aiProvider';

// Constants for security limits
const MAX_TEMPLATE_SIZE = 512 * 1024;  // 512KB
const MAX_DATA_SIZE = 1024 * 1024;     // 1MB
const MAX_EXPR_LENGTH = 2000;          // 2000 characters
const VALID_FORMATS = ['json', 'xml', 'csv', 'text'] as const;
const VALID_ACTIONS = ['continue', 'out', 'over', 'next', 'into'] as const;

// One engine per workspace — persists across panel open/close
const engine = new DebugEngine();
const aiProvider = new AIProvider();

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

function wirePanel(panel: DebuggerPanel, context: vscode.ExtensionContext): void {
    panel.setMessageHandler(async (msg: any) => {
        if (msg.type !== 'api') { return undefined; }
        const { method, path: urlPath, body } = msg;

        try {
            const result = await handleApiCall(method, urlPath, body, context);
            return result;
        } catch (err: any) {
            return { error: err.message ?? String(err) };
        }
    });
}

// ── API router (mirrors the ASP.NET backend's endpoints) ─────────────────────

async function handleApiCall(method: string, urlPath: string, body: any, context: vscode.ExtensionContext): Promise<any> {
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
        
        // Security: Input size limits
        if (templateContent?.length > MAX_TEMPLATE_SIZE) {
            throw new Error(`Template exceeds size limit of ${MAX_TEMPLATE_SIZE / 1024}KB`);
        }
        if (dataContent?.length > MAX_DATA_SIZE) {
            throw new Error(`Data exceeds size limit of ${MAX_DATA_SIZE / 1024}KB`);
        }

        // Security: Whitelist format
        if (!VALID_FORMATS.includes(format?.toLowerCase())) {
            throw new Error('Invalid format. Supported: json, xml, csv, text');
        }

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
        const action: any = VALID_ACTIONS.includes(body?.action) ? body.action : 'next';
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
        if (expr.length > MAX_EXPR_LENGTH) {
            throw new Error(`Expression exceeds maximum length of ${MAX_EXPR_LENGTH} characters`);
        }
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
        const format = (body?.format || 'json').toLowerCase();
        if (!VALID_FORMATS.includes(format as any)) {
            throw new Error('Invalid format. Supported: json, xml, csv, text');
        }
        return engine.validateOutput(format);
    }

    // POST /api/breakpoint  { line, condition }
    if (POST && urlPath === '/api/breakpoint') {
        const condition = body.condition ?? undefined;
        if (condition && condition.length > MAX_EXPR_LENGTH) {
            throw new Error(`Condition exceeds maximum length of ${MAX_EXPR_LENGTH} characters`);
        }
        const bp = engine.setBreakpoint(body.line, condition);
        return { id: bp.id, line: bp.line };
    }

    // DELETE /api/breakpoint/:id
    if (DEL && urlPath.startsWith('/api/breakpoint/') && !urlPath.endsWith('/toggle')) {
        const id = parseInt(urlPath.split('/').pop() ?? '', 10);
        if (!Number.isFinite(id) || id <= 0) return { error: 'Invalid ID' };
        engine.removeBreakpoint(id);
        return { ok: true };
    }

    // POST /api/breakpoint/:id/toggle
    if (POST && urlPath.includes('/api/breakpoint/') && urlPath.endsWith('/toggle')) {
        const parts = urlPath.split('/');
        const id = parseInt(parts[3] || '', 10);
        if (!Number.isFinite(id) || id <= 0) return { error: 'Invalid ID' };
        engine.toggleBreakpoint(id);
        return { ok: true };
    }

    // POST /api/watch  { expression }
    if (POST && urlPath === '/api/watch') {
        const expr = body.expression ?? '';
        if (expr.length > MAX_EXPR_LENGTH) {
            throw new Error(`Expression exceeds maximum length of ${MAX_EXPR_LENGTH} characters`);
        }
        const w = await engine.addWatch(expr);
        return { id: w.id };
    }

    // DELETE /api/watch/:id
    if (DEL && urlPath.startsWith('/api/watch/')) {
        const id = parseInt(urlPath.split('/').pop() ?? '', 10);
        if (!Number.isFinite(id) || id <= 0) return { error: 'Invalid ID' };
        engine.removeWatch(id);
        return { ok: true };
    }
    // POST /api/clipboard/copy
    if (POST && urlPath === '/api/clipboard/copy') {
        const text = body?.text ?? '';
        await vscode.env.clipboard.writeText(text);
        return { ok: true };
    }

    // ── AI Endpoints with SecretStorage ──────────────────────────────────────

    // POST /api/ai/save-key
    if (POST && urlPath === '/api/ai/save-key') {
        const { apiKey } = body;
        if (apiKey) {
            await context.secrets.store('gemini-api-key', apiKey);
            return { ok: true };
        }
        return { ok: false, error: 'API key is required' };
    }

    // GET /api/ai/get-key-status
    if (GET && urlPath === '/api/ai/get-key-status') {
        const key = await context.secrets.get('gemini-api-key');
        return { hasKey: !!key };
    }

    // POST /api/ai/validate-key
    if (POST && urlPath === '/api/ai/validate-key') {
        const { apiKey } = body;
        const keyToValidate = apiKey || await context.secrets.get('gemini-api-key');
        if (!keyToValidate) return { isValid: false, errorMessage: 'No API key provided' };
        return await aiProvider.validateKey(keyToValidate);
    }

    // POST /api/ai/list-models
    if (POST && urlPath === '/api/ai/list-models') {
        const { apiKey } = body;
        const keyToUse = apiKey || await context.secrets.get('gemini-api-key');
        if (!keyToUse) return { models: [] };
        const models = await aiProvider.listModels(keyToUse);
        return { models };
    }

    // POST /api/ai/generate
    if (POST && urlPath === '/api/ai/generate') {
        const { prompt, apiKey, model, dataContext, outputFormat, mappingDetails, sensitivePatterns } = body;
        const keyToUse = apiKey || await context.secrets.get('gemini-api-key');
        if (!keyToUse) throw new Error('AI API Key not configured');

        // Security: Data Sanitization
        const sanitizedPrompt = sanitizeData(prompt, sensitivePatterns || []);
        const sanitizedMapping = sanitizeData(mappingDetails || '', sensitivePatterns || []);
        const sanitizedDataContext = JSON.parse(sanitizeData(JSON.stringify(dataContext), sensitivePatterns || []));

        // Security: Whitelist outputFormat
        const safeOutputFormat = ['json', 'xml', 'text', 'csv'].includes((outputFormat || '').toLowerCase())
            ? outputFormat
            : 'json';

        let fullPrompt = `Generate a Liquid template based on this requirement: "${sanitizedPrompt}".`;
        
        if (sanitizedMapping && sanitizedMapping.trim()) {
            fullPrompt += `\n\nReference Business Mapping Details:\n${sanitizedMapping}`;
        }

        fullPrompt += `\n\nInput data context: ${JSON.stringify(sanitizedDataContext)}
Expected output format: ${safeOutputFormat}

IMPORTANT RULES for Azure Logic Apps compatibility:
1. All root-level input variables MUST be prefixed with "content." (e.g., use {{ content.item }} instead of {{ item }}).
2. For JSON input, if accessing a root property "products", use "content.products".
3. For XML input, the root element should be accessed via "content.RootElement".

Return ONLY the Liquid template code. No explanations. No markdown code blocks.`;

        const template = await aiProvider.generateTemplate(fullPrompt, keyToUse, model);
        return { template };
    }

    return { error: `Unknown endpoint: ${method} ${urlPath}` };
}

/**
 * Sanitizes sensitive data using provided regex patterns
 */
const MAX_PATTERNS = 20;
const MAX_PATTERN_LENGTH = 200;

function sanitizeData(input: string, patterns: string[]): string {
    if (!input) return input;
    let result = input;
    
    // Security: Filter patterns to prevent ReDoS
    const safePatterns = (patterns || [])
        .slice(0, MAX_PATTERNS)
        .filter(p => typeof p === 'string' && p.length <= MAX_PATTERN_LENGTH)
        .filter(p => !/(\+|\*|\{).*(\+|\*|\{)/.test(p)); // block nested quantifiers

    for (const pattern of safePatterns) {
        try {
            const regex = new RegExp(pattern, 'gi');
            result = result.replace(regex, '[REDACTED]');
        } catch (e) {
            // Ignore invalid regex patterns
        }
    }
    // Default sanitization for common patterns if not provided
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    result = result.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CREDIT_CARD]');
    
    return result;
}
