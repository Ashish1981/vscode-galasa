import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function ensureFile(file: string, contents = ''): void {
    if (!fs.existsSync(file)) {
        ensureDir(path.dirname(file));
        fs.writeFileSync(file, contents);
    }
}

export async function setupWorkspace(context: vscode.ExtensionContext, galasaPath: string): Promise<void> {
    ensureDir(galasaPath);
    ensureDir(path.join(galasaPath, 'vscode'));
    ensureDir(path.join(galasaPath, 'ras'));

    ensureFile(path.join(galasaPath, 'credentials.properties'));
    ensureFile(path.join(galasaPath, 'cps.properties'));
    ensureFile(path.join(galasaPath, 'bootstrap.properties'));
    ensureFile(path.join(galasaPath, 'dss.properties'));
    ensureFile(path.join(galasaPath, 'overrides.properties'));

    const cpsGalasaPath = path.join(galasaPath, 'cps_snippets.json');
    const cpsExtensionPath = path.join(context.extensionPath, 'lib', 'cps');
    if (fs.existsSync(cpsGalasaPath)) {
        ensureDir(cpsExtensionPath);
        ensureFile(path.join(cpsExtensionPath, 'snippets.json'));
        if (fs.readFileSync(cpsGalasaPath).toString() !== fs.readFileSync(path.join(cpsExtensionPath, 'snippets.json')).toString()) {
            fs.writeFileSync(path.join(cpsExtensionPath, 'snippets.json'), fs.readFileSync(cpsGalasaPath));
            const reload = await vscode.window.showInformationMessage(
                'Changes were detected to your Galasa snippets. Do you want to reload the window now?',
                'Reload'
            );
            if (reload === 'Reload') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
    }
}
