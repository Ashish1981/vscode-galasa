import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as os from 'os';
import {
    TestCase,
    GherkinTestCase,
    findTestArtifact,
    getGalasaVersion,
} from '../../src/local/debugger/DebugConfigHandler';
import { state, resetState } from '../_helpers/vscodeStub';

describe('TestCase / GherkinTestCase', () => {
    it('TestCase carries label and pathToFile', () => {
        const t = new TestCase('MyTest', '/x/MyTest.java');
        expect(t.label).to.equal('MyTest');
        expect(t.pathToFile).to.equal('/x/MyTest.java');
    });
    it('GherkinTestCase carries label and uri', () => {
        const fakeUri = { toString: () => 'file:///x/y.feature', fsPath: '/x/y.feature' } as any;
        const g = new GherkinTestCase('y', fakeUri);
        expect(g.label).to.equal('y');
        expect(g.uri.toString()).to.equal('file:///x/y.feature');
    });
});

describe('findTestArtifact', () => {
    let readStub: sinon.SinonStub;
    let statStub: sinon.SinonStub;
    let readdirStub: sinon.SinonStub;

    beforeEach(() => {
        readStub = sinon.stub(fs, 'readFileSync');
        statStub = sinon.stub(fs, 'statSync');
        readdirStub = sinon.stub(fs, 'readdirSync');
    });
    afterEach(() => {
        readStub.restore();
        statStub.restore();
        readdirStub.restore();
    });

    it('extracts package and bundle from a typical Galasa test', () => {
        const testFile = '/repo/bundle/src/main/java/my/pkg/MyTest.java';
        const dir = path.dirname(testFile);

        readStub.withArgs(testFile).returns('package my.pkg;\n@Test\nclass MyTest {}');
        statStub.callsFake((p: string) => ({ isDirectory: () => p === dir || p === '/repo/bundle' || p === '/repo' }) as any);
        readdirStub.callsFake((p: string) => p === '/repo/bundle' ? ['pom.xml'] : [] as any);
        readStub.withArgs(path.join('/repo/bundle', 'pom.xml')).returns(
            '<project><artifactId>my.bundle</artifactId><groupId>g</groupId><version>1</version></project>');

        const artifact = findTestArtifact(new TestCase('MyTest', testFile));
        expect(artifact).to.equal('my.bundle/my.pkg.MyTest');
    });
});

describe('getGalasaVersion', () => {
    let readStub: sinon.SinonStub;
    beforeEach(() => {
        resetState();
        readStub = sinon.stub(fs, 'readFileSync');
    });
    afterEach(() => readStub.restore());

    it('returns LATEST → falls back to package.json symbolicversion', () => {
        readStub.withArgs(path.join('/ext', 'package.json')).returns(
            JSON.stringify({ version: '0.15.0', symbolicversion: '0.15.0' }));
        const ctx: any = { extensionPath: '/ext' };
        expect(getGalasaVersion(ctx)).to.equal('0.15.0');
    });

    it('returns configured version when not LATEST', () => {
        state.config['galasa.version'] = '0.99.9';
        const ctx: any = { extensionPath: '/ext' };
        expect(getGalasaVersion(ctx)).to.equal('0.99.9');
    });
});

describe('debug VM args integration smoke (via JavaVersion getRequiredVmArgs)', () => {
    it('Java major numbers across the 8-26 range each produce a deterministic arg set', () => {
        // Cross-cuts the JavaVersion contract from the debugger consumer's perspective.
        const { getRequiredVmArgs } = require('../../src/utils/JavaVersion');
        for (let v = 8; v <= 26; v++) {
            const args = getRequiredVmArgs(v);
            expect(args).to.be.an('array');
            if (v < 9) expect(args.length).to.equal(0);
            if (v >= 9) expect(args.some((a: string) => a.startsWith('--add-opens'))).to.equal(true);
            if (v >= 17) expect(args).to.include('-Djava.security.manager=allow');
            if (v >= 21) expect(args).to.include('-Djdk.attach.allowAttachSelf=true');
        }
    });
});

// silence unused-var lint warnings on imports kept for typing:
void childProcess; void os;
