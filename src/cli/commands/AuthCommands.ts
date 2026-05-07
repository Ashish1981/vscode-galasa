import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli, runInTerminal } from '../GalasaCli';
import { buildAuthStatusArgs } from './argv';

export function registerAuthCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.auth.login', authLogin),
        vscode.commands.registerCommand('galasa.auth.logout', authLogout),
        vscode.commands.registerCommand('galasa.auth.tokens.get', authTokensGet),
        vscode.commands.registerCommand('galasa.auth.tokens.delete', authTokensDelete),
        vscode.commands.registerCommand('galasa.auth.status', authStatus)
    );
}

export async function authStatus(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(buildAuthStatusArgs()));
    const result = await runGalasaCli(args);
    logCliResult('auth status', result);
    if (result.code === 0) {
        vscode.window.showInformationMessage('Galasa: authenticated.');
    } else {
        vscode.window.showWarningMessage('Galasa: not authenticated. Run "Galasa: Auth - Login" first.');
    }
}

export async function authLogin(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['auth', 'login']));
    await runInTerminal(args, 'galasactl auth login');
}

export async function authLogout(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const args = appendGalasaHomeArg(['auth', 'logout']);
    const result = await runGalasaCli(args);
    logCliResult('auth logout', result);
    if (result.code === 0) {
        vscode.window.showInformationMessage('Successfully logged out of the Galasa ecosystem.');
    } else {
        vscode.window.showErrorMessage(`Logout failed: ${result.stderr || result.stdout}`);
    }
}

export async function authTokensGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['auth', 'tokens', 'get']));
    const result = await runGalasaCli(args);
    logCliResult('auth tokens get', result);
}

export async function authTokensDelete(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const tokenId = await vscode.window.showInputBox({
        prompt: 'Token ID to delete',
        placeHolder: 'e.g., abcdef12-3456-7890'
    });
    if (!tokenId) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['auth', 'tokens', 'delete', '--tokenid', tokenId]));
    const result = await runGalasaCli(args);
    logCliResult('auth tokens delete', result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Token ${tokenId} deleted.`);
    } else {
        vscode.window.showErrorMessage(`Delete failed: ${result.stderr || result.stdout}`);
    }
}
