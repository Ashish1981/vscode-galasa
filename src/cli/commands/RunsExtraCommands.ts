import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';
import { buildRunsUpdateArgs, buildRunsCleanupArgs, buildRunsCleanupLocalArgs } from './argv';

export function registerRunsExtraCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.runs.update', runsUpdate),
        vscode.commands.registerCommand('galasa.runs.cleanup', runsCleanup),
        vscode.commands.registerCommand('galasa.runs.cleanupLocal', runsCleanupLocal)
    );
}

export async function runsUpdate(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Run name to update' });
    if (!name) {
        return;
    }
    const status = await vscode.window.showInputBox({ prompt: 'Status (leave blank to skip)' });
    const result = await vscode.window.showInputBox({ prompt: 'Result (leave blank to skip)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(buildRunsUpdateArgs({
        name,
        status: status || undefined,
        result: result || undefined,
    })));
    const cliResult = await runGalasaCli(args);
    logCliResult(`runs update ${name}`, cliResult);
}

async function promptCleanupFilters(): Promise<{ age?: string; requestor?: string; result?: string; status?: string }> {
    const age = await vscode.window.showInputBox({ prompt: 'Age filter (e.g. 14d) — blank to skip' });
    const requestor = await vscode.window.showInputBox({ prompt: 'Requestor filter — blank to skip' });
    const result = await vscode.window.showInputBox({ prompt: 'Result filter — blank to skip' });
    const status = await vscode.window.showInputBox({ prompt: 'Status filter — blank to skip' });
    return {
        age: age || undefined,
        requestor: requestor || undefined,
        result: result || undefined,
        status: status || undefined,
    };
}

export async function runsCleanup(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const filters = await promptCleanupFilters();
    const args = appendGalasaHomeArg(appendBootstrapArg(buildRunsCleanupArgs(filters)));
    const result = await runGalasaCli(args);
    logCliResult('runs cleanup', result);
}

export async function runsCleanupLocal(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const filters = await promptCleanupFilters();
    const args = appendGalasaHomeArg(buildRunsCleanupLocalArgs(filters));
    const result = await runGalasaCli(args);
    logCliResult('runs cleanup local', result);
}
