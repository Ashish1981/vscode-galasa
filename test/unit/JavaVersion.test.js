"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const childProcess = require("child_process");
const JavaVersion_1 = require("../../src/utils/JavaVersion");
const vscodeStub_1 = require("../_helpers/vscodeStub");
const fs = require("fs");
describe('parseJavaVersion', () => {
    const cases = [
        { label: 'Oracle 1.8.0_392', input: 'java version "1.8.0_392"', expected: 8 },
        { label: 'OpenJDK 1.8.0_402', input: 'openjdk version "1.8.0_402"', expected: 8 },
        { label: 'Oracle 1.8.0', input: 'java version "1.8.0"', expected: 8 },
        { label: 'OpenJDK 9.0.4', input: 'openjdk version "9.0.4"', expected: 9 },
        { label: 'OpenJDK 10.0.2', input: 'openjdk version "10.0.2"', expected: 10 },
        { label: 'OpenJDK 11.0.21', input: 'openjdk version "11.0.21" 2023-10-17', expected: 11 },
        { label: 'Oracle 17 LTS', input: 'java version "17.0.9" 2023-10-17 LTS', expected: 17 },
        { label: 'OpenJDK 21.0.10', input: 'openjdk version "21.0.10" 2026-01-20', expected: 21 },
        { label: 'OpenJDK 22-ea', input: 'openjdk version "22-ea" 2024-03-19', expected: 22 },
        { label: 'OpenJDK 23 GA', input: 'openjdk version "23" 2024-09-17', expected: 23 },
        { label: 'OpenJDK 24-ea+15', input: 'openjdk version "24-ea+15-1234"', expected: 24 },
        { label: 'OpenJDK 25.0.0', input: 'openjdk version "25.0.0" 2025-09-16', expected: 25 },
        { label: 'OpenJDK 26-ea', input: 'openjdk version "26-ea" 2026-03-17', expected: 26 },
        { label: 'OpenJDK 26.0.1+7', input: 'openjdk version "26.0.1+7"', expected: 26 },
        { label: 'multi-line full output', input: 'openjdk version "21.0.2" 2024-01-16\nOpenJDK Runtime Environment\nOpenJDK 64-Bit Server VM', expected: 21 },
        { label: 'leading whitespace', input: '   java version "11.0.10"', expected: 11 },
        { label: 'mixed case Version', input: 'Java Version "17.0.1"', expected: 17 },
        { label: 'no quotes around version', input: 'java version 17.0.1', expected: 17 },
        { label: 'empty string', input: '', expected: undefined },
        { label: 'no version keyword', input: 'this output has no v_word', expected: undefined },
        { label: 'malformed', input: 'java version "abc"', expected: undefined },
    ];
    for (const c of cases) {
        it(`parses ${c.label} -> ${c.expected}`, () => {
            (0, chai_1.expect)((0, JavaVersion_1.parseJavaVersion)(c.input)).to.equal(c.expected);
        });
    }
});
describe('isVersionSupported', () => {
    it(`MIN is ${JavaVersion_1.MIN_SUPPORTED_JAVA}`, () => (0, chai_1.expect)(JavaVersion_1.MIN_SUPPORTED_JAVA).to.equal(8));
    it(`MAX is ${JavaVersion_1.MAX_SUPPORTED_JAVA}`, () => (0, chai_1.expect)(JavaVersion_1.MAX_SUPPORTED_JAVA).to.equal(26));
    it('rejects 0', () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(0)).to.equal(false));
    it('rejects 7 (one below MIN)', () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(7)).to.equal(false));
    it('accepts 8 (MIN boundary)', () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(8)).to.equal(true));
    it('accepts 26 (MAX boundary)', () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(26)).to.equal(true));
    it('rejects 27 (one above MAX)', () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(27)).to.equal(false));
    it('rejects negative', () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(-1)).to.equal(false));
    for (let v = 8; v <= 26; v++) {
        it(`accepts v${v}`, () => (0, chai_1.expect)((0, JavaVersion_1.isVersionSupported)(v)).to.equal(true));
    }
});
describe('getRequiredVmArgs', () => {
    it('v8 returns empty array (no flags needed pre-9)', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(8);
        (0, chai_1.expect)(args).to.be.an('array').with.lengthOf(0);
    });
    it('v9 includes the full add-opens block but no security/attach flags', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(9);
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.lang=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.lang.reflect=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.util=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.util.concurrent=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.io=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.net=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.nio=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.text=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.security=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/sun.net.www.protocol.https=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/sun.security.ssl=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/sun.security.util=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('--add-opens=java.management/sun.management=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.not.include('-Djava.security.manager=allow');
        (0, chai_1.expect)(args).to.not.include('-Djdk.attach.allowAttachSelf=true');
    });
    it('v11 same shape as v9 (no v17 flags yet)', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(11);
        (0, chai_1.expect)(args.some(a => a.startsWith('--add-opens'))).to.equal(true);
        (0, chai_1.expect)(args).to.not.include('-Djava.security.manager=allow');
    });
    it('v16 still no v17 flag', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(16);
        (0, chai_1.expect)(args).to.not.include('-Djava.security.manager=allow');
    });
    it('v17 adds java.security.manager=allow', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(17);
        (0, chai_1.expect)(args).to.include('-Djava.security.manager=allow');
        (0, chai_1.expect)(args).to.not.include('-Djdk.attach.allowAttachSelf=true');
    });
    it('v20 still no v21 flag', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(20);
        (0, chai_1.expect)(args).to.not.include('-Djdk.attach.allowAttachSelf=true');
    });
    it('v21 adds jdk.attach.allowAttachSelf', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(21);
        (0, chai_1.expect)(args).to.include('-Djdk.attach.allowAttachSelf=true');
        (0, chai_1.expect)(args).to.include('-Djava.security.manager=allow');
    });
    it('v26 has the full superset', () => {
        const args = (0, JavaVersion_1.getRequiredVmArgs)(26);
        (0, chai_1.expect)(args).to.include('--add-opens=java.base/java.lang=ALL-UNNAMED');
        (0, chai_1.expect)(args).to.include('-Djava.security.manager=allow');
        (0, chai_1.expect)(args).to.include('-Djdk.attach.allowAttachSelf=true');
    });
});
describe('JavaVersionError', () => {
    it('extends Error and carries detected version', () => {
        const e = new JavaVersion_1.JavaVersionError('boom', 7);
        (0, chai_1.expect)(e).to.be.instanceOf(Error);
        (0, chai_1.expect)(e.name).to.equal('JavaVersionError');
        (0, chai_1.expect)(e.message).to.equal('boom');
        (0, chai_1.expect)(e.detectedVersion).to.equal(7);
    });
    it('detectedVersion is optional', () => {
        const e = new JavaVersion_1.JavaVersionError('boom');
        (0, chai_1.expect)(e.detectedVersion).to.equal(undefined);
    });
});
describe('describeJava', () => {
    it('formats source and path', () => {
        const desc = (0, JavaVersion_1.describeJava)({ javaPath: '/x/java', majorVersion: 17, rawVersion: 'java 17', source: 'PATH' });
        (0, chai_1.expect)(desc).to.contain('Java 17');
        (0, chai_1.expect)(desc).to.contain('/x/java');
        (0, chai_1.expect)(desc).to.contain('PATH');
    });
});
describe('detectJava (with stubbed spawn)', () => {
    let spawnStub;
    let existsStub;
    beforeEach(() => {
        (0, vscodeStub_1.resetState)();
        spawnStub = sinon.stub(childProcess, 'spawnSync');
        existsStub = sinon.stub(fs, 'existsSync').callsFake(() => true);
    });
    afterEach(() => {
        spawnStub.restore();
        existsStub.restore();
        delete process.env.JAVA_HOME;
    });
    function fakeSpawnReturn(versionLine) {
        return { error: undefined, stdout: '', stderr: versionLine, status: 0, signal: null, output: [], pid: 0 };
    }
    it('returns undefined when no candidate works', () => {
        spawnStub.returns({ error: new Error('not found'), stdout: '', stderr: '', status: -1, signal: null, output: [], pid: 0 });
        existsStub.callsFake(() => false);
        const r = (0, JavaVersion_1.detectJava)();
        (0, chai_1.expect)(r).to.equal(undefined);
    });
    it('prefers configured galasa.javaHome over JAVA_HOME and PATH', () => {
        vscodeStub_1.state.config['galasa.javaHome'] = '/opt/jdk21';
        process.env.JAVA_HOME = '/opt/jdk17';
        spawnStub.callsFake((bin) => {
            if (bin.startsWith('/opt/jdk21'))
                return fakeSpawnReturn('openjdk version "21.0.2"');
            if (bin.startsWith('/opt/jdk17'))
                return fakeSpawnReturn('openjdk version "17.0.9"');
            return fakeSpawnReturn('openjdk version "11.0.21"');
        });
        const r = (0, JavaVersion_1.detectJava)();
        (0, chai_1.expect)(r).to.not.equal(undefined);
        (0, chai_1.expect)(r.majorVersion).to.equal(21);
        (0, chai_1.expect)(r.source).to.equal('configured');
    });
    it('falls back to JAVA_HOME when galasa.javaHome unset', () => {
        process.env.JAVA_HOME = '/opt/jdk17';
        spawnStub.callsFake((bin) => {
            if (bin.startsWith('/opt/jdk17'))
                return fakeSpawnReturn('openjdk version "17.0.9"');
            return fakeSpawnReturn('openjdk version "11.0.21"');
        });
        const r = (0, JavaVersion_1.detectJava)();
        (0, chai_1.expect)(r.majorVersion).to.equal(17);
        (0, chai_1.expect)(r.source).to.equal('JAVA_HOME');
    });
    it('falls back to PATH when nothing else set', () => {
        spawnStub.returns(fakeSpawnReturn('openjdk version "11.0.21"'));
        const r = (0, JavaVersion_1.detectJava)();
        (0, chai_1.expect)(r.majorVersion).to.equal(11);
        (0, chai_1.expect)(r.source).to.equal('PATH');
    });
    it('skips a candidate whose version string is unparseable', () => {
        process.env.JAVA_HOME = '/opt/broken';
        spawnStub.callsFake((bin) => {
            if (bin.startsWith('/opt/broken'))
                return fakeSpawnReturn('this is not a java version banner');
            return fakeSpawnReturn('openjdk version "21.0.0"');
        });
        const r = (0, JavaVersion_1.detectJava)();
        (0, chai_1.expect)(r.majorVersion).to.equal(21);
        (0, chai_1.expect)(r.source).to.equal('PATH');
    });
});
//# sourceMappingURL=JavaVersion.test.js.map