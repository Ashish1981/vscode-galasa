// Pure argv builders. No vscode imports. Tested directly.

export interface NamedArgs {
    name: string;
}

export interface RunsUpdateArgs {
    name: string;
    status?: string;
    result?: string;
}

export interface RunsCleanupArgs {
    age?: string;
    requestor?: string;
    result?: string;
    status?: string;
}

export interface TagsArgs {
    stream: string;
    name?: string;
    value?: string;
}

export interface StreamsSetArgs {
    name: string;
    obr?: string;
    mavenRepo?: string;
    description?: string;
    testCatalog?: string;
}

function pushIf(args: string[], flag: string, value: string | undefined): void {
    if (value !== undefined && value.trim().length > 0) {
        args.push(flag, value.trim());
    }
}

export function buildRunsUpdateArgs(input: RunsUpdateArgs): string[] {
    if (!input.name || input.name.trim().length === 0) {
        throw new Error('runs update: name is required');
    }
    const args = ['runs', 'update', '--name', input.name.trim()];
    pushIf(args, '--status', input.status);
    pushIf(args, '--result', input.result);
    return args;
}

export function buildRunsCleanupArgs(input: RunsCleanupArgs): string[] {
    const args = ['runs', 'cleanup'];
    pushIf(args, '--age', input.age);
    pushIf(args, '--requestor', input.requestor);
    pushIf(args, '--result', input.result);
    pushIf(args, '--status', input.status);
    return args;
}

export function buildRunsCleanupLocalArgs(input: RunsCleanupArgs): string[] {
    const args = ['runs', 'cleanup', 'local'];
    pushIf(args, '--age', input.age);
    pushIf(args, '--requestor', input.requestor);
    pushIf(args, '--result', input.result);
    pushIf(args, '--status', input.status);
    return args;
}

export function buildTagsGetArgs(input: TagsArgs): string[] {
    if (!input.stream || input.stream.trim().length === 0) {
        throw new Error('tags get: stream is required');
    }
    const args = ['tags', 'get', '--stream', input.stream.trim()];
    pushIf(args, '--name', input.name);
    return args;
}

export function buildTagsSetArgs(input: TagsArgs): string[] {
    if (!input.stream || input.stream.trim().length === 0) {
        throw new Error('tags set: stream is required');
    }
    if (!input.name || input.name.trim().length === 0) {
        throw new Error('tags set: name is required');
    }
    if (input.value === undefined) {
        throw new Error('tags set: value is required');
    }
    return [
        'tags', 'set',
        '--stream', input.stream.trim(),
        '--name', input.name.trim(),
        '--value', input.value
    ];
}

export function buildTagsDeleteArgs(input: TagsArgs): string[] {
    if (!input.stream || input.stream.trim().length === 0) {
        throw new Error('tags delete: stream is required');
    }
    if (!input.name || input.name.trim().length === 0) {
        throw new Error('tags delete: name is required');
    }
    return ['tags', 'delete', '--stream', input.stream.trim(), '--name', input.name.trim()];
}

export function buildUsersDeleteArgs(input: NamedArgs): string[] {
    if (!input.name || input.name.trim().length === 0) {
        throw new Error('users delete: name is required');
    }
    return ['users', 'delete', '--name', input.name.trim()];
}

export interface RunsBulkDeleteArgs {
    names: string[];
}

export interface RunsTailArgs {
    name: string;
    pollSeconds?: number;
}

export function parseNameList(raw: string): string[] {
    if (!raw) return [];
    return raw.split(/[,\s]+/).map(s => s.trim()).filter(s => s.length > 0);
}

export function buildRunsBulkDeleteArgs(input: RunsBulkDeleteArgs): string[][] {
    const names = (input.names || []).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) {
        throw new Error('runs delete (bulk): at least one name required');
    }
    return names.map(n => ['runs', 'delete', '--name', n]);
}

export function buildRunsTailArgs(input: RunsTailArgs): string[] {
    if (!input.name || input.name.trim().length === 0) {
        throw new Error('runs tail: name is required');
    }
    const args = ['runs', 'get', '--name', input.name.trim(), '--format', 'raw'];
    return args;
}

export function buildAuthStatusArgs(): string[] {
    // We probe authentication by listing tokens; non-zero exit indicates not authenticated.
    return ['auth', 'tokens', 'get'];
}

export function buildStreamsSetArgs(input: StreamsSetArgs): string[] {
    if (!input.name || input.name.trim().length === 0) {
        throw new Error('streams set: name is required');
    }
    const args = ['streams', 'set', '--name', input.name.trim()];
    pushIf(args, '--obr', input.obr);
    pushIf(args, '--maven-repo', input.mavenRepo);
    pushIf(args, '--description', input.description);
    pushIf(args, '--test-catalog', input.testCatalog);
    return args;
}
