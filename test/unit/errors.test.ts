import { expect } from 'chai';
import { isCliSuccess, extractCliErrorSummary, formatCliError, reportCliError } from '../../src/utils/errors';
import { state, resetState } from '../_helpers/vscodeStub';

describe('isCliSuccess', () => {
    it('true for code 0', () => expect(isCliSuccess({ code: 0, stdout: '', stderr: '' })).to.equal(true));
    it('false for code 1', () => expect(isCliSuccess({ code: 1, stdout: '', stderr: '' })).to.equal(false));
    it('false for code -1', () => expect(isCliSuccess({ code: -1, stdout: '', stderr: '' })).to.equal(false));
});

describe('extractCliErrorSummary', () => {
    it('uses last non-blank stderr line when available', () => {
        const r = { code: 1, stdout: '', stderr: 'first\n\nsecond\n   \nthird\n' };
        expect(extractCliErrorSummary(r)).to.equal('third');
    });
    it('falls back to stdout when stderr empty', () => {
        const r = { code: 1, stdout: 'something\nfailed', stderr: '' };
        expect(extractCliErrorSummary(r)).to.equal('failed');
    });
    it('falls back to "exit code N" when both streams empty', () => {
        const r = { code: 7, stdout: '', stderr: '' };
        expect(extractCliErrorSummary(r)).to.equal('exit code 7');
    });
    it('trims trailing whitespace on the chosen line', () => {
        const r = { code: 1, stdout: '', stderr: 'noisy line   ' };
        expect(extractCliErrorSummary(r)).to.equal('noisy line');
    });
});

describe('formatCliError', () => {
    it('builds the canonical message', () => {
        const msg = formatCliError({
            label: 'runs get',
            result: { code: 2, stdout: '', stderr: 'auth failed' },
        });
        expect(msg).to.equal("runs get failed (exit 2): auth failed");
    });
    it('appends hint when supplied', () => {
        const msg = formatCliError({
            label: 'runs get',
            result: { code: 2, stdout: '', stderr: 'auth failed' },
            hint: 'Try galasa.auth.login',
        });
        expect(msg).to.equal("runs get failed (exit 2): auth failed. Try galasa.auth.login");
    });
});

describe('reportCliError', () => {
    beforeEach(() => resetState());

    it('shows an error message via vscode.window', () => {
        reportCliError({ label: 'op', result: { code: 1, stdout: '', stderr: 'bad' } });
        expect(state.showErrorMessageCalls.length).to.equal(1);
        expect(state.showErrorMessageCalls[0][0]).to.contain('op failed');
    });

    it('writes to channel when one is supplied', () => {
        const ch = {
            lines: [] as string[],
            appendLine(l: string) { this.lines.push(l); },
            append(l: string) { this.lines.push(l); },
            show() {}, dispose() {}, clear() {},
        } as any;
        reportCliError({ label: 'op', result: { code: 9, stdout: 'OUT', stderr: 'ERR' } }, ch);
        const joined = ch.lines.join('\n');
        expect(joined).to.contain('[Galasa]');
        expect(joined).to.contain('op failed');
        expect(joined).to.contain('OUT');
        expect(joined).to.contain('ERR');
    });
});
