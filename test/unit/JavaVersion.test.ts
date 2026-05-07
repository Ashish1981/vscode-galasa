import { expect } from 'chai';
import * as sinon from 'sinon';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    parseJavaVersion,
    isVersionSupported,
    getRequiredVmArgs,
    detectJava,
    describeJava,
    JavaVersionError,
    MIN_SUPPORTED_JAVA,
    MAX_SUPPORTED_JAVA,
} from '../../src/utils/JavaVersion';
import { state, resetState } from '../_helpers/vscodeStub';

const JAVA_BIN = os.platform() === 'win32' ? 'java.exe' : 'java';
const javaUnder = (home: string) => path.join(home, 'bin', JAVA_BIN);

describe('parseJavaVersion', () => {
    const cases: Array<{ label: string; input: string; expected: number | undefined }> = [
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
            expect(parseJavaVersion(c.input)).to.equal(c.expected);
        });
    }
});

describe('isVersionSupported', () => {
    it(`MIN is ${MIN_SUPPORTED_JAVA}`, () => expect(MIN_SUPPORTED_JAVA).to.equal(8));
    it(`MAX is ${MAX_SUPPORTED_JAVA}`, () => expect(MAX_SUPPORTED_JAVA).to.equal(26));
    it('rejects 0', () => expect(isVersionSupported(0)).to.equal(false));
    it('rejects 7 (one below MIN)', () => expect(isVersionSupported(7)).to.equal(false));
    it('accepts 8 (MIN boundary)', () => expect(isVersionSupported(8)).to.equal(true));
    it('accepts 26 (MAX boundary)', () => expect(isVersionSupported(26)).to.equal(true));
    it('rejects 27 (one above MAX)', () => expect(isVersionSupported(27)).to.equal(false));
    it('rejects negative', () => expect(isVersionSupported(-1)).to.equal(false));

    for (let v = 8; v <= 26; v++) {
        it(`accepts v${v}`, () => expect(isVersionSupported(v)).to.equal(true));
    }
});

describe('getRequiredVmArgs', () => {
    it('v8 returns empty array (no flags needed pre-9)', () => {
        const args = getRequiredVmArgs(8);
        expect(args).to.be.an('array').with.lengthOf(0);
    });

    it('v9 includes the full add-opens block but no security/attach flags', () => {
        const args = getRequiredVmArgs(9);
        expect(args).to.include('--add-opens=java.base/java.lang=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.lang.reflect=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.util=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.util.concurrent=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.io=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.net=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.nio=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.text=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/java.security=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/sun.net.www.protocol.https=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/sun.security.ssl=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.base/sun.security.util=ALL-UNNAMED');
        expect(args).to.include('--add-opens=java.management/sun.management=ALL-UNNAMED');
        expect(args).to.not.include('-Djava.security.manager=allow');
        expect(args).to.not.include('-Djdk.attach.allowAttachSelf=true');
    });

    it('v11 same shape as v9 (no v17 flags yet)', () => {
        const args = getRequiredVmArgs(11);
        expect(args.some(a => a.startsWith('--add-opens'))).to.equal(true);
        expect(args).to.not.include('-Djava.security.manager=allow');
    });

    it('v16 still no v17 flag', () => {
        const args = getRequiredVmArgs(16);
        expect(args).to.not.include('-Djava.security.manager=allow');
    });

    it('v17 adds java.security.manager=allow', () => {
        const args = getRequiredVmArgs(17);
        expect(args).to.include('-Djava.security.manager=allow');
        expect(args).to.not.include('-Djdk.attach.allowAttachSelf=true');
    });

    it('v20 still no v21 flag', () => {
        const args = getRequiredVmArgs(20);
        expect(args).to.not.include('-Djdk.attach.allowAttachSelf=true');
    });

    it('v21 adds jdk.attach.allowAttachSelf', () => {
        const args = getRequiredVmArgs(21);
        expect(args).to.include('-Djdk.attach.allowAttachSelf=true');
        expect(args).to.include('-Djava.security.manager=allow');
    });

    it('v26 has the full superset', () => {
        const args = getRequiredVmArgs(26);
        expect(args).to.include('--add-opens=java.base/java.lang=ALL-UNNAMED');
        expect(args).to.include('-Djava.security.manager=allow');
        expect(args).to.include('-Djdk.attach.allowAttachSelf=true');
    });
});

describe('JavaVersionError', () => {
    it('extends Error and carries detected version', () => {
        const e = new JavaVersionError('boom', 7);
        expect(e).to.be.instanceOf(Error);
        expect(e.name).to.equal('JavaVersionError');
        expect(e.message).to.equal('boom');
        expect(e.detectedVersion).to.equal(7);
    });

    it('detectedVersion is optional', () => {
        const e = new JavaVersionError('boom');
        expect(e.detectedVersion).to.equal(undefined);
    });
});

describe('describeJava', () => {
    it('formats source and path', () => {
        const desc = describeJava({ javaPath: '/x/java', majorVersion: 17, rawVersion: 'java 17', source: 'PATH' });
        expect(desc).to.contain('Java 17');
        expect(desc).to.contain('/x/java');
        expect(desc).to.contain('PATH');
    });
});

describe('detectJava (with stubbed spawn)', () => {
    let spawnStub: sinon.SinonStub;
    let existsStub: sinon.SinonStub;

    beforeEach(() => {
        resetState();
        spawnStub = sinon.stub(childProcess, 'spawnSync');
        existsStub = sinon.stub(fs, 'existsSync').callsFake(() => true);
    });

    afterEach(() => {
        spawnStub.restore();
        existsStub.restore();
        delete process.env.JAVA_HOME;
    });

    function fakeSpawnReturn(versionLine: string) {
        return { error: undefined, stdout: '', stderr: versionLine, status: 0, signal: null, output: [], pid: 0 } as any;
    }

    it('returns undefined when no candidate works', () => {
        spawnStub.returns({ error: new Error('not found'), stdout: '', stderr: '', status: -1, signal: null, output: [], pid: 0 });
        existsStub.callsFake(() => false);
        const r = detectJava();
        expect(r).to.equal(undefined);
    });

    it('prefers configured galasa.javaHome over JAVA_HOME and PATH', () => {
        const home21 = path.join(os.tmpdir(), 'jdk21');
        const home17 = path.join(os.tmpdir(), 'jdk17');
        const bin21 = javaUnder(home21);
        const bin17 = javaUnder(home17);
        state.config['galasa.javaHome'] = home21;
        process.env.JAVA_HOME = home17;
        spawnStub.callsFake((bin: string) => {
            if (bin === bin21) return fakeSpawnReturn('openjdk version "21.0.2"');
            if (bin === bin17) return fakeSpawnReturn('openjdk version "17.0.9"');
            return fakeSpawnReturn('openjdk version "11.0.21"');
        });
        const r = detectJava();
        expect(r).to.not.equal(undefined);
        expect(r!.majorVersion).to.equal(21);
        expect(r!.source).to.equal('configured');
    });

    it('falls back to JAVA_HOME when galasa.javaHome unset', () => {
        const home17 = path.join(os.tmpdir(), 'jdk17');
        const bin17 = javaUnder(home17);
        process.env.JAVA_HOME = home17;
        spawnStub.callsFake((bin: string) => {
            if (bin === bin17) return fakeSpawnReturn('openjdk version "17.0.9"');
            return fakeSpawnReturn('openjdk version "11.0.21"');
        });
        const r = detectJava();
        expect(r!.majorVersion).to.equal(17);
        expect(r!.source).to.equal('JAVA_HOME');
    });

    it('falls back to PATH when nothing else set', () => {
        spawnStub.returns(fakeSpawnReturn('openjdk version "11.0.21"'));
        const r = detectJava();
        expect(r!.majorVersion).to.equal(11);
        expect(r!.source).to.equal('PATH');
    });

    it('skips a candidate whose version string is unparseable', () => {
        const homeBroken = path.join(os.tmpdir(), 'broken');
        const binBroken = javaUnder(homeBroken);
        process.env.JAVA_HOME = homeBroken;
        spawnStub.callsFake((bin: string) => {
            if (bin === binBroken) return fakeSpawnReturn('this is not a java version banner');
            return fakeSpawnReturn('openjdk version "21.0.0"');
        });
        const r = detectJava();
        expect(r!.majorVersion).to.equal(21);
        expect(r!.source).to.equal('PATH');
    });
});
