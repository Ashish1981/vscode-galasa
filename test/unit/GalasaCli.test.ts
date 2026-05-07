import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as childProcess from 'child_process';
import { EventEmitter } from 'events';
import {
    getConfiguredCliPath,
    resolveCliExecutable,
    getGalasaHome,
    getBootstrap,
    buildCommonEnv,
    appendBootstrapArg,
    appendGalasaHomeArg,
    runGalasaCli,
    ensureCliAvailable,
    logCliResult,
    getOutputChannel,
    getConfiguredCliTimeoutMs,
    DEFAULT_CLI_TIMEOUT_MS,
} from '../../src/cli/GalasaCli';
import { state, resetState } from '../_helpers/vscodeStub';

describe('GalasaCli — config helpers', () => {
    beforeEach(() => resetState());

    it('getConfiguredCliPath returns undefined when not set', () => {
        expect(getConfiguredCliPath()).to.equal(undefined);
    });

    it('getConfiguredCliPath returns undefined for whitespace-only', () => {
        state.config['galasa.cliPath'] = '   ';
        expect(getConfiguredCliPath()).to.equal(undefined);
    });

    it('getConfiguredCliPath trims surrounding whitespace', () => {
        state.config['galasa.cliPath'] = '  /opt/galasactl  ';
        expect(getConfiguredCliPath()).to.equal('/opt/galasactl');
    });

    describe('getGalasaHome priority', () => {
        afterEach(() => {
            delete process.env.GALASA_HOME;
        });

        it('returns trimmed galasa.home config when set', () => {
            state.config['galasa.home'] = '  /tmp/galasa  ';
            expect(getGalasaHome()).to.equal('/tmp/galasa');
        });

        it('falls back to GALASA_HOME env var', () => {
            process.env.GALASA_HOME = '/env/galasa';
            expect(getGalasaHome()).to.equal('/env/galasa');
        });

        it('defaults to ~/.galasa when neither set', () => {
            const home = os.homedir();
            expect(getGalasaHome()).to.equal(path.join(home, '.galasa'));
        });
    });

    describe('getBootstrap priority', () => {
        afterEach(() => {
            delete process.env.GALASA_BOOTSTRAP;
        });

        it('returns trimmed galasa.bootstrap config', () => {
            state.config['galasa.bootstrap'] = '  https://example/bootstrap.properties  ';
            expect(getBootstrap()).to.equal('https://example/bootstrap.properties');
        });

        it('falls back to GALASA_BOOTSTRAP env var', () => {
            process.env.GALASA_BOOTSTRAP = 'file:///etc/bootstrap.properties';
            expect(getBootstrap()).to.equal('file:///etc/bootstrap.properties');
        });

        it('returns undefined when neither set', () => {
            expect(getBootstrap()).to.equal(undefined);
        });
    });

    describe('buildCommonEnv', () => {
        afterEach(() => {
            delete process.env.GALASA_HOME;
            delete process.env.GALASA_BOOTSTRAP;
        });

        it('always sets GALASA_HOME', () => {
            const env = buildCommonEnv();
            expect(env.GALASA_HOME).to.be.a('string').and.not.empty;
        });

        it('sets GALASA_BOOTSTRAP only when configured', () => {
            const env = buildCommonEnv();
            expect(env.GALASA_BOOTSTRAP).to.equal(undefined);
            state.config['galasa.bootstrap'] = 'file:///x';
            const env2 = buildCommonEnv();
            expect(env2.GALASA_BOOTSTRAP).to.equal('file:///x');
        });
    });
});

describe('GalasaCli — argv helpers', () => {
    beforeEach(() => resetState());

    afterEach(() => {
        delete process.env.GALASA_BOOTSTRAP;
    });

    it('appendBootstrapArg appends when bootstrap is configured', () => {
        state.config['galasa.bootstrap'] = 'file:///b';
        const out = appendBootstrapArg(['runs', 'get']);
        expect(out).to.deep.equal(['runs', 'get', '--bootstrap', 'file:///b']);
    });

    it('appendBootstrapArg leaves untouched when nothing configured', () => {
        const out = appendBootstrapArg(['runs', 'get']);
        expect(out).to.deep.equal(['runs', 'get']);
    });

    it('appendBootstrapArg does not duplicate existing --bootstrap', () => {
        state.config['galasa.bootstrap'] = 'file:///b';
        const out = appendBootstrapArg(['runs', 'get', '--bootstrap', 'file:///already']);
        expect(out).to.deep.equal(['runs', 'get', '--bootstrap', 'file:///already']);
    });

    it('appendGalasaHomeArg appends --galasahome with resolved home', () => {
        state.config['galasa.home'] = '/tmp/g';
        const out = appendGalasaHomeArg(['runs', 'get']);
        expect(out).to.deep.equal(['runs', 'get', '--galasahome', '/tmp/g']);
    });

    it('appendGalasaHomeArg does not duplicate', () => {
        state.config['galasa.home'] = '/tmp/g';
        const out = appendGalasaHomeArg(['runs', 'get', '--galasahome', '/explicit']);
        expect(out).to.deep.equal(['runs', 'get', '--galasahome', '/explicit']);
    });
});

describe('GalasaCli — resolveCliExecutable', () => {
    let existsStub: sinon.SinonStub;
    beforeEach(() => {
        resetState();
        existsStub = sinon.stub(fs, 'existsSync');
    });
    afterEach(() => existsStub.restore());

    it('returns "galasactl" or "galasactl.exe" when nothing configured', () => {
        const exe = resolveCliExecutable();
        expect(exe === 'galasactl' || exe === 'galasactl.exe').to.equal(true);
    });

    it('uses configured path verbatim if it exists as a file', () => {
        state.config['galasa.cliPath'] = '/opt/galasactl-bin';
        existsStub.callsFake((p: string) => p === '/opt/galasactl-bin');
        expect(resolveCliExecutable()).to.equal('/opt/galasactl-bin');
    });

    it('treats configured path as directory and joins binary name', () => {
        const dir = '/opt/cli-dir';
        const expected = path.join(dir, os.platform() === 'win32' ? 'galasactl.exe' : 'galasactl');
        state.config['galasa.cliPath'] = dir;
        existsStub.callsFake((p: string) => p === expected);
        const exe = resolveCliExecutable();
        expect(exe).to.equal(expected);
    });

    it('falls through to configured value when nothing exists', () => {
        state.config['galasa.cliPath'] = '/nope';
        existsStub.callsFake(() => false);
        expect(resolveCliExecutable()).to.equal('/nope');
    });
});

describe('GalasaCli — runGalasaCli', () => {
    let spawnStub: sinon.SinonStub;
    beforeEach(() => {
        resetState();
        spawnStub = sinon.stub(childProcess, 'spawn');
    });
    afterEach(() => spawnStub.restore());

    function fakeChild(stdout: string, stderr: string, code: number): any {
        const child: any = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        setImmediate(() => {
            if (stdout) child.stdout.emit('data', Buffer.from(stdout));
            if (stderr) child.stderr.emit('data', Buffer.from(stderr));
            child.emit('close', code);
        });
        return child;
    }

    it('captures stdout, stderr, and exit code', async () => {
        spawnStub.returns(fakeChild('hello', 'oops', 0));
        const r = await runGalasaCli(['--version']);
        expect(r.code).to.equal(0);
        expect(r.stdout).to.equal('hello');
        expect(r.stderr).to.equal('oops');
    });

    it('reports non-zero exit codes', async () => {
        spawnStub.returns(fakeChild('', 'failure', 2));
        const r = await runGalasaCli(['runs', 'get']);
        expect(r.code).to.equal(2);
        expect(r.stderr).to.equal('failure');
    });

    it('handles spawn-error', async () => {
        const child: any = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        spawnStub.returns(child);
        const promise = runGalasaCli(['x']);
        setImmediate(() => child.emit('error', new Error('ENOENT')));
        const r = await promise;
        expect(r.code).to.equal(-1);
        expect(r.stderr).to.contain('ENOENT');
    });
});

describe('GalasaCli — ensureCliAvailable', () => {
    let spawnStub: sinon.SinonStub;
    beforeEach(() => {
        resetState();
        spawnStub = sinon.stub(childProcess, 'spawn');
    });
    afterEach(() => spawnStub.restore());

    function ok() {
        const c: any = new EventEmitter();
        c.stdout = new EventEmitter(); c.stderr = new EventEmitter();
        setImmediate(() => { c.stdout.emit('data', Buffer.from('v0.1.0')); c.emit('close', 0); });
        return c;
    }
    function bad() {
        const c: any = new EventEmitter();
        c.stdout = new EventEmitter(); c.stderr = new EventEmitter();
        setImmediate(() => { c.stderr.emit('data', Buffer.from('not found')); c.emit('close', 127); });
        return c;
    }

    it('returns true on exit 0', async () => {
        spawnStub.returns(ok());
        expect(await ensureCliAvailable()).to.equal(true);
        expect(state.showWarningMessageCalls.length).to.equal(0);
    });

    it('returns false and warns on non-zero exit', async () => {
        spawnStub.returns(bad());
        expect(await ensureCliAvailable()).to.equal(false);
        expect(state.showWarningMessageCalls.length).to.be.greaterThan(0);
    });
});

describe('GalasaCli — output channel', () => {
    beforeEach(() => resetState());

    it('getOutputChannel returns a channel that records lines', () => {
        const ch = getOutputChannel();
        ch.appendLine('hello');
        expect(state.output.lines).to.include('hello');
    });

    it('logCliResult prints exit code and both streams', () => {
        resetState();
        // re-load to clear cached output state if necessary
        const ch = getOutputChannel();
        void ch;
        logCliResult('mylabel', { code: 5, stdout: 'OUT\n', stderr: 'ERR\n' });
        const joined = state.output.lines.join('\n');
        expect(joined).to.contain('mylabel');
        expect(joined).to.contain('exit code: 5');
        expect(joined).to.contain('OUT');
        expect(joined).to.contain('ERR');
    });
});

describe('GalasaCli — getConfiguredCliTimeoutMs', () => {
    beforeEach(() => resetState());

    it('returns the default when nothing configured', () => {
        expect(getConfiguredCliTimeoutMs()).to.equal(DEFAULT_CLI_TIMEOUT_MS);
    });

    it('returns configured value when set', () => {
        state.config['galasa.cliTimeoutMs'] = 30000;
        expect(getConfiguredCliTimeoutMs()).to.equal(30000);
    });

    it('floors fractional values', () => {
        state.config['galasa.cliTimeoutMs'] = 12345.7;
        expect(getConfiguredCliTimeoutMs()).to.equal(12345);
    });

    it('falls back to default when configured value is non-positive', () => {
        state.config['galasa.cliTimeoutMs'] = 0;
        expect(getConfiguredCliTimeoutMs()).to.equal(DEFAULT_CLI_TIMEOUT_MS);
        state.config['galasa.cliTimeoutMs'] = -100;
        expect(getConfiguredCliTimeoutMs()).to.equal(DEFAULT_CLI_TIMEOUT_MS);
    });

    it('falls back to default for non-numeric configured value', () => {
        state.config['galasa.cliTimeoutMs'] = 'fast' as any;
        expect(getConfiguredCliTimeoutMs()).to.equal(DEFAULT_CLI_TIMEOUT_MS);
    });

    it('falls back to default for NaN/Infinity', () => {
        state.config['galasa.cliTimeoutMs'] = NaN;
        expect(getConfiguredCliTimeoutMs()).to.equal(DEFAULT_CLI_TIMEOUT_MS);
        state.config['galasa.cliTimeoutMs'] = Infinity;
        expect(getConfiguredCliTimeoutMs()).to.equal(DEFAULT_CLI_TIMEOUT_MS);
    });
});

describe('GalasaCli — runGalasaCli timeout behaviour', () => {
    let spawnStub: sinon.SinonStub;
    beforeEach(() => {
        resetState();
        spawnStub = sinon.stub(childProcess, 'spawn');
    });
    afterEach(() => spawnStub.restore());

    it('kills the child and returns exit code -2 on timeout', async () => {
        const child: any = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        let killed = false;
        child.kill = () => {
            killed = true;
            setImmediate(() => child.emit('close', null));
        };
        spawnStub.returns(child);
        const r = await runGalasaCli(['runs', 'get'], { timeoutMs: 30 });
        expect(killed).to.equal(true);
        expect(r.code).to.equal(-2);
        expect(r.stderr).to.contain('Timed out after 30ms');
    });

    it('completes normally when work finishes before timeout', async () => {
        const child: any = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        spawnStub.returns(child);
        const promise = runGalasaCli(['x'], { timeoutMs: 5000 });
        setImmediate(() => {
            child.stdout.emit('data', Buffer.from('done'));
            child.emit('close', 0);
        });
        const r = await promise;
        expect(r.code).to.equal(0);
        expect(r.stdout).to.equal('done');
    });

    it('disables timeout when explicitly 0 (process completes normally)', async () => {
        const child: any = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        spawnStub.returns(child);
        const promise = runGalasaCli(['x'], { timeoutMs: 0 });
        setImmediate(() => child.emit('close', 0));
        const r = await promise;
        expect(r.code).to.equal(0);
    });
});
