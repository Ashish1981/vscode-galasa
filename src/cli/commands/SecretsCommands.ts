import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';

export function registerSecretsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.secrets.get', secretsGet),
        vscode.commands.registerCommand('galasa.secrets.set', secretsSet),
        vscode.commands.registerCommand('galasa.secrets.delete', secretsDelete)
    );
}

export async function secretsGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Secret name (leave blank to list all)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(['secrets', 'get']));
    if (name && name.trim().length > 0) {
        args.push('--name', name.trim());
    }
    const result = await runGalasaCli(args);
    logCliResult('secrets get', result);
}

export async function secretsSet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Secret name', placeHolder: 'e.g., SIMBANK' });
    if (!name) {
        return;
    }
    const type = await vscode.window.showQuickPick(
        ['UsernamePassword', 'UsernameToken', 'Token', 'Username'],
        { placeHolder: 'Secret type' }
    );
    if (!type) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg([
        'secrets', 'set',
        '--name', name,
        '--type', type
    ]));
    if (type === 'UsernamePassword' || type === 'Username') {
        const username = await vscode.window.showInputBox({ prompt: 'Username' });
        if (!username) {
            return;
        }
        args.push('--username', username);
    }
    if (type === 'UsernamePassword') {
        const password = await vscode.window.showInputBox({ prompt: 'Password', password: true });
        if (password === undefined) {
            return;
        }
        args.push('--password', password);
    }
    if (type === 'UsernameToken' || type === 'Token') {
        if (type === 'UsernameToken') {
            const username = await vscode.window.showInputBox({ prompt: 'Username' });
            if (!username) {
                return;
            }
            args.push('--username', username);
        }
        const token = await vscode.window.showInputBox({ prompt: 'Token', password: true });
        if (token === undefined) {
            return;
        }
        args.push('--token', token);
    }
    const result = await runGalasaCli(args);
    logCliResult(`secrets set ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Secret ${name} stored.`);
    } else {
        vscode.window.showErrorMessage(`Set failed: ${result.stderr || result.stdout}`);
    }
}

export async function secretsDelete(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Secret name to delete' });
    if (!name) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete secret '${name}'?`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['secrets', 'delete', '--name', name]));
    const result = await runGalasaCli(args);
    logCliResult(`secrets delete ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Secret ${name} deleted.`);
    } else {
        vscode.window.showErrorMessage(`Delete failed: ${result.stderr || result.stdout}`);
    }
}
