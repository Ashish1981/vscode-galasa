import { expect } from 'chai';
import {
    buildRunsUpdateArgs,
    buildRunsCleanupArgs,
    buildRunsCleanupLocalArgs,
    buildTagsGetArgs,
    buildTagsSetArgs,
    buildTagsDeleteArgs,
    buildUsersDeleteArgs,
    buildStreamsSetArgs,
    buildRunsBulkDeleteArgs,
    buildRunsTailArgs,
    buildAuthStatusArgs,
    parseNameList,
} from '../../src/cli/commands/argv';

describe('argv builders — runs.update', () => {
    it('builds minimum argv', () => {
        expect(buildRunsUpdateArgs({ name: 'U1' })).to.deep.equal(['runs', 'update', '--name', 'U1']);
    });
    it('appends optional --status', () => {
        expect(buildRunsUpdateArgs({ name: 'U1', status: 'finished' })).to.deep.equal(
            ['runs', 'update', '--name', 'U1', '--status', 'finished']);
    });
    it('appends optional --result', () => {
        expect(buildRunsUpdateArgs({ name: 'U1', result: 'Passed' })).to.deep.equal(
            ['runs', 'update', '--name', 'U1', '--result', 'Passed']);
    });
    it('appends both', () => {
        expect(buildRunsUpdateArgs({ name: 'U1', status: 'finished', result: 'Passed' })).to.deep.equal(
            ['runs', 'update', '--name', 'U1', '--status', 'finished', '--result', 'Passed']);
    });
    it('skips empty / whitespace optional flags', () => {
        expect(buildRunsUpdateArgs({ name: 'U1', status: '   ', result: '' })).to.deep.equal(
            ['runs', 'update', '--name', 'U1']);
    });
    it('throws when name missing', () => {
        expect(() => buildRunsUpdateArgs({ name: '' })).to.throw(/name is required/);
        expect(() => buildRunsUpdateArgs({ name: '   ' })).to.throw(/name is required/);
    });
    it('trims surrounding whitespace on name', () => {
        expect(buildRunsUpdateArgs({ name: '  U1  ' })).to.deep.equal(['runs', 'update', '--name', 'U1']);
    });
});

describe('argv builders — runs.cleanup', () => {
    it('emits bare cleanup with no filters', () => {
        expect(buildRunsCleanupArgs({})).to.deep.equal(['runs', 'cleanup']);
    });
    it('appends each filter when provided', () => {
        expect(buildRunsCleanupArgs({ age: '14d', requestor: 'me', result: 'Passed', status: 'finished' })).to.deep.equal(
            ['runs', 'cleanup', '--age', '14d', '--requestor', 'me', '--result', 'Passed', '--status', 'finished']);
    });
    it('skips empty strings', () => {
        expect(buildRunsCleanupArgs({ age: '', requestor: '   ', result: '7d', status: '' })).to.deep.equal(
            ['runs', 'cleanup', '--result', '7d']);
    });
});

describe('argv builders — runs.cleanupLocal', () => {
    it('uses "local" subcommand', () => {
        expect(buildRunsCleanupLocalArgs({})).to.deep.equal(['runs', 'cleanup', 'local']);
    });
    it('threads filters', () => {
        expect(buildRunsCleanupLocalArgs({ age: '30d' })).to.deep.equal(
            ['runs', 'cleanup', 'local', '--age', '30d']);
    });
});

describe('argv builders — tags.get', () => {
    it('requires stream', () => {
        expect(() => buildTagsGetArgs({ stream: '' })).to.throw(/stream is required/);
    });
    it('emits stream only when no name', () => {
        expect(buildTagsGetArgs({ stream: 'main' })).to.deep.equal(['tags', 'get', '--stream', 'main']);
    });
    it('emits name when given', () => {
        expect(buildTagsGetArgs({ stream: 'main', name: 'env' })).to.deep.equal(
            ['tags', 'get', '--stream', 'main', '--name', 'env']);
    });
    it('trims stream and name', () => {
        expect(buildTagsGetArgs({ stream: '  main  ', name: '  env  ' })).to.deep.equal(
            ['tags', 'get', '--stream', 'main', '--name', 'env']);
    });
});

describe('argv builders — tags.set', () => {
    it('requires stream + name + value', () => {
        expect(() => buildTagsSetArgs({ stream: '', name: 'k', value: 'v' })).to.throw(/stream is required/);
        expect(() => buildTagsSetArgs({ stream: 's', name: '', value: 'v' })).to.throw(/name is required/);
        expect(() => buildTagsSetArgs({ stream: 's', name: 'k', value: undefined as any })).to.throw(/value is required/);
    });
    it('allows empty-string value (explicit clear)', () => {
        expect(buildTagsSetArgs({ stream: 's', name: 'k', value: '' })).to.deep.equal(
            ['tags', 'set', '--stream', 's', '--name', 'k', '--value', '']);
    });
    it('builds full argv', () => {
        expect(buildTagsSetArgs({ stream: 's', name: 'k', value: 'v' })).to.deep.equal(
            ['tags', 'set', '--stream', 's', '--name', 'k', '--value', 'v']);
    });
});

describe('argv builders — tags.delete', () => {
    it('requires stream and name', () => {
        expect(() => buildTagsDeleteArgs({ stream: '', name: 'k' })).to.throw(/stream is required/);
        expect(() => buildTagsDeleteArgs({ stream: 's', name: '' })).to.throw(/name is required/);
    });
    it('builds argv', () => {
        expect(buildTagsDeleteArgs({ stream: 's', name: 'k' })).to.deep.equal(
            ['tags', 'delete', '--stream', 's', '--name', 'k']);
    });
});

describe('argv builders — users.delete', () => {
    it('requires name', () => {
        expect(() => buildUsersDeleteArgs({ name: '' })).to.throw(/name is required/);
    });
    it('builds argv', () => {
        expect(buildUsersDeleteArgs({ name: 'jane' })).to.deep.equal(
            ['users', 'delete', '--name', 'jane']);
    });
});

describe('argv builders — streams.set', () => {
    it('requires name', () => {
        expect(() => buildStreamsSetArgs({ name: '' })).to.throw(/name is required/);
    });
    it('emits bare set with only name', () => {
        expect(buildStreamsSetArgs({ name: 'main' })).to.deep.equal(
            ['streams', 'set', '--name', 'main']);
    });
    it('appends each optional flag', () => {
        expect(buildStreamsSetArgs({
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
        expect(buildStreamsSetArgs({ name: 'main', obr: '', mavenRepo: '   ', description: 'd' })).to.deep.equal(
            ['streams', 'set', '--name', 'main', '--description', 'd']);
    });
});

describe('argv builders — parseNameList', () => {
    it('returns [] for empty', () => {
        expect(parseNameList('')).to.deep.equal([]);
    });
    it('splits on commas', () => {
        expect(parseNameList('A,B,C')).to.deep.equal(['A', 'B', 'C']);
    });
    it('splits on whitespace', () => {
        expect(parseNameList('A B   C')).to.deep.equal(['A', 'B', 'C']);
    });
    it('handles mixed separators', () => {
        expect(parseNameList(' A, B  C, D ')).to.deep.equal(['A', 'B', 'C', 'D']);
    });
    it('drops empty fragments', () => {
        expect(parseNameList(',,A,,B,,')).to.deep.equal(['A', 'B']);
    });
});

describe('argv builders — runs.deleteBulk', () => {
    it('throws when no names', () => {
        expect(() => buildRunsBulkDeleteArgs({ names: [] })).to.throw(/at least one name/);
        expect(() => buildRunsBulkDeleteArgs({ names: ['', '   '] })).to.throw(/at least one name/);
    });
    it('emits one argv per name', () => {
        expect(buildRunsBulkDeleteArgs({ names: ['U1', 'U2'] })).to.deep.equal([
            ['runs', 'delete', '--name', 'U1'],
            ['runs', 'delete', '--name', 'U2'],
        ]);
    });
    it('trims and skips empties', () => {
        expect(buildRunsBulkDeleteArgs({ names: ['  U1  ', '', 'U2 '] })).to.deep.equal([
            ['runs', 'delete', '--name', 'U1'],
            ['runs', 'delete', '--name', 'U2'],
        ]);
    });
});

describe('argv builders — runs.tail', () => {
    it('requires name', () => {
        expect(() => buildRunsTailArgs({ name: '' })).to.throw(/name is required/);
        expect(() => buildRunsTailArgs({ name: '  ' })).to.throw(/name is required/);
    });
    it('uses raw format', () => {
        expect(buildRunsTailArgs({ name: 'U1' })).to.deep.equal(
            ['runs', 'get', '--name', 'U1', '--format', 'raw']);
    });
    it('trims', () => {
        expect(buildRunsTailArgs({ name: '  U1  ' })).to.deep.equal(
            ['runs', 'get', '--name', 'U1', '--format', 'raw']);
    });
});

describe('argv builders — auth.status', () => {
    it('emits "auth tokens get"', () => {
        expect(buildAuthStatusArgs()).to.deep.equal(['auth', 'tokens', 'get']);
    });
});
