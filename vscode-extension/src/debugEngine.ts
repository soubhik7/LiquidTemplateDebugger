import { Liquid } from 'liquidjs';
import { TemplateParser } from './templateParser';
import { FormatConverter } from './formatConverter';
import {
    DebugState,
    TrackedVariable,
    Breakpoint,
    WatchExpression,
    StepResult,
    ParsedTemplate,
    ForLoopState,
    ExecutionStackEntry
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
    
    // ── Flow Control Stacks ───────────────────────────────────────────────────
    private executionStack: ExecutionStackEntry[] = [];
    private forLoopStack: ForLoopState[] = [];
    private caseValueStack: any[] = [];

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
        if (!templatePath || !dataPath) throw new Error('Template and Data paths are required');
        if (!fs.existsSync(templatePath) || !fs.lstatSync(templatePath).isFile()) throw new Error('Invalid template path');
        if (!fs.existsSync(dataPath) || !fs.lstatSync(dataPath).isFile()) throw new Error('Invalid data path');

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
        const savedBreakpoints = this.state.breakpoints.map(bp => ({ ...bp, hitCount: 0 })); // Reset hits for new run
        this.state = this.createInitialState();
        this.state.breakpoints = savedBreakpoints;
        this.parsedTemplate = null;
        this.scopeStack = ['root'];
        this.previousOutput = '';
        this.outputMap = [];
        this.executionStack = [];
        this.forLoopStack = [];
        this.caseValueStack = [];

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
            if (element.type === 'tag') {
                const tagNameMatch = element.raw.match(/^\s*\{%-?\s*([a-zA-Z0-9_]+)/);
                const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
                const expressionMatch = element.raw.match(/^\s*\{%-?\s*[a-zA-Z0-9_]+\s+([\s\S]*?)-?%\}\s*$/);
                const args = expressionMatch ? expressionMatch[1].trim() : '';

                if (this.isFlowControlTag(tagName)) {
                    await this.executeFlowControlTag(tagName, args, context, element.line);
                } else if (this.isExecuting()) {
                    if (tagName === 'assign') {
                        await this.executeAssign(args, context, element.line);
                    } else if (tagName === 'capture') {
                        await this.executeCapture(args, context, element.line);
                    } else if (tagName === 'for') {
                        await this.executeForStart(args, context, element.line);
                    } else if (tagName === 'endfor') {
                        await this.executeForEnd(element.line);
                    } else if (tagName === 'endcapture') {
                        if (this.scopeStack.length > 1) { this.scopeStack.pop(); }
                    } else {
                        // All other non-block tags
                        const rendered = await this.liquid.parseAndRender(element.raw, context);
                        this.state.output += rendered;
                        await this.syncVariablesAfterTag(element.raw);
                    }
                }
            } else if (this.isExecuting()) {
                if (element.type === 'output') {
                    const rendered = await this.liquid.parseAndRender(element.raw, context);
                    this.state.output += rendered;
                } else {
                    this.state.output += element.content;
                }
            }
        } catch (err: any) {
            this.state.output += `[ERROR line ${element.line}: ${err.message}]`;
        }

        const endIndex = this.state.output.length;
        if (endIndex > startIndex) {
            this.outputMap.push({ startIndex, endIndex, line: element.line });
        }

        this.state.currentElement++;
        await this.updateWatches();

        const completed = this.state.currentElement >= elements.length;
        if (!completed) {
            this.state.currentLine = elements[this.state.currentElement].line;
        }

        return this.makeResult(completed);
    }

    async stepOver(): Promise<StepResult> {
        return this.step();
    }

    async stepOut(): Promise<StepResult> {
        if (!this.state.isRunning || !this.parsedTemplate) {
            throw new Error('No active debug session');
        }

        const startExecutionDepth = this.executionStack.length;
        const startForDepth = this.forLoopStack.length;
        const startCaseDepth = this.caseValueStack.length;

        let result: StepResult;
        do {
            result = await this.step();
            if (await this.checkBreakpoint()) { break; }
            
            // If we've popped any stack, we've "stepped out" of the current scope
            if (this.executionStack.length < startExecutionDepth || 
                this.forLoopStack.length < startForDepth || 
                this.caseValueStack.length < startCaseDepth) {
                break;
            }
        } while (!result.completed);
        
        return result;
    }

    async continue(): Promise<StepResult> {
        let result: StepResult;
        do {
            result = await this.step();
            if (await this.checkBreakpoint()) { break; }
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

    async checkBreakpoint(): Promise<boolean> {
        const { currentElement, currentLine, breakpoints } = this.state;
        if (!this.parsedTemplate) return false;
        
        // Only trigger breakpoint on the FIRST element of a line to avoid multiple hits per line
        // (e.g. literal + output + literal on one line)
        const elements = this.parsedTemplate.elements;
        const isFirstOnLine = currentElement === 0 || elements[currentElement - 1].line !== currentLine;
        if (!isFirstOnLine) return false;

        for (const bp of breakpoints) {
            if (bp.enabled && bp.line === currentLine) {
                if (bp.condition && bp.condition.trim().length > 0) {
                    try {
                        const conditionMet = await this.evaluateCondition(bp.condition, this.buildContext());
                        if (!conditionMet) continue;
                    } catch {
                        continue;
                    }
                }
                bp.hitCount++;
                this.state.isPaused = true;
                return true;
            }
        }
        return false;
    }

    // ── Watches ───────────────────────────────────────────────────────────────

    async addWatch(expression: string): Promise<WatchExpression> {
        const existing = this.state.watches.find(w => w.expression === expression);
        if (existing) { return existing; }
        const watch: WatchExpression = { id: Date.now(), expression, value: null };
        this.state.watches.push(watch);
        await this.refreshWatch(watch);
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
                    .replace(/[\u00A0\u1680\u2000-\u200F\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, ' ') // Strip Em/En spaces and Zero-Width characters
                    .replace(/,(\s*[\]}])/g, ' $1') // trailing commas replaced by space, preserving length and newlines
                    .replace(/:\s*(?=,)/g, m => m + 'null') // empty value before comma, insert null, preserve newlines
                    .replace(/:\s*(?=})/g, m => m + 'null'); // empty value before }, insert null, preserve newlines
                JSON.parse(cleanedOutput);
            } else if (format === 'xml') {
                // Simple XML check
                const trimmed = output.trim();
                if (!trimmed.startsWith('<')) { throw new Error('Not valid XML — does not start with <'); }
                if (trimmed.includes('[ERROR')) { throw new Error('XML contains rendering errors'); }
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
            let loopState = undefined;
            if (v.scope === 'for') {
                loopState = this.forLoopStack.find(s => s.variableName === name);
            }
            
            let rawValueToSerialize = v.value;
            if (v.scope === 'for' && v.loopItems) {
                rawValueToSerialize = {
                    current_item: v.value,
                    index: loopState ? loopState.currentIndex : -1,
                    total_items: v.loopItems.length,
                    all_loop_objects: v.loopItems
                };
            }

            variables.push({
                name,
                scopeTag: v.scope,
                currentValue: this.fmtValue(v.value),
                typeName: this.typeOf(v.value),
                rawValue: this.toSerializable(rawValueToSerialize),
                origin: { sourcePath: this.inputDataContent.length < 5000 ? v.scope : v.scope, sourceFormat: this.state.format },
                transformations: v.transformations || []
            });
        }

        const watches = this.state.watches.map(w => ({
            id: w.id,
            expression: w.expression,
            displayExpression: w.expression,
            currentValue: this.fmtValue(w.value),
            rawValue: w.value,
            typeName: this.typeOf(w.value),
            hasChanged: false,
            error: w.error,
            transformations: w.transformations || [],
            scopeTag: 'WATCH'
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
        this.executionStack = [];
        this.forLoopStack = [];
        this.caseValueStack = [];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private trackVariable(name: string, value: any, scope: string, transformations?: any[], loopItems?: any[]): void {
        const existing = this.state.variables.get(name);
        const variable: TrackedVariable = {
            name, value, type: this.typeOf(value), scope,
            history: existing ? [...existing.history] : [],
            transformations: transformations || (existing ? existing.transformations : []),
            loopItems: loopItems || (existing ? existing.loopItems : undefined)
        };
        if (existing && JSON.stringify(existing.value) !== JSON.stringify(value)) {
            variable.history.push({ line: this.state.currentLine, oldValue: existing.value, newValue: value });
        }
        this.state.variables.set(name, variable);
    }

    public buildContext(): Record<string, any> {
        const ctx: Record<string, any> = {};
        for (const [name, v] of this.state.variables) { ctx[name] = v.value; }
        return ctx;
    }

    private async syncVariablesAfterTag(raw: string): Promise<void> {
        const assignMatch = raw.match(/\{%-?\s*assign\s+(\w+)\s*=\s*(.*?)\s*-?%\}/);
        if (assignMatch) {
            const varName = assignMatch[1];
            const expr = assignMatch[2].trim();
            const val = await this.parser.evaluateExpression(expr, this.buildContext());
            const transformations = await this.extractTransformationsFromExpression(expr, this.buildContext());
            if (val !== undefined && val !== null) { this.trackVariable(varName, val, 'assign', transformations); }
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

    private findAliasExpressionInTemplate(alias: string): string | null {
        if (!this.parsedTemplate) return null;
        const elements = this.parsedTemplate.elements;
        
        // Support nested paths like pricing.unitPrice by focusing on the leaf name
        const parts = alias.split('.');
        const leaf = parts[parts.length - 1];
        const escapedLeaf = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Generic label detection:
        // Matches the leaf name as a distinct word at the end of the literal snippet,
        // followed by any punctuation or separators (: > = , etc).
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escapedLeaf}[^a-zA-Z0-9_]*$`, 'i');

        for (let i = 0; i < elements.length - 1; i++) {
            const el = elements[i];
            if (el.type === 'literal') {
                const text = el.content.trimEnd();
                if (regex.test(text)) {
                    // Check parent context for nested paths if it's a multipart alias
                    if (parts.length > 1) {
                        const parent = parts[parts.length - 2];
                        const escapedParent = parent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const parentRegex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escapedParent}(?:$|[^a-zA-Z0-9_])`, 'i');
                        
                        let foundParent = false;
                        // Scan back a few elements to see if parent is mentioned
                        for (let j = Math.max(0, i - 5); j <= i; j++) {
                            if (elements[j].type === 'literal' && parentRegex.test(elements[j].content)) {
                                foundParent = true;
                                break;
                            }
                        }
                        if (!foundParent) continue;
                    }

                    const nextEl = elements[i + 1];
                    if (nextEl.type === 'output') {
                        return nextEl.content.trim();
                    }
                }
            }
        }
        return null;
    }

    private async updateWatches(): Promise<void> {
        for (const w of this.state.watches) { await this.refreshWatch(w); }
    }

    private async refreshWatch(watch: WatchExpression): Promise<void> {
        try {
            const context = this.buildContext();
            
            // Try evaluating directly as a variable or expression first
            let value = await this.parser.evaluateExpression(watch.expression, context);
            let exprToAnalyze = watch.expression;

            // If it evaluates to something that looks like an undefined variable (null/nil in Liquid),
            // try to find if it refers to an output field in the template.
            if (value === null || value === undefined) {
                const aliasedExpr = this.findAliasExpressionInTemplate(watch.expression);
                if (aliasedExpr) {
                    exprToAnalyze = aliasedExpr;
                    value = await this.parser.evaluateExpression(aliasedExpr, context);
                }
            }

            watch.value = value;
            watch.error = undefined;

            // Pull transformations from tracked variables if the watch is a simple variable name
            const trackedVar = this.state.variables.get(watch.expression);
            if (trackedVar && !watch.expression.includes('|')) {
                watch.transformations = trackedVar.transformations || [];
            } else {
                // Otherwise extract math transformations from the actual expression being evaluated
                watch.transformations = await this.extractTransformationsFromExpression(exprToAnalyze, context);
            }
        } catch (e: any) {
            watch.value = null;
            watch.error = e.message;
            watch.transformations = [];
        }
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

    private isExecuting(): boolean {
        return this.executionStack.length === 0 || this.executionStack.every(e => e.executing);
    }

    private isFlowControlTag(tagName: string): boolean {
        return ['if', 'unless', 'elsif', 'else', 'endif', 'endunless', 'case', 'when', 'endcase', 'break', 'continue', 'increment', 'decrement'].includes(tagName);
    }

    private async executeFlowControlTag(tagName: string, args: string, context: Record<string, any>, line: number) {
        switch (tagName) {
            case 'if': {
                if (!this.isExecuting()) {
                    this.executionStack.push({ executing: false, branchTaken: true });
                    return;
                }
                const result = await this.evaluateCondition(args, context);
                this.executionStack.push({ executing: result, branchTaken: result });
                break;
            }
            case 'unless': {
                if (!this.isExecuting()) {
                    this.executionStack.push({ executing: false, branchTaken: true });
                    return;
                }
                const result = !(await this.evaluateCondition(args, context));
                this.executionStack.push({ executing: result, branchTaken: result });
                break;
            }
            case 'elsif': {
                if (this.executionStack.length === 0) return;
                const top = this.executionStack.pop()!;
                if (top.branchTaken || !this.isExecuting()) {
                    this.executionStack.push({ executing: false, branchTaken: true });
                    return;
                }
                const result = await this.evaluateCondition(args, context);
                this.executionStack.push({ executing: result, branchTaken: result });
                break;
            }
            case 'else': {
                if (this.executionStack.length === 0) return;
                const top = this.executionStack.pop()!;
                if (top.branchTaken || !this.isExecuting()) {
                    this.executionStack.push({ executing: false, branchTaken: true });
                    return;
                }
                this.executionStack.push({ executing: true, branchTaken: true });
                break;
            }
            case 'endif':
            case 'endunless': {
                if (this.executionStack.length > 0) this.executionStack.pop();
                break;
            }
            case 'case': {
                if (!this.isExecuting()) {
                    this.executionStack.push({ executing: false, branchTaken: true });
                    return;
                }
                const value = await this.parser.evaluateExpression(args, context);
                this.caseValueStack.push(value);
                this.executionStack.push({ executing: false, branchTaken: false });
                break;
            }
            case 'when': {
                if (this.executionStack.length === 0) return;
                const top = this.executionStack.pop()!;
                if (top.branchTaken || !this.isExecuting() || this.caseValueStack.length === 0) {
                    this.executionStack.push({ executing: false, branchTaken: true });
                    return;
                }
                const caseValue = this.caseValueStack[this.caseValueStack.length - 1];
                
                const whenValues = args.split(',').map(s => s.trim());
                let matched = false;
                for (const wv of whenValues) {
                    const evalWv = await this.parser.evaluateExpression(wv, context);
                    if (evalWv === caseValue || String(evalWv) === String(caseValue)) {
                        matched = true;
                        break;
                    }
                }
                
                this.executionStack.push({ executing: matched, branchTaken: matched });
                break;
            }
            case 'endcase': {
                if (this.executionStack.length > 0) this.executionStack.pop();
                if (this.caseValueStack.length > 0) this.caseValueStack.pop();
                break;
            }
            case 'break': {
                if (!this.isExecuting() || this.forLoopStack.length === 0) return;
                const loopState = this.forLoopStack.pop()!;
                this.state.currentElement = loopState.loopEndElementIndex;
                this.state.variables.delete(loopState.variableName);
                if (this.forLoopStack.length > 0) {
                    this.setForLoopVariable(this.forLoopStack[this.forLoopStack.length - 1]);
                } else {
                    this.state.variables.delete('forloop');
                }
                break;
            }
            case 'continue': {
                if (!this.isExecuting() || this.forLoopStack.length === 0) return;
                const loopState = this.forLoopStack[this.forLoopStack.length - 1];
                loopState.currentIndex++;
                if (loopState.currentIndex < loopState.items.length) {
                    this.setForLoopVariable(loopState);
                    this.state.currentElement = loopState.loopStartElementIndex;
                } else {
                    this.forLoopStack.pop();
                    this.state.currentElement = loopState.loopEndElementIndex;
                    this.state.variables.delete(loopState.variableName);
                    if (this.forLoopStack.length > 0) {
                        this.setForLoopVariable(this.forLoopStack[this.forLoopStack.length - 1]);
                    } else {
                        this.state.variables.delete('forloop');
                    }
                }
                break;
            }
            case 'increment': {
                if (!this.isExecuting()) return;
                const vName = args.trim();
                let val = this.state.variables.get(vName)?.value ?? 0;
                if (typeof val !== 'number') val = 0;
                this.state.output += val;
                this.trackVariable(vName, val + 1, 'global');
                break;
            }
            case 'decrement': {
                if (!this.isExecuting()) return;
                const vName = args.trim();
                let val = this.state.variables.get(vName)?.value ?? 0;
                if (typeof val !== 'number') val = 0;
                val = val - 1;
                this.state.output += val;
                this.trackVariable(vName, val, 'global');
                break;
            }
        }
    }

    private async evaluateCondition(condition: string, context: Record<string, any>): Promise<boolean> {
        try {
            const out = await this.liquid.parseAndRender(`{% if ${condition} %}1{% endif %}`, context);
            return out.trim() === '1';
        } catch {
            return false;
        }
    }

    private async executeAssign(args: string, context: Record<string, any>, line: number) {
        await this.syncVariablesAfterTag(`{% assign ${args} %}`);
    }

    private async executeCapture(args: string, context: Record<string, any>, line: number) {
        const varName = args.trim();
        let depth = 1;
        let idx = this.state.currentElement + 1;
        const elements = this.parsedTemplate!.elements;

        while (idx < elements.length && depth > 0) {
            const el = elements[idx];
            if (el.type === 'tag') {
                const tagNameMatch = el.raw.match(/^\s*\{%-?\s*([a-zA-Z0-9_]+)/);
                const tg = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
                if (tg === 'capture') depth++;
                else if (tg === 'endcapture') depth--;
            }
            if (depth === 0) break;
            idx++;
        }
        
        const endIdx = idx;
        let innerRaw = '';
        for(let i = this.state.currentElement + 1; i < endIdx; i++) {
            innerRaw += elements[i].raw;
        }
        
        try {
            const rendered = await this.liquid.parseAndRender(innerRaw, context);
            const transformations = await this.extractTransformationsFromCapture(innerRaw, context);
            this.trackVariable(varName, rendered.trim(), 'capture', transformations);
        } catch (e: any) {
            this.state.output += `[ERROR block rendering: ${e.message}]`;
        }
        
        this.state.currentElement = endIdx - 1; // Will be incremented by AdvanceToNext
    }

    private async executeForStart(args: string, context: Record<string, any>, line: number) {
        const forMatch = args.match(/^(\w+)\s+in\s+([\w.]+)/);
        if (!forMatch) return;
        
        const itemName = forMatch[1];
        const collName = forMatch[2];
        const collVal = this.resolvePath(context, collName);
        
        let items: any[] = [];
        if (Array.isArray(collVal)) items = [...collVal];
        else if (collVal && typeof collVal === 'object') items = Object.keys(collVal);
        
        let depth = 1;
        let endForIdx = this.state.currentElement + 1;
        const elements = this.parsedTemplate!.elements;
        while (endForIdx < elements.length && depth > 0) {
            const el = elements[endForIdx];
            if (el.type === 'tag') {
                const tagNameMatch = el.raw.match(/^\s*\{%-?\s*([a-zA-Z0-9_]+)/);
                const tg = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
                if (tg === 'for') depth++;
                else if (tg === 'endfor') depth--;
            }
            if (depth === 0) break;
            endForIdx++;
        }
        
        const loopState: ForLoopState = {
            variableName: itemName,
            collectionExpression: collName,
            items,
            currentIndex: 0,
            loopStartElementIndex: this.state.currentElement,
            loopEndElementIndex: endForIdx,
            executionStackDepthAtStart: this.executionStack.length,
            caseValueStackDepthAtStart: this.caseValueStack.length,
            scopeStackDepthAtStart: this.scopeStack.length
        };
        
        this.forLoopStack.push(loopState);
        
        if (items.length > 0) {
            this.setForLoopVariable(loopState);
        } else {
            this.state.currentElement = endForIdx - 1; // Will step to endfor and pop
        }
    }

    private setForLoopVariable(loopState: ForLoopState) {
        const item = loopState.items[loopState.currentIndex];
        this.trackVariable(loopState.variableName, item, 'for', undefined, loopState.items);
        
        const forloop = {
            index: loopState.currentIndex + 1,
            index0: loopState.currentIndex,
            first: loopState.currentIndex === 0,
            last: loopState.currentIndex === loopState.items.length - 1,
            length: loopState.items.length,
            rindex: loopState.items.length - loopState.currentIndex,
            rindex0: loopState.items.length - loopState.currentIndex - 1
        };
        this.trackVariable('forloop', forloop, 'for');
    }

    private async executeForEnd(line: number) {
        if (this.forLoopStack.length === 0) return;
        
        const loopState = this.forLoopStack[this.forLoopStack.length - 1];
        loopState.currentIndex++;
        
        if (loopState.currentIndex < loopState.items.length) {
            this.setForLoopVariable(loopState);
            this.state.currentElement = loopState.loopStartElementIndex;
        } else {
            this.forLoopStack.pop();
            this.state.variables.delete(loopState.variableName);
            if (this.forLoopStack.length > 0) {
                this.setForLoopVariable(this.forLoopStack[this.forLoopStack.length - 1]);
            } else {
                this.state.variables.delete('forloop');
            }
        }
    }

    public async extractTransformationsFromExpression(expr: string, context: Record<string, any>): Promise<any[]> {
        const parts = expr.split('|');
        if (parts.length <= 1) return [];
        const baseExpr = parts[0].trim();
        const transformations: any[] = [];
        let currentValue = await this.parser.evaluateExpression(baseExpr, context);
        let currentExpr = baseExpr;

        for (let i = 1; i < parts.length; i++) {
            const filterStr = parts[i].trim();
            currentExpr += ` | ${filterStr}`;
            const nextValue = await this.parser.evaluateExpression(currentExpr, context);
            
            let operator = '';
            let rightVar = '';
            let rightValue: any = undefined;
            
            const filterMatch = filterStr.match(/^(\w+)(?:\s*:\s*(.+))?$/);
            if (filterMatch) {
                const name = filterMatch[1].toLowerCase();
                const arg = filterMatch[2] ? filterMatch[2].trim() : '';
                
                if (name === 'plus') operator = '+';
                else if (name === 'minus') operator = '-';
                else if (name === 'times') operator = '*';
                else if (name === 'dividedby' || name === 'divided_by') operator = '/';
                else if (name === 'modulo') operator = '%';
                else if (['round', 'floor', 'ceil', 'abs'].includes(name)) operator = name;
                
                if (arg) {
                    rightVar = arg;
                    try {
                        rightValue = await this.parser.evaluateExpression(arg, context);
                    } catch {
                        rightValue = arg;
                    }
                }
            }

            transformations.push({
                type: 'FILTER',
                name: filterStr,
                baseExpr: i === 1 ? baseExpr : '',
                operator: operator,
                rightVar: rightVar,
                rightValue: rightValue,
                before: currentValue,
                after: nextValue
            });
            currentValue = nextValue;
        }
        return transformations;
    }

    private async extractTransformationsFromCapture(innerRaw: string, context: Record<string, any>): Promise<any[]> {
        const transformations: any[] = [];
        const regex = /\{\{(.*?)\}\}/g;
        let match;
        while ((match = regex.exec(innerRaw)) !== null) {
            const expr = match[1];
            if (expr.includes('|')) {
                const tr = await this.extractTransformationsFromExpression(expr, context);
                transformations.push(...tr);
            }
        }
        return transformations;
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
