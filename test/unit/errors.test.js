"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const errors_1 = require("../../src/utils/errors");
const vscodeStub_1 = require("../_helpers/vscodeStub");
describe('isCliSuccess', () => {
    it('true for code 0', () => (0, chai_1.expect)((0, errors_1.isCliSuccess)({ code: 0, stdout: '', stderr: '' })).to.equal(true));
    it('false for code 1', () => (0, chai_1.expect)((0, errors_1.isCliSuccess)({ code: 1, stdout: '', stderr: '' })).to.equal(false));
    it('false for code -1', () => (0, chai_1.expect)((0, errors_1.isCliSuccess)({ code: -1, stdout: '', stderr: '' })).to.equal(false));
});
describe('extractCliErrorSummary', () => {
    it('uses last non-blank stderr line when available', () => {
        const r = { code: 1, stdout: '', stderr: 'first\n\nsecond\n   \nthird\n' };
        (0, chai_1.expect)((0, errors_1.extractCliErrorSummary)(r)).to.equal('third');
    });
    it('falls back to stdout when stderr empty', () => {
        const r = { code: 1, stdout: 'something\nfailed', stderr: '' };
        (0, chai_1.expect)((0, errors_1.extractCliErrorSummary)(r)).to.equal('failed');
    });
    it('falls back to "exit code N" when both streams empty', () => {
        const r = { code: 7, stdout: '', stderr: '' };
        (0, chai_1.expect)((0, errors_1.extractCliErrorSummary)(r)).to.equal('exit code 7');
    });
    it('trims trailing whitespace on the chosen line', () => {
        const r = { code: 1, stdout: '', stderr: 'noisy line   ' };
        (0, chai_1.expect)((0, errors_1.extractCliErrorSummary)(r)).to.equal('noisy line');
    });
});
describe('formatCliError', () => {
    it('builds the canonical message', () => {
        const msg = (0, errors_1.formatCliError)({
            label: 'runs get',
            result: { code: 2, stdout: '', stderr: 'auth failed' },
        });
        (0, chai_1.expect)(msg).to.equal("runs get failed (exit 2): auth failed");
    });
    it('appends hint when supplied', () => {
        const msg = (0, errors_1.formatCliError)({
            label: 'runs get',
            result: { code: 2, stdout: '', stderr: 'auth failed' },
            hint: 'Try galasa.auth.login',
        });
        (0, chai_1.expect)(msg).to.equal("runs get failed (exit 2): auth failed. Try galasa.auth.login");
    });
});
describe('reportCliError', () => {
    beforeEach(() => (0, vscodeStub_1.resetState)());
    it('shows an error message via vscode.window', () => {
        (0, errors_1.reportCliError)({ label: 'op', result: { code: 1, stdout: '', stderr: 'bad' } });
        (0, chai_1.expect)(vscodeStub_1.state.showErrorMessageCalls.length).to.equal(1);
        (0, chai_1.expect)(vscodeStub_1.state.showErrorMessageCalls[0][0]).to.contain('op failed');
    });
    it('writes to channel when one is supplied', () => {
        const ch = {
            lines: [],
            appendLine(l) { this.lines.push(l); },
            append(l) { this.lines.push(l); },
            show() { }, dispose() { }, clear() { },
        };
        (0, errors_1.reportCliError)({ label: 'op', result: { code: 9, stdout: 'OUT', stderr: 'ERR' } }, ch);
        const joined = ch.lines.join('\n');
        (0, chai_1.expect)(joined).to.contain('[Galasa]');
        (0, chai_1.expect)(joined).to.contain('op failed');
        (0, chai_1.expect)(joined).to.contain('OUT');
        (0, chai_1.expect)(joined).to.contain('ERR');
    });
});
//# sourceMappingURL=errors.test.js.map