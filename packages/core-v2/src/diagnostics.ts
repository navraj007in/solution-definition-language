/**
 * Shared diagnostic vocabulary, aligned with spec/v2/DIAGNOSTICS.md (DG-001).
 *
 * This is intentionally a subset: DG-001 defines a full report *envelope*
 * (`format`, `scope`, `sources`, `outcome`, `diagnostics`, `advice`) for a
 * complete validation operation. Nothing in this package produces that
 * envelope yet — only the input-profile stage (IN-001–IN-005) is
 * implemented (see input-profile.ts and README.md). `Diagnostic` here is
 * the per-finding shape DG-001 requires (`rule`, `severity`, `category`,
 * `stage`, `message`, plus a decoded `path` in place of full DG-002
 * location/source-descriptor resolution, which needs a source-ID concept
 * this package doesn't have yet). Building the full envelope, `sources`
 * array, and `location.source` resolution is future work, tracked in
 * README.md's status table.
 */

export type Severity = 'error' | 'warning';
export type Category = 'validation' | 'resource';

/**
 * DG-001's stage vocabulary. Only 'input' and 'structure' are produced by
 * this package today. Identity/reference checks (ID-*) are classified as
 * 'structure' — DG-001 has no dedicated "identity" stage, and ST-003 groups
 * "identities, references, cross-field predicates" together under the
 * document's full-structure check, which is the closest documented fit.
 */
export type Stage =
  | 'input'
  | 'source'
  | 'composition'
  | 'structure'
  | 'semantics'
  | 'normalization'
  | 'result';

/** Decoded key/index path to a node. `[]` means the document root. */
export type Path = Array<string | number>;

export interface Diagnostic {
  /** A rule ID from the v2 specification prose (e.g. "IN-002"), not a package error code. */
  rule: string;
  severity: Severity;
  category: Category;
  stage: Stage;
  message: string;
  /** Decoded key/index path to the offending node, when known. */
  path?: Path;
}
