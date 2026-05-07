"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const fs = require("fs");
const childProcess = require("child_process");
const path = require("path");
const os = require("os");
const DebugConfigHandler_1 = require("../../src/local/debugger/DebugConfigHandler");
const vscodeStub_1 = require("../_helpers/vscodeStub");
describe('TestCase / GherkinTestCase', () => {
    it('TestCase carries label and pathToFile', () => {
        const t = new DebugConfigHandler_1.TestCase('MyTest', '/x/MyTest.java');
        (0, chai_1.expect)(t.label).to.equal('MyTest');
        (0, chai_1.expect)(t.pathToFile).to.equal('/x/MyTest.java');
    });
    it('GherkinTestCase carries label and uri', () => {
        const fakeUri = { toString: () => 'file:///x/y.feature', fsPath: '/x/y.feature' };
        const g = new DebugConfigHandler_1.GherkinTestCase('y', fakeUri);
        (0, chai_1.expect)(g.label).to.equal('y');
        (0, chai_1.expect)(g.uri.toString()).to.equal('file:///x/y.feature');
    });
});
describe('findTestArtifact', () => {
    let readStub;
    let statStub;
    let readdirStub;
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
        statStub.callsFake((p) => ({ isDirectory: () => p === dir || p === '/repo/bundle' || p === '/repo' }));
        readdirStub.callsFake((p) => p === '/repo/bundle' ? ['pom.xml'] : []);
        readStub.withArgs(path.join('/repo/bundle', 'pom.xml')).returns('<project><artifactId>my.bundle</artifactId><groupId>g</groupId><version>1</version></project>');
        const artifact = (0, DebugConfigHandler_1.findTestArtifact)(new DebugConfigHandler_1.TestCase('MyTest', testFile));
        (0, chai_1.expect)(artifact).to.equal('my.bundle/my.pkg.MyTest');
    });
});
describe('getGalasaVersion', () => {
    let readStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
        readStub = sinon.stub(fs, 'readFileSync');
    });
    afterEach(() => readStub.restore());
    it('returns LATEST → falls back to package.json symbolicversion', () => {
        readStub.withArgs(path.join('/ext', 'package.json')).returns(JSON.stringify({ version: '0.15.0', symbolicversion: '0.15.0' }));
        const ctx = { extensionPath: '/ext' };
        (0, chai_1.expect)((0, DebugConfigHandler_1.getGalasaVersion)(ctx)).to.equal('0.15.0');
    });
    it('returns configured version when not LATEST', () => {
        vscodeStub_1.state.config['galasa.version'] = '0.99.9';
        const ctx = { extensionPath: '/ext' };
        (0, chai_1.expect)((0, DebugConfigHandler_1.getGalasaVersion)(ctx)).to.equal('0.99.9');
    });
});
describe('debug VM args integration smoke (via JavaVersion getRequiredVmArgs)', () => {
    it('Java major numbers across the 8-26 range each produce a deterministic arg set', () => {
        // Cross-cuts the JavaVersion contract from the debugger consumer's perspective.
        const { getRequiredVmArgs } = require('../../src/utils/JavaVersion');
        for (let v = 8; v <= 26; v++) {
            const args = getRequiredVmArgs(v);
            (0, chai_1.expect)(args).to.be.an('array');
            if (v < 9)
                (0, chai_1.expect)(args.length).to.equal(0);
            if (v >= 9)
                (0, chai_1.expect)(args.some((a) => a.startsWith('--add-opens'))).to.equal(true);
            if (v >= 17)
                (0, chai_1.expect)(args).to.include('-Djava.security.manager=allow');
            if (v >= 21)
                (0, chai_1.expect)(args).to.include('-Djdk.attach.allowAttachSelf=true');
        }
    });
});
// silence unused-var lint warnings on imports kept for typing:
void childProcess;
void os;
//# sourceMappingURL=DebugConfigHandler.test.js.map