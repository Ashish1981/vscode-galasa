import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { describeStatus } from '../../src/utils/statusBar';
import { state, resetState } from '../_helpers/vscodeStub';

describe('statusBar.describeStatus', () => {
    let spawnSyncStub: sinon.SinonStub;
    let existsStub: sinon.SinonStub;

    beforeEach(() => {
        resetState();
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
        spawnSyncStub.returns({ error: new Error('not found'), stdout: '', stderr: '', status: -1, signal: null, output: [], pid: 0 } as any);
        const s = describeStatus();
        expect(s.warn).to.equal(true);
        expect(s.text).to.contain('no Java');
    });

    it('warns when Java is unsupported (e.g. v7)', () => {
        process.env.JAVA_HOME = '/opt/j7';
        existsStub.callsFake(() => true);
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'java version "1.7.0"', status: 0, signal: null, output: [], pid: 0 } as any);
        const s = describeStatus();
        expect(s.warn).to.equal(true);
        expect(s.text).to.contain('unsupported');
    });

    it('green when Java is in range', () => {
        process.env.JAVA_HOME = '/opt/j21';
        existsStub.callsFake(() => true);
        spawnSyncStub.returns({ error: undefined, stdout: '', stderr: 'openjdk version "21.0.2"', status: 0, signal: null, output: [], pid: 0 } as any);
        const s = describeStatus();
        expect(s.warn).to.equal(false);
        expect(s.text).to.contain('Java 21');
    });
});
