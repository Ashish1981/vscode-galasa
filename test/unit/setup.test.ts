import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { setupWorkspace } from '../../src/config/setup';

function freshTempDir(prefix: string): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function rimrafSync(target: string): void {
    if (!fs.existsSync(target)) return;
    if (fs.statSync(target).isDirectory()) {
        for (const entry of fs.readdirSync(target)) {
            rimrafSync(path.join(target, entry));
        }
        fs.rmdirSync(target);
    } else {
        fs.unlinkSync(target);
    }
}

describe('config/setup — setupWorkspace', () => {
    let tmpRoot: string;
    let galasaPath: string;
    let extPath: string;
    let context: any;

    beforeEach(() => {
        tmpRoot = freshTempDir('galasa-setup-');
        galasaPath = path.join(tmpRoot, 'home', 'me', '.galasa');
        extPath = path.join(tmpRoot, 'extension');
        fs.mkdirSync(extPath, { recursive: true });
        context = { extensionPath: extPath };
    });

    afterEach(() => {
        rimrafSync(tmpRoot);
    });

    it('creates the galasa home directory if it does not exist', async () => {
        expect(fs.existsSync(galasaPath)).to.equal(false);
        await setupWorkspace(context, galasaPath);
        expect(fs.existsSync(galasaPath)).to.equal(true);
        expect(fs.statSync(galasaPath).isDirectory()).to.equal(true);
    });

    it('creates intermediate parent directories (recursive mkdir)', async () => {
        const deep = path.join(tmpRoot, 'a', 'b', 'c', '.galasa');
        await setupWorkspace(context, deep);
        expect(fs.existsSync(deep)).to.equal(true);
    });

    it('creates the vscode/ subdirectory', async () => {
        await setupWorkspace(context, galasaPath);
        expect(fs.existsSync(path.join(galasaPath, 'vscode'))).to.equal(true);
        expect(fs.statSync(path.join(galasaPath, 'vscode')).isDirectory()).to.equal(true);
    });

    it('creates the ras/ subdirectory', async () => {
        await setupWorkspace(context, galasaPath);
        expect(fs.existsSync(path.join(galasaPath, 'ras'))).to.equal(true);
    });

    it('creates each scaffolding properties file (empty) when missing', async () => {
        await setupWorkspace(context, galasaPath);
        for (const f of [
            'credentials.properties',
            'cps.properties',
            'bootstrap.properties',
            'dss.properties',
            'overrides.properties',
        ]) {
            const p = path.join(galasaPath, f);
            expect(fs.existsSync(p), `${f} should exist`).to.equal(true);
            expect(fs.readFileSync(p).toString()).to.equal('');
        }
    });

    it('does NOT overwrite existing properties files', async () => {
        fs.mkdirSync(galasaPath, { recursive: true });
        const credsPath = path.join(galasaPath, 'credentials.properties');
        fs.writeFileSync(credsPath, 'existing.user=alice\n');
        await setupWorkspace(context, galasaPath);
        expect(fs.readFileSync(credsPath).toString()).to.equal('existing.user=alice\n');
    });

    it('is idempotent — running twice leaves the same state', async () => {
        await setupWorkspace(context, galasaPath);
        const stat1 = fs.readdirSync(galasaPath).sort();
        await setupWorkspace(context, galasaPath);
        const stat2 = fs.readdirSync(galasaPath).sort();
        expect(stat2).to.deep.equal(stat1);
    });
});
