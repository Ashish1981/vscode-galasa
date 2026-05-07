import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';

export function registerStreamsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.streams.get', streamsGet),
        vscode.commands.registerCommand('galasa.streams.delete', streamsDelete)
    );
}

export async function streamsGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Stream name (leave blank for all)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(['streams', 'get']));
    if (name && name.trim().length > 0) {
        args.push('--name', name.trim());
    }
    const result = await runGalasaCli(args);
    logCliResult('streams get', result);
}

export async function streamsDelete(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Stream name to delete' });
    if (!name) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete stream '${name}'?`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['streams', 'delete', '--name', name]));
    const result = await runGalasaCli(args);
    logCliResult(`streams delete ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Stream ${name} deleted.`);
    } else {
        vscode.window.showErrorMessage(`Delete failed: ${result.stderr || result.stdout}`);
    }
}
