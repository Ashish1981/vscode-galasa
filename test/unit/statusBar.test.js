"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const fs = require("fs");
const childProcess = require("child_process");
const statusBar_1 = require("../../src/utils/statusBar");
const vscodeStub_1 = require("../_helpers/vscodeStub");
describe('statusBar.describeStatus', () => {
    let spawnSyncStub;
    let existsStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
        delete process.env.JAVA_HOME;
        spawnSyncStub = sinon.stub(childProcess, 'spawnSync');
        existsStub = sinon.stub(fs, 'existsSync');
    });
    afterEach(() => {
        spawnSyncStub.restore();
        existsStub.restore();
    });
    it('warns when Java is missing', () => {
        existsStub.callsFake(() => false);
        spawnSyncStub.returns({ error: new Error('not found'), stdout: '', stderr: '', status: -1, signal: null, output: [], pid: 0 });
        const s = (0, statusBar_1.describeStatus)();
        (0, chai_1.expect)(s.warn).to.equal(true);
        (0, chai_1.expect)(s.text).to.contain('no Java');
    });
    it('warns when Java is unsupported (e.g. v7)', () => {
        process.env.JAVA_HOME = '/opt/j7';
        existsStub.callsFake(() => true);
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'java version "1.7.0"', status: 0, signal: null, output: [], pid: 0 });
        const s = (0, statusBar_1.describeStatus)();
        (0, chai_1.expect)(s.warn).to.equal(true);
        (0, chai_1.expect)(s.text).to.contain('unsupported');
    });
    it('green when Java is in range', () => {
        process.env.JAVA_HOME = '/opt/j21';
        existsStub.callsFake(() => true);
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'openjdk version "21.0.2"', status: 0, signal: null, output: [], pid: 0 });
        const s = (0, statusBar_1.describeStatus)();
        (0, chai_1.expect)(s.warn).to.equal(false);
        (0, chai_1.expect)(s.text).to.contain('Java 21');
    });
});
//# sourceMappingURL=statusBar.test.js.map