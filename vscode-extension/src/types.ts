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
    isRunning: boolean;
    isPaused: boolean;
}

export interface TrackedVariable {
    name: string;
    value: any;
    type: string;
    scope: string;
    history: VariableChange[];
}

export interface VariableChange {
    line: number;
    oldValue: any;
    newValue: any;
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

export interface StepResult {
    output: string;
    variables: Map<string, TrackedVariable>;
    currentLine: number;
    currentElement: number;
    completed: boolean;
}
