import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';
import { buildUsersDeleteArgs } from './argv';

export function registerUsersCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.users.get', usersGet),
        vscode.commands.registerCommand('galasa.users.set', usersSet),
        vscode.commands.registerCommand('galasa.users.delete', usersDelete)
    );
}

export async function usersDelete(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const loginId = await vscode.window.showInputBox({ prompt: 'User login id to delete' });
    if (!loginId) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete user '${loginId}'?`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(buildUsersDeleteArgs({ name: loginId })));
    const result = await runGalasaCli(args);
    logCliResult(`users delete ${loginId}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`User ${loginId} deleted.`);
    } else {
        vscode.window.showErrorMessage(`Delete failed: ${result.stderr || result.stdout}`);
    }
}

export async function usersGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const loginId = await vscode.window.showInputBox({ prompt: 'User login id (leave blank for all)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(['users', 'get']));
    if (loginId && loginId.trim().length > 0) {
        args.push('--login-id', loginId.trim());
    }
    const result = await runGalasaCli(args);
    logCliResult('users get', result);
}

export async function usersSet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const loginId = await vscode.window.showInputBox({ prompt: 'User login id' });
    if (!loginId) {
        return;
    }
    const role = await vscode.window.showInputBox({ prompt: 'Role to assign', placeHolder: 'e.g., admin' });
    if (!role) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg([
        'users', 'set',
        '--login-id', loginId,
        '--role', role
    ]));
    const result = await runGalasaCli(args);
    logCliResult(`users set ${loginId}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`User ${loginId} updated to role ${role}.`);
    } else {
        vscode.window.showErrorMessage(`Set failed: ${result.stderr || result.stdout}`);
    }
}
