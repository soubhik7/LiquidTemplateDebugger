import * as vscode from 'vscode';
import { LiquidDebugSession } from './debugAdapter';

export function activate(context: vscode.ExtensionContext) {
    // Register the inline debug adapter (no external process needed)
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory(
            'liquid',
            new InlineDebugAdapterFactory()
        )
    );

    // "Liquid: Start Debugging" command — triggered from right-click or command palette
    context.subscriptions.push(
        vscode.commands.registerCommand('liquid-debugger.start', async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage('Open a .liquid file first.');
                return;
            }
            if (!editor.document.fileName.endsWith('.liquid')) {
                vscode.window.showErrorMessage('Active file is not a Liquid template (.liquid).');
                return;
            }

            const templatePath = editor.document.uri.fsPath;

            // Ask the user to pick a data file
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'Data files': ['json', 'xml', 'csv', 'txt'] },
                title: 'Select Input Data File'
            });

            if (!picked || picked.length === 0) {
                vscode.window.showWarningMessage('No data file selected — debugging cancelled.');
                return;
            }

            const dataPath = picked[0].fsPath;
            const format   = extensionToFormat(dataPath);

            await vscode.debug.startDebugging(undefined, {
                type:        'liquid',
                name:        'Debug Liquid Template',
                request:     'launch',
                template:    templatePath,
                data:        dataPath,
                format:      format,
                stopOnEntry: true
            });
        })
    );

    // Debug configuration provider — handles F5 with no launch.json
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            'liquid',
            new LiquidConfigurationProvider()
        )
    );
}

export function deactivate() { /* nothing to tear down */ }

// ── Inline adapter factory ────────────────────────────────────────────────────

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(
        _session: vscode.DebugSession,
        _executable: vscode.DebugAdapterExecutable | undefined
    ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new LiquidDebugSession());
    }
}

// ── Configuration provider (F5 without launch.json) ──────────────────────────

class LiquidConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(
        _folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        _token?: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DebugConfiguration> {
        // Only auto-fill when there's no existing config
        if (!config.type && !config.request) {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'liquid') {
                config.type        = 'liquid';
                config.name        = 'Debug Liquid Template';
                config.request     = 'launch';
                config.template    = '${file}';
                config.data        = '${workspaceFolder}/data.json';
                config.format      = 'json';
                config.stopOnEntry = true;
            }
        }

        if (!config.template) {
            return vscode.window.showInformationMessage('No template file specified.').then(() => undefined);
        }

        return config;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extensionToFormat(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    switch (ext) {
        case 'json': return 'json';
        case 'xml':  return 'xml';
        case 'csv':  return 'csv';
        case 'txt':  return 'text';
        default:     return 'json';
    }
}
