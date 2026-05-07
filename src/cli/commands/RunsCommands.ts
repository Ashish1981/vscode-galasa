import * as vscode from 'vscode';
import { appendBootstrapArg, appendGalasaHomeArg, ensureCliAvailable, logCliResult, runGalasaCli, runInTerminal } from '../GalasaCli';
import { buildRunsBulkDeleteArgs, buildRunsTailArgs, parseNameList } from './argv';

export function registerRunsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('galasa.runs.prepare', runsPrepare),
        vscode.commands.registerCommand('galasa.runs.submit', runsSubmit),
        vscode.commands.registerCommand('galasa.runs.submitLocal', runsSubmitLocal),
        vscode.commands.registerCommand('galasa.runs.get', runsGet),
        vscode.commands.registerCommand('galasa.runs.delete', runsDelete),
        vscode.commands.registerCommand('galasa.runs.deleteBulk', runsDeleteBulk),
        vscode.commands.registerCommand('galasa.runs.download', runsDownload),
        vscode.commands.registerCommand('galasa.runs.reset', runsReset),
        vscode.commands.registerCommand('galasa.runs.cancel', runsCancel),
        vscode.commands.registerCommand('galasa.runs.tail', runsTail)
    );
}

export async function runsDeleteBulk(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const raw = await vscode.window.showInputBox({
        prompt: 'Run names to delete (comma- or whitespace-separated)',
        placeHolder: 'e.g., U123, U124 U125',
    });
    if (!raw) {
        return;
    }
    const names = parseNameList(raw);
    if (names.length === 0) {
        vscode.window.showWarningMessage('No run names provided.');
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete ${names.length} run(s) from the ecosystem?\n${names.join(', ')}`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const argvList = buildRunsBulkDeleteArgs({ names });
    let successes = 0;
    const failures: string[] = [];
    for (let i = 0; i < argvList.length; i++) {
        const fullArgs = appendGalasaHomeArg(appendBootstrapArg(argvList[i]));
        const result = await runGalasaCli(fullArgs);
        logCliResult(`runs delete ${names[i]}`, result);
        if (result.code === 0) {
            successes++;
        } else {
            failures.push(names[i]);
        }
    }
    if (failures.length === 0) {
        vscode.window.showInformationMessage(`Deleted ${successes} run(s).`);
    } else {
        vscode.window.showWarningMessage(`Deleted ${successes} run(s); failures: ${failures.join(', ')}`);
    }
}

export async function runsTail(runName?: string): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let name = runName;
    if (!name) {
        name = await promptForName('Run name to tail', 'e.g., U123');
    }
    if (!name) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(buildRunsTailArgs({ name })));
    await runInTerminal(args, `galasactl runs tail ${name}`);
}

async function promptForName(prompt: string, placeHolder?: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({ prompt, placeHolder });
}

export async function runsPrepare(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const portfolio = await promptForName('Portfolio file path', 'e.g., my-portfolio.yaml');
    if (!portfolio) {
        return;
    }
    const stream = await promptForName('Test stream name (optional)');
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'prepare', '--portfolio', portfolio]));
    if (stream) {
        args.push('--stream', stream);
    }
    await runInTerminal(args, 'galasactl runs prepare');
}

export async function runsSubmit(): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    const portfolio = await promptForName('Portfolio file path', 'e.g., my-portfolio.yaml');
    if (!portfolio) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'submit', '--portfolio', portfolio]));
    await runInTerminal(args, 'galasactl runs submit');
}

export async function runsSubmitLocal(testClass?: string, obr?: string, extraArgs?: string[]): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let cls = testClass;
    if (!cls) {
        cls = await promptForName('Test class', 'e.g., my.bundle/my.pkg.MyTest');
    }
    if (!cls) {
        return;
    }
    let obrCoord = obr;
    if (!obrCoord) {
        obrCoord = await promptForName('OBR coordinates', 'e.g., mvn:my.group/my.obr/0.1.0/obr');
    }
    if (!obrCoord) {
        return;
    }
    const args = appendGalasaHomeArg([
        'runs', 'submit', 'local',
        '--class', cls,
        '--obr', obrCoord
    ]);
    if (extraArgs && extraArgs.length > 0) {
        args.push(...extraArgs);
    }
    await runInTerminal(args, 'galasactl runs submit local');
}

export async function runsGet(runName?: string): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let name = runName;
    if (!name) {
        name = await promptForName('Run name to get', 'e.g., U123');
    }
    if (!name) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'get', '--name', name, '--format', 'details']));
    const result = await runGalasaCli(args);
    logCliResult(`runs get ${name}`, result);
}

export async function runsDelete(runName?: string): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let name = runName;
    if (!name) {
        name = await promptForName('Run name to delete', 'e.g., U123');
    }
    if (!name) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(
        `Delete run '${name}' from the ecosystem?`,
        { modal: true },
        'Delete'
    );
    if (confirm !== 'Delete') {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'delete', '--name', name]));
    const result = await runGalasaCli(args);
    logCliResult(`runs delete ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Run ${name} deleted.`);
    } else {
        vscode.window.showErrorMessage(`Delete failed: ${result.stderr || result.stdout}`);
    }
}

export async function runsDownload(runName?: string): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let name = runName;
    if (!name) {
        name = await promptForName('Run name to download', 'e.g., U123');
    }
    if (!name) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'download', '--name', name]));
    await runInTerminal(args, `galasactl runs download ${name}`);
}

export async function runsReset(runName?: string): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let name = runName;
    if (!name) {
        name = await promptForName('Run name to reset', 'e.g., U123');
    }
    if (!name) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'reset', '--name', name]));
    const result = await runGalasaCli(args);
    logCliResult(`runs reset ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Run ${name} reset.`);
    } else {
        vscode.window.showErrorMessage(`Reset failed: ${result.stderr || result.stdout}`);
    }
}

export async function runsCancel(runName?: string): Promise<void> {
    if (!(await ensureCliAvailable())) {
        return;
    }
    let name = runName;
    if (!name) {
        name = await promptForName('Run name to cancel', 'e.g., U123');
    }
    if (!name) {
        return;
    }
    const args = appendGalasaHomeArg(appendBootstrapArg(['runs', 'cancel', '--name', name]));
    const result = await runGalasaCli(args);
    logCliResult(`runs cancel ${name}`, result);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`Run ${name} cancelled.`);
    } else {
        vscode.window.showErrorMessage(`Cancel failed: ${result.stderr || result.stdout}`);
    }
}
