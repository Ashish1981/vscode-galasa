import * as vscode from 'vscode';
import { detectJava, isVersionSupported } from './JavaVersion';

let statusItem: vscode.StatusBarItem | undefined;

export function describeStatus(): { text: string; tooltip: string; warn: boolean } {
    const java = detectJava();
    if (!java) {
        return {
            text: '$(warning) Galasa: no Java',
            tooltip: 'Galasa: no Java runtime detected. Click for diagnostics.',
            warn: true,
        };
    }
    if (!isVersionSupported(java.majorVersion)) {
        return {
            text: `$(warning) Galasa: Java ${java.majorVersion} unsupported`,
            tooltip: `Galasa: detected Java ${java.majorVersion} is outside the supported range. Click for diagnostics.`,
            warn: true,
        };
    }
    return {
        text: `$(check) Galasa: Java ${java.majorVersion}`,
        tooltip: `Galasa: Java ${java.majorVersion} detected (${java.source}). Click for diagnostics.`,
        warn: false,
    };
}

export function ensureStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
    if (statusItem) {
        return statusItem;
    }
    statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusItem.command = 'galasa.diagnostics';
    context.subscriptions.push(statusItem);
    refreshStatusBar();
    statusItem.show();
    return statusItem;
}

export function refreshStatusBar(): void {
    if (!statusItem) {
        return;
    }
    const s = describeStatus();
    statusItem.text = s.text;
    statusItem.tooltip = s.tooltip;
    statusItem.backgroundColor = s.warn
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
}

export function disposeStatusBarForTests(): void {
    statusItem = undefined;
}
