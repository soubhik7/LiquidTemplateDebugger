import {
    LoggingDebugSession,
    InitializedEvent,
    TerminatedEvent,
    StoppedEvent,
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
    data: string;
    format?: string;
    stopOnEntry?: boolean;
}

export class LiquidDebugSession extends LoggingDebugSession {
    private static readonly THREAD_ID = 1;
    private engine: DebugEngine;
    private variableHandles = new Handles<string>();

    constructor() {
        super();
        this.engine = new DebugEngine();
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }

    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        _args: DebugProtocol.InitializeRequestArguments
    ): void {
        response.body = {
            supportsConfigurationDoneRequest: true,
            supportsEvaluateForHovers: true,
            supportsConditionalBreakpoints: true,
            supportsRestartRequest: true,
            supportTerminateDebuggee: true,
            supportsTerminateRequest: true,
            supportsStepBack: false,
            supportsSetVariable: false,
            supportsGotoTargetsRequest: false,
            supportsCompletionsRequest: false
        };
        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    protected configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        _args: DebugProtocol.ConfigurationDoneArguments
    ): void {
        super.configurationDoneRequest(response, _args);
    }

    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: LaunchRequestArguments
    ): Promise<void> {
        try {
            if (!args.template) {
                this.sendErrorResponse(response, { id: 1001, format: 'template path is required', showUser: true });
                return;
            }
            if (!args.data) {
                this.sendErrorResponse(response, { id: 1002, format: 'data file path is required', showUser: true });
                return;
            }

            await this.engine.initialize(args.template, args.data, args.format || 'json');

            this.sendResponse(response);

            if (args.stopOnEntry !== false) {
                this.sendEvent(new StoppedEvent('entry', LiquidDebugSession.THREAD_ID));
            } else {
                await this.runToEnd(response);
            }
        } catch (err: any) {
            this.sendErrorResponse(response, {
                id: 1003,
                format: `Launch failed: ${err.message}`,
                showUser: true
            });
        }
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        response.body = { threads: [new Thread(LiquidDebugSession.THREAD_ID, 'Liquid Template')] };
        this.sendResponse(response);
    }

    protected stackTraceRequest(
        response: DebugProtocol.StackTraceResponse,
        _args: DebugProtocol.StackTraceArguments
    ): void {
        const line = this.engine.getCurrentLine();
        const templatePath = this.engine.getTemplatePath();
        const frame = new StackFrame(
            0,
            'Template Execution',
            new Source(path.basename(templatePath), templatePath),
            line,
            1
        );
        response.body = { stackFrames: [frame], totalFrames: 1 };
        this.sendResponse(response);
    }

    protected scopesRequest(
        response: DebugProtocol.ScopesResponse,
        _args: DebugProtocol.ScopesArguments
    ): void {
        response.body = {
            scopes: [
                new Scope('Variables', this.variableHandles.create('variables'), false),
                new Scope('Output',    this.variableHandles.create('output'),    false)
            ]
        };
        this.sendResponse(response);
    }

    protected variablesRequest(
        response: DebugProtocol.VariablesResponse,
        args: DebugProtocol.VariablesArguments
    ): void {
        const id = this.variableHandles.get(args.variablesReference);
        const variables: DebugProtocol.Variable[] = [];

        if (id === 'variables') {
            for (const [name, v] of this.engine.getAllVariables()) {
                variables.push({
                    name,
                    value: this.fmt(v.value),
                    type: v.type,
                    variablesReference: this.isObject(v.value)
                        ? this.variableHandles.create(`var:${name}`)
                        : 0
                });
            }
        } else if (id === 'output') {
            variables.push({
                name: 'output',
                value: this.engine.getOutput() || '(empty)',
                type: 'string',
                variablesReference: 0
            });
        } else if (id?.startsWith('var:')) {
            const varName = id.substring(4);
            const v = this.engine.getVariable(varName);
            if (v && typeof v.value === 'object' && v.value !== null) {
                for (const [k, val] of Object.entries(v.value as object)) {
                    variables.push({
                        name: k,
                        value: this.fmt(val),
                        type: typeof val,
                        variablesReference: this.isObject(val)
                            ? this.variableHandles.create(`var:${varName}.${k}`)
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
        this.engine.clearBreakpoints();
        const breakpoints: DebugProtocol.Breakpoint[] = [];
        for (const src of (args.breakpoints || [])) {
            const bp = this.engine.setBreakpoint(src.line, src.condition);
            breakpoints.push(new Breakpoint(true, bp.line));
        }
        response.body = { breakpoints };
        this.sendResponse(response);
    }

    protected async continueRequest(
        response: DebugProtocol.ContinueResponse,
        _args: DebugProtocol.ContinueArguments
    ): Promise<void> {
        try {
            let result = await this.engine.step();
            while (!result.completed) {
                if (this.engine.checkAndHitBreakpoint()) {
                    this.sendEvent(new StoppedEvent('breakpoint', LiquidDebugSession.THREAD_ID));
                    response.body = { allThreadsContinued: true };
                    this.sendResponse(response);
                    return;
                }
                result = await this.engine.step();
            }
            this.sendEvent(new OutputEvent(result.output, 'stdout'));
            this.sendEvent(new TerminatedEvent());
            response.body = { allThreadsContinued: true };
            this.sendResponse(response);
        } catch (err: any) {
            this.sendErrorResponse(response, { id: 2001, format: err.message, showUser: true });
        }
    }

    protected async nextRequest(
        response: DebugProtocol.NextResponse,
        _args: DebugProtocol.NextArguments
    ): Promise<void> {
        try {
            const result = await this.engine.step();
            if (result.completed) {
                this.sendEvent(new OutputEvent(result.output, 'stdout'));
                this.sendEvent(new TerminatedEvent());
            } else {
                this.engine.checkAndHitBreakpoint();
                this.sendEvent(new StoppedEvent('step', LiquidDebugSession.THREAD_ID));
            }
            this.sendResponse(response);
        } catch (err: any) {
            this.sendErrorResponse(response, { id: 2002, format: err.message, showUser: true });
        }
    }

    protected async evaluateRequest(
        response: DebugProtocol.EvaluateResponse,
        args: DebugProtocol.EvaluateArguments
    ): Promise<void> {
        try {
            const value = await this.engine.evaluateExpression(args.expression);
            response.body = { result: this.fmt(value), variablesReference: 0 };
            this.sendResponse(response);
        } catch (err: any) {
            this.sendErrorResponse(response, { id: 2003, format: `Eval error: ${err.message}`, showUser: true });
        }
    }

    protected disconnectRequest(
        response: DebugProtocol.DisconnectResponse,
        _args: DebugProtocol.DisconnectArguments
    ): void {
        this.engine.reset();
        this.sendResponse(response);
    }

    private async runToEnd(response: DebugProtocol.LaunchResponse): Promise<void> {
        const result = await this.engine.continue();
        this.sendEvent(new OutputEvent(result.output, 'stdout'));
        this.sendEvent(new TerminatedEvent());
    }

    private fmt(value: any): string {
        if (value === null || value === undefined) { return 'null'; }
        if (typeof value === 'string') { return `"${value}"`; }
        if (Array.isArray(value)) { return `Array[${value.length}]`; }
        if (typeof value === 'object') { return `{${Object.keys(value).join(', ')}}`; }
        return String(value);
    }

    private isObject(value: any): boolean {
        return value !== null && typeof value === 'object';
    }
}
