/**
 * SDL v2 structural validation — spec/v2/FULL-SPEC.md's FD-001 ("Structural
 * catalogue": sdl-v2.schema.json defines the full authored-document shape)
 * checked directly with AJV against the full document.
 *
 * This is the ST-003 "after resolution, check the complete document's
 * required sections and fields" mode — it expects an assembled, full
 * document (`sdlVersion`, `solution`, `architecture`, `data` all present or
 * legitimately absent-and-therefore-rejected), not a fragment. ST-001's
 * per-source fragment mode — where an ordinary object's missing required
 * members are deferred to the assembled document, but an array item's own
 * required fields are still checked immediately — needs a schema
 * transformation this package doesn't have yet (selectively stripping
 * `required` only from "ordinary object" property schemas, not from array
 * item schemas), so per-fragment structural checking is not implemented.
 *
 * Rule attribution is deliberately coarse. FULL-SPEC.md numbers several
 * more specific structural sub-rules under FD-002 (document minimum: the
 * four top-level sections, solution's required fields, architecture's
 * component-count conditionals) and FD-003 (PII requires explicit
 * encryptionAtRest; ORM exclusion), and the schema does encode both
 * (verified: all 43 `scope: full-document` cases in
 * spec/v2/conformance/full-document.yaml pass on their `expected.structure`
 * outcome). But mapping an individual AJV error back to the specific
 * spec sub-rule it corresponds to needs a real JSON-pointer-path-to-rule-ID
 * table this package doesn't have — so every failure is reported as the
 * umbrella `FD-001` ("this document doesn't match the structural
 * catalogue") rather than guessing a more specific code. See README.md's
 * status table.
 */

import { Ajv } from 'ajv';
import type { ValidateFunction } from 'ajv';
import { sdlV2Schema } from './schema.js';
import type { Diagnostic, Path } from './diagnostics.js';

export interface StructureCheckResult {
  outcome: 'accept' | 'reject';
  diagnostics: Diagnostic[];
}

let compiled: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (!compiled) {
    // strict: false — the schema uses `minItems` on properties without a
    // matching `type: "array"` alongside it in some branches (AJV's strict
    // mode flags this even though the effective validation is correct), the
    // same reason @sdl/core (1.1) compiles its own schema with strict: false.
    const ajv = new Ajv({ allErrors: true, strict: false });
    compiled = ajv.compile(sdlV2Schema);
  }
  return compiled;
}

function ajvErrorPath(instancePath: string): Path {
  if (instancePath === '') return [];
  // AJV instancePath is JSON Pointer syntax, e.g. "/architecture/services/0/name".
  return instancePath
    .split('/')
    .slice(1)
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg.replace(/~1/g, '/').replace(/~0/g, '~')));
}

export function validateStructure(doc: unknown): StructureCheckResult {
  const validate = getValidator();
  const valid = validate(doc);
  if (valid) {
    return { outcome: 'accept', diagnostics: [] };
  }
  const diagnostics: Diagnostic[] = (validate.errors ?? []).map((err) => ({
    rule: 'FD-001',
    severity: 'error',
    category: 'validation',
    stage: 'structure',
    message: `${err.instancePath || '(root)'} ${err.message ?? 'failed schema validation'}`.trim(),
    path: ajvErrorPath(err.instancePath),
  }));
  return { outcome: 'reject', diagnostics };
}
