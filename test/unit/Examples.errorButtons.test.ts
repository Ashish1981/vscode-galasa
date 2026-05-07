import { expect } from 'chai';
import { launchSimbank, createExampleFiles } from '../../src/local/Examples';
import { state, resetState } from '../_helpers/vscodeStub';

const fakeContext: any = { extensionPath: '/tmp/ext', subscriptions: [] };

describe('Examples — error notifications carry actionable buttons', () => {
    beforeEach(() => resetState());

    it('launchSimbank without simbankJarPath shows error with Open Settings / Download / Open Docs', async () => {
        await launchSimbank(fakeContext);
        expect(state.showErrorMessageCalls.length).to.equal(1);
        const args = state.showErrorMessageCalls[0];
        expect(args[0]).to.contain("'galasa.simbankJarPath' is not set");
        expect(args).to.include('Open Settings');
        expect(args).to.include('Download Galasa');
        expect(args).to.include('Open Docs');
    });

    it('launchSimbank → Open Settings opens galasa.simbankJarPath in settings UI', async () => {
        state.errorResponses = ['Open Settings'];
        await launchSimbank(fakeContext);
        const exec = state.executedCommands.find(c => c.name === 'workbench.action.openSettings');
        expect(exec, 'expected workbench.action.openSettings to be invoked').to.not.equal(undefined);
        expect(exec!.args[0]).to.equal('galasa.simbankJarPath');
    });

    it('launchSimbank → Download Galasa opens the releases URL', async () => {
        state.errorResponses = ['Download Galasa'];
        await launchSimbank(fakeContext);
        expect(state.openedUris.length).to.equal(1);
        expect(state.openedUris[0]).to.contain('github.com/galasa-dev/galasa/releases');
    });

    it('launchSimbank → Open Docs opens the simbank docs URL', async () => {
        state.errorResponses = ['Open Docs'];
        await launchSimbank(fakeContext);
        expect(state.openedUris.length).to.equal(1);
        expect(state.openedUris[0]).to.contain('galasa.dev');
    });

    it('createExampleFiles without configuration shows error with all three buttons', async () => {
        await createExampleFiles(fakeContext);
        expect(state.showErrorMessageCalls.length).to.equal(1);
        const args = state.showErrorMessageCalls[0];
        expect(args[0]).to.contain("'galasa.examplesArchivePath'");
        expect(args[0]).to.contain("'galasa.examplePackagePrefix'");
        expect(args).to.include('Open Settings');
        expect(args).to.include('Download Galasa');
        expect(args).to.include('Open Docs');
    });

    it('createExampleFiles → Open Settings opens galasa.examplesArchivePath in settings UI', async () => {
        state.errorResponses = ['Open Settings'];
        await createExampleFiles(fakeContext);
        const exec = state.executedCommands.find(c => c.name === 'workbench.action.openSettings');
        expect(exec, 'expected workbench.action.openSettings to be invoked').to.not.equal(undefined);
        expect(exec!.args[0]).to.equal('galasa.examplesArchivePath');
    });

    it('createExampleFiles → user dismisses (no choice) does not open settings or URLs', async () => {
        state.errorResponses = [undefined];
        await createExampleFiles(fakeContext);
        expect(state.executedCommands.find(c => c.name === 'workbench.action.openSettings')).to.equal(undefined);
        expect(state.openedUris).to.deep.equal([]);
    });
});
