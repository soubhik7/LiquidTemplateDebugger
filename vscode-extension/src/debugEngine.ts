import { Liquid } from 'liquidjs';
import { TemplateParser } from './templateParser';
import { FormatConverter } from './formatConverter';
import {
    DebugState,
    TrackedVariable,
    Breakpoint,
    WatchExpression,
    StepResult,
    VariableOrigin,
    Scope
} from './types';
import * as fs from 'fs';

export class DebugEngine {
    private parser: TemplateParser;
    private converter: FormatConverter;
    private liquid: Liquid;
    private state: DebugState;

    constructor() {
        this.parser = new TemplateParser();
        this.converter = new FormatConverter();
        this.liquid = new Liquid({
            strictFilters: false,
            strictVariables: false,
            lenientIf: true
        });

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
            scopeStack: [],
            isRunning: false,
            isPaused: false
        };
    }

    async initialize(templatePath: string, dataPath: string, format: string): Promise<void> {
        this.state.templatePath = templatePath;
        this.state.dataPath = dataPath;
        this.state.format = format;

        // Load and parse data
        const dataContent = fs.readFileSync(dataPath, 'utf-8');
        const rawData = this.converter.loadData(dataContent, format);
        const wrappedData = this.converter.wrapForLogicApps(rawData);

        // Initialize variables with input data
        this.trackVariable('content', wrappedData, {
            source: 'input',
            path: 'content'
        }, 'global');

        // Parse template
        await this.parser.parseTemplate(templatePath);

        this.state.currentLine = 1;
        this.state.currentElement = 0;
        this.state.isRunning = true;
        this.state.isPaused = true;
    }

    async step(): Promise<StepResult> {
        if (!this.state.isRunning) {
            throw new Error('Debug session not running');
        }

        const parsed = await this.parser.parseTemplate(this.state.templatePath);
        
        if (this.state.currentElement >= parsed.elements.length) {
            return {
                output: this.state.output,
                variables: this.state.variables,
                currentLine: this.state.currentLine,
                currentElement: this.state.currentElement,
                completed: true
            };
        }

        const element = parsed.elements[this.state.currentElement];
        this.state.currentLine = element.line;

        // Check breakpoints
        if (await this.shouldBreakAt(element.line)) {
            this.state.isPaused = true;
            return {
                output: this.state.output,
                variables: this.state.variables,
                currentLine: this.state.currentLine,
                currentElement: this.state.currentElement,
                completed: false
            };
        }

        // Execute element
        const context = this.buildContext();
        let elementOutput = '';

        try {
            if (element.type === 'output') {
                elementOutput = await this.liquid.parseAndRender(`{{ ${element.content} }}`, context);
            } else if (element.type === 'tag') {
                elementOutput = await this.liquid.parseAndRender(element.raw, context);
                this.updateVariablesFromTag(element.content, context);
            } else {
                elementOutput = element.content;
            }

            this.state.output += elementOutput;
        } catch (error: any) {
            throw new Error(`Execution error at line ${element.line}: ${error.message}`);
        }

        this.state.currentElement++;
        this.updateWatches();

        return {
            output: this.state.output,
            variables: this.state.variables,
            currentLine: this.state.currentLine,
            currentElement: this.state.currentElement,
            completed: this.state.currentElement >= parsed.elements.length
        };
    }

    async continue(): Promise<StepResult> {
        let result: StepResult;
        do {
            result = await this.step();
            if (this.state.isPaused) {
                break;
            }
        } while (!result.completed);
        return result;
    }

    async stepOver(): Promise<StepResult> {
        const startLine = this.state.currentLine;
        let result: StepResult;
        
        do {
            result = await this.step();
            if (result.completed || this.state.currentLine > startLine) {
                break;
            }
        } while (true);
        
        return result;
    }

    setBreakpoint(line: number, condition?: string): Breakpoint {
        const id = this.state.breakpoints.length + 1;
        const breakpoint: Breakpoint = {
            id,
            line,
            condition,
            enabled: true,
            hitCount: 0
        };
        this.state.breakpoints.push(breakpoint);
        return breakpoint;
    }

    removeBreakpoint(id: number): boolean {
        const index = this.state.breakpoints.findIndex(bp => bp.id === id);
        if (index >= 0) {
            this.state.breakpoints.splice(index, 1);
            return true;
        }
        return false;
    }

    toggleBreakpoint(id: number): boolean {
        const bp = this.state.breakpoints.find(b => b.id === id);
        if (bp) {
            bp.enabled = !bp.enabled;
            return true;
        }
        return false;
    }

    addWatch(expression: string): WatchExpression {
        const id = this.state.watches.length + 1;
        const watch: WatchExpression = {
            id,
            expression,
            value: null
        };
        this.state.watches.push(watch);
        this.updateWatch(watch);
        return watch;
    }

    removeWatch(id: number): boolean {
        const index = this.state.watches.findIndex(w => w.id === id);
        if (index >= 0) {
            this.state.watches.splice(index, 1);
            return true;
        }
        return false;
    }

    async evaluateExpression(expression: string): Promise<any> {
        const context = this.buildContext();
        return await this.parser.evaluateExpression(expression, context);
    }

    getVariable(name: string): TrackedVariable | undefined {
        return this.state.variables.get(name);
    }

    getAllVariables(): Map<string, TrackedVariable> {
        return new Map(this.state.variables);
    }

    getBreakpoints(): Breakpoint[] {
        return [...this.state.breakpoints];
    }

    getWatches(): WatchExpression[] {
        return [...this.state.watches];
    }

    getOutput(): string {
        return this.state.output;
    }

    getCurrentLine(): number {
        return this.state.currentLine;
    }

    reset(): void {
        this.state = this.createInitialState();
    }

    private trackVariable(
        name: string,
        value: any,
        origin: VariableOrigin,
        scope: string
    ): void {
        const existing = this.state.variables.get(name);
        const variable: TrackedVariable = {
            name,
            value,
            type: this.getType(value),
            origin,
            scope,
            history: existing ? [...existing.history] : []
        };

        if (existing && existing.value !== value) {
            variable.history.push({
                line: this.state.currentLine,
                oldValue: existing.value,
                newValue: value,
                operation: 'assign'
            });
        }

        this.state.variables.set(name, variable);
    }

    private buildContext(): any {
        const context: any = {};
        for (const [name, variable] of this.state.variables) {
            context[name] = variable.value;
        }
        return context;
    }

    private updateVariablesFromTag(tagContent: string, context: any): void {
        const assignMatch = tagContent.match(/assign\s+(\w+)\s*=\s*(.+)/);
        if (assignMatch) {
            const varName = assignMatch[1];
            const value = context[varName];
            this.trackVariable(varName, value, {
                source: 'assign',
                path: varName,
                line: this.state.currentLine
            }, 'local');
        }

        const forMatch = tagContent.match(/for\s+(\w+)\s+in\s+(.+)/);
        if (forMatch) {
            const varName = forMatch[1];
            const value = context[varName];
            if (value !== undefined) {
                this.trackVariable(varName, value, {
                    source: 'for',
                    path: varName,
                    line: this.state.currentLine
                }, 'loop');
            }
        }
    }

    private async shouldBreakAt(line: number): Promise<boolean> {
        for (const bp of this.state.breakpoints) {
            if (bp.enabled && bp.line === line) {
                if (!bp.condition) {
                    bp.hitCount++;
                    return true;
                }
                
                try {
                    const context = this.buildContext();
                    const result = await this.parser.evaluateExpression(bp.condition, context);
                    if (result) {
                        bp.hitCount++;
                        return true;
                    }
                } catch {
                    // Condition evaluation failed, don't break
                }
            }
        }
        return false;
    }

    private updateWatches(): void {
        for (const watch of this.state.watches) {
            this.updateWatch(watch);
        }
    }

    private updateWatch(watch: WatchExpression): void {
        try {
            const context = this.buildContext();
            watch.value = this.parser.evaluateExpression(watch.expression, context);
            watch.error = undefined;
        } catch (error: any) {
            watch.value = null;
            watch.error = error.message;
        }
    }

    private getType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }
}

// Made with Bob
