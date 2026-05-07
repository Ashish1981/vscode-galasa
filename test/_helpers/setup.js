"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mocha root setup. Resolves `import 'vscode'` to our in-memory stub. The
// helper module itself keeps its real named exports (`state`, `resetState`).
const Module = require('module');
const vscodeStub_1 = require("./vscodeStub");
const stubFakePath = require.resolve('./vscodeStub') + '#vscode-virtual';
require.cache[stubFakePath] = {
    id: stubFakePath,
    filename: stubFakePath,
    loaded: true,
    exports: vscodeStub_1.default,
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
    if (request === 'vscode') {
        return stubFakePath;
    }
    return origResolve.call(this, request, parent, ...rest);
};
//# sourceMappingURL=setup.js.map