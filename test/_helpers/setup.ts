// Mocha root setup. Resolves `import 'vscode'` to our in-memory stub. The
// helper module itself keeps its real named exports (`state`, `resetState`).
const Module = require('module');
import vscodeStub from './vscodeStub';

const stubFakePath = require.resolve('./vscodeStub') + '#vscode-virtual';
require.cache[stubFakePath] = {
    id: stubFakePath,
    filename: stubFakePath,
    loaded: true,
    exports: vscodeStub,
} as any;

const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, parent: any, ...rest: any[]) {
    if (request === 'vscode') {
        return stubFakePath;
    }
    return origResolve.call(this, request, parent, ...rest);
};
