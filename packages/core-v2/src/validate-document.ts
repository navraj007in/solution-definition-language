/**
 * Combines the checks this package has into one full-document result, in
 * ST-003's order: "full structure, identities/references, cross-field
 * predicates... in that order."
 *
 * This is NOT FD-006 ("Full-document conformance": input profile for all
 * sources, composition, final structure, identities/references, *all*
 * applicable cross-field predicates, ND/NM normalization, and the
 * resulting document's validity). It only runs the two of those stages
 * this package has: `validateStructure()` (FD-001/002/003, whatever the
 * schema itself encodes) and `checkIdentity()` (the ~2-of-20 identity sets
 * that module covers). No composition, no semantic slices beyond identity,
 * no normalization.
 *
 * Given an already-assembled document — this doesn't parse YAML or resolve
 * imports; combine with `compose()` first for a multi-file input.
 */

import { validateStructure } from './structure.js';
import { checkIdentity } from './identity.js';
import type { Diagnostic } from './diagnostics.js';

export interface ValidateFullDocumentResult {
  outcome: 'accept' | 'reject';
  diagnostics: Diagnostic[];
}

export function validateFullDocument(doc: unknown): ValidateFullDocumentResult {
  const structure = validateStructure(doc);
  if (structure.outcome === 'reject') {
    return { outcome: 'reject', diagnostics: structure.diagnostics };
  }

  const identity = checkIdentity(doc);
  if (identity.outcome === 'reject') {
    return { outcome: 'reject', diagnostics: identity.diagnostics };
  }

  return { outcome: 'accept', diagnostics: [] };
}
