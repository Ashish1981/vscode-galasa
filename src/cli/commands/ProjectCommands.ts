import * as vscode from 'vscode';
import { appendGalasaHomeArg, ensureCliAvailable, runInTerminal } from '../GalasaCli';

export function registerProjectCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.project.create', projectCreate),
        vscode.commands.registerCommand('galasa.local.init', localInit)
    );
}

export async function projectCreate(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const packageName = await vscode.window.showInputBox({
        prompt: 'Package name for the new test project',
        placeHolder: 'e.g., dev.galasa.example.banking'
    });
    if (!packageName) {
        return;
    }
    const features = await vscode.window.showInputBox({
        prompt: 'Comma-separated feature names (default: payee)',
        placeHolder: 'e.g., payee,account'
    });
    const args = appendGalasaHomeArg(['project', 'create', '--package', packageName, '--obr']);
    if (features && features.trim().length > 0) {
        args.push('--features', features.trim());
    }
    const includeMaven = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Include a Maven build (gradle is the alternative)?'
    });
    if (includeMaven === 'Yes') {
        args.push('--maven');
    } else if (includeMaven === 'No') {
        args.push('--gradle');
    }
    await runInTerminal(args, 'galasactl project create');
}

export async function localInit(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const args = appendGalasaHomeArg(['local', 'init']);
    await runInTerminal(args, 'galasactl local init');
}
