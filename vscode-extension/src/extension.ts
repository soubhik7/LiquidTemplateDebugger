import * as vscode from 'vscode';
import { LiquidDebugSession } from './debugAdapter';
import { DebuggerPanel } from './debuggerPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Liquid Template Debugger extension activated');

    // Register debug adapter factory
    const factory = new LiquidDebugAdapterFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('liquid', factory)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('liquid-debugger.start', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            const templatePath = editor.document.uri.fsPath;
            if (!templatePath.endsWith('.liquid')) {
                vscode.window.showErrorMessage('Active file is not a Liquid template');
                return;
            }

            // Prompt for data file
            const dataUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Data Files': ['json', 'xml', 'csv', 'txt']
                },
                title: 'Select Input Data File'
            });

            if (!dataUri || dataUri.length === 0) {
                vscode.window.showErrorMessage('No data file selected');
                return;
            }

            const dataPath = dataUri[0].fsPath;
            const format = getFormatFromExtension(dataPath);

            // Start debugging
            await vscode.debug.startDebugging(undefined, {
                type: 'liquid',
                name: 'Debug Liquid Template',
                request: 'launch',
                template: templatePath,
                data: dataPath,
                format: format,
                stopOnEntry: true
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('liquid-debugger.loadData', async () => {
            const dataUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Data Files': ['json', 'xml', 'csv', 'txt']
                },
                title: 'Select Input Data File'
            });

            if (dataUri && dataUri.length > 0) {
                vscode.window.showInformationMessage(`Loaded data: ${dataUri[0].fsPath}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('liquid-debugger.showDebugger', () => {
            DebuggerPanel.createOrShow(context.extensionUri);
        })
    );

    // Register configuration provider
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('liquid', new LiquidConfigurationProvider())
    );
}

export function deactivate() {
    console.log('Liquid Template Debugger extension deactivated');
}

class LiquidDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(
        session: vscode.DebugSession,
        executable: vscode.DebugAdapterExecutable | undefined
    ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new LiquidDebugSession());
    }
}

class LiquidConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DebugConfiguration> {
        // If launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'liquid') {
                config.type = 'liquid';
                config.name = 'Debug Liquid Template';
                config.request = 'launch';
                config.template = '${file}';
                config.stopOnEntry = true;
            }
        }

        if (!config.template) {
            return vscode.window.showInformationMessage('Cannot find a template to debug').then(_ => {
                return undefined;
            });
        }

        return config;
    }
}

function getFormatFromExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'json': return 'json';
        case 'xml': return 'xml';
        case 'csv': return 'csv';
        case 'txt': return 'text';
        default: return 'json';
    }
}

// Made with Bob
