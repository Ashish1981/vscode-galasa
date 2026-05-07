import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, SpawnOptions } from 'child_process';

export interface GalasaCliResult {
    code: number;
    stdout: string;
    stderr: string;
}

export interface GalasaCliRunOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    showInTerminal?: boolean;
    terminalName?: string;
    captureOutput?: boolean;
    timeoutMs?: number;
}

export const DEFAULT_CLI_TIMEOUT_MS = 120_000;

export function getConfiguredCliTimeoutMs(): number {
    const configured = vscode.workspace.getConfiguration('galasa').get<number>('cliTimeoutMs');
    if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_CLI_TIMEOUT_MS;
}

function getCliExecutableName(): string {
    return os.platform() === 'win32' ? 'galasactl.exe' : 'galasactl';
}

export function getConfiguredCliPath(): string | undefined {
    const configured = vscode.workspace.getConfiguration('galasa').get<string>('cliPath');
    if (configured && configured.trim().length > 0) {
        return configured.trim();
    }
    return undefined;
}

/**
 * Returns the directories searched (in order) for `galasactl` when the
 * `galasa.cliPath` setting is empty and `PATH` lookup also fails.
 *
 * Order: configured `galasa.home`/bin → ~/.galasa/bin → ~/bin →
 * /usr/local/bin → /usr/bin → /opt/galasa/bin →
 * %LOCALAPPDATA%\Programs\galasactl → C:\Program Files\galasactl.
 */
export function getCliSearchDirs(): string[] {
    const dirs: string[] = [];
    const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
    const galasaHome = (vscode.workspace.getConfiguration('galasa').get<string>('home') || '').trim();
    if (galasaHome) {
        dirs.push(path.join(galasaHome, 'bin'));
    }
    if (home) {
        dirs.push(path.join(home, '.galasa', 'bin'));
        dirs.push(path.join(home, 'bin'));
    }
    if (os.platform() === 'win32') {
        const localAppData = process.env.LOCALAPPDATA;
        if (localAppData) {
            dirs.push(path.join(localAppData, 'Programs', 'galasactl'));
        }
        const progFiles = process.env.ProgramFiles || process.env['ProgramFiles'];
        if (progFiles) {
            dirs.push(path.join(progFiles, 'galasactl'));
        }
    } else {
        dirs.push('/usr/local/bin');
        dirs.push('/usr/bin');
        dirs.push('/opt/galasa/bin');
    }
    // De-dupe while preserving order
    const seen = new Set<string>();
    return dirs.filter(d => {
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
    });
}

function findOnPath(exeName: string): string | undefined {
    const pathEnv = process.env.PATH;
    if (!pathEnv) return undefined;
    const sep = os.platform() === 'win32' ? ';' : ':';
    for (const dir of pathEnv.split(sep)) {
        if (!dir) continue;
        const candidate = path.join(dir, exeName);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

export function resolveCliExecutable(): string {
    const configured = getConfiguredCliPath();
    const exeName = getCliExecutableName();

    if (configured) {
        if (fs.existsSync(configured)) {
            return configured;
        }
        const expanded = path.join(configured, exeName);
        if (fs.existsSync(expanded)) {
            return expanded;
        }
        return configured;
    }

    const onPath = findOnPath(exeName);
    if (onPath) {
        return onPath;
    }

    for (const dir of getCliSearchDirs()) {
        const candidate = path.join(dir, exeName);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    // Last resort — let spawn() try execvp on bare name.
    return exeName;
}

export function getGalasaHome(): string {
    const configured = vscode.workspace.getConfiguration('galasa').get<string>('home');
    if (configured && configured.trim().length > 0) {
        return configured.trim();
    }
    if (process.env.GALASA_HOME && process.env.GALASA_HOME.trim().length > 0) {
        return process.env.GALASA_HOME.trim();
    }
    const userProfile = process.env.USERPROFILE || process.env.HOME || os.homedir();
    return path.join(userProfile, '.galasa');
}

export function getBootstrap(): string | undefined {
    const configured = vscode.workspace.getConfiguration('galasa').get<string>('bootstrap');
    if (configured && configured.trim().length > 0) {
        return configured.trim();
    }
    return process.env.GALASA_BOOTSTRAP || undefined;
}

export function buildCommonEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    env['GALASA_HOME'] = getGalasaHome();
    const bootstrap = getBootstrap();
    if (bootstrap) {
        env['GALASA_BOOTSTRAP'] = bootstrap;
    }
    return env;
}

export async function runGalasaCli(args: string[], options: GalasaCliRunOptions = {}): Promise<GalasaCliResult> {
    const exe = resolveCliExecutable();
    const env = options.env ?? buildCommonEnv();
    const cwd = options.cwd ?? getGalasaHome();

    if (options.showInTerminal) {
        const terminal = vscode.window.createTerminal({
            name: options.terminalName ?? 'galasactl',
            cwd,
            env: env as { [key: string]: string }
        });
        terminal.show();
        const quotedArgs = args.map(quoteArg).join(' ');
        terminal.sendText(`"${exe}" ${quotedArgs}`);
        return { code: 0, stdout: '', stderr: '' };
    }

    const timeoutMs = options.timeoutMs ?? getConfiguredCliTimeoutMs();

    return new Promise<GalasaCliResult>((resolve) => {
        const spawnOpts: SpawnOptions = {
            cwd,
            env,
            shell: false
        };
        const child = spawn(exe, args, spawnOpts);
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const timer = timeoutMs > 0 ? setTimeout(() => {
            timedOut = true;
            try { child.kill('SIGKILL'); } catch { /* ignore */ }
        }, timeoutMs) : undefined;

        child.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        child.stderr?.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });
        child.on('error', (err: Error) => {
            if (timer) clearTimeout(timer);
            resolve({ code: -1, stdout, stderr: stderr + '\n' + err.message });
        });
        child.on('close', (code: number | null) => {
            if (timer) clearTimeout(timer);
            if (timedOut) {
                resolve({ code: -2, stdout, stderr: stderr + `\nTimed out after ${timeoutMs}ms` });
                return;
            }
            resolve({ code: code ?? 0, stdout, stderr });
        });
    });
}

function quoteArg(arg: string): string {
    if (arg.includes(' ') || arg.includes('"')) {
        return '"' + arg.replace(/"/g, '\\"') + '"';
    }
    return arg;
}

export function describeCliResolution(): string {
    const exe = resolveCliExecutable();
    const configured = getConfiguredCliPath();
    const exeName = os.platform() === 'win32' ? 'galasactl.exe' : 'galasactl';
    const lines: string[] = [];
    lines.push(`Resolved galasactl path : ${exe}`);
    lines.push(`Configured (galasa.cliPath) : ${configured ?? '(none)'}`);
    lines.push(`PATH directories searched (first match wins):`);
    const pathEnv = process.env.PATH || '';
    const sep = os.platform() === 'win32' ? ';' : ':';
    const pathDirs = pathEnv.split(sep).filter(Boolean);
    for (const d of pathDirs) {
        lines.push(`  - ${d}`);
    }
    lines.push(`Fallback directories searched after PATH:`);
    for (const d of getCliSearchDirs()) {
        lines.push(`  - ${d}`);
    }
    lines.push(`Looking for executable name: ${exeName}`);
    return lines.join('\n');
}

export async function ensureCliAvailable(): Promise<boolean> {
    try {
        const result = await runGalasaCli(['--version']);
        if (result.code === 0) {
            return true;
        }
        const channel = getOutputChannel();
        channel.appendLine('[Galasa] galasactl could not be invoked.');
        channel.appendLine(describeCliResolution());
        if (result.stderr) channel.appendLine(result.stderr);
        const action = await vscode.window.showWarningMessage(
            `galasactl is not available (exit ${result.code}). ` +
            `Set 'galasa.cliPath' to the absolute path of galasactl, or add its directory to PATH. ` +
            `See the Galasa output channel for the full search list.`,
            'Open Settings',
            'Show Output',
            'Run Diagnostics'
        );
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'galasa.cliPath');
        } else if (action === 'Show Output') {
            channel.show(true);
        } else if (action === 'Run Diagnostics') {
            vscode.commands.executeCommand('galasa.diagnostics');
        }
        return false;
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to invoke galasactl: ${(err as Error).message}`);
        return false;
    }
}

export function appendBootstrapArg(args: string[]): string[] {
    const bootstrap = getBootstrap();
    if (bootstrap && !args.includes('--bootstrap')) {
        return [...args, '--bootstrap', bootstrap];
    }
    return args;
}

export function appendGalasaHomeArg(args: string[]): string[] {
    if (!args.includes('--galasahome')) {
        return [...args, '--galasahome', getGalasaHome()];
    }
    return args;
}

export async function runInTerminal(args: string[], terminalName?: string): Promise<void> {
    await runGalasaCli(args, { showInTerminal: true, terminalName });
}

export function getOutputChannel(): vscode.OutputChannel {
    if (!sharedChannel) {
        sharedChannel = vscode.window.createOutputChannel('Galasa');
    }
    return sharedChannel;
}

let sharedChannel: vscode.OutputChannel | undefined;

export function logCliResult(label: string, result: GalasaCliResult): void {
    const channel = getOutputChannel();
    channel.appendLine(`--- ${label} (exit code: ${result.code}) ---`);
    if (result.stdout) {
        channel.appendLine(result.stdout);
    }
    if (result.stderr) {
        channel.appendLine(result.stderr);
    }
    channel.show(true);
}
