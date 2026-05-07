import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';

export function registerResourcesCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.resources.apply', resourcesApply),
        vscode.commands.registerCommand('galasa.resources.create', resourcesCreate),
        vscode.commands.registerCommand('galasa.resources.update', resourcesUpdate),
        vscode.commands.registerCommand('galasa.resources.delete', resourcesDelete)
    );
}

async function pickResourceFile(): Promise<string | undefined> {
    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'YAML files': ['yaml', 'yml'] },
        openLabel: 'Choose resources YAML'
    });
    return uris && uris.length > 0 ? uris[0].fsPath : undefined;
}

async function runResourceCommand(action: 'apply' | 'create' | 'update' | 'delete'): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const file = await pickResourceFile();
    if (!file) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['resources', action, '--file', file]));
    const result = await runGalasaCli(args);
    logCliResult(`resources ${action}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Resources ${action} succeeded.`);
    } else {
        vscode.window.showErrorMessage(`Resources ${action} failed: ${result.stderr || result.stdout}`);
    }
}

export const resourcesApply = () => runResourceCommand('apply');
export const resourcesCreate = () => runResourceCommand('create');
export const resourcesUpdate = () => runResourceCommand('update');
export const resourcesDelete = () => runResourceCommand('delete');
