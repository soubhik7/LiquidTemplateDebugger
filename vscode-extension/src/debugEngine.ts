import { Liquid } from 'liquidjs';
import { TemplateParser } from './templateParser';
import { FormatConverter } from './formatConverter';
import {
    DebugState,
    TrackedVariable,
    Breakpoint,
    WatchExpression,
    StepResult,
    ParsedTemplate
} from './types';
import * as fs from 'fs';

export class DebugEngine {
    private parser: TemplateParser;
    private converter: FormatConverter;
    private liquid: Liquid;
    private state: DebugState;
    private parsedTemplate: ParsedTemplate | null = null;
    private inputDataContent: string = '';
    private templateSource: string = '';
    private scopeStack: string[] = ['root'];
    private previousOutput: string = '';
    private outputMap: { startIndex: number; endIndex: number; line: number }[] = [];
    private lastReloadArgs: { templateContent: string; dataContent: string; format: string } | null = null;

    constructor() {
        this.parser = new TemplateParser();
        this.converter = new FormatConverter();
        this.liquid = this.parser.getLiquid();
        this.state = this.createInitialState();
    }

    private createInitialState(): DebugState {
        return {
            templatePath: '',
            dataPath: '',
            format: 'json',
            currentLine: 1,
            currentElement: 0,
            variables: new Map(),
            output: '',
            breakpoints: [],
            watches: [],
            isRunning: false,
            isPaused: false
        };
    }

    // ── Initialize from file paths (DAP / VS Code editor integration) ─────────
    async initialize(templatePath: string, dataPath: string, format: string): Promise<void> {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const dataContent = fs.readFileSync(dataPath, 'utf-8');
        await this.initializeFromContent(templateContent, dataContent, format, templatePath);
    }

    // ── Initialize from pasted strings (Load modal) ───────────────────────────
    async initializeFromContent(
        templateContent: string,
        dataContent: string,
        format: string,
        templatePath = ''
    ): Promise<void> {
        const savedBreakpoints = [...this.state.breakpoints]; // preserve BPs across reloads
        this.state = this.createInitialState();
        this.state.breakpoints = savedBreakpoints;
        this.parsedTemplate = null;
        this.scopeStack = ['root'];
        this.previousOutput = '';
        this.outputMap = [];

        this.templateSource = templateContent;
        this.inputDataContent = dataContent;
        this.state.templatePath = templatePath;
        this.state.format = format;

        // Save args for reset
        this.lastReloadArgs = { templateContent, dataContent, format };

        const rawData = this.converter.loadData(dataContent, format);
        const wrappedData = this.converter.wrapForTemplate(rawData);
        for (const [key, value] of Object.entries(wrappedData)) {
            this.trackVariable(key, value, 'global');
        }

        this.parsedTemplate = this.parser.parseTemplateFromContent(templateContent);
        this.state.currentLine = this.parsedTemplate.elements[0]?.line ?? 1;
        this.state.currentElement = 0;
        this.state.isRunning = true;
        this.state.isPaused = true;
    }

    async reinitialize(): Promise<void> {
        if (!this.lastReloadArgs) { throw new Error('Nothing loaded yet'); }
        const { templateContent, dataContent, format } = this.lastReloadArgs;
        await this.initializeFromContent(templateContent, dataContent, format, this.state.templatePath);
    }

    // ── Step ──────────────────────────────────────────────────────────────────
    async step(): Promise<StepResult> {
        if (!this.state.isRunning || !this.parsedTemplate) {
            throw new Error('No active debug session');
        }

        const { elements } = this.parsedTemplate;
        if (this.state.currentElement >= elements.length) {
            return this.makeResult(true);
        }

        const element = elements[this.state.currentElement];
        this.state.currentLine = element.line;
        this.updateScopeStack(element);

        const context = this.buildContext();
        this.previousOutput = this.state.output;
        const startIndex = this.state.output.length;

        try {
            if (element.type === 'output' || element.type === 'tag') {
                const rendered = await this.liquid.parseAndRender(element.raw, context);
                this.state.output += rendered;
                if (element.type === 'tag') {
                    await this.syncVariablesAfterTag(element.raw);
                }
            } else {
                this.state.output += element.content;
            }
        } catch (err: any) {
            this.state.output += `[ERROR line ${element.line}: ${err.message}]`;
        }

        const endIndex = this.state.output.length;
        if (endIndex > startIndex) {
            this.outputMap.push({ startIndex, endIndex, line: element.line });
        }

        this.state.currentElement++;
        this.updateWatches();

        const completed = this.state.currentElement >= elements.length;
        if (!completed) {
            this.state.currentLine = elements[this.state.currentElement].line;
        }

        return this.makeResult(completed);
    }

    async stepOver(): Promise<StepResult> {
        return this.step();
    }

    async continue(): Promise<StepResult> {
        let result: StepResult;
        do {
            result = await this.step();
            if (this.checkBreakpoint()) { break; }
        } while (!result.completed);
        return result;
    }

    // ── Breakpoints ───────────────────────────────────────────────────────────

    setBreakpoint(line: number, condition?: string): Breakpoint {
        const existing = this.state.breakpoints.find(b => b.line === line);
        if (existing) { existing.condition = condition; existing.enabled = true; return existing; }
        const bp: Breakpoint = {
            id: Math.floor(Date.now() + Math.random() * 1000),
            line, condition, enabled: true, hitCount: 0
        };
        this.state.breakpoints.push(bp);
        return bp;
    }

    removeBreakpoint(id: number): boolean {
        const idx = this.state.breakpoints.findIndex(b => b.id === id);
        if (idx >= 0) { this.state.breakpoints.splice(idx, 1); return true; }
        return false;
    }

    clearBreakpoints(): void { this.state.breakpoints = []; }

    toggleBreakpoint(id: number): boolean {
        const bp = this.state.breakpoints.find(b => b.id === id);
        if (bp) { bp.enabled = !bp.enabled; return true; }
        return false;
    }

    checkBreakpoint(): boolean {
        const { currentLine, breakpoints } = this.state;
        for (const bp of breakpoints) {
            if (bp.enabled && bp.line === currentLine) {
                bp.hitCount++;
                this.state.isPaused = true;
                return true;
            }
        }
        return false;
    }

    // ── Watches ───────────────────────────────────────────────────────────────

    addWatch(expression: string): WatchExpression {
        const existing = this.state.watches.find(w => w.expression === expression);
        if (existing) { return existing; }
        const watch: WatchExpression = { id: Date.now(), expression, value: null };
        this.state.watches.push(watch);
        this.refreshWatch(watch);
        return watch;
    }

    removeWatch(id: number): boolean {
        const idx = this.state.watches.findIndex(w => w.id === id);
        if (idx >= 0) { this.state.watches.splice(idx, 1); return true; }
        return false;
    }

    async evaluateExpression(expression: string): Promise<any> {
        return this.parser.evaluateExpression(expression, this.buildContext());
    }

    validateOutput(format: string): { isValid: boolean; errorMessage?: string; sourceLineNumber?: number } {
        const output = this.state.output;
        try {
            if (format === 'json') {
                let cleanedOutput = output
                    .replace(/,(\s*[\]}])/g, ' $1') // trailing commas replaced by space, preserving length and newlines
                    .replace(/:\s*(?=,)/g, m => m + 'null') // empty value before comma, insert null, preserve newlines
                    .replace(/:\s*(?=})/g, m => m + 'null'); // empty value before }, insert null, preserve newlines
                JSON.parse(cleanedOutput);
            } else if (format === 'xml') {
                // Simple XML check
                if (!output.trim().startsWith('<')) { throw new Error('Not valid XML — does not start with <'); }
            } else if (format === 'csv') {
                if (!output.includes(',') && !output.includes('\n')) {
                    throw new Error('Content does not appear to be CSV');
                }
            }
            return { isValid: true };
        } catch (e: any) {
            let sourceLineNumber: number | undefined;
            const lineMatch = e.message.match(/line (\d+)/i);
            let charIndex = -1;
            
            if (lineMatch) {
                const outLine = parseInt(lineMatch[1], 10);
                let currentLine = 1;
                for (let i = 0; i < output.length; i++) {
                    if (currentLine === outLine) {
                        charIndex = i;
                        break;
                    }
                    if (output[i] === '\n') currentLine++;
                }
            }
            
            if (charIndex === -1) {
                const posMatch = e.message.match(/position (\d+)/i);
                if (posMatch) {
                    charIndex = parseInt(posMatch[1], 10);
                }
            }

            if (charIndex >= 0) {
                const segment = this.outputMap.find(s => charIndex >= s.startIndex && charIndex < s.endIndex);
                if (segment) {
                    sourceLineNumber = segment.line;
                } else if (this.outputMap.length > 0) {
                    sourceLineNumber = this.outputMap[this.outputMap.length - 1].line;
                }
            }

            return { isValid: false, errorMessage: e.message, sourceLineNumber };
        }
    }

    // ── Web-UI-compatible state object ────────────────────────────────────────

    getWebUIState(): any {
        const isComplete = !this.state.isRunning ||
            this.state.currentElement >= (this.parsedTemplate?.elements.length ?? 0);

        const variables = [];
        for (const [name, v] of this.state.variables) {
            variables.push({
                name,
                scopeTag: v.scope,
                currentValue: this.fmtValue(v.value),
                typeName: this.typeOf(v.value),
                rawValue: this.toSerializable(v.value),
                origin: { sourcePath: this.inputDataContent.length < 5000 ? v.scope : v.scope, sourceFormat: this.state.format },
                transformations: []
            });
        }

        const watches = this.state.watches.map(w => ({
            id: w.id,
            expression: w.expression,
            displayExpression: w.expression,
            currentValue: this.fmtValue(w.value),
            typeName: this.typeOf(w.value),
            hasChanged: false,
            error: w.error
        }));

        const breakpoints = this.state.breakpoints.map(bp => ({
            id: bp.id,
            line: bp.line,
            condition: bp.condition ?? null,
            isEnabled: bp.enabled,
            hitCount: bp.hitCount
        }));

        const elements = (this.parsedTemplate?.elements ?? []).map(e => ({
            lineNumber: e.line,
            type: e.type,
            content: e.content
        }));

        const lastChunk = this.state.output.substring(this.previousOutput.length);

        return {
            isLoaded: this.state.isRunning || isComplete,
            templateSource: this.templateSource,
            dataContent: this.inputDataContent,
            dataFormat: this.state.format,
            elements,
            breakpoints,
            watches,
            state: {
                isComplete,
                currentLine: this.state.currentLine,
                currentElementIndex: this.state.currentElement,
                outputSoFar: this.state.output,
                lastOutputChunk: lastChunk,
                variables,
                scopeStack: [...this.scopeStack]
            }
        };
    }

    // ── Accessors (for DAP adapter) ───────────────────────────────────────────
    getVariable(name: string): TrackedVariable | undefined { return this.state.variables.get(name); }
    getAllVariables(): Map<string, TrackedVariable> { return new Map(this.state.variables); }
    getBreakpoints(): Breakpoint[] { return [...this.state.breakpoints]; }
    getWatches(): WatchExpression[] { return [...this.state.watches]; }
    getOutput(): string { return this.state.output; }
    getCurrentLine(): number { return this.state.currentLine; }
    getTemplatePath(): string { return this.state.templatePath; }
    isLoaded(): boolean { return !!this.parsedTemplate; }

    reset(): void {
        this.state = this.createInitialState();
        this.parsedTemplate = null;
        this.templateSource = '';
        this.inputDataContent = '';
        this.scopeStack = ['root'];
        this.previousOutput = '';
        this.outputMap = [];
        this.lastReloadArgs = null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private trackVariable(name: string, value: any, scope: string): void {
        const existing = this.state.variables.get(name);
        const variable: TrackedVariable = {
            name, value, type: this.typeOf(value), scope,
            history: existing ? [...existing.history] : []
        };
        if (existing && JSON.stringify(existing.value) !== JSON.stringify(value)) {
            variable.history.push({ line: this.state.currentLine, oldValue: existing.value, newValue: value });
        }
        this.state.variables.set(name, variable);
    }

    private buildContext(): Record<string, any> {
        const ctx: Record<string, any> = {};
        for (const [name, v] of this.state.variables) { ctx[name] = v.value; }
        return ctx;
    }

    private async syncVariablesAfterTag(raw: string): Promise<void> {
        const assignMatch = raw.match(/\{%-?\s*assign\s+(\w+)\s*=/);
        if (assignMatch) {
            const varName = assignMatch[1];
            const val = await this.parser.evaluateExpression(varName, this.buildContext());
            if (val !== undefined && val !== null) { this.trackVariable(varName, val, 'assign'); }
        }

        const captureMatch = raw.match(/\{%-?\s*capture\s+(\w+)\s*-?%\}([\s\S]*?)\{%-?\s*endcapture/);
        if (captureMatch) {
            const varName = captureMatch[1];
            const rendered = await this.liquid.parseAndRender(captureMatch[2], this.buildContext());
            this.trackVariable(varName, rendered.trim(), 'capture');
            const e = `capture:${varName}`;
            if (!this.scopeStack.includes(e)) { this.scopeStack.push(e); }
        }

        const forMatch = raw.match(/\{%-?\s*for\s+(\w+)\s+in\s+([\w.]+)/);
        if (forMatch) {
            const itemName = forMatch[1];
            const collName = forMatch[2];
            const coll = this.resolvePath(this.buildContext(), collName);
            if (Array.isArray(coll) && coll.length > 0) { this.trackVariable(itemName, coll[0], 'for'); }
            const e = `for:${itemName}`;
            if (!this.scopeStack.includes(e)) { this.scopeStack.push(e); }
        }

        if (/\{%-?\s*endfor/.test(raw)) { this.scopeStack = this.scopeStack.filter(s => !s.startsWith('for:')); }
        if (/\{%-?\s*endcapture/.test(raw)) { this.scopeStack = this.scopeStack.filter(s => !s.startsWith('capture:')); }
    }

    private updateScopeStack(element: { type: string; raw: string }): void {
        if (element.type !== 'tag') { return; }
        const raw = element.raw;
        if (/\{%-?\s*if\b/.test(raw))    { if (!this.scopeStack.includes('if')) { this.scopeStack.push('if'); } }
        if (/\{%-?\s*unless\b/.test(raw)){ if (!this.scopeStack.includes('unless')) { this.scopeStack.push('unless'); } }
        if (/\{%-?\s*endif/.test(raw))   { this.scopeStack = this.scopeStack.filter(s => s !== 'if' && s !== 'unless'); }
        if (/\{%-?\s*case\b/.test(raw))  { if (!this.scopeStack.includes('case')) { this.scopeStack.push('case'); } }
        if (/\{%-?\s*endcase/.test(raw)) { this.scopeStack = this.scopeStack.filter(s => s !== 'case'); }
    }

    private resolvePath(ctx: any, path: string): any {
        return path.split('.').reduce((obj, key) => obj?.[key], ctx);
    }

    private updateWatches(): void {
        for (const w of this.state.watches) { this.refreshWatch(w); }
    }

    private refreshWatch(watch: WatchExpression): void {
        this.parser.evaluateExpression(watch.expression, this.buildContext())
            .then(v => { watch.value = v; watch.error = undefined; })
            .catch((e: any) => { watch.value = null; watch.error = e.message; });
    }

    private makeResult(completed: boolean): StepResult {
        const lastChunk = this.state.output.substring(this.previousOutput.length);
        return {
            output: this.state.output,
            variables: this.getAllVariables(),
            currentLine: this.state.currentLine,
            currentElement: this.state.currentElement,
            completed,
            lastChunk
        };
    }

    private fmtValue(value: any): string {
        if (value === null || value === undefined) { return 'nil'; }
        if (typeof value === 'string') { return value.length > 300 ? value.substring(0, 300) + '…' : value; }
        if (Array.isArray(value)) { return `[${value.length} items]`; }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            return `{${keys.length} keys}`;
        }
        return String(value);
    }

    private typeOf(value: any): string {
        if (value === null || value === undefined) { return 'Null'; }
        if (Array.isArray(value)) { return `Array`; }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            return `Hash: ${keys.length} keys`;
        }
        const t = typeof value;
        if (t === 'number') { return Number.isInteger(value) ? 'Integer' : 'Double'; }
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    private toSerializable(value: any): any {
        if (value === null || value === undefined) { return null; }
        if (typeof value !== 'object') { return value; }
        try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
    }
}
