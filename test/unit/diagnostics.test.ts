import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { EventEmitter } from 'events';
import { collectDiagnostics, formatDiagnostics } from '../../src/utils/diagnostics';
import { state, resetState } from '../_helpers/vscodeStub';

function fakeChild(stdout: string, stderr: string, code: number) {
    const c: any = new EventEmitter();
    c.stdout = new EventEmitter();
    c.stderr = new EventEmitter();
    setImmediate(() => {
        if (stdout) c.stdout.emit('data', Buffer.from(stdout));
        if (stderr) c.stderr.emit('data', Buffer.from(stderr));
        c.emit('close', code);
    });
    return c;
}

describe('diagnostics — collectDiagnostics', () => {
    let spawnSyncStub: sinon.SinonStub;
    let spawnStub: sinon.SinonStub;
    let existsStub: sinon.SinonStub;

    beforeEach(() => {
        resetState();
        delete process.env.JAVA_HOME;
        delete process.env.GALASA_HOME;
        spawnSyncStub = sinon.stub(childProcess, 'spawnSync');
        spawnStub = sinon.stub(childProcess, 'spawn');
        existsStub = sinon.stub(fs, 'existsSync');
    });
    afterEach(() => {
        spawnSyncStub.restore();
        spawnStub.restore();
        existsStub.restore();
    });

    it('reports all-green when Java + CLI both work', async () => {
        state.config['galasa.javaHome'] = '/opt/jdk21';
        state.config['galasa.home'] = '/tmp/galasa';
        existsStub.callsFake((p: string) => p === '/opt/jdk21/bin/java' || p === '/tmp/galasa');
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'openjdk version "21.0.2"', status: 0, signal: null, output: [], pid: 0 } as any);
        spawnStub.returns(fakeChild('galasactl 0.45.0\n', '', 0));

        const snap = await collectDiagnostics();
        expect(snap.java.detected).to.equal(true);
        expect(snap.java.major).to.equal(21);
        expect(snap.java.supported).to.equal(true);
        expect(snap.cli.available).to.equal(true);
        expect(snap.cli.version).to.contain('galasactl');
        expect(snap.galasaHome).to.equal('/tmp/galasa');
        expect(snap.galasaHomeExists).to.equal(true);
    });

    it('reports java NOT detected when no candidate works', async () => {
        existsStub.callsFake(() => false);
        spawnSyncStub.returns({ error: new Error('not found'), stdout: '', stderr: '', status: -1, signal: null, output: [], pid: 0 } as any);
        spawnStub.returns(fakeChild('', 'cli missing', 127));

        const snap = await collectDiagnostics();
        expect(snap.java.detected).to.equal(false);
        expect(snap.java.supported).to.equal(false);
        expect(snap.cli.available).to.equal(false);
    });

    it('reports unsupported Java when version outside range', async () => {
        process.env.JAVA_HOME = '/opt/jdk7';
        existsStub.callsFake((p: string) => p === '/opt/jdk7/bin/java');
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'java version "1.7.0_80"', status: 0, signal: null, output: [], pid: 0 } as any);
        spawnStub.returns(fakeChild('', '', 0));

        const snap = await collectDiagnostics();
        expect(snap.java.detected).to.equal(true);
        expect(snap.java.major).to.equal(7);
        expect(snap.java.supported).to.equal(false);
    });
});

describe('diagnostics — formatDiagnostics', () => {
    it('shows extension version when supplied', () => {
        const out = formatDiagnostics({
            java: { detected: false, supported: false, rangeMin: 8, rangeMax: 26 },
            cli: { executable: 'galasactl', available: false },
            galasaHome: '/g', galasaHomeExists: false,
            extensionVersion: '0.15.0',
        });
        expect(out).to.contain('Extension version : 0.15.0');
        expect(out).to.contain('Java runtime     : NOT DETECTED');
        expect(out).to.contain('Available        : NO');
        expect(out).to.contain('GALASA_HOME      : /g');
    });

    it('renders supported java with full block', () => {
        const out = formatDiagnostics({
            java: { detected: true, supported: true, major: 17, source: 'PATH', path: '/usr/bin/java', rangeMin: 8, rangeMax: 26 },
            cli: { executable: 'galasactl', available: true, version: 'galasactl 1.0.0' },
            galasaHome: '/g', galasaHomeExists: true,
        });
        expect(out).to.contain('Major version    : 17');
        expect(out).to.contain('Source           : PATH');
        expect(out).to.contain('Supported        : yes');
        expect(out).to.contain('--version output : galasactl 1.0.0');
        expect(out).to.contain('Bootstrap        : (default)');
    });
});
