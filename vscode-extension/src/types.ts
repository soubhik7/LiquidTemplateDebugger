export interface DebugState {
    templatePath: string;
    dataPath: string;
    format: string;
    currentLine: number;
    currentElement: number;
    variables: Map<string, TrackedVariable>;
    output: string;
    breakpoints: Breakpoint[];
    watches: WatchExpression[];
    scopeStack: Scope[];
    isRunning: boolean;
    isPaused: boolean;
}

export interface TrackedVariable {
    name: string;
    value: any;
    type: string;
    origin: VariableOrigin;
    scope: string;
    history: VariableChange[];
}

export interface VariableOrigin {
    source: 'input' | 'assign' | 'for' | 'capture';
    path: string;
    line?: number;
}

export interface VariableChange {
    line: number;
    oldValue: any;
    newValue: any;
    operation: string;
}

export interface Breakpoint {
    id: number;
    line: number;
    condition?: string;
    enabled: boolean;
    hitCount: number;
}

export interface WatchExpression {
    id: number;
    expression: string;
    value: any;
    error?: string;
}

export interface Scope {
    name: string;
    variables: Map<string, any>;
    parent?: Scope;
}

export interface TemplateElement {
    type: 'literal' | 'output' | 'tag';
    line: number;
    content: string;
    raw: string;
}

export interface ParsedTemplate {
    elements: TemplateElement[];
    lines: string[];
    totalLines: number;
}

export interface InputData {
    raw: any;
    format: string;
    wrapped: any;
}

export interface StepResult {
    output: string;
    variables: Map<string, TrackedVariable>;
    currentLine: number;
    currentElement: number;
    completed: boolean;
}

export interface EvaluationResult {
    value: any;
    type: string;
    error?: string;
}

// Made with Bob
