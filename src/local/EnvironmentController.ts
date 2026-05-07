import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentProvider, GalasaEnvironment } from './views/TreeViewEnvironmentProperties';

export function buildEnvFileName(displayName: string): string | undefined {
    const sanitized = (displayName || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (sanitized.length === 0) {
        return undefined;
    }
    return sanitized + '.galenv';
}

export async function addEnvrionment(galasaPath: string, environmentProvider: EnvironmentProvider): Promise<void> {
    const newName = await vscode.window.showInputBox({ placeHolder: 'Galasa Environment Name' });
    if (!newName) {
        return;
    }
    const newFileName = buildEnvFileName(newName);
    if (!newFileName) {
        vscode.window.showWarningMessage('Galasa Environment Name must contain at least one alphanumeric / underscore / hyphen character.');
        return;
    }
    const vscodeDir = path.join(galasaPath, 'vscode');
    try {
        fs.mkdirSync(vscodeDir, { recursive: true });
    } catch (err) {
        vscode.window.showErrorMessage(`Could not create '${vscodeDir}': ${(err as Error).message}`);
        return;
    }
    const target = path.join(vscodeDir, newFileName);
    if (fs.existsSync(target)) {
        vscode.window.showWarningMessage("New Galasa Environment Name already exists or is too similar");
        return;
    }
    try {
        fs.writeFileSync(target, '#' + newName + '\n');
    } catch (err) {
        vscode.window.showErrorMessage(`Could not write '${target}': ${(err as Error).message}`);
        return;
    }
    environmentProvider.setEnvironment(target);
    environmentProvider.refresh();
    vscode.window.showInformationMessage(`Galasa environment '${newName}' added.`);
}

export async function deleteEnvironment(env : GalasaEnvironment, environmentProvider : EnvironmentProvider) {
    if(environmentProvider.getEnvironment() == env.envPath) {
        environmentProvider.setEnvironment(undefined);
    }
    fs.unlinkSync(env.envPath);
    environmentProvider.refresh();
}