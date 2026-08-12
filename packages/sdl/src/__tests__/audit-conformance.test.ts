import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { compile, compileWithImports, validate, validateSemantics, normalize, parse } from '../index';
import { parseWithImports } from '../resolver';
import type { FileReader } from '../resolver';
import { getImplementedArtifactTypes } from '../generators';
import type { SDLDocument } from '../types';

const repoRoot = join(__dirname, '..', '..', '..', '..');
const singleFileExamplesDir = join(repoRoot, 'examples', 'single-file');
const templatesDir = join(repoRoot, 'templates');
const conformanceValidDir = join(repoRoot, 'examples', 'conformance', 'valid');

const negativeSingleFileExamples = new Set([
  'missing-required.yaml',
  'pii-no-encryption.yaml',
  'mongodb-efcore.yaml',
  'azure-cloudformation.yaml',
]);

const multiFileRoots = [
  join(repoRoot, 'examples', 'multi-file', 'medchat', 'solution.sdl.yaml'),
  join(repoRoot, 'examples', 'multi-file', 'nexper-crm', 'solution.sdl.yaml'),
];

function makeReader(files: Record<string, string>): FileReader {
  return (p: string) => (p in files ? files[p] : null);
}

/**
 * The compiled-output invariant: for any document that compiles successfully,
 * the *normalized* document must itself pass schema validation and semantic
 * validation. Without this, a compiled document written back to disk cannot be
 * recompiled — the audit found four normalizer outputs (empty personas, empty
 * artifacts.generate, railway runtimes, hibernate ORM) that violated it.
 */
describe('conformance: normalized output remains valid SDL', () => {
  function assertRoundTrip(name: string, doc: SDLDocument): void {
    const revalidation = validate(doc as unknown);
    assert.equal(
      revalidation.valid,
      true,
      `${name}: normalized document failed schema validation: ${JSON.stringify(revalidation.errors, null, 2)}`,
    );
    const semanticErrors = validateSemantics(doc);
    assert.deepEqual(
      semanticErrors,
      [],
      `${name}: normalized document failed semantic validation: ${JSON.stringify(semanticErrors, null, 2)}`,
    );
  }

  it('holds for every valid single-file example', () => {
    const files = readdirSync(singleFileExamplesDir)
      .filter(f => (f.endsWith('.yaml') || f.endsWith('.yml')) && !negativeSingleFileExamples.has(f));
    assert.ok(files.length > 0);
    for (const filename of files) {
      const result = compile(readFileSync(join(singleFileExamplesDir, filename), 'utf-8'));
      assert.equal(result.success, true, `${filename} did not compile`);
      assertRoundTrip(filename, result.document!);
    }
  });

  it('holds for every starter template', () => {
    const files = readdirSync(templatesDir).filter(f => f.endsWith('.sdl.yaml'));
    assert.ok(files.length > 0);
    for (const filename of files) {
      const result = compile(readFileSync(join(templatesDir, filename), 'utf-8'));
      assert.equal(result.success, true, `${filename} did not compile`);
      assertRoundTrip(filename, result.document!);
    }
  });

  it('holds for every valid conformance example', () => {
    const files = readdirSync(conformanceValidDir).filter(f => f.endsWith('.yaml') || f.endsWith('.sdl.yaml'));
    for (const filename of files) {
      const result = compile(readFileSync(join(conformanceValidDir, filename), 'utf-8'));
      assert.equal(result.success, true, `${filename} did not compile`);
      assertRoundTrip(filename, result.document!);
    }
  });

  it('holds for the multi-file showcase examples', () => {
    for (const rootPath of multiFileRoots) {
      const baseDir = dirname(rootPath);
      const result = compileWithImports(
        readFileSync(rootPath, 'utf-8'),
        p => {
          try {
            return readFileSync(join(baseDir, p), 'utf-8');
          } catch {
            return null;
          }
        },
        rootPath,
      );
      assert.equal(result.success, true, `${rootPath} did not compile`);
      assertRoundTrip(rootPath, result.document!);
    }
  });

  it('holds on the default-inference worst case: backend-only doc hitting railway runtimes and hibernate ORM', () => {
    // No product, deployment, nonFunctional, or artifacts sections: the
    // normalizer fabricates all of them, infers cloud 'railway' (backend
    // present), maps railway runtimes, and infers orm 'hibernate' from
    // java-spring + postgres. Every one of these previously produced
    // schema-invalid output.
    const yaml = [
      'sdlVersion: "1.1"',
      'solution:',
      '  name: audit-minimal',
      '  description: minimal backend-only document',
      '  stage: MVP',
      'architecture:',
      '  style: modular-monolith',
      '  projects:',
      '    backend:',
      '      - name: api',
      '        framework: java-spring',
      'data:',
      '  primaryDatabase:',
      '    type: postgres',
      '    hosting: managed',
    ].join('\n');

    const result = compile(yaml);
    assert.equal(result.success, true, JSON.stringify(result.errors, null, 2));
    const doc = result.document!;
    assert.equal(doc.deployment.cloud, 'railway');
    assert.equal(doc.deployment.runtime?.backend, 'railway');
    assert.equal(doc.architecture.projects.backend![0].orm, 'hibernate');
    assert.deepEqual(doc.product.personas, []);
    assert.deepEqual(doc.artifacts?.generate, []);
    assertRoundTrip('audit-minimal', doc);
  });
});

describe('conformance: import resolution failures fail compilation', () => {
  const ROOT = [
    'sdlVersion: "1.1"',
    'imports:',
    '  - missing-module.sdl.yaml',
    'solution:',
    '  name: import-fail',
    '  description: root with a missing import',
    '  stage: MVP',
    'architecture:',
    '  style: modular-monolith',
    '  projects:',
    '    backend:',
    '      - name: api',
    '        framework: nodejs',
    'data:',
    '  primaryDatabase:',
    '    type: postgres',
    '    hosting: managed',
  ].join('\n');

  it('a missing import fails compileWithImports even when the root is complete', () => {
    const result = compileWithImports(ROOT, makeReader({}), 'root');
    assert.equal(result.success, false);
    assert.equal(result.document, null);
    assert.ok(result.errors.some(e => e.code === 'MISSING_IMPORT'), JSON.stringify(result.errors));
    assert.ok(result.resolveErrors.some(e => e.type === 'missing-file'));
  });
});

describe('conformance: resolver import semantics', () => {
  it('resolves nested import paths relative to the declaring module, not the root', () => {
    const requested: string[] = [];
    const files: Record<string, string> = {
      'sdl/mid.sdl.yaml': 'imports:\n  - leaf.sdl.yaml\nauth:\n  strategy: none\n',
      'sdl/leaf.sdl.yaml': 'testing:\n  approach: unit\n',
    };
    const reader: FileReader = p => {
      requested.push(p);
      return p in files ? files[p] : null;
    };
    const result = parseWithImports('imports:\n  - sdl/mid.sdl.yaml\nsdlVersion: "1.1"\n', reader, 'root');
    assert.deepEqual(result.errors, [], JSON.stringify(result.errors));
    assert.ok(requested.includes('sdl/leaf.sdl.yaml'), `paths requested: ${requested.join(', ')}`);
    assert.ok((result.document.testing as Record<string, unknown>).approach === 'unit');
  });

  it('normalises ../ segments against the declaring module directory', () => {
    const files: Record<string, string> = {
      'sdl/mid.sdl.yaml': 'imports:\n  - ../shared/common.sdl.yaml\nauth:\n  strategy: none\n',
      'shared/common.sdl.yaml': 'testing:\n  approach: unit\n',
    };
    const result = parseWithImports('imports:\n  - sdl/mid.sdl.yaml\n', makeReader(files), 'root');
    assert.deepEqual(result.errors, []);
    assert.ok(result.modules.some(m => m.path === 'shared/common.sdl.yaml'));
  });

  it('a diamond dependency is loaded once and is not a circular-import error', () => {
    const files: Record<string, string> = {
      'a.sdl.yaml': 'imports:\n  - shared.sdl.yaml\nauth:\n  strategy: none\n',
      'b.sdl.yaml': 'imports:\n  - shared.sdl.yaml\ntesting:\n  approach: unit\n',
      'shared.sdl.yaml': 'technicalDebt:\n  - id: TD-1\n    decision: d\n    reason: r\n    impact: i\n',
    };
    const result = parseWithImports('imports:\n  - a.sdl.yaml\n  - b.sdl.yaml\n', makeReader(files), 'root');
    assert.deepEqual(result.errors, [], JSON.stringify(result.errors));
    // Merged exactly once — no duplicated array entries from the second branch.
    assert.equal((result.document.technicalDebt as unknown[]).length, 1);
  });

  it('a genuine cycle is still a circular-import error', () => {
    const files: Record<string, string> = {
      'a.sdl.yaml': 'imports:\n  - b.sdl.yaml\nauth:\n  strategy: none\n',
      'b.sdl.yaml': 'imports:\n  - a.sdl.yaml\ntesting:\n  approach: unit\n',
    };
    const result = parseWithImports('imports:\n  - a.sdl.yaml\n', makeReader(files), 'root');
    assert.ok(result.errors.some(e => e.type === 'circular-import'), JSON.stringify(result.errors));
  });

  it('identity-keyed arrays merge by name: duplicate warns and later module wins', () => {
    const files: Record<string, string> = {
      'one.sdl.yaml': 'features:\n  - name: checkout\n    priority: low\n',
      'two.sdl.yaml': 'features:\n  - name: checkout\n    priority: critical\n  - name: search\n',
    };
    const result = parseWithImports('imports:\n  - one.sdl.yaml\n  - two.sdl.yaml\n', makeReader(files), 'root');
    assert.deepEqual(result.errors, []);
    const features = result.document.features as Array<Record<string, unknown>>;
    assert.equal(features.length, 2);
    assert.equal(features.find(f => f.name === 'checkout')!.priority, 'critical');
    assert.ok(result.warnings.some(w => w.type === 'duplicate-array-item'), JSON.stringify(result.warnings));
  });

  it('identity-keyed merge also applies to domain.entities and integrations.custom', () => {
    const files: Record<string, string> = {
      'one.sdl.yaml': 'domain:\n  entities:\n    - name: User\n      description: v1\nintegrations:\n  custom:\n    - name: stripe\n      purpose: v1\n',
      'two.sdl.yaml': 'domain:\n  entities:\n    - name: User\n      description: v2\nintegrations:\n  custom:\n    - name: stripe\n      purpose: v2\n',
    };
    const result = parseWithImports('imports:\n  - one.sdl.yaml\n  - two.sdl.yaml\n', makeReader(files), 'root');
    const entities = (result.document.domain as Record<string, unknown>).entities as Array<Record<string, unknown>>;
    const custom = (result.document.integrations as Record<string, unknown>).custom as Array<Record<string, unknown>>;
    assert.equal(entities.length, 1);
    assert.equal(entities[0].description, 'v2');
    assert.equal(custom.length, 1);
    assert.equal(custom[0].purpose, 'v2');
    assert.equal(result.warnings.filter(w => w.type === 'duplicate-array-item').length, 2);
  });

  it('concatenable arrays still concatenate', () => {
    const files: Record<string, string> = {
      'one.sdl.yaml': 'technicalDebt:\n  - id: TD-1\n    decision: a\n    reason: r\n    impact: i\n',
      'two.sdl.yaml': 'technicalDebt:\n  - id: TD-2\n    decision: b\n    reason: r\n    impact: i\n',
    };
    const result = parseWithImports('imports:\n  - one.sdl.yaml\n  - two.sdl.yaml\n', makeReader(files), 'root');
    assert.equal((result.document.technicalDebt as unknown[]).length, 2);
  });
});

describe('conformance: artifact enum consistency', () => {
  it('the schema artifacts.generate enum exactly matches the generator registry', () => {
    const schema = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'src', 'schema', 'sdl-v1.1.schema.json'), 'utf-8'),
    );
    const enumValues: string[] =
      schema.$defs.ArtifactConfig.properties.generate.items.enum;
    const registryValues = getImplementedArtifactTypes();
    assert.deepEqual(
      [...enumValues].sort(),
      [...registryValues].sort(),
      'schema artifacts.generate enum and generator registry have drifted',
    );
  });

  it('compliance-checklist is requestable from valid SDL', () => {
    const yaml = [
      'sdlVersion: "1.1"',
      'solution:',
      '  name: checklist-test',
      '  description: compliance-checklist is a valid artifact',
      '  stage: MVP',
      'architecture:',
      '  style: modular-monolith',
      '  projects:',
      '    backend:',
      '      - name: api',
      '        framework: nodejs',
      'data:',
      '  primaryDatabase:',
      '    type: postgres',
      '    hosting: managed',
      'artifacts:',
      '  generate:',
      '    - compliance-checklist',
    ].join('\n');
    const result = compile(yaml);
    assert.equal(result.success, true, JSON.stringify(result.errors, null, 2));
  });
});

describe('conformance: SEM-015 architecture must not be empty', () => {
  it('rejects a document whose architecture has no projects and no services', () => {
    const yaml = [
      'sdlVersion: "1.1"',
      'solution:',
      '  name: empty-arch',
      '  description: architecture with no components',
      '  stage: MVP',
      'architecture:',
      '  style: modular-monolith',
      '  projects: {}',
      'data:',
      '  primaryDatabase:',
      '    type: postgres',
      '    hosting: managed',
    ].join('\n');
    const result = compile(yaml);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(e => e.code === 'ARCHITECTURE_EMPTY'), JSON.stringify(result.errors));
  });
});

describe('conformance: canonical-location aliases', () => {
  const BASE = [
    'sdlVersion: "1.1"',
    'solution:',
    '  name: alias-test',
    '  description: canonical alias normalization',
    '  stage: MVP',
    'architecture:',
    '  style: modular-monolith',
    '  projects:',
    '    backend:',
    '      - name: api',
    '        framework: nodejs',
    'data:',
    '  primaryDatabase:',
    '    type: postgres',
    '    hosting: managed',
  ].join('\n');

  it('techDebt authored alone is mirrored into canonical technicalDebt', () => {
    const yaml = BASE + '\ntechDebt:\n  - id: TD-1\n    decision: skip cache\n    reason: time\n    impact: slower reads\n';
    const result = compile(yaml);
    assert.equal(result.success, true, JSON.stringify(result.errors));
    assert.equal(result.document!.technicalDebt?.length, 1);
    assert.equal(result.document!.technicalDebt![0].id, 'TD-1');
    assert.ok(result.inferences.some(i => i.path === 'technicalDebt'));
  });

  it('techDebt and technicalDebt authored together are concatenated', () => {
    const yaml = BASE +
      '\ntechnicalDebt:\n  - id: TD-1\n    decision: a\n    reason: r\n    impact: i\n' +
      'techDebt:\n  - id: TD-2\n    decision: b\n    reason: r\n    impact: i\n';
    const result = compile(yaml);
    assert.equal(result.success, true);
    assert.deepEqual(result.document!.technicalDebt!.map(t => t.id), ['TD-1', 'TD-2']);
  });

  it('shorthand compliance locations are lifted into root compliance.frameworks', () => {
    const yaml = BASE +
      '\nnonFunctional:\n  availability:\n    target: "99.9"\n  scaling:\n    expectedUsersMonth1: 100\n  compliance:\n    frameworks:\n      - gdpr\n' +
      'constraints:\n  compliance:\n    - soc2\n';
    const result = compile(yaml);
    assert.equal(result.success, true, JSON.stringify(result.errors));
    const names = result.document!.compliance!.frameworks!.map(f => f.name).sort();
    assert.deepEqual(names, ['GDPR', 'SOC2']);
    // Normalized output must survive revalidation (SEM-009 name vocabulary).
    assert.deepEqual(validateSemantics(result.document!), []);
  });

  it('an authored root compliance section is never overwritten by shorthands', () => {
    const yaml = BASE +
      '\ncompliance:\n  frameworks:\n    - name: HIPAA\n      applicable: true\n' +
      'constraints:\n  compliance:\n    - gdpr\n';
    const result = compile(yaml);
    assert.equal(result.success, true);
    assert.deepEqual(result.document!.compliance!.frameworks!.map(f => f.name), ['HIPAA']);
  });
});

describe('conformance: normalize is idempotent on compiled documents', () => {
  it('normalizing a compiled document a second time adds nothing', () => {
    const yaml = readFileSync(join(singleFileExamplesDir, 'taskflow.yaml'), 'utf-8');
    const first = compile(yaml);
    assert.equal(first.success, true);
    const second = normalize(parse(JSON.stringify(first.document)).data as SDLDocument);
    assert.deepEqual(second.document, first.document);
  });
});
