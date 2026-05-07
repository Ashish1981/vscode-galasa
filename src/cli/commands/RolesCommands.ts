import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';

export function registerRolesCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.roles.get', rolesGet)
    );
}

export async function rolesGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Role name (leave blank for all)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(['roles', 'get']));
    if (name && name.trim().length > 0) {
        args.push('--name', name.trim());
    }
    const result = await runGalasaCli(args);
    logCliResult('roles get', result);
}
