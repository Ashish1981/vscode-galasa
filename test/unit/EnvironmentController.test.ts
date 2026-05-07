import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { addEnvrionment, buildEnvFileName } from '../../src/local/EnvironmentController';
import { EnvironmentProvider } from '../../src/local/views/TreeViewEnvironmentProperties';
import { state, resetState } from '../_helpers/vscodeStub';

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

describe('buildEnvFileName', () => {
    it('strips disallowed characters', () => {
        expect(buildEnvFileName('My Env!  ')).to.equal('MyEnv.galenv');
    });
    it('preserves alnum + underscore + hyphen', () => {
        expect(buildEnvFileName('a-b_C9')).to.equal('a-b_C9.galenv');
    });
    it('returns undefined when nothing remains', () => {
        expect(buildEnvFileName('!@#$%^')).to.equal(undefined);
        expect(buildEnvFileName('')).to.equal(undefined);
    });
});

describe('EnvironmentController.addEnvrionment (functional)', () => {
    let tmpRoot: string;
    let galasaPath: string;

    beforeEach(() => {
        resetState();
        tmpRoot = freshTempDir('galasa-env-');
        galasaPath = path.join(tmpRoot, '.galasa');
    });

    afterEach(() => {
        rimrafSync(tmpRoot);
    });

    it('creates the vscode/ directory before writing the env file', async () => {
        // galasa home does not exist at all — simulating fresh user
        expect(fs.existsSync(galasaPath)).to.equal(false);
        // Build provider (must tolerate missing directory)
        fs.mkdirSync(galasaPath, { recursive: true });
        const provider = new EnvironmentProvider(galasaPath);
        // Now wipe out vscode/ to simulate it not existing at addEnv time
        rimrafSync(path.join(galasaPath, 'vscode'));

        state.inputBoxQueue = ['Production'];
        await addEnvrionment(galasaPath, provider);

        const target = path.join(galasaPath, 'vscode', 'Production.galenv');
        expect(fs.existsSync(target), `${target} should exist`).to.equal(true);
        expect(fs.readFileSync(target).toString()).to.equal('#Production\n');
        // Should be marked active via the provider
        expect(provider.getEnvironment()).to.equal(target);
    });

    it('aborts cleanly when the user cancels the input box', async () => {
        fs.mkdirSync(galasaPath, { recursive: true });
        const provider = new EnvironmentProvider(galasaPath);
        state.inputBoxQueue = [undefined];
        await addEnvrionment(galasaPath, provider);
        const vscodeDir = path.join(galasaPath, 'vscode');
        const galenv = fs.existsSync(vscodeDir) ? fs.readdirSync(vscodeDir).filter(f => f.endsWith('.galenv')) : [];
        expect(galenv.length).to.equal(0);
    });

    it('warns and aborts when name has no allowable characters', async () => {
        fs.mkdirSync(galasaPath, { recursive: true });
        const provider = new EnvironmentProvider(galasaPath);
        state.inputBoxQueue = ['!!!  '];
        await addEnvrionment(galasaPath, provider);
        expect(state.showWarningMessageCalls.length).to.be.greaterThan(0);
        const vscodeDir = path.join(galasaPath, 'vscode');
        const galenv = fs.existsSync(vscodeDir) ? fs.readdirSync(vscodeDir).filter(f => f.endsWith('.galenv')) : [];
        expect(galenv.length).to.equal(0);
    });

    it('warns when an environment with the same sanitized name already exists', async () => {
        fs.mkdirSync(path.join(galasaPath, 'vscode'), { recursive: true });
        fs.writeFileSync(path.join(galasaPath, 'vscode', 'Prod.galenv'), '#Prod\n');
        const provider = new EnvironmentProvider(galasaPath);
        state.inputBoxQueue = ['Prod'];
        await addEnvrionment(galasaPath, provider);
        expect(state.showWarningMessageCalls.length).to.be.greaterThan(0);
    });
});

describe('EnvironmentProvider — tolerant of missing directories', () => {
    let tmpRoot: string;
    let galasaPath: string;

    beforeEach(() => {
        resetState();
        tmpRoot = freshTempDir('galasa-envprovider-');
        galasaPath = path.join(tmpRoot, '.galasa');
        fs.mkdirSync(galasaPath, { recursive: true });
    });

    afterEach(() => {
        rimrafSync(tmpRoot);
    });

    it('constructor does not throw when vscode/ is missing', () => {
        // Construction must succeed even though vscode/ does not yet exist.
        expect(() => new EnvironmentProvider(galasaPath)).to.not.throw();
        // It should also create vscode/ itself.
        expect(fs.existsSync(path.join(galasaPath, 'vscode'))).to.equal(true);
    });

    it('getChildren returns [] when vscode/ does not exist (tolerates race condition)', () => {
        const provider = new EnvironmentProvider(galasaPath);
        // External mishap: vscode/ deleted between construction and read
        rimrafSync(path.join(galasaPath, 'vscode'));
        expect(() => provider.getChildren()).to.not.throw();
        expect(provider.getChildren()).to.deep.equal([]);
    });

    it('getChildren lists *.galenv entries when present', () => {
        const provider = new EnvironmentProvider(galasaPath);
        fs.writeFileSync(path.join(galasaPath, 'vscode', 'Dev.galenv'), '#Dev\n');
        fs.writeFileSync(path.join(galasaPath, 'vscode', 'Prod.galenv'), '#Prod\n');
        const children = provider.getChildren()!;
        const labels = children.map(c => c.label).sort();
        expect(labels).to.deep.equal(['Dev', 'Prod']);
    });

    it('marks the active environment with " - Active" suffix', () => {
        const provider = new EnvironmentProvider(galasaPath);
        fs.writeFileSync(path.join(galasaPath, 'vscode', 'Dev.galenv'), '#Dev\n');
        fs.writeFileSync(path.join(galasaPath, 'vscode', 'Prod.galenv'), '#Prod\n');
        provider.setEnvironment(path.join(galasaPath, 'vscode', 'Prod.galenv'));
        const labels = provider.getChildren()!.map(c => c.label);
        expect(labels[0]).to.equal('Prod - Active');
    });
});
