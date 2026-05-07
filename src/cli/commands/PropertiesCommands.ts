import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';

export function registerPropertiesCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.properties.get', propertiesGet),
        vscode.commands.registerCommand('galasa.properties.set', propertiesSet),
        vscode.commands.registerCommand('galasa.properties.delete', propertiesDelete),
        vscode.commands.registerCommand('galasa.properties.namespaces.get', namespacesGet)
    );
}

export async function propertiesGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const namespace = await vscode.window.showInputBox({ prompt: 'Namespace to query', placeHolder: 'e.g., zos' });
    if (!namespace) {
        return;
    }
    const prefix = await vscode.window.showInputBox({ prompt: 'Property prefix (optional)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(['properties', 'get', '--namespace', namespace]));
    if (prefix) {
        args.push('--prefix', prefix);
    }
    const result = await runGalasaCli(args);
    logCliResult(`properties get ${namespace}`, result);
}

export async function propertiesSet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const namespace = await vscode.window.showInputBox({ prompt: 'Namespace', placeHolder: 'e.g., zos' });
    if (!namespace) {
        return;
    }
    const propName = await vscode.window.showInputBox({ prompt: 'Property name', placeHolder: 'e.g., image.SIMBANK.hostname' });
    if (!propName) {
        return;
    }
    const value = await vscode.window.showInputBox({ prompt: `Value for ${propName}` });
    if (value === undefined) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg([
        'properties', 'set',
        '--namespace', namespace,
        '--name', propName,
        '--value', value
    ]));
    const result = await runGalasaCli(args);
    logCliResult(`properties set ${namespace}.${propName}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Property ${namespace}.${propName} set.`);
    } else {
        vscode.window.showErrorMessage(`Set failed: ${result.stderr || result.stdout}`);
    }
}

export async function propertiesDelete(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const namespace = await vscode.window.showInputBox({ prompt: 'Namespace', placeHolder: 'e.g., zos' });
    if (!namespace) {
        return;
    }
    const propName = await vscode.window.showInputBox({ prompt: 'Property name to delete' });
    if (!propName) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete property ${namespace}.${propName}?`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg([
        'properties', 'delete',
        '--namespace', namespace,
        '--name', propName
    ]));
    const result = await runGalasaCli(args);
    logCliResult(`properties delete ${namespace}.${propName}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Property ${namespace}.${propName} deleted.`);
    } else {
        vscode.window.showErrorMessage(`Delete failed: ${result.stderr || result.stdout}`);
    }
}

export async function namespacesGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['properties', 'namespaces', 'get']));
    const result = await runGalasaCli(args);
    logCliResult('properties namespaces get', result);
}
