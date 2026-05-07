"use strict";
// In-memory vscode API stub. Sufficient for unit-testing modules that do
// `import * as vscode from 'vscode'`. Anything not modeled here is left as a
// no-op to keep tests fast and deterministic.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetState = exports.state = void 0;
exports.state = {
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
function resetState() {
    exports.state.config = {};
    exports.state.inputBoxQueue = [];
    exports.state.quickPickQueue = [];
    exports.state.warningResponses = [];
    exports.state.showInformationMessageCalls = [];
    exports.state.showErrorMessageCalls = [];
    exports.state.showWarningMessageCalls = [];
    exports.state.registeredCommands = {};
    exports.state.output = { lines: [], shown: false };
}
exports.resetState = resetState;
function getNested(obj, dotted) {
    const parts = dotted.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur === undefined || cur === null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
const vscodeStub = {
    workspace: {
        getConfiguration(section) {
            return {
                get(key, defaultValue) {
                    const fullKey = section ? `${section}.${key}` : key;
                    const direct = exports.state.config[fullKey];
                    if (direct !== undefined)
                        return direct;
                    const nested = getNested(exports.state.config, fullKey);
                    if (nested !== undefined)
                        return nested;
                    return defaultValue;
                },
                has(key) {
                    const fullKey = section ? `${section}.${key}` : key;
                    return exports.state.config[fullKey] !== undefined || getNested(exports.state.config, fullKey) !== undefined;
                },
                update(_key, _value) {
                    return Promise.resolve();
                },
            };
        },
        findFiles() {
            return Promise.resolve([]);
        },
        onDidChangeConfiguration(_listener) {
            return { dispose() { } };
        },
        get workspaceFolders() {
            return exports.state.config['_workspaceFolders'];
        },
        openTextDocument() { return Promise.resolve({}); },
        createFileSystemWatcher() {
            return { onDidCreate() { }, dispose() { } };
        },
    },
    window: {
        showInputBox(opts) {
            const value = exports.state.inputBoxQueue.length > 0 ? exports.state.inputBoxQueue.shift() : undefined;
            void opts;
            return Promise.resolve(value);
        },
        showQuickPick() {
            const value = exports.state.quickPickQueue.length > 0 ? exports.state.quickPickQueue.shift() : undefined;
            return Promise.resolve(value);
        },
        showInformationMessage(...args) {
            exports.state.showInformationMessageCalls.push(args);
            return Promise.resolve(undefined);
        },
        showErrorMessage(...args) {
            exports.state.showErrorMessageCalls.push(args);
            return Promise.resolve(undefined);
        },
        showWarningMessage(...args) {
            exports.state.showWarningMessageCalls.push(args);
            const value = exports.state.warningResponses.length > 0 ? exports.state.warningResponses.shift() : undefined;
            return Promise.resolve(value);
        },
        createOutputChannel(_name) {
            return {
                appendLine(line) { exports.state.output.lines.push(line); },
                append(line) { exports.state.output.lines.push(line); },
                show() { exports.state.output.shown = true; },
                dispose() { },
                clear() { exports.state.output.lines.length = 0; },
            };
        },
        createTerminal() {
            return { show() { }, sendText(_t) { }, dispose() { } };
        },
        createStatusBarItem() {
            return {
                show() { }, hide() { }, dispose() { },
                text: '', tooltip: '', backgroundColor: undefined, command: undefined,
            };
        },
        createWebviewPanel() {
            return { webview: { html: '' }, dispose() { }, onDidDispose() { } };
        },
        registerTreeDataProvider() { return { dispose() { } }; },
        get activeTextEditor() { return undefined; },
        get activeColorTheme() { return { kind: 1 }; },
    },
    commands: {
        registerCommand(name, handler) {
            exports.state.registeredCommands[name] = handler;
            return { dispose() { delete exports.state.registeredCommands[name]; } };
        },
        executeCommand: () => Promise.resolve(),
    },
    debug: {
        startDebugging: () => Promise.resolve(true),
        registerDebugConfigurationProvider: () => ({ dispose() { } }),
    },
    languages: {
        registerCodeLensProvider: () => ({ dispose() { } }),
    },
    extensions: {
        getExtension: () => undefined,
    },
    Uri: {
        parse: (s) => ({
            toString: () => s,
            fsPath: s.startsWith('file://') ? s.substring('file://'.length) : s,
            scheme: s.split(':')[0] || 'file',
        }),
        file: (p) => ({ toString: () => `file://${p}`, fsPath: p, scheme: 'file' }),
    },
    ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2, Three: 3 },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: class {
        constructor(id) {
            this.id = id;
        }
    },
    EventEmitter: class {
        constructor() {
            this.listeners = [];
        }
        get event() {
            return (l) => { this.listeners.push(l); return { dispose: () => { } }; };
        }
        fire(d) { for (const l of this.listeners)
            l(d); }
        dispose() { }
    },
    TreeItem: class {
        constructor(label, collapsibleState) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    },
};
exports.default = vscodeStub;
//# sourceMappingURL=vscodeStub.js.map