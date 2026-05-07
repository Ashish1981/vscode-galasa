import * as vscode from 'vscode';
import * as fs from 'fs';
import { detectJava, describeJava, isVersionSupported, MAX_SUPPORTED_JAVA, MIN_SUPPORTED_JAVA } from './JavaVersion';
import { getOutputChannel, getGalasaHome, getBootstrap, resolveCliExecutable, runGalasaCli } from '../cli/GalasaCli';

export interface DiagnosticsSnapshot {
    java: {
        detected: boolean;
        path?: string;
        major?: number;
        source?: string;
        supported: boolean;
        rangeMin: number;
        rangeMax: number;
    };
    cli: {
        executable: string;
        configured?: string;
        available: boolean;
        version?: string;
        exitCode?: number;
    };
    galasaHome: string;
    galasaHomeExists: boolean;
    bootstrap?: string;
    extensionVersion?: string;
}

export async function collectDiagnostics(): Promise<DiagnosticsSnapshot> {
    const java = detectJava();
    const cliExe = resolveCliExecutable();
    const cliConfigured = vscode.workspace.getConfiguration('galasa').get<string>('cliPath');

    let cliAvailable = false;
    let cliVersion: string | undefined;
    let cliExit: number | undefined;
    try {
        const result = await runGalasaCli(['--version']);
        cliExit = result.code;
        cliAvailable = result.code === 0;
        if (cliAvailable) {
            cliVersion = (result.stdout || '').trim().split(/\r?\n/)[0] || undefined;
        }
    } catch {
        cliAvailable = false;
    }

    const galasaHome = getGalasaHome();
    return {
        java: {
            detected: !!java,
            path: java?.javaPath,
            major: java?.majorVersion,
            source: java?.source,
            supported: !!java && isVersionSupported(java.majorVersion),
            rangeMin: MIN_SUPPORTED_JAVA,
            rangeMax: MAX_SUPPORTED_JAVA,
        },
        cli: {
            executable: cliExe,
            configured: cliConfigured && cliConfigured.trim().length > 0 ? cliConfigured.trim() : undefined,
            available: cliAvailable,
            version: cliVersion,
            exitCode: cliExit,
        },
        galasaHome,
        galasaHomeExists: fs.existsSync(galasaHome),
        bootstrap: getBootstrap(),
    };
}

export function formatDiagnostics(snap: DiagnosticsSnapshot): string {
    const lines: string[] = [];
    lines.push('=== Galasa Diagnostics ===');
    if (snap.extensionVersion) {
        lines.push(`Extension version : ${snap.extensionVersion}`);
    }
    lines.push('');
    lines.push('-- Java --');
    if (!snap.java.detected) {
        lines.push(`  Java runtime     : NOT DETECTED (need JDK ${snap.java.rangeMin}-${snap.java.rangeMax})`);
    } else {
        const j = snap.java;
        lines.push(`  Major version    : ${j.major}`);
        lines.push(`  Source           : ${j.source}`);
        lines.push(`  Path             : ${j.path}`);
        lines.push(`  Supported        : ${j.supported ? 'yes' : `NO (range ${j.rangeMin}-${j.rangeMax})`}`);
    }
    lines.push('');
    lines.push('-- CLI (galasactl) --');
    lines.push(`  Configured       : ${snap.cli.configured ?? '(none)'}`);
    lines.push(`  Resolved exe     : ${snap.cli.executable}`);
    lines.push(`  Available        : ${snap.cli.available ? 'yes' : 'NO'}`);
    if (snap.cli.version) {
        lines.push(`  --version output : ${snap.cli.version}`);
    } else if (snap.cli.exitCode !== undefined) {
        lines.push(`  --version exit   : ${snap.cli.exitCode}`);
    }
    lines.push('');
    lines.push('-- Galasa Home --');
    lines.push(`  GALASA_HOME      : ${snap.galasaHome}`);
    lines.push(`  Exists           : ${snap.galasaHomeExists ? 'yes' : 'NO'}`);
    lines.push(`  Bootstrap        : ${snap.bootstrap ?? '(default)'}`);
    return lines.join('\n');
}

export async function runDiagnostics(extensionVersion?: string): Promise<void> {
    const snap = await collectDiagnostics();
    snap.extensionVersion = extensionVersion;
    const channel = getOutputChannel();
    channel.appendLine(formatDiagnostics(snap));
    channel.show(true);
}
