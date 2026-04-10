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
    scope: string;   // 'global' | 'local' | 'loop' | 'capture'
    history: VariableChange[];
    transformations?: any[];
    loopItems?: any[];
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
    lastChunk: string;
}

// ─── Snapshot sent to WebView ──────────────────────────────────────────────

export interface SnapshotVariable {
    name: string;
    displayValue: string;
    rawValue: any;
    type: string;
    scope: string;
    historyCount: number;
    lastChange?: { line: number; oldValue: string };
}

export interface SnapshotWatch {
    id: number;
    expression: string;
    value: string;
    error?: string;
}

export interface SnapshotBreakpoint {
    id: number;
    line: number;
    condition?: string;
    enabled: boolean;
    hitCount: number;
}

export interface DebugSnapshot {
    // Template
    templatePath: string;
    templateLines: string[];
    totalElements: number;
    currentElement: number;
    currentLine: number;
    scopeStack: string[];
    // Data
    inputData: string;
    inputFormat: string;
    // Output
    output: string;
    lastChunk: string;
    // State
    variables: SnapshotVariable[];
    watches: SnapshotWatch[];
    breakpoints: SnapshotBreakpoint[];
    completed: boolean;
}

export interface ForLoopState {
    variableName: string;
    collectionExpression: string;
    items: any[];
    currentIndex: number;
    loopStartElementIndex: number;
    loopEndElementIndex: number;
    executionStackDepthAtStart: number;
    caseValueStackDepthAtStart: number;
    scopeStackDepthAtStart: number;
}

export interface ExecutionStackEntry {
    executing: boolean;
    branchTaken: boolean;
}
