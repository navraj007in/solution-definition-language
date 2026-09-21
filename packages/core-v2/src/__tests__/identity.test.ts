import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { checkIdentity } from '../identity.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getByPath(value: unknown, path: Array<string | number>): unknown {
  let cur: unknown = value;
  for (const seg of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

// Runs the actual spec/v2/conformance/cases.yaml fixtures (scope: identity)
// as node:test cases, same rationale as input-profile.test.ts: `npm test`
// should catch a regression here without a second invocation of
// scripts/run-conformance.mjs.
describe('checkIdentity — spec/v2/conformance/cases.yaml (scope: identity)', () => {
  const casesPath = join(__dirname, '..', '..', '..', '..', 'spec', 'v2', 'conformance', 'cases.yaml');
  const manifest = parseYaml(readFileSync(casesPath, 'utf8')) as {
    cases: Array<{
      id: string;
      scope: string;
      value?: unknown;
      expected: {
        outcome: string;
        violations?: string[];
        edges?: Array<[string, string]>;
        targets?: Array<{ sourcePath: unknown; targetPath: unknown }>;
        assertions?: Array<{ path: Array<string | number>; length?: number; equals?: unknown }>;
      };
    }>;
  };
  const identityCases = manifest.cases.filter((c) => c.scope === 'identity');

  it('loaded at least the known identity-scope cases', () => {
    assert.ok(identityCases.length >= 11, `expected >= 11 identity cases, found ${identityCases.length}`);
  });

  for (const c of identityCases) {
    it(c.id, () => {
      const result = checkIdentity(c.value);
      assert.equal(result.outcome, c.expected.outcome, JSON.stringify(result.diagnostics));

      if (c.expected.outcome === 'reject') {
        const gotRules = new Set(result.diagnostics.map((d) => d.rule));
        for (const rule of c.expected.violations ?? []) {
          assert.ok(gotRules.has(rule), `expected violation ${rule}, got ${JSON.stringify([...gotRules])}`);
        }
      }

      if (c.expected.edges !== undefined) {
        assert.deepEqual(result.edges, c.expected.edges);
      }
      if (c.expected.targets !== undefined) {
        assert.deepEqual(result.targets, c.expected.targets);
      }
      // Fixture-input sanity assertions (see run-conformance.mjs's
      // checkAssertions) — checked here too so `npm test` covers them.
      for (const a of c.expected.assertions ?? []) {
        const v = getByPath(c.value, a.path);
        if (a.length !== undefined) {
          assert.ok(Array.isArray(v) && v.length === a.length, `expected length ${a.length} at ${JSON.stringify(a.path)}`);
        }
        if (a.equals !== undefined) {
          assert.deepEqual(v, a.equals);
        }
      }
    });
  }
});

describe('checkIdentity — direct cases', () => {
  it('accepts an empty document (no components, nothing to check)', () => {
    const result = checkIdentity({});
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(result.edges, []);
    assert.deepEqual(result.targets, []);
  });

  it('a frontend and a backend project may share a name with each other, but not within the same list', () => {
    // ID-002's "Components" set is one namespace across all four lists, so
    // even a frontend/backend pair sharing a name is a collision.
    const result = checkIdentity({
      architecture: {
        projects: {
          frontend: [{ name: 'web' }],
          backend: [{ name: 'web' }],
        },
      },
    });
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'ID-002'));
  });

  it('reports the specific dependency-list index in the path for an ID-003 violation', () => {
    const result = checkIdentity({
      architecture: {
        services: [{ name: 'worker', dependencies: ['ghost'] }],
      },
    });
    assert.equal(result.outcome, 'reject');
    const hit = result.diagnostics.find((d) => d.rule === 'ID-003');
    assert.ok(hit);
    assert.deepEqual(hit!.path, ['architecture', 'services', 0, 'dependencies', 0]);
  });

  it('detects a three-node dependency cycle', () => {
    const result = checkIdentity({
      architecture: {
        services: [
          { name: 'a', dependencies: ['b'] },
          { name: 'b', dependencies: ['c'] },
          { name: 'c', dependencies: ['a'] },
        ],
      },
    });
    assert.equal(result.outcome, 'reject');
    assert.ok(result.diagnostics.some((d) => d.rule === 'ID-004'));
  });

  it('a service with no cyclic or self dependency in a larger acyclic graph is accepted', () => {
    const result = checkIdentity({
      architecture: {
        services: [
          { name: 'gateway', dependencies: ['auth', 'billing'] },
          { name: 'auth', dependencies: [] },
          { name: 'billing', dependencies: ['auth'] },
        ],
      },
    });
    assert.equal(result.outcome, 'accept');
    assert.deepEqual(
      result.edges.sort(),
      [
        ['gateway', 'auth'],
        ['gateway', 'billing'],
        ['billing', 'auth'],
      ].sort(),
    );
  });
});
