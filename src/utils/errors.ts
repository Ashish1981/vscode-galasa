import * as vscode from 'vscode';
import { GalasaCliResult } from '../cli/GalasaCli';

export interface CliErrorOptions {
    label: string;
    result: GalasaCliResult;
    hint?: string;
}

export function isCliSuccess(result: GalasaCliResult): boolean {
    return result.code === 0;
}

export function extractCliErrorSummary(result: GalasaCliResult): string {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    const lines = (stderr.length > 0 ? stderr : stdout).split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }
    return `exit code ${result.code}`;
}

export function formatCliError(opts: CliErrorOptions): string {
    const summary = extractCliErrorSummary(opts.result);
    const base = `${opts.label} failed (exit ${opts.result.code}): ${summary}`;
    return opts.hint ? `${base}. ${opts.hint}` : base;
}

export function reportCliError(opts: CliErrorOptions, channel?: vscode.OutputChannel): void {
    const message = formatCliError(opts);
    if (channel) {
        channel.appendLine(`[Galasa] ${message}`);
        if (opts.result.stdout && opts.result.stdout.trim().length > 0) {
            channel.appendLine(opts.result.stdout);
        }
        if (opts.result.stderr && opts.result.stderr.trim().length > 0) {
            channel.appendLine(opts.result.stderr);
        }
    }
    vscode.window.showErrorMessage(message);
}
