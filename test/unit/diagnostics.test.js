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
const childProcess = require("child_process");
const events_1 = require("events");
const diagnostics_1 = require("../../src/utils/diagnostics");
const vscodeStub_1 = require("../_helpers/vscodeStub");
function fakeChild(stdout, stderr, code) {
    const c = new events_1.EventEmitter();
    c.stdout = new events_1.EventEmitter();
    c.stderr = new events_1.EventEmitter();
    setImmediate(() => {
        if (stdout)
            c.stdout.emit('data', Buffer.from(stdout));
        if (stderr)
            c.stderr.emit('data', Buffer.from(stderr));
        c.emit('close', code);
    });
    return c;
}
describe('diagnostics — collectDiagnostics', () => {
    let spawnSyncStub;
    let spawnStub;
    let existsStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
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
    it('reports all-green when Java + CLI both work', () => __awaiter(void 0, void 0, void 0, function* () {
        vscodeStub_1.state.config['galasa.javaHome'] = '/opt/jdk21';
        vscodeStub_1.state.config['galasa.home'] = '/tmp/galasa';
        existsStub.callsFake((p) => p === '/opt/jdk21/bin/java' || p === '/tmp/galasa');
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'openjdk version "21.0.2"', status: 0, signal: null, output: [], pid: 0 });
        spawnStub.returns(fakeChild('galasactl 0.45.0\n', '', 0));
        const snap = yield (0, diagnostics_1.collectDiagnostics)();
        (0, chai_1.expect)(snap.java.detected).to.equal(true);
        (0, chai_1.expect)(snap.java.major).to.equal(21);
        (0, chai_1.expect)(snap.java.supported).to.equal(true);
        (0, chai_1.expect)(snap.cli.available).to.equal(true);
        (0, chai_1.expect)(snap.cli.version).to.contain('galasactl');
        (0, chai_1.expect)(snap.galasaHome).to.equal('/tmp/galasa');
        (0, chai_1.expect)(snap.galasaHomeExists).to.equal(true);
    }));
    it('reports java NOT detected when no candidate works', () => __awaiter(void 0, void 0, void 0, function* () {
        existsStub.callsFake(() => false);
        spawnSyncStub.returns({ error: new Error('not found'), stdout: '', stderr: '', status: -1, signal: null, output: [], pid: 0 });
        spawnStub.returns(fakeChild('', 'cli missing', 127));
        const snap = yield (0, diagnostics_1.collectDiagnostics)();
        (0, chai_1.expect)(snap.java.detected).to.equal(false);
        (0, chai_1.expect)(snap.java.supported).to.equal(false);
        (0, chai_1.expect)(snap.cli.available).to.equal(false);
    }));
    it('reports unsupported Java when version outside range', () => __awaiter(void 0, void 0, void 0, function* () {
        process.env.JAVA_HOME = '/opt/jdk7';
        existsStub.callsFake((p) => p === '/opt/jdk7/bin/java');
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'java version "1.7.0_80"', status: 0, signal: null, output: [], pid: 0 });
        spawnStub.returns(fakeChild('', '', 0));
        const snap = yield (0, diagnostics_1.collectDiagnostics)();
        (0, chai_1.expect)(snap.java.detected).to.equal(true);
        (0, chai_1.expect)(snap.java.major).to.equal(7);
        (0, chai_1.expect)(snap.java.supported).to.equal(false);
    }));
});
describe('diagnostics — formatDiagnostics', () => {
    it('shows extension version when supplied', () => {
        const out = (0, diagnostics_1.formatDiagnostics)({
            java: { detected: false, supported: false, rangeMin: 8, rangeMax: 26 },
            cli: { executable: 'galasactl', available: false },
            galasaHome: '/g', galasaHomeExists: false,
            extensionVersion: '0.15.0',
        });
        (0, chai_1.expect)(out).to.contain('Extension version : 0.15.0');
        (0, chai_1.expect)(out).to.contain('Java runtime     : NOT DETECTED');
        (0, chai_1.expect)(out).to.contain('Available        : NO');
        (0, chai_1.expect)(out).to.contain('GALASA_HOME      : /g');
    });
    it('renders supported java with full block', () => {
        const out = (0, diagnostics_1.formatDiagnostics)({
            java: { detected: true, supported: true, major: 17, source: 'PATH', path: '/usr/bin/java', rangeMin: 8, rangeMax: 26 },
            cli: { executable: 'galasactl', available: true, version: 'galasactl 1.0.0' },
            galasaHome: '/g', galasaHomeExists: true,
        });
        (0, chai_1.expect)(out).to.contain('Major version    : 17');
        (0, chai_1.expect)(out).to.contain('Source           : PATH');
        (0, chai_1.expect)(out).to.contain('Supported        : yes');
        (0, chai_1.expect)(out).to.contain('--version output : galasactl 1.0.0');
        (0, chai_1.expect)(out).to.contain('Bootstrap        : (default)');
    });
});
//# sourceMappingURL=diagnostics.test.js.map