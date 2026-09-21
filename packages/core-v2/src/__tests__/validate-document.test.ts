import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { validateFullDocument } from '../validate-document.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cases whose expected.outcome needs a semantic slice this package doesn't
// have yet: FD-003's ORM exclusion, SO-001 (scope/operations), SC-001
// (scalar grammar), DM-001 (domain metadata). See validate-document.ts's
// header for exactly what IS covered (structure + identity, in that order).
const KNOWN_GAPS = new Set([
  'full-orm-explicit-mongodb',
  'full-orm-database-none',
  'full-zero-duration',
  'full-domain-no-key',
  'full-modular-key-removed',
]);

describe('validateFullDocument — spec/v2/conformance/full-document.yaml (expected.outcome)', () => {
  const casesPath = join(__dirname, '..', '..', '..', '..', 'spec', 'v2', 'conformance', 'full-document.yaml');
  const manifest = parseYaml(readFileSync(casesPath, 'utf8')) as {
    cases: Array<{ id: string; value: unknown; expected: { outcome: string; violations?: string[] } }>;
  };

  it('loaded at least the known full-document cases', () => {
    assert.ok(manifest.cases.length >= 43, `expected >= 43 cases, found ${manifest.cases.length}`);
  });

  for (const c of manifest.cases) {
    const testFn = KNOWN_GAPS.has(c.id) ? it.skip : it;
    testFn(`${c.id} (outcome: ${c.expected.outcome})`, () => {
      const result = validateFullDocument(c.value);
      assert.equal(result.outcome, c.expected.outcome, JSON.stringify(result.diagnostics.slice(0, 3)));
    });
  }
});

describe('validateFullDocument — direct cases', () => {
  const VALID_DOC = {
    sdlVersion: '2.0',
    solution: { name: 'X', description: 'A minimal service.', stage: 'MVP' },
    architecture: { style: 'modular-monolith', projects: { backend: [{ name: 'api', framework: 'nodejs' }] } },
    data: { databaseMode: 'none' },
  };

  it('accepts a minimal valid document', () => {
    const result = validateFullDocument(VALID_DOC);
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.diagnostics, []);
  });

  it('rejects on structure before even attempting identity checks', () => {
    // Missing `data` — a structural failure. If identity ran first/anyway
    // on this malformed shape it could throw or produce misleading
    // diagnostics; asserting FD-001-only here pins the ordering.
    const { data: _omit, ...withoutData } = VALID_DOC;
    const result = validateFullDocument(withoutData);
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.every((d) => d.rule === 'FD-001'));
  });

  it('is structurally valid but rejects on an identity violation', () => {
    const result = validateFullDocument({
      ...VALID_DOC,
      architecture: {
        ...VALID_DOC.architecture,
        projects: { backend: [{ name: 'api', framework: 'nodejs' }, { name: 'api', framework: 'nodejs' }] },
      },
    });
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'ID-002'));
  });
});
