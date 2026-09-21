#!/usr/bin/env node
// Runs @sdl/core-v2 against spec/v2/conformance/cases.yaml's `scope: input`
// cases — the only scope this package implements so far (IN-001–IN-005).
//
// This is deliberately separate from spec/v2/conformance/check-corpus.mjs,
// which is an *integrity* checker: it verifies the fixture corpus is
// internally consistent (unique IDs, valid YAML, linked files not drifted,
// etc.) but "does not invoke SDL packages" — by design, it never runs an
// actual implementation against the cases. This script is that missing
// other half for the one scope this package covers: it feeds each case's
// `source` through parseInputProfile() and checks the outcome (and, for
// reject cases, that every expected violation rule was reported; for
// accept cases with an expected `value`, that the decoded value matches).
//
// Every other scope (identity, scalar, domain, composition, ...) has cases
// in this same corpus that nothing in this package can run yet — see
// README.md's status table.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseInputProfile } from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesPath = join(__dirname, '..', '..', '..', 'spec', 'v2', 'conformance', 'cases.yaml');

const manifest = parseYaml(readFileSync(casesPath, 'utf8'));
const inputCases = manifest.cases.filter((c) => c.scope === 'input');
const skippedScopes = new Set(manifest.cases.filter((c) => c.scope !== 'input').map((c) => c.scope));

let pass = 0;
let fail = 0;
const failures = [];

for (const c of inputCases) {
  const result = parseInputProfile(c.source);
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

  if (ok && expected.outcome === 'accept' && expected.value !== undefined) {
    if (JSON.stringify(result.value) !== JSON.stringify(expected.value)) {
      ok = false;
      detail = `value mismatch: want ${JSON.stringify(expected.value)}, got ${JSON.stringify(result.value)}`;
    }
  }

  if (!ok && detail === '') {
    detail = `outcome: want ${expected.outcome}, got ${result.outcome}, diagnostics ${JSON.stringify(result.diagnostics)}`;
  }

  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({ id: c.id, detail });
  }
}

console.log(`[conformance] scope: input — ${pass}/${inputCases.length} passed`);
for (const f of failures) {
  console.error(`  FAIL ${f.id}: ${f.detail}`);
}

const otherScopes = [...skippedScopes].sort();
console.log(`[conformance] cases.yaml scopes not yet implemented, skipped: ${otherScopes.join(', ')}`);
console.log(
  '[conformance] not touched at all: bindings.yaml, contracts.yaml, domain-metadata.yaml, ' +
    'scope-operations.yaml, normalization.yaml, diagnostics.yaml, release-migration.yaml, full-document.yaml',
);

if (fail > 0) {
  process.exit(1);
}
