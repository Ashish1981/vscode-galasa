import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync, ExecFileSyncOptions } from 'child_process';
import * as vscode from 'vscode';

export const MIN_SUPPORTED_JAVA = 8;
export const MAX_SUPPORTED_JAVA = 26;

export interface JavaInstallation {
    javaPath: string;
    majorVersion: number;
    rawVersion: string;
    source: 'configured' | 'java.home' | 'JAVA_HOME' | 'PATH';
}

export class JavaVersionError extends Error {
    constructor(message: string, public readonly detectedVersion?: number) {
        super(message);
        this.name = 'JavaVersionError';
    }
}

export function parseJavaVersion(versionOutput: string): number | undefined {
    const match = versionOutput.match(/version\s+"?([\d._+-]+)"?/i);
    if (!match) {
        return undefined;
    }
    const raw = match[1];
    if (raw.startsWith('1.')) {
        const sub = raw.split('.')[1];
        const major = parseInt(sub, 10);
        return isNaN(major) ? undefined : major;
    }
    const major = parseInt(raw.split(/[._+-]/)[0], 10);
    return isNaN(major) ? undefined : major;
}

export function isVersionSupported(major: number): boolean {
    return major >= MIN_SUPPORTED_JAVA && major <= MAX_SUPPORTED_JAVA;
}

function getJavaExecutableName(): string {
    return os.platform() === 'win32' ? 'java.exe' : 'java';
}

function joinJavaBin(javaHome: string): string {
    return path.join(javaHome, 'bin', getJavaExecutableName());
}

function tryQueryJava(javaPath: string): { major: number; raw: string } | undefined {
    if (!fs.existsSync(javaPath)) {
        return undefined;
    }
    try {
        const opts: ExecFileSyncOptions = {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 5000
        };
        const output = execFileSync(javaPath, ['-version'], opts);
        const stderrOutput = (output && output.toString()) || '';
        const major = parseJavaVersion(stderrOutput);
        if (major === undefined) {
            return undefined;
        }
        return { major, raw: stderrOutput.trim().split(/\r?\n/)[0] };
    } catch (err) {
        const e: any = err;
        const stderr = e && e.stderr ? e.stderr.toString() : '';
        const stdout = e && e.stdout ? e.stdout.toString() : '';
        const combined = stderr + '\n' + stdout;
        const major = parseJavaVersion(combined);
        if (major !== undefined) {
            return { major, raw: combined.trim().split(/\r?\n/)[0] };
        }
        return undefined;
    }
}

function findJavaCandidates(): { javaPath: string; source: JavaInstallation['source'] }[] {
    const candidates: { javaPath: string; source: JavaInstallation['source'] }[] = [];

    const configured = vscode.workspace.getConfiguration('galasa').get<string>('javaHome');
    if (configured && configured.trim().length > 0) {
        candidates.push({ javaPath: joinJavaBin(configured), source: 'configured' });
    }

    const javaHomeFromConfig = vscode.workspace.getConfiguration('java').get<string>('home');
    if (javaHomeFromConfig && javaHomeFromConfig.trim().length > 0) {
        candidates.push({ javaPath: joinJavaBin(javaHomeFromConfig), source: 'java.home' });
    }

    const envJavaHome = process.env.JAVA_HOME;
    if (envJavaHome && envJavaHome.trim().length > 0) {
        candidates.push({ javaPath: joinJavaBin(envJavaHome), source: 'JAVA_HOME' });
    }

    candidates.push({ javaPath: getJavaExecutableName(), source: 'PATH' });

    return candidates;
}

export function detectJava(): JavaInstallation | undefined {
    const candidates = findJavaCandidates();
    for (const candidate of candidates) {
        const probe = tryQueryJava(candidate.javaPath);
        if (probe) {
            return {
                javaPath: candidate.javaPath,
                majorVersion: probe.major,
                rawVersion: probe.raw,
                source: candidate.source
            };
        }
    }
    return undefined;
}

export function detectAndValidateJava(): JavaInstallation {
    const installation = detectJava();
    if (!installation) {
        throw new JavaVersionError(
            `Unable to locate a Java runtime. Please install JDK ${MIN_SUPPORTED_JAVA}+ ` +
            `(up to ${MAX_SUPPORTED_JAVA}) and either set JAVA_HOME, configure 'galasa.javaHome', ` +
            `or ensure 'java' is on your PATH.`
        );
    }
    if (!isVersionSupported(installation.majorVersion)) {
        throw new JavaVersionError(
            `Detected Java ${installation.majorVersion} is outside the supported range ` +
            `(${MIN_SUPPORTED_JAVA}-${MAX_SUPPORTED_JAVA}). Please install a supported JDK.`,
            installation.majorVersion
        );
    }
    return installation;
}

export function getRequiredVmArgs(majorVersion: number): string[] {
    const args: string[] = [];
    if (majorVersion >= 9) {
        args.push(
            '--add-opens=java.base/java.lang=ALL-UNNAMED',
            '--add-opens=java.base/java.lang.reflect=ALL-UNNAMED',
            '--add-opens=java.base/java.util=ALL-UNNAMED',
            '--add-opens=java.base/java.util.concurrent=ALL-UNNAMED',
            '--add-opens=java.base/java.io=ALL-UNNAMED',
            '--add-opens=java.base/java.net=ALL-UNNAMED',
            '--add-opens=java.base/java.nio=ALL-UNNAMED',
            '--add-opens=java.base/java.text=ALL-UNNAMED',
            '--add-opens=java.base/java.security=ALL-UNNAMED',
            '--add-opens=java.base/sun.net.www.protocol.https=ALL-UNNAMED',
            '--add-opens=java.base/sun.security.ssl=ALL-UNNAMED',
            '--add-opens=java.base/sun.security.util=ALL-UNNAMED',
            '--add-opens=java.management/sun.management=ALL-UNNAMED'
        );
    }
    if (majorVersion >= 17) {
        args.push('-Djava.security.manager=allow');
    }
    if (majorVersion >= 21) {
        args.push('-Djdk.attach.allowAttachSelf=true');
    }
    return args;
}

export function describeJava(installation: JavaInstallation): string {
    return `Java ${installation.majorVersion} (source: ${installation.source}, path: ${installation.javaPath})`;
}

export async function showUnsupportedJavaWarning(error: JavaVersionError): Promise<void> {
    const action = await vscode.window.showWarningMessage(
        error.message,
        'Configure Java Home',
        'Open Settings'
    );
    if (action === 'Configure Java Home' || action === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'galasa.javaHome');
    }
}
