export interface VariableChange {
  line: number;
  oldValue?: unknown;
  newValue?: unknown;
  before?: unknown;
  after?: unknown;
}

export interface Transformation {
  type?: string;
  name?: string;
  operator?: string;
  baseExpr?: string;
  rightVar?: string;
  before?: unknown;
  after?: unknown;
  rightValue?: unknown;
  args?: string;
}

export interface VariableOrigin {
  sourcePath?: string;
  sourceFormat?: string;
}

export interface TrackedVariable {
  name: string;
  currentValue?: string;
  rawValue?: unknown;
  typeName?: string;
  scopeTag?: string;
  origin?: VariableOrigin;
  transformations?: Transformation[];
  history?: VariableChange[];
}

export interface Breakpoint {
  id: number;
  line: number;
  condition?: string;
  isEnabled: boolean;
  hitCount: number;
}

export interface WatchExpression {
  id: number;
  expression: string;
  displayExpression?: string;
  currentValue?: string;
  rawValue?: unknown;
  typeName?: string;
  hasChanged?: boolean;
  transformations?: Transformation[];
}

export interface TemplateElement {
  type: 'literal' | 'output' | 'tag';
  lineNumber: number;
  content: string;
  raw: string;
}

export interface DebugStateSnapshot {
  currentLine: number;
  currentElementIndex: number;
  isComplete: boolean;
  outputSoFar: string;
  lastOutputChunk?: string;
  variables: TrackedVariable[];
  scopeStack: string[];
}

export interface WebUIState {
  isLoaded: boolean;
  templateSource?: string;
  elements?: TemplateElement[];
  dataContent?: string;
  dataFormat?: string;
  breakpoints?: Breakpoint[];
  watches?: WatchExpression[];
  state?: DebugStateSnapshot;
  error?: string;
}

export type Theme =
  | 'dark'
  | 'light'
  | 'dark-warm'
  | 'light-warm'
  | 'dark-cool'
  | 'light-cool'
  | 'midnight'
  | 'glass-dark'
  | 'glass-light';

export type AccentColor = string;

export type InspectorTab = 'watches' | 'breakpoints' | 'eval' | 'problems';
