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
 * DG-001's stage vocabulary. Only 'input' is produced by this package today.
 */
export type Stage =
  | 'input'
  | 'source'
  | 'composition'
  | 'structure'
  | 'semantics'
  | 'normalization'
  | 'result';

export interface Diagnostic {
  /** A rule ID from the v2 specification prose (e.g. "IN-002"), not a package error code. */
  rule: string;
  severity: Severity;
  category: Category;
  stage: Stage;
  message: string;
  /** Decoded key/index path to the offending node, when known. `[]` means the document root. */
  path?: Array<string | number>;
}
