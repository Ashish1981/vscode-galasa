"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const argv_1 = require("../../src/cli/commands/argv");
describe('argv builders — runs.update', () => {
    it('builds minimum argv', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsUpdateArgs)({ name: 'U1' })).to.deep.equal(['runs', 'update', '--name', 'U1']);
    });
    it('appends optional --status', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsUpdateArgs)({ name: 'U1', status: 'finished' })).to.deep.equal(['runs', 'update', '--name', 'U1', '--status', 'finished']);
    });
    it('appends optional --result', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsUpdateArgs)({ name: 'U1', result: 'Passed' })).to.deep.equal(['runs', 'update', '--name', 'U1', '--result', 'Passed']);
    });
    it('appends both', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsUpdateArgs)({ name: 'U1', status: 'finished', result: 'Passed' })).to.deep.equal(['runs', 'update', '--name', 'U1', '--status', 'finished', '--result', 'Passed']);
    });
    it('skips empty / whitespace optional flags', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsUpdateArgs)({ name: 'U1', status: '   ', result: '' })).to.deep.equal(['runs', 'update', '--name', 'U1']);
    });
    it('throws when name missing', () => {
        (0, chai_1.expect)(() => (0, argv_1.buildRunsUpdateArgs)({ name: '' })).to.throw(/name is required/);
        (0, chai_1.expect)(() => (0, argv_1.buildRunsUpdateArgs)({ name: '   ' })).to.throw(/name is required/);
    });
    it('trims surrounding whitespace on name', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsUpdateArgs)({ name: '  U1  ' })).to.deep.equal(['runs', 'update', '--name', 'U1']);
    });
});
describe('argv builders — runs.cleanup', () => {
    it('emits bare cleanup with no filters', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsCleanupArgs)({})).to.deep.equal(['runs', 'cleanup']);
    });
    it('appends each filter when provided', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsCleanupArgs)({ age: '14d', requestor: 'me', result: 'Passed', status: 'finished' })).to.deep.equal(['runs', 'cleanup', '--age', '14d', '--requestor', 'me', '--result', 'Passed', '--status', 'finished']);
    });
    it('skips empty strings', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsCleanupArgs)({ age: '', requestor: '   ', result: '7d', status: '' })).to.deep.equal(['runs', 'cleanup', '--result', '7d']);
    });
});
describe('argv builders — runs.cleanupLocal', () => {
    it('uses "local" subcommand', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsCleanupLocalArgs)({})).to.deep.equal(['runs', 'cleanup', 'local']);
    });
    it('threads filters', () => {
        (0, chai_1.expect)((0, argv_1.buildRunsCleanupLocalArgs)({ age: '30d' })).to.deep.equal(['runs', 'cleanup', 'local', '--age', '30d']);
    });
});
describe('argv builders — tags.get', () => {
    it('requires stream', () => {
        (0, chai_1.expect)(() => (0, argv_1.buildTagsGetArgs)({ stream: '' })).to.throw(/stream is required/);
    });
    it('emits stream only when no name', () => {
        (0, chai_1.expect)((0, argv_1.buildTagsGetArgs)({ stream: 'main' })).to.deep.equal(['tags', 'get', '--stream', 'main']);
    });
    it('emits name when given', () => {
        (0, chai_1.expect)((0, argv_1.buildTagsGetArgs)({ stream: 'main', name: 'env' })).to.deep.equal(['tags', 'get', '--stream', 'main', '--name', 'env']);
    });
    it('trims stream and name', () => {
        (0, chai_1.expect)((0, argv_1.buildTagsGetArgs)({ stream: '  main  ', name: '  env  ' })).to.deep.equal(['tags', 'get', '--stream', 'main', '--name', 'env']);
    });
});
describe('argv builders — tags.set', () => {
    it('requires stream + name + value', () => {
        (0, chai_1.expect)(() => (0, argv_1.buildTagsSetArgs)({ stream: '', name: 'k', value: 'v' })).to.throw(/stream is required/);
        (0, chai_1.expect)(() => (0, argv_1.buildTagsSetArgs)({ stream: 's', name: '', value: 'v' })).to.throw(/name is required/);
        (0, chai_1.expect)(() => (0, argv_1.buildTagsSetArgs)({ stream: 's', name: 'k', value: undefined })).to.throw(/value is required/);
    });
    it('allows empty-string value (explicit clear)', () => {
        (0, chai_1.expect)((0, argv_1.buildTagsSetArgs)({ stream: 's', name: 'k', value: '' })).to.deep.equal(['tags', 'set', '--stream', 's', '--name', 'k', '--value', '']);
    });
    it('builds full argv', () => {
        (0, chai_1.expect)((0, argv_1.buildTagsSetArgs)({ stream: 's', name: 'k', value: 'v' })).to.deep.equal(['tags', 'set', '--stream', 's', '--name', 'k', '--value', 'v']);
    });
});
describe('argv builders — tags.delete', () => {
    it('requires stream and name', () => {
        (0, chai_1.expect)(() => (0, argv_1.buildTagsDeleteArgs)({ stream: '', name: 'k' })).to.throw(/stream is required/);
        (0, chai_1.expect)(() => (0, argv_1.buildTagsDeleteArgs)({ stream: 's', name: '' })).to.throw(/name is required/);
    });
    it('builds argv', () => {
        (0, chai_1.expect)((0, argv_1.buildTagsDeleteArgs)({ stream: 's', name: 'k' })).to.deep.equal(['tags', 'delete', '--stream', 's', '--name', 'k']);
    });
});
describe('argv builders — users.delete', () => {
    it('requires name', () => {
        (0, chai_1.expect)(() => (0, argv_1.buildUsersDeleteArgs)({ name: '' })).to.throw(/name is required/);
    });
    it('builds argv', () => {
        (0, chai_1.expect)((0, argv_1.buildUsersDeleteArgs)({ name: 'jane' })).to.deep.equal(['users', 'delete', '--name', 'jane']);
    });
});
describe('argv builders — streams.set', () => {
    it('requires name', () => {
        (0, chai_1.expect)(() => (0, argv_1.buildStreamsSetArgs)({ name: '' })).to.throw(/name is required/);
    });
    it('emits bare set with only name', () => {
        (0, chai_1.expect)((0, argv_1.buildStreamsSetArgs)({ name: 'main' })).to.deep.equal(['streams', 'set', '--name', 'main']);
    });
    it('appends each optional flag', () => {
        (0, chai_1.expect)((0, argv_1.buildStreamsSetArgs)({
            name: 'main',
            obr: 'mvn:g/a/1.0/obr',
            mavenRepo: 'https://repo',
            description: 'desc',
            testCatalog: 'https://catalog',
        })).to.deep.equal([
            'streams', 'set', '--name', 'main',
            '--obr', 'mvn:g/a/1.0/obr',
            '--maven-repo', 'https://repo',
            '--description', 'desc',
            '--test-catalog', 'https://catalog',
        ]);
    });
    it('skips blank optionals', () => {
        (0, chai_1.expect)((0, argv_1.buildStreamsSetArgs)({ name: 'main', obr: '', mavenRepo: '   ', description: 'd' })).to.deep.equal(['streams', 'set', '--name', 'main', '--description', 'd']);
    });
});
//# sourceMappingURL=argv.test.js.map