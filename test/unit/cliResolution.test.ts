import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    resolveCliExecutable,
    getCliSearchDirs,
    describeCliResolution,
} from '../../src/cli/GalasaCli';
import { state, resetState } from '../_helpers/vscodeStub';

const isWin = os.platform() === 'win32';
const EXE = isWin ? 'galasactl.exe' : 'galasactl';
const PATH_SEP = isWin ? ';' : ':';

describe('resolveCliExecutable — WSL / PATH probing', () => {
    let existsStub: sinon.SinonStub;
    let originalPath: string | undefined;

    beforeEach(() => {
        resetState();
        originalPath = process.env.PATH;
        existsStub = sinon.stub(fs, 'existsSync');
    });

    afterEach(() => {
        existsStub.restore();
        if (originalPath === undefined) delete process.env.PATH;
        else process.env.PATH = originalPath;
        delete process.env.HOME;
        delete process.env.USERPROFILE;
        delete process.env.LOCALAPPDATA;
    });

    it('finds galasactl on PATH first', () => {
        process.env.PATH = ['/somewhere/else', '/usr/local/bin', '/usr/bin'].join(PATH_SEP);
        const installed = path.join('/usr/local/bin', EXE);
        existsStub.callsFake((p: string) => p === installed);
        expect(resolveCliExecutable()).to.equal(installed);
    });

    it('falls back to /usr/local/bin even when PATH is empty (the WSL+VS Code case)', function () {
        if (isWin) this.skip();
        process.env.PATH = '';
        const installed = '/usr/local/bin/galasactl';
        existsStub.callsFake((p: string) => p === installed);
        expect(resolveCliExecutable()).to.equal(installed);
    });

    it('falls back to /usr/local/bin when PATH points elsewhere (the WSL+VS Code case)', function () {
        if (isWin) this.skip();
        process.env.PATH = '/some/other:/path:/only';
        const installed = '/usr/local/bin/galasactl';
        existsStub.callsFake((p: string) => p === installed);
        expect(resolveCliExecutable()).to.equal(installed);
    });

    it('finds galasactl in ~/.galasa/bin if installed there', function () {
        if (isWin) this.skip();
        process.env.HOME = '/home/me';
        process.env.PATH = '/some/other';
        const installed = '/home/me/.galasa/bin/galasactl';
        existsStub.callsFake((p: string) => p === installed);
        expect(resolveCliExecutable()).to.equal(installed);
    });

    it('finds galasactl in /opt/galasa/bin', function () {
        if (isWin) this.skip();
        process.env.PATH = '/usr/games';
        const installed = '/opt/galasa/bin/galasactl';
        existsStub.callsFake((p: string) => p === installed);
        expect(resolveCliExecutable()).to.equal(installed);
    });

    it('returns bare exe name when nothing on disk matches (lets execvp try)', () => {
        process.env.PATH = '/unknown';
        existsStub.callsFake(() => false);
        expect(resolveCliExecutable()).to.equal(EXE);
    });

    it('configured galasa.cliPath wins even if galasactl is also on PATH', () => {
        process.env.PATH = ['/usr/local/bin'].join(PATH_SEP);
        const onPath = path.join('/usr/local/bin', EXE);
        const configured = '/opt/team/bin/galasactl-stable';
        state.config['galasa.cliPath'] = configured;
        existsStub.callsFake((p: string) => p === configured || p === onPath);
        expect(resolveCliExecutable()).to.equal(configured);
    });
});

describe('getCliSearchDirs', () => {
    afterEach(() => {
        delete process.env.HOME;
        delete process.env.USERPROFILE;
        delete process.env.LOCALAPPDATA;
        delete process.env.ProgramFiles;
    });

    it('puts configured galasa home/bin first when set', () => {
        process.env.HOME = '/home/me';
        const dirs = getCliSearchDirs();
        expect(dirs).to.include(path.join('/home/me', '.galasa', 'bin'));
        expect(dirs).to.include(path.join('/home/me', 'bin'));
    });

    it('on POSIX, includes /usr/local/bin, /usr/bin, /opt/galasa/bin in order', function () {
        if (isWin) this.skip();
        process.env.HOME = '/home/me';
        const dirs = getCliSearchDirs();
        const i1 = dirs.indexOf('/usr/local/bin');
        const i2 = dirs.indexOf('/usr/bin');
        const i3 = dirs.indexOf('/opt/galasa/bin');
        expect(i1).to.be.greaterThan(-1);
        expect(i2).to.be.greaterThan(i1);
        expect(i3).to.be.greaterThan(i2);
    });

    it('on Windows, includes %LOCALAPPDATA%\\Programs\\galasactl and %ProgramFiles%\\galasactl', function () {
        if (!isWin) this.skip();
        process.env.LOCALAPPDATA = 'C:\\Users\\me\\AppData\\Local';
        process.env.ProgramFiles = 'C:\\Program Files';
        const dirs = getCliSearchDirs();
        expect(dirs).to.include(path.join('C:\\Users\\me\\AppData\\Local', 'Programs', 'galasactl'));
        expect(dirs).to.include(path.join('C:\\Program Files', 'galasactl'));
    });

    it('de-duplicates entries', () => {
        process.env.HOME = '/home/me';
        const dirs = getCliSearchDirs();
        expect(new Set(dirs).size).to.equal(dirs.length);
    });
});

describe('describeCliResolution', () => {
    afterEach(() => {
        delete process.env.PATH;
    });

    it('renders a multi-line report with Resolved, Configured, PATH, fallbacks', () => {
        process.env.PATH = '/a' + PATH_SEP + '/b';
        const report = describeCliResolution();
        expect(report).to.contain('Resolved galasactl path');
        expect(report).to.contain('Configured (galasa.cliPath)');
        expect(report).to.contain('PATH directories searched');
        expect(report).to.contain('/a');
        expect(report).to.contain('/b');
        expect(report).to.contain('Fallback directories searched after PATH');
    });
});
