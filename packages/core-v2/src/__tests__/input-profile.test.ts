import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseInputProfile } from '../input-profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Runs the actual spec/v2/conformance/cases.yaml fixtures (scope: input)
// as node:test cases, rather than only via scripts/run-conformance.mjs, so
// `npm test` catches a regression here too and CI doesn't need a second
// invocation to cover it.
describe('parseInputProfile — spec/v2/conformance/cases.yaml (scope: input)', () => {
  const casesPath = join(__dirname, '..', '..', '..', '..', 'spec', 'v2', 'conformance', 'cases.yaml');
  const manifest = parseYaml(readFileSync(casesPath, 'utf8')) as {
    cases: Array<{
      id: string;
      scope: string;
      source?: string;
      expected: { outcome: string; violations?: string[]; value?: unknown };
    }>;
  };
  const inputCases = manifest.cases.filter((c) => c.scope === 'input');

  // Sanity check on the fixture load itself — if this fails, every case
  // below is silently vacuous instead of failing loudly.
  it('loaded at least the known input-scope cases', () => {
    assert.ok(inputCases.length >= 14, `expected >= 14 input cases, found ${inputCases.length}`);
  });

  for (const c of inputCases) {
    it(c.id, () => {
      assert.ok(typeof c.source === 'string', `case ${c.id} has no source`);
      const result = parseInputProfile(c.source!);
      assert.equal(result.outcome, c.expected.outcome, JSON.stringify(result.diagnostics));

      if (c.expected.outcome === 'reject') {
        const gotRules = new Set(result.diagnostics.map((d) => d.rule));
        for (const rule of c.expected.violations ?? []) {
          assert.ok(gotRules.has(rule), `expected violation ${rule}, got ${JSON.stringify([...gotRules])}`);
        }
      }

      if (c.expected.outcome === 'accept' && c.expected.value !== undefined) {
        assert.deepEqual(result.value, c.expected.value);
      }
    });
  }
});

// Direct unit tests, independent of the fixture corpus — these pin down
// behavior the corpus doesn't happen to exercise (e.g. path tracking,
// non-root violations) and keep failing usefully even if the corpus file
// moves or its format changes.
describe('parseInputProfile — direct cases', () => {
  it('accepts a plain nested document', () => {
    const result = parseInputProfile('a:\n  b: 1\n  c: [1, 2, 3]\n');
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.value, { a: { b: 1, c: [1, 2, 3] } });
  });

  it('reports IN-002 with a path for a non-string key nested under a mapping', () => {
    const result = parseInputProfile('a:\n  true: 1\n');
    assert.equal(result.outcome, 'reject');
    const hit = result.diagnostics.find((d) => d.rule === 'IN-002');
    assert.ok(hit);
    assert.deepEqual(hit!.path, ['a']);
  });

  it('reports IN-003 for an explicit tag nested inside a sequence', () => {
    const result = parseInputProfile('a:\n  - !!str 1\n');
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'IN-003'));
  });

  it('does not treat two keys aliasing the same anchor as a cycle', () => {
    const result = parseInputProfile('a: &x {n: 1}\nb: *x\nc: *x\n');
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.value, { a: { n: 1 }, b: { n: 1 }, c: { n: 1 } });
  });

  it('reports IN-004 for a cycle nested inside an array', () => {
    const result = parseInputProfile('a:\n  - &x [1, 2, *x]\n');
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'IN-004'));
  });
});
