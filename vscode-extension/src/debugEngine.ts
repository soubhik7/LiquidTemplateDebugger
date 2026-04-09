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

    constructor() {
        this.parser = new TemplateParser();
        this.converter = new FormatConverter();
        // Share the same Liquid instance as the parser for consistency
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

    async initialize(templatePath: string, dataPath: string, format: string): Promise<void> {
        this.state = this.createInitialState();
        this.state.templatePath = templatePath;
        this.state.dataPath = dataPath;
        this.state.format = format;

        // Load and parse data file
        const dataContent = fs.readFileSync(dataPath, 'utf-8');
        const rawData = this.converter.loadData(dataContent, format);
        const wrappedData = this.converter.wrapForTemplate(rawData);

        // Seed all top-level keys as tracked variables
        for (const [key, value] of Object.entries(wrappedData)) {
            this.trackVariable(key, value, 'global');
        }

        // Parse the template once — stored for the entire session
        this.parsedTemplate = this.parser.parseTemplate(templatePath);

        this.state.currentLine = 1;
        this.state.currentElement = 0;
        this.state.isRunning = true;
        this.state.isPaused = true;
    }

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

        // Render this single element against the current variable context
        const context = this.buildContext();
        try {
            if (element.type === 'output' || element.type === 'tag') {
                const rendered = await this.liquid.parseAndRender(element.raw, context);
                this.state.output += rendered;

                // After rendering a tag, re-sync variables (e.g. assign, capture)
                if (element.type === 'tag') {
                    await this.syncVariablesAfterTag(element.content, element.raw, context);
                }
            } else {
                // Literal — emit as-is
                this.state.output += element.content;
            }
        } catch (err: any) {
            // Non-fatal: emit error marker and continue stepping
            this.state.output += `[ERROR line ${element.line}: ${err.message}]`;
        }

        this.state.currentElement++;
        this.updateWatches();

        const completed = this.state.currentElement >= elements.length;
        return this.makeResult(completed);
    }

    async continue(): Promise<StepResult> {
        let result: StepResult;
        do {
            result = await this.step();
            if (this.state.isPaused) { break; }
        } while (!result.completed);
        return result;
    }

    async stepOver(): Promise<StepResult> {
        const startLine = this.state.currentLine;
        let result: StepResult;
        do {
            result = await this.step();
            if (result.completed || this.state.currentLine > startLine) { break; }
        } while (true);
        return result;
    }

    // ── Breakpoints ───────────────────────────────────────────────────────────

    setBreakpoint(line: number, condition?: string): Breakpoint {
        // Update existing on same line
        const existing = this.state.breakpoints.find(b => b.line === line);
        if (existing) {
            existing.condition = condition;
            existing.enabled = true;
            return existing;
        }
        const bp: Breakpoint = {
            id: Date.now(),
            line,
            condition,
            enabled: true,
            hitCount: 0
        };
        this.state.breakpoints.push(bp);
        return bp;
    }

    removeBreakpoint(id: number): boolean {
        const idx = this.state.breakpoints.findIndex(b => b.id === id);
        if (idx >= 0) { this.state.breakpoints.splice(idx, 1); return true; }
        return false;
    }

    clearBreakpoints(): void {
        this.state.breakpoints = [];
    }

    toggleBreakpoint(id: number): boolean {
        const bp = this.state.breakpoints.find(b => b.id === id);
        if (bp) { bp.enabled = !bp.enabled; return true; }
        return false;
    }

    checkAndHitBreakpoint(): boolean {
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

    // ── Watch expressions ─────────────────────────────────────────────────────

    addWatch(expression: string): WatchExpression {
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

    // ── Accessors ─────────────────────────────────────────────────────────────

    getVariable(name: string): TrackedVariable | undefined {
        return this.state.variables.get(name);
    }

    getAllVariables(): Map<string, TrackedVariable> {
        return new Map(this.state.variables);
    }

    getBreakpoints(): Breakpoint[] { return [...this.state.breakpoints]; }
    getWatches(): WatchExpression[] { return [...this.state.watches]; }
    getOutput(): string { return this.state.output; }
    getCurrentLine(): number { return this.state.currentLine; }
    getTemplatePath(): string { return this.state.templatePath; }

    reset(): void {
        this.state = this.createInitialState();
        this.parsedTemplate = null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private trackVariable(name: string, value: any, scope: string): void {
        const existing = this.state.variables.get(name);
        const variable: TrackedVariable = {
            name,
            value,
            type: this.typeOf(value),
            scope,
            history: existing ? [...existing.history] : []
        };
        if (existing && existing.value !== value) {
            variable.history.push({
                line: this.state.currentLine,
                oldValue: existing.value,
                newValue: value
            });
        }
        this.state.variables.set(name, variable);
    }

    private buildContext(): Record<string, any> {
        const ctx: Record<string, any> = {};
        for (const [name, v] of this.state.variables) {
            ctx[name] = v.value;
        }
        return ctx;
    }

    private async syncVariablesAfterTag(
        tagName: string,
        raw: string,
        _prevContext: Record<string, any>
    ): Promise<void> {
        // Detect assign: {% assign varName = ... %}
        const assignMatch = raw.match(/\{%-?\s*assign\s+(\w+)\s*=/);
        if (assignMatch) {
            const varName = assignMatch[1];
            const value = await this.parser.evaluateExpression(varName, this.buildContext());
            if (value !== undefined) {
                this.trackVariable(varName, value, 'local');
            }
        }

        // Detect capture: {% capture varName %} ... {% endcapture %}
        const captureMatch = raw.match(/\{%-?\s*capture\s+(\w+)\s*-?%\}([\s\S]*?)\{%-?\s*endcapture\s*-?%\}/);
        if (captureMatch) {
            const varName = captureMatch[1];
            const rendered = await this.liquid.parseAndRender(captureMatch[2], this.buildContext());
            this.trackVariable(varName, rendered.trim(), 'local');
        }
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
        return {
            output: this.state.output,
            variables: this.getAllVariables(),
            currentLine: this.state.currentLine,
            currentElement: this.state.currentElement,
            completed
        };
    }

    private typeOf(value: any): string {
        if (value === null) { return 'null'; }
        if (Array.isArray(value)) { return 'array'; }
        return typeof value;
    }
}
