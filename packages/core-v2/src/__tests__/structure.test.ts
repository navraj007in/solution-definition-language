import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { validateStructure } from '../structure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Runs the actual spec/v2/conformance/full-document.yaml fixtures against
// their `expected.structure` field — independent of `expected.outcome`,
// which also depends on semantic validation this package doesn't implement
// yet (see structure.ts's header comment on why `structure` is scored
// separately, and README.md's status table).
describe('validateStructure — spec/v2/conformance/full-document.yaml (expected.structure)', () => {
  const casesPath = join(__dirname, '..', '..', '..', '..', 'spec', 'v2', 'conformance', 'full-document.yaml');
  const manifest = parseYaml(readFileSync(casesPath, 'utf8')) as {
    cases: Array<{ id: string; value: unknown; expected: { structure: string } }>;
  };

  it('loaded at least the known full-document cases', () => {
    assert.ok(manifest.cases.length >= 43, `expected >= 43 cases, found ${manifest.cases.length}`);
  });

  for (const c of manifest.cases) {
    it(`${c.id} (structure: ${c.expected.structure})`, () => {
      const result = validateStructure(c.value);
      assert.equal(result.outcome, c.expected.structure, JSON.stringify(result.diagnostics.slice(0, 3)));
    });
  }
});

describe('validateStructure — direct cases', () => {
  it('accepts a minimal valid v2 document', () => {
    const result = validateStructure({
      sdlVersion: '2.0',
      solution: { name: 'X', description: 'A minimal service.', stage: 'MVP' },
      architecture: { style: 'modular-monolith', projects: { backend: [{ name: 'api', framework: 'nodejs' }] } },
      data: { databaseMode: 'none' },
    });
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects a non-object document', () => {
    const result = validateStructure('not a document');
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.length > 0);
    assert.equal(result.diagnostics[0]!.rule, 'FD-001');
  });

  it('reports a decoded path for a nested violation', () => {
    const result = validateStructure({
      sdlVersion: '2.0',
      solution: { name: 'X', description: 'A minimal service.', stage: 'MVP' },
      architecture: {
        style: 'modular-monolith',
        projects: { backend: [{ name: 'api', framework: 'not-a-real-framework' }] },
      },
      data: { databaseMode: 'none' },
    });
    assert.equal(result.outcome, 'reject');
    const hit = result.diagnostics.find((d) => d.path && d.path.join('.') === 'architecture.projects.backend.0.framework');
    assert.ok(hit, `expected a diagnostic at that path, got ${JSON.stringify(result.diagnostics)}`);
  });

  it('caches the compiled validator across calls (same result twice)', () => {
    const doc = {
      sdlVersion: '2.0',
      solution: { name: 'X', description: 'A minimal service.', stage: 'MVP' },
      architecture: { style: 'modular-monolith', projects: { backend: [{ name: 'api', framework: 'nodejs' }] } },
      data: { databaseMode: 'none' },
    };
    assert.equal(validateStructure(doc).outcome, 'accept');
    assert.equal(validateStructure(doc).outcome, 'accept');
  });
});
