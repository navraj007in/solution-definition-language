import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { compose } from '../compose.js';
import type { FileReader } from '../compose.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getByPath(value: unknown, path: Array<string | number>): unknown {
  let cur: unknown = value;
  for (const seg of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

// One documented, deliberate gap — see compose.ts's header and
// scripts/run-conformance.mjs's KNOWN_COMPOSITION_GAPS: this case needs
// SC-003 (scalar-grammar validation), not implemented yet.
const KNOWN_GAPS = new Set(['merge-invalid-source-cannot-be-overridden']);

describe('compose — spec/v2/conformance/cases.yaml (scope: composition)', () => {
  const casesPath = join(__dirname, '..', '..', '..', '..', 'spec', 'v2', 'conformance', 'cases.yaml');
  const manifest = parseYaml(readFileSync(casesPath, 'utf8')) as {
    cases: Array<{
      id: string;
      scope: string;
      root?: string;
      files?: Record<string, string>;
      limits?: { maxImportDepth?: number };
      expected: {
        outcome: string;
        violations?: string[];
        contributions?: string[];
        assertions?: Array<{ path: Array<string | number>; length?: number; equals?: unknown }>;
        warnings?: Array<{ rule: string; kind: string; path: Array<string | number> }>;
      };
    }>;
  };
  const compositionCases = manifest.cases.filter((c) => c.scope === 'composition');

  it('loaded at least the known composition-scope cases', () => {
    assert.ok(compositionCases.length >= 21, `expected >= 21 composition cases, found ${compositionCases.length}`);
  });

  for (const c of compositionCases) {
    const testFn = KNOWN_GAPS.has(c.id) ? it.skip : it;
    testFn(c.id, () => {
      const files = c.files ?? {};
      const readFile: FileReader = (p) => (p in files ? files[p]! : null);
      const result = compose(c.root!, files[c.root!]!, readFile, c.limits?.maxImportDepth ? { maxImportDepth: c.limits.maxImportDepth } : {});
      const expected = c.expected;

      assert.equal(result.outcome, expected.outcome, JSON.stringify(result.diagnostics));

      if (expected.outcome === 'reject' || expected.outcome === 'resource-failure') {
        const gotRules = new Set(result.diagnostics.map((d) => d.rule));
        for (const rule of expected.violations ?? []) {
          assert.ok(gotRules.has(rule), `expected violation ${rule}, got ${JSON.stringify([...gotRules])}`);
        }
      }

      if (expected.contributions) {
        assert.deepEqual(result.contributions, expected.contributions);
      }

      for (const a of expected.assertions ?? []) {
        const v = getByPath(result.document, a.path);
        if (a.equals !== undefined) assert.deepEqual(v, a.equals);
        if (a.length !== undefined) {
          assert.ok(Array.isArray(v) && v.length === a.length, `expected length ${a.length} at ${JSON.stringify(a.path)}`);
        }
      }

      for (const w of expected.warnings ?? []) {
        const found = result.warnings.some((rw) => rw.rule === w.rule && rw.kind === w.kind && JSON.stringify(rw.path) === JSON.stringify(w.path));
        assert.ok(found, `expected warning ${JSON.stringify(w)}, got ${JSON.stringify(result.warnings)}`);
      }
    });
  }
});

describe('compose — direct cases', () => {
  function reader(files: Record<string, string>): FileReader {
    return (p) => (p in files ? files[p]! : null);
  }

  const HEAD =
    'sdlVersion: "2.0"\n' +
    'solution:\n' +
    '  name: X\n' +
    '  description: A minimal composition test fixture.\n' +
    '  stage: MVP\n' +
    'architecture:\n' +
    '  style: modular-monolith\n' +
    '  projects:\n' +
    '    backend:\n' +
    '      - name: api\n' +
    '        framework: nodejs\n' +
    'data:\n' +
    '  primaryDatabase:\n' +
    '    type: postgres\n' +
    '    hosting: managed\n';

  it('accepts a root with no imports and returns it as the sole contribution', () => {
    const files = { 'root.sdl.yaml': HEAD };
    const result = compose('root.sdl.yaml', files['root.sdl.yaml']!, reader(files));
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.contributions, ['root.sdl.yaml']);
    assert.equal((result.document as any).solution.name, 'X');
    assert.equal('imports' in (result.document as any), false);
  });

  it('rejects an import object entry with an unknown field', () => {
    const files = { 'root.sdl.yaml': `${HEAD}imports:\n  - name: a\n    path: a\n    extra: nope\n` };
    const result = compose('root.sdl.yaml', files['root.sdl.yaml']!, reader(files));
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'IM-001'));
  });

  it('merges a three-level chain and orders contributions leaves-first', () => {
    const files = {
      'root.sdl.yaml': `${HEAD}imports:\n  - a\n`,
      'a.sdl.yaml': 'imports:\n  - b\nauth:\n  strategy: none\n',
      'b.sdl.yaml': 'features:\n  - name: Deep\n',
    };
    const result = compose('root.sdl.yaml', files['root.sdl.yaml']!, reader(files));
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.contributions, ['b.sdl.yaml', 'a.sdl.yaml', 'root.sdl.yaml']);
    assert.deepEqual((result.document as any).features, [{ name: 'Deep' }]);
  });

  it('is a resource-failure, not a plain reject, when the depth limit is exceeded', () => {
    const files = {
      'root.sdl.yaml': `${HEAD}imports:\n  - a\n`,
      'a.sdl.yaml': 'imports:\n  - b\n',
      'b.sdl.yaml': 'auth:\n  strategy: none\n',
    };
    const result = compose('root.sdl.yaml', files['root.sdl.yaml']!, reader(files), { maxImportDepth: 1 });
    assert.equal(result.outcome, 'resource-failure');
    assert.ok(result.diagnostics.some((d) => d.rule === 'IM-005' && d.category === 'resource'));
  });

  it('rejects a self-import as a cycle', () => {
    const files = { 'root.sdl.yaml': `${HEAD}imports:\n  - root\n` };
    const result = compose('root.sdl.yaml', files['root.sdl.yaml']!, reader(files));
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'IM-003'));
  });

  it('concatenates a plain (non-identity-keyed) extension array in source order across three modules', () => {
    // Each import needs at least one non-x-* field, or it trips IM-006's
    // "extension-only module" rejection — confirmed by this test itself
    // failing that way before this fixture included `auth:`/`features:`.
    const files = {
      'root.sdl.yaml': `${HEAD}imports:\n  - a\n  - b\nx-tags:\n  - root\n`,
      'a.sdl.yaml': 'auth:\n  strategy: none\nx-tags:\n  - first\n',
      'b.sdl.yaml': 'features:\n  - name: Placeholder\nx-tags:\n  - second\n',
    };
    const result = compose('root.sdl.yaml', files['root.sdl.yaml']!, reader(files));
    assert.equal(result.outcome, 'accept');
    // Postorder: a, b, root — each contributes its own x-tags in that order.
    assert.deepEqual((result.document as any)['x-tags'], ['first', 'second', 'root']);
  });
});
