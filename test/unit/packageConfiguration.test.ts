import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('package.json — grouped settings UI', () => {
    // mocha runs from the repo root (.mocharc.json sits there)
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));

    it('contributes.configuration is an array of grouped sections', () => {
        const cfg = pkg.contributes.configuration;
        expect(Array.isArray(cfg), 'configuration should be an array of groups').to.equal(true);
        expect(cfg.length).to.be.greaterThan(0);
        for (const group of cfg) {
            expect(group.title, 'each group needs a title').to.be.a('string').and.not.empty;
            expect(group.properties, 'each group needs properties').to.be.an('object');
        }
    });

    it('every group title starts with "Galasa:" so the UI shows them under one heading', () => {
        for (const group of pkg.contributes.configuration) {
            expect(group.title.startsWith('Galasa')).to.equal(true);
        }
    });

    it('every settings key is unique across all groups', () => {
        const seen = new Set<string>();
        const dups: string[] = [];
        for (const group of pkg.contributes.configuration) {
            for (const key of Object.keys(group.properties)) {
                if (seen.has(key)) dups.push(key);
                seen.add(key);
            }
        }
        expect(dups, `duplicate keys: ${dups.join(', ')}`).to.deep.equal([]);
    });

    it('every settings key is namespaced under "galasa."', () => {
        for (const group of pkg.contributes.configuration) {
            for (const key of Object.keys(group.properties)) {
                expect(key.startsWith('galasa.'), `bad key: ${key}`).to.equal(true);
            }
        }
    });

    it('every setting has a markdownDescription (not the legacy %nls% placeholder)', () => {
        const offenders: string[] = [];
        for (const group of pkg.contributes.configuration) {
            for (const [key, val] of Object.entries(group.properties)) {
                const desc = (val as any).markdownDescription || (val as any).description;
                if (!desc) {
                    offenders.push(`${key}: missing description`);
                } else if (desc.startsWith('%') && desc.endsWith('%')) {
                    offenders.push(`${key}: still uses NLS placeholder ${desc}`);
                }
            }
        }
        expect(offenders, offenders.join('\n')).to.deep.equal([]);
    });

    it('the SimBank-related settings live in the "SimBank & Examples" group', () => {
        const simGroup = pkg.contributes.configuration.find((g: any) => /SimBank/i.test(g.title));
        expect(simGroup, 'expected a SimBank group').to.not.equal(undefined);
        for (const k of [
            'galasa.simbankJarPath',
            'galasa.examplesArchivePath',
            'galasa.examplePackagePrefix',
            'galasa.exampleSubdirectories',
            'galasa.examplePomPlaceholder',
        ]) {
            expect(Object.keys(simGroup.properties)).to.include(k);
        }
    });

    it('runtime settings (java/cli/timeout/home) live in the "Runtime" group', () => {
        const rt = pkg.contributes.configuration.find((g: any) => /Runtime/i.test(g.title));
        expect(rt, 'expected a Runtime group').to.not.equal(undefined);
        for (const k of ['galasa.javaHome', 'galasa.cliPath', 'galasa.cliTimeoutMs', 'galasa.home']) {
            expect(Object.keys(rt.properties)).to.include(k);
        }
    });

    it('the previous flat schema still resolves to 20 settings total', () => {
        const all: string[] = [];
        for (const group of pkg.contributes.configuration) {
            all.push(...Object.keys(group.properties));
        }
        expect(all.length).to.equal(20);
    });
});
