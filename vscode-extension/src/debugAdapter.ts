import {
    LoggingDebugSession,
    InitializedEvent,
    TerminatedEvent,
    StoppedEvent,
    BreakpointEvent,
    OutputEvent,
    Thread,
    StackFrame,
    Scope,
    Source,
    Handles,
    Breakpoint
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugEngine } from './debugEngine';
import * as path from 'path';

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    template: string;
    data?: string;
    format?: string;
    stopOnEntry?: boolean;
}

export class LiquidDebugSession extends LoggingDebugSession {
    private static THREAD_ID = 1;
    private engine: DebugEngine;
    private variableHandles = new Handles<string>();
    private configurationDone = false;

    constructor() {
        super();
        this.engine = new DebugEngine();
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }

    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ): void {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsModulesRequest = false;
        response.body.supportsRestartRequest = true;
        response.body.supportsExceptionOptions = false;
        response.body.supportsValueFormattingOptions = true;
        response.body.supportsExceptionInfoRequest = false;
        response.body.supportTerminateDebuggee = true;
        response.body.supportsDelayedStackTraceLoading = false;
        response.body.supportsLoadedSourcesRequest = false;
        response.body.supportsLogPoints = false;
        response.body.supportsTerminateThreadsRequest = false;
        response.body.supportsSetExpression = false;
        response.body.supportsTerminateRequest = true;
        response.body.supportsDataBreakpoints = false;
        response.body.supportsReadMemoryRequest = false;
        response.body.supportsDisassembleRequest = false;
        response.body.supportsCancelRequest = false;
        response.body.supportsBreakpointLocationsRequest = false;
        response.body.supportsClipboardContext = false;
        response.body.supportsConditionalBreakpoints = true;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsFunctionBreakpoints = false;

        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    protected configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments
    ): void {
        super.configurationDoneRequest(response, args);
        this.configurationDone = true;
    }

    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: LaunchRequestArguments
    ): Promise<void> {
        try {
            const templatePath = args.template;
            const dataPath = args.data || '';
            const format = args.format || 'json';

            if (!dataPath) {
                this.sendErrorResponse(response, {
                    id: 1001,
                    format: 'Data file path is required',
                    showUser: true
                });
                return;
            }

            await this.engine.initialize(templatePath, dataPath, format);

            this.sendResponse(response);

            if (args.stopOnEntry) {
                this.sendEvent(new StoppedEvent('entry', LiquidDebugSession.THREAD_ID));
            } else {
                this.continueRequest(
                    <DebugProtocol.ContinueResponse>{ command: 'continue' },
                    { threadId: LiquidDebugSession.THREAD_ID }
                );
            }
        } catch (error: any) {
            this.sendErrorResponse(response, {
                id: 1002,
                format: `Failed to launch: ${error.message}`,
                showUser: true
            });
        }
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        response.body = {
            threads: [new Thread(LiquidDebugSession.THREAD_ID, 'Liquid Template')]
        };
        this.sendResponse(response);
    }

    protected stackTraceRequest(
        response: DebugProtocol.StackTraceResponse,
        args: DebugProtocol.StackTraceArguments
    ): void {
        const currentLine = this.engine.getCurrentLine();
        const templatePath = (this.engine as any).state.templatePath;

        const stackFrame = new StackFrame(
            0,
            'Template Execution',
            new Source(path.basename(templatePath), templatePath),
            currentLine,
            1
        );

        response.body = {
            stackFrames: [stackFrame],
            totalFrames: 1
        };
        this.sendResponse(response);
    }

    protected scopesRequest(
        response: DebugProtocol.ScopesResponse,
        args: DebugProtocol.ScopesArguments
    ): void {
        const scopes: DebugProtocol.Scope[] = [
            new Scope('Variables', this.variableHandles.create('variables'), false),
            new Scope('Output', this.variableHandles.create('output'), false)
        ];

        response.body = { scopes };
        this.sendResponse(response);
    }

    protected variablesRequest(
        response: DebugProtocol.VariablesResponse,
        args: DebugProtocol.VariablesArguments
    ): void {
        const id = this.variableHandles.get(args.variablesReference);
        const variables: DebugProtocol.Variable[] = [];

        if (id === 'variables') {
            const allVars = this.engine.getAllVariables();
            for (const [name, trackedVar] of allVars) {
                variables.push({
                    name,
                    value: this.formatValue(trackedVar.value),
                    type: trackedVar.type,
                    variablesReference: this.isExpandable(trackedVar.value)
                        ? this.variableHandles.create(`var:${name}`)
                        : 0
                });
            }
        } else if (id === 'output') {
            const output = this.engine.getOutput();
            variables.push({
                name: 'Current Output',
                value: output || '(empty)',
                type: 'string',
                variablesReference: 0
            });
        } else if (id?.startsWith('var:')) {
            const varName = id.substring(4);
            const variable = this.engine.getVariable(varName);
            if (variable && typeof variable.value === 'object') {
                for (const [key, value] of Object.entries(variable.value)) {
                    variables.push({
                        name: key,
                        value: this.formatValue(value),
                        type: typeof value,
                        variablesReference: this.isExpandable(value)
                            ? this.variableHandles.create(`var:${varName}.${key}`)
                            : 0
                    });
                }
            }
        }

        response.body = { variables };
        this.sendResponse(response);
    }

    protected async setBreakPointsRequest(
        response: DebugProtocol.SetBreakpointsResponse,
        args: DebugProtocol.SetBreakpointsArguments
    ): Promise<void> {
        const breakpoints: DebugProtocol.Breakpoint[] = [];

        if (args.breakpoints) {
            for (const bp of args.breakpoints) {
                const breakpoint = this.engine.setBreakpoint(bp.line, bp.condition);
                breakpoints.push({
                    id: breakpoint.id,
                    verified: true,
                    line: breakpoint.line
                });
            }
        }

        response.body = { breakpoints };
        this.sendResponse(response);
    }

    protected async continueRequest(
        response: DebugProtocol.ContinueResponse,
        args: DebugProtocol.ContinueArguments
    ): Promise<void> {
        try {
            const result = await this.engine.continue();
            
            if (result.completed) {
                this.sendEvent(new OutputEvent(result.output, 'stdout'));
                this.sendEvent(new TerminatedEvent());
            } else {
                this.sendEvent(new StoppedEvent('breakpoint', LiquidDebugSession.THREAD_ID));
            }

            response.body = { allThreadsContinued: true };
            this.sendResponse(response);
        } catch (error: any) {
            this.sendErrorResponse(response, {
                id: 1003,
                format: error.message,
                showUser: true
            });
        }
    }

    protected async nextRequest(
        response: DebugProtocol.NextResponse,
        args: DebugProtocol.NextArguments
    ): Promise<void> {
        try {
            const result = await this.engine.step();
            
            if (result.completed) {
                this.sendEvent(new OutputEvent(result.output, 'stdout'));
                this.sendEvent(new TerminatedEvent());
            } else {
                this.sendEvent(new StoppedEvent('step', LiquidDebugSession.THREAD_ID));
            }

            this.sendResponse(response);
        } catch (error: any) {
            this.sendErrorResponse(response, {
                id: 1004,
                format: error.message,
                showUser: true
            });
        }
    }

    protected async evaluateRequest(
        response: DebugProtocol.EvaluateResponse,
        args: DebugProtocol.EvaluateArguments
    ): Promise<void> {
        try {
            const result = await this.engine.evaluateExpression(args.expression);
            response.body = {
                result: this.formatValue(result),
                variablesReference: 0
            };
            this.sendResponse(response);
        } catch (error: any) {
            this.sendErrorResponse(response, {
                id: 1005,
                format: `Evaluation error: ${error.message}`,
                showUser: true
            });
        }
    }

    protected disconnectRequest(
        response: DebugProtocol.DisconnectResponse,
        args: DebugProtocol.DisconnectArguments
    ): void {
        this.engine.reset();
        this.sendResponse(response);
    }

    private formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return `Array(${value.length})`;
            }
            return `Object {${Object.keys(value).length} keys}`;
        }
        return String(value);
    }

    private isExpandable(value: any): boolean {
        return value !== null && typeof value === 'object';
    }
}

// Made with Bob
