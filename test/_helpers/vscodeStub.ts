// In-memory vscode API stub. Sufficient for unit-testing modules that do
// `import * as vscode from 'vscode'`. Anything not modeled here is left as a
// no-op to keep tests fast and deterministic.

export type ConfigStore = Record<string, any>;

export interface StubState {
    config: ConfigStore;
    inputBoxQueue: (string | undefined)[];
    quickPickQueue: (string | undefined)[];
    warningResponses: (string | undefined)[];
    showInformationMessageCalls: any[];
    showErrorMessageCalls: any[];
    showWarningMessageCalls: any[];
    registeredCommands: Record<string, (...args: any[]) => any>;
    output: { lines: string[]; shown: boolean };
}

export const state: StubState = {
    config: {},
    inputBoxQueue: [],
    quickPickQueue: [],
    warningResponses: [],
    showInformationMessageCalls: [],
    showErrorMessageCalls: [],
    showWarningMessageCalls: [],
    registeredCommands: {},
    output: { lines: [], shown: false },
};

export function resetState(): void {
    state.config = {};
    state.inputBoxQueue = [];
    state.quickPickQueue = [];
    state.warningResponses = [];
    state.showInformationMessageCalls = [];
    state.showErrorMessageCalls = [];
    state.showWarningMessageCalls = [];
    state.registeredCommands = {};
    state.output = { lines: [], shown: false };
}

function getNested(obj: any, dotted: string): any {
    const parts = dotted.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur === undefined || cur === null) return undefined;
        cur = cur[p];
    }
    return cur;
}

const vscodeStub: any = {
    workspace: {
        getConfiguration(section?: string) {
            return {
                get<T = any>(key: string, defaultValue?: T): T | undefined {
                    const fullKey = section ? `${section}.${key}` : key;
                    const direct = state.config[fullKey];
                    if (direct !== undefined) return direct;
                    const nested = getNested(state.config, fullKey);
                    if (nested !== undefined) return nested;
                    return defaultValue;
                },
                has(key: string): boolean {
                    const fullKey = section ? `${section}.${key}` : key;
                    return state.config[fullKey] !== undefined || getNested(state.config, fullKey) !== undefined;
                },
                update(_key: string, _value: any): Promise<void> {
                    return Promise.resolve();
                },
            };
        },
        findFiles(): Promise<any[]> {
            return Promise.resolve([]);
        },
        onDidChangeConfiguration(_listener: any) {
            return { dispose() {} };
        },
        get workspaceFolders(): any[] | undefined {
            return state.config['_workspaceFolders'];
        },
        openTextDocument(): Promise<any> { return Promise.resolve({}); },
        createFileSystemWatcher() {
            return { onDidCreate() {}, dispose() {} };
        },
    },
    window: {
        showInputBox(opts?: any): Promise<string | undefined> {
            const value = state.inputBoxQueue.length > 0 ? state.inputBoxQueue.shift() : undefined;
            void opts;
            return Promise.resolve(value);
        },
        showQuickPick(): Promise<string | undefined> {
            const value = state.quickPickQueue.length > 0 ? state.quickPickQueue.shift() : undefined;
            return Promise.resolve(value);
        },
        showInformationMessage(...args: any[]): Promise<string | undefined> {
            state.showInformationMessageCalls.push(args);
            return Promise.resolve(undefined);
        },
        showErrorMessage(...args: any[]): Promise<string | undefined> {
            state.showErrorMessageCalls.push(args);
            return Promise.resolve(undefined);
        },
        showWarningMessage(...args: any[]): Promise<string | undefined> {
            state.showWarningMessageCalls.push(args);
            const value = state.warningResponses.length > 0 ? state.warningResponses.shift() : undefined;
            return Promise.resolve(value);
        },
        createOutputChannel(_name: string) {
            return {
                appendLine(line: string) { state.output.lines.push(line); },
                append(line: string) { state.output.lines.push(line); },
                show() { state.output.shown = true; },
                dispose() {},
                clear() { state.output.lines.length = 0; },
            };
        },
        createTerminal() {
            return { show() {}, sendText(_t: string) {}, dispose() {} };
        },
        createStatusBarItem() {
            return {
                show() {}, hide() {}, dispose() {},
                text: '', tooltip: '', backgroundColor: undefined, command: undefined,
            };
        },
        createWebviewPanel() {
            return { webview: { html: '' }, dispose() {}, onDidDispose() {} };
        },
        registerTreeDataProvider() { return { dispose() {} }; },
        get activeTextEditor() { return undefined; },
        get activeColorTheme() { return { kind: 1 }; },
    },
    commands: {
        registerCommand(name: string, handler: (...args: any[]) => any) {
            state.registeredCommands[name] = handler;
            return { dispose() { delete state.registeredCommands[name]; } };
        },
        executeCommand: () => Promise.resolve(),
    },
    debug: {
        startDebugging: () => Promise.resolve(true),
        registerDebugConfigurationProvider: () => ({ dispose() {} }),
    },
    languages: {
        registerCodeLensProvider: () => ({ dispose() {} }),
    },
    extensions: {
        getExtension: () => undefined,
    },
    Uri: {
        parse: (s: string) => ({
            toString: () => s,
            fsPath: s.startsWith('file://') ? s.substring('file://'.length) : s,
            scheme: s.split(':')[0] || 'file',
        }),
        file: (p: string) => ({ toString: () => `file://${p}`, fsPath: p, scheme: 'file' }),
    },
    ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2, Three: 3 },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: class { constructor(public id: string) {} },
    EventEmitter: class {
        listeners: any[] = [];
        get event() {
            return (l: any) => { this.listeners.push(l); return { dispose: () => {} }; };
        }
        fire(d: any) { for (const l of this.listeners) l(d); }
        dispose() {}
    },
    TreeItem: class {
        constructor(public label: string, public collapsibleState?: number) {}
    },
};

export default vscodeStub;
