#!/usr/bin/env node
// Runs @sdl/core-v2 against spec/v2/conformance/cases.yaml — the scopes
// this package implements so far: `input` (IN-001–IN-005) and `identity`
// (ID-001–ID-004). See README.md's status table for everything else.
//
// This is deliberately separate from spec/v2/conformance/check-corpus.mjs,
// which is an *integrity* checker: it verifies the fixture corpus is
// internally consistent (unique IDs, valid YAML, linked files not drifted,
// etc.) but "does not invoke SDL packages" — by design, it never runs an
// actual implementation against the cases. This script is that missing
// other half for the scopes this package covers.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseInputProfile, checkIdentity } from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesPath = join(__dirname, '..', '..', '..', 'spec', 'v2', 'conformance', 'cases.yaml');
const manifest = parseYaml(readFileSync(casesPath, 'utf8'));

function getByPath(value, path) {
  let cur = value;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return cur;
}

function checkAssertions(cases, sourceValueOf) {
  const problems = [];
  for (const c of cases) {
    for (const a of c.expected.assertions ?? []) {
      const v = getByPath(sourceValueOf(c), a.path);
      if ('length' in a && (!Array.isArray(v) || v.length !== a.length)) {
        problems.push(`${c.id}: assertion length mismatch at ${JSON.stringify(a.path)} (want ${a.length}, got ${Array.isArray(v) ? v.length : typeof v})`);
      }
      if ('equals' in a && JSON.stringify(v) !== JSON.stringify(a.equals)) {
        problems.push(`${c.id}: assertion equals mismatch at ${JSON.stringify(a.path)}`);
      }
    }
  }
  return problems;
}

/**
 * Runs one scope's cases through `run(case) -> { outcome, diagnostics, ...extra }`
 * and checks outcome, violation coverage, and any of the named extra fields
 * (compared by deep equality) that the case's `expected` declares.
 */
function runScope(scopeName, cases, run, extraFields) {
  let pass = 0;
  const failures = [];
  for (const c of cases) {
    const result = run(c);
    const expected = c.expected;
    let ok = result.outcome === expected.outcome;
    let detail = '';

    if (ok && expected.outcome === 'reject') {
      const gotRules = new Set(result.diagnostics.map((d) => d.rule));
      const missing = (expected.violations ?? []).filter((r) => !gotRules.has(r));
      if (missing.length > 0) {
        ok = false;
        detail = `missing violations ${JSON.stringify(missing)}; got ${JSON.stringify([...gotRules])}`;
      }
    }

    for (const field of extraFields) {
      if (ok && expected[field] !== undefined) {
        if (JSON.stringify(result[field]) !== JSON.stringify(expected[field])) {
          ok = false;
          detail = `${field} mismatch: want ${JSON.stringify(expected[field])}, got ${JSON.stringify(result[field])}`;
        }
      }
    }

    if (!ok && detail === '') {
      detail = `outcome: want ${expected.outcome}, got ${result.outcome}, diagnostics ${JSON.stringify(result.diagnostics)}`;
    }

    if (ok) {
      pass++;
    } else {
      failures.push({ id: c.id, detail });
    }
  }
  console.log(`[conformance] scope: ${scopeName} — ${pass}/${cases.length} passed`);
  for (const f of failures) {
    console.error(`  FAIL ${f.id}: ${f.detail}`);
  }
  return failures.length;
}

let totalFail = 0;

const inputCases = manifest.cases.filter((c) => c.scope === 'input');
totalFail += runScope('input', inputCases, (c) => parseInputProfile(c.source), ['value']);

const identityCases = manifest.cases.filter((c) => c.scope === 'identity');
totalFail += runScope('identity', identityCases, (c) => checkIdentity(c.value), ['edges', 'targets']);
const assertionProblems = checkAssertions(identityCases, (c) => c.value);
if (assertionProblems.length > 0) {
  console.error(`[conformance] scope: identity — ${assertionProblems.length} fixture assertion(s) failed against the fixture's own input:`);
  for (const p of assertionProblems) console.error(`  ${p}`);
  totalFail += assertionProblems.length;
}

const coveredScopes = new Set(['input', 'identity']);
const skippedScopes = [...new Set(manifest.cases.filter((c) => !coveredScopes.has(c.scope)).map((c) => c.scope))].sort();
console.log(`[conformance] cases.yaml scopes not yet implemented, skipped: ${skippedScopes.join(', ')}`);
console.log(
  '[conformance] not touched at all: bindings.yaml, contracts.yaml, domain-metadata.yaml, ' +
    'scope-operations.yaml, normalization.yaml, diagnostics.yaml, release-migration.yaml, full-document.yaml',
);

if (totalFail > 0) {
  process.exit(1);
}
