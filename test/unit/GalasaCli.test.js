"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const fs = require("fs");
const os = require("os");
const childProcess = require("child_process");
const events_1 = require("events");
const GalasaCli_1 = require("../../src/cli/GalasaCli");
const vscodeStub_1 = require("../_helpers/vscodeStub");
describe('GalasaCli — config helpers', () => {
    beforeEach(() => (0, vscodeStub_1.resetState)());
    it('getConfiguredCliPath returns undefined when not set', () => {
        (0, chai_1.expect)((0, GalasaCli_1.getConfiguredCliPath)()).to.equal(undefined);
    });
    it('getConfiguredCliPath returns undefined for whitespace-only', () => {
        vscodeStub_1.state.config['galasa.cliPath'] = '   ';
        (0, chai_1.expect)((0, GalasaCli_1.getConfiguredCliPath)()).to.equal(undefined);
    });
    it('getConfiguredCliPath trims surrounding whitespace', () => {
        vscodeStub_1.state.config['galasa.cliPath'] = '  /opt/galasactl  ';
        (0, chai_1.expect)((0, GalasaCli_1.getConfiguredCliPath)()).to.equal('/opt/galasactl');
    });
    describe('getGalasaHome priority', () => {
        afterEach(() => {
            delete process.env.GALASA_HOME;
        });
        it('returns trimmed galasa.home config when set', () => {
            vscodeStub_1.state.config['galasa.home'] = '  /tmp/galasa  ';
            (0, chai_1.expect)((0, GalasaCli_1.getGalasaHome)()).to.equal('/tmp/galasa');
        });
        it('falls back to GALASA_HOME env var', () => {
            process.env.GALASA_HOME = '/env/galasa';
            (0, chai_1.expect)((0, GalasaCli_1.getGalasaHome)()).to.equal('/env/galasa');
        });
        it('defaults to ~/.galasa when neither set', () => {
            const home = os.homedir();
            (0, chai_1.expect)((0, GalasaCli_1.getGalasaHome)()).to.equal(`${home}/.galasa`.replace(/\\/g, '/').replace(`${home}/.galasa`, `${home}/.galasa`));
        });
    });
    describe('getBootstrap priority', () => {
        afterEach(() => {
            delete process.env.GALASA_BOOTSTRAP;
        });
        it('returns trimmed galasa.bootstrap config', () => {
            vscodeStub_1.state.config['galasa.bootstrap'] = '  https://example/bootstrap.properties  ';
            (0, chai_1.expect)((0, GalasaCli_1.getBootstrap)()).to.equal('https://example/bootstrap.properties');
        });
        it('falls back to GALASA_BOOTSTRAP env var', () => {
            process.env.GALASA_BOOTSTRAP = 'file:///etc/bootstrap.properties';
            (0, chai_1.expect)((0, GalasaCli_1.getBootstrap)()).to.equal('file:///etc/bootstrap.properties');
        });
        it('returns undefined when neither set', () => {
            (0, chai_1.expect)((0, GalasaCli_1.getBootstrap)()).to.equal(undefined);
        });
    });
    describe('buildCommonEnv', () => {
        afterEach(() => {
            delete process.env.GALASA_HOME;
            delete process.env.GALASA_BOOTSTRAP;
        });
        it('always sets GALASA_HOME', () => {
            const env = (0, GalasaCli_1.buildCommonEnv)();
            (0, chai_1.expect)(env.GALASA_HOME).to.be.a('string').and.not.empty;
        });
        it('sets GALASA_BOOTSTRAP only when configured', () => {
            const env = (0, GalasaCli_1.buildCommonEnv)();
            (0, chai_1.expect)(env.GALASA_BOOTSTRAP).to.equal(undefined);
            vscodeStub_1.state.config['galasa.bootstrap'] = 'file:///x';
            const env2 = (0, GalasaCli_1.buildCommonEnv)();
            (0, chai_1.expect)(env2.GALASA_BOOTSTRAP).to.equal('file:///x');
        });
    });
});
describe('GalasaCli — argv helpers', () => {
    beforeEach(() => (0, vscodeStub_1.resetState)());
    afterEach(() => {
        delete process.env.GALASA_BOOTSTRAP;
    });
    it('appendBootstrapArg appends when bootstrap is configured', () => {
        vscodeStub_1.state.config['galasa.bootstrap'] = 'file:///b';
        const out = (0, GalasaCli_1.appendBootstrapArg)(['runs', 'get']);
        (0, chai_1.expect)(out).to.deep.equal(['runs', 'get', '--bootstrap', 'file:///b']);
    });
    it('appendBootstrapArg leaves untouched when nothing configured', () => {
        const out = (0, GalasaCli_1.appendBootstrapArg)(['runs', 'get']);
        (0, chai_1.expect)(out).to.deep.equal(['runs', 'get']);
    });
    it('appendBootstrapArg does not duplicate existing --bootstrap', () => {
        vscodeStub_1.state.config['galasa.bootstrap'] = 'file:///b';
        const out = (0, GalasaCli_1.appendBootstrapArg)(['runs', 'get', '--bootstrap', 'file:///already']);
        (0, chai_1.expect)(out).to.deep.equal(['runs', 'get', '--bootstrap', 'file:///already']);
    });
    it('appendGalasaHomeArg appends --galasahome with resolved home', () => {
        vscodeStub_1.state.config['galasa.home'] = '/tmp/g';
        const out = (0, GalasaCli_1.appendGalasaHomeArg)(['runs', 'get']);
        (0, chai_1.expect)(out).to.deep.equal(['runs', 'get', '--galasahome', '/tmp/g']);
    });
    it('appendGalasaHomeArg does not duplicate', () => {
        vscodeStub_1.state.config['galasa.home'] = '/tmp/g';
        const out = (0, GalasaCli_1.appendGalasaHomeArg)(['runs', 'get', '--galasahome', '/explicit']);
        (0, chai_1.expect)(out).to.deep.equal(['runs', 'get', '--galasahome', '/explicit']);
    });
});
describe('GalasaCli — resolveCliExecutable', () => {
    let existsStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
        existsStub = sinon.stub(fs, 'existsSync');
    });
    afterEach(() => existsStub.restore());
    it('returns "galasactl" or "galasactl.exe" when nothing configured', () => {
        const exe = (0, GalasaCli_1.resolveCliExecutable)();
        (0, chai_1.expect)(exe === 'galasactl' || exe === 'galasactl.exe').to.equal(true);
    });
    it('uses configured path verbatim if it exists as a file', () => {
        vscodeStub_1.state.config['galasa.cliPath'] = '/opt/galasactl-bin';
        existsStub.callsFake((p) => p === '/opt/galasactl-bin');
        (0, chai_1.expect)((0, GalasaCli_1.resolveCliExecutable)()).to.equal('/opt/galasactl-bin');
    });
    it('treats configured path as directory and joins binary name', () => {
        vscodeStub_1.state.config['galasa.cliPath'] = '/opt/cli-dir';
        existsStub.callsFake((p) => p === '/opt/cli-dir/galasactl' || p === '/opt/cli-dir/galasactl.exe');
        const exe = (0, GalasaCli_1.resolveCliExecutable)();
        (0, chai_1.expect)(exe.startsWith('/opt/cli-dir/galasactl')).to.equal(true);
    });
    it('falls through to configured value when nothing exists', () => {
        vscodeStub_1.state.config['galasa.cliPath'] = '/nope';
        existsStub.callsFake(() => false);
        (0, chai_1.expect)((0, GalasaCli_1.resolveCliExecutable)()).to.equal('/nope');
    });
});
describe('GalasaCli — runGalasaCli', () => {
    let spawnStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
        spawnStub = sinon.stub(childProcess, 'spawn');
    });
    afterEach(() => spawnStub.restore());
    function fakeChild(stdout, stderr, code) {
        const child = new events_1.EventEmitter();
        child.stdout = new events_1.EventEmitter();
        child.stderr = new events_1.EventEmitter();
        setImmediate(() => {
            if (stdout)
                child.stdout.emit('data', Buffer.from(stdout));
            if (stderr)
                child.stderr.emit('data', Buffer.from(stderr));
            child.emit('close', code);
        });
        return child;
    }
    it('captures stdout, stderr, and exit code', () => __awaiter(void 0, void 0, void 0, function* () {
        spawnStub.returns(fakeChild('hello', 'oops', 0));
        const r = yield (0, GalasaCli_1.runGalasaCli)(['--version']);
        (0, chai_1.expect)(r.code).to.equal(0);
        (0, chai_1.expect)(r.stdout).to.equal('hello');
        (0, chai_1.expect)(r.stderr).to.equal('oops');
    }));
    it('reports non-zero exit codes', () => __awaiter(void 0, void 0, void 0, function* () {
        spawnStub.returns(fakeChild('', 'failure', 2));
        const r = yield (0, GalasaCli_1.runGalasaCli)(['runs', 'get']);
        (0, chai_1.expect)(r.code).to.equal(2);
        (0, chai_1.expect)(r.stderr).to.equal('failure');
    }));
    it('handles spawn-error', () => __awaiter(void 0, void 0, void 0, function* () {
        const child = new events_1.EventEmitter();
        child.stdout = new events_1.EventEmitter();
        child.stderr = new events_1.EventEmitter();
        spawnStub.returns(child);
        const promise = (0, GalasaCli_1.runGalasaCli)(['x']);
        setImmediate(() => child.emit('error', new Error('ENOENT')));
        const r = yield promise;
        (0, chai_1.expect)(r.code).to.equal(-1);
        (0, chai_1.expect)(r.stderr).to.contain('ENOENT');
    }));
});
describe('GalasaCli — ensureCliAvailable', () => {
    let spawnStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
        spawnStub = sinon.stub(childProcess, 'spawn');
    });
    afterEach(() => spawnStub.restore());
    function ok() {
        const c = new events_1.EventEmitter();
        c.stdout = new events_1.EventEmitter();
        c.stderr = new events_1.EventEmitter();
        setImmediate(() => { c.stdout.emit('data', Buffer.from('v0.1.0')); c.emit('close', 0); });
        return c;
    }
    function bad() {
        const c = new events_1.EventEmitter();
        c.stdout = new events_1.EventEmitter();
        c.stderr = new events_1.EventEmitter();
        setImmediate(() => { c.stderr.emit('data', Buffer.from('not found')); c.emit('close', 127); });
        return c;
    }
    it('returns true on exit 0', () => __awaiter(void 0, void 0, void 0, function* () {
        spawnStub.returns(ok());
        (0, chai_1.expect)(yield (0, GalasaCli_1.ensureCliAvailable)()).to.equal(true);
        (0, chai_1.expect)(vscodeStub_1.state.showWarningMessageCalls.length).to.equal(0);
    }));
    it('returns false and warns on non-zero exit', () => __awaiter(void 0, void 0, void 0, function* () {
        spawnStub.returns(bad());
        (0, chai_1.expect)(yield (0, GalasaCli_1.ensureCliAvailable)()).to.equal(false);
        (0, chai_1.expect)(vscodeStub_1.state.showWarningMessageCalls.length).to.be.greaterThan(0);
    }));
});
describe('GalasaCli — output channel', () => {
    beforeEach(() => (0, vscodeStub_1.resetState)());
    it('getOutputChannel returns a channel that records lines', () => {
        const ch = (0, GalasaCli_1.getOutputChannel)();
        ch.appendLine('hello');
        (0, chai_1.expect)(vscodeStub_1.state.output.lines).to.include('hello');
    });
    it('logCliResult prints exit code and both streams', () => {
        (0, vscodeStub_1.resetState)();
        // re-load to clear cached output state if necessary
        const ch = (0, GalasaCli_1.getOutputChannel)();
        void ch;
        (0, GalasaCli_1.logCliResult)('mylabel', { code: 5, stdout: 'OUT\n', stderr: 'ERR\n' });
        const joined = vscodeStub_1.state.output.lines.join('\n');
        (0, chai_1.expect)(joined).to.contain('mylabel');
        (0, chai_1.expect)(joined).to.contain('exit code: 5');
        (0, chai_1.expect)(joined).to.contain('OUT');
        (0, chai_1.expect)(joined).to.contain('ERR');
    });
});
//# sourceMappingURL=GalasaCli.test.js.map