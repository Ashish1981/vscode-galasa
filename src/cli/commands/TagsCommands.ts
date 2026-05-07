import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli } from '../GalasaCli';
import { buildTagsGetArgs, buildTagsSetArgs, buildTagsDeleteArgs } from './argv';

export function registerTagsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.tags.get', tagsGet),
        vscode.commands.registerCommand('galasa.tags.set', tagsSet),
        vscode.commands.registerCommand('galasa.tags.delete', tagsDelete)
    );
}

export async function tagsGet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const stream = await vscode.window.showInputBox({ prompt: 'Stream name' });
    if (!stream) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Tag name (leave blank for all)' });
    const args = appendGalasaHomeArg(appendBootstrapArg(buildTagsGetArgs({ stream, name: name || undefined })));
    const result = await runGalasaCli(args);
    logCliResult('tags get', result);
}

export async function tagsSet(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const stream = await vscode.window.showInputBox({ prompt: 'Stream name' });
    if (!stream) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Tag name' });
    if (!name) {
        return;
    }
    const value = await vscode.window.showInputBox({ prompt: 'Tag value' });
    if (value === undefined) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(buildTagsSetArgs({ stream, name, value })));
    const result = await runGalasaCli(args);
    logCliResult(`tags set ${stream}/${name}`, result);
}

export async function tagsDelete(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const stream = await vscode.window.showInputBox({ prompt: 'Stream name' });
    if (!stream) {
        return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Tag name to delete' });
    if (!name) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete tag '${name}' from stream '${stream}'?`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(buildTagsDeleteArgs({ stream, name })));
    const result = await runGalasaCli(args);
    logCliResult(`tags delete ${stream}/${name}`, result);
}
