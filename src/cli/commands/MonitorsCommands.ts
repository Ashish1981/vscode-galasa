import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';

export function registerMonitorsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.monitors.get', monitorsGet),
        vscode.commands.registerCommand('galasa.monitors.set', monitorsSet)
    );
}

export async function monitorsGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Monitor name (leave blank for all)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(['monitors', 'get']));
    if (name && name.trim().length > 0) {
        args.push('--name', name.trim());
    }
    const result = await runGalasaCli(args);
    logCliResult('monitors get', result);
}

export async function monitorsSet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Monitor name' });
    if (!name) {
        return;
    }
    const stateChoice = await vscode.window.showQuickPick(['enable', 'disable'], {
        placeHolder: 'Enable or disable the monitor?'
    });
    if (!stateChoice) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg([
        'monitors', 'set',
        '--name', name,
        stateChoice === 'enable' ? '--isEnabled' : '--isEnabled=false'
    ]));
    const result = await runGalasaCli(args);
    logCliResult(`monitors set ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Monitor ${name} ${stateChoice}d.`);
    } else {
        vscode.window.showErrorMessage(`Set failed: ${result.stderr || result.stdout}`);
    }
}
