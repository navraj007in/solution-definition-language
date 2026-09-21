/**
 * SDL v2 import resolution and composition — spec/v2/FOUNDATIONS.md
 * § "Imports and composition", rules IM-001 through IM-006, plus the
 * narrow slices of ST-001 (per-source local-duplicate checking) and
 * ST-003 (sdlVersion consistency) that composition depends on directly.
 *
 * Scope, honestly: this covers the *mechanics* of import resolution and
 * merging — traversal order, diamond/cycle handling, depth limits, path
 * safety, sidecar rejection, and the merge algorithm (identity-keyed
 * arrays, concatenation, scalar-override) — checked against all 21
 * `scope: composition` cases in spec/v2/conformance/cases.yaml, except
 * one: `merge-invalid-source-cannot-be-overridden` needs SC-003
 * (attempt-count grammar) to reject an invalid value in a non-root
 * source before it gets overridden, and this package has no scalar-
 * grammar (SC-*) validator yet. See README.md's status table.
 *
 * What IS covered beyond the traversal/merge mechanics: local-duplicate
 * detection within a single source's `domain.entities[]`,
 * `integrations.custom[]`, and `features[]` (ID-002, via ST-001 — "an
 * invalid value cannot be repaired merely by overriding it in a later
 * source"), and sdlVersion consistency across modules (ST-003).
 *
 * Every file (root and every import) is parsed with `parseInputProfile()`
 * — so IN-001–IN-005 apply uniformly to the whole graph, and a malformed
 * *preferred* file (e.g. `a.sdl.yaml` with broken YAML) is reported as
 * that parse failure rather than silently falling back to `a.sdl.yml`
 * (IM-001: "unreadable or malformed preferred files are errors, not a
 * fallback signal" — only *absence* permits trying the second suffix).
 */

import { parseInputProfile } from './input-profile.js';
import type { Diagnostic, Path } from './diagnostics.js';

export type FileReader = (canonicalPath: string) => string | null;

export interface ComposeOptions {
  /** Spec floor is 3 nested import levels beyond the root; that is the default. */
  maxImportDepth?: number;
}

export interface ComposeWarning {
  rule: string;
  kind: 'scalar-override' | 'duplicate-array-item' | 'nonstandard-extension';
  path: Path;
}

export interface ComposeResult {
  outcome: 'accept' | 'reject' | 'resource-failure';
  /** The merged document with `imports` removed. Present only on 'accept'. */
  document: Record<string, unknown> | undefined;
  diagnostics: Diagnostic[];
  warnings: ComposeWarning[];
  /** Canonical file paths in postorder merge order (imports before the file that imports them). */
  contributions: string[];
}

const IDENTITY_KEYED_ARRAY_PATHS: ReadonlySet<string> = new Set(['domain.entities', 'integrations.custom', 'features']);
const IMPORT_LABEL_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SDL_EXTENSIONS = ['.sdl.yaml', '.sdl.yml'];
const SIDECAR_PATHS: ReadonlySet<string> = new Set(['sdl/assumptions.sdl.yaml', 'sdl/complexity.sdl.yaml']);
const DEFAULT_MAX_IMPORT_DEPTH = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function diag(rule: string, category: Diagnostic['category'], message: string, path: Path = []): Diagnostic {
  return { rule, severity: 'error', category, stage: 'composition', message, path };
}

// ─── Path handling ───

function hasUnsafePathSyntax(p: string): boolean {
  if (p.startsWith('/')) return true; // absolute
  if (p.includes('\\')) return true; // backslash
  if (p.includes('\0')) return true; // NUL
  if (/^[A-Za-z]:/.test(p)) return true; // drive prefix, e.g. C:
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(p)) return true; // URI scheme
  return false;
}

/** Joins a directory with a relative path and collapses `.`/`..`. Returns null if the result escapes the root. */
function joinWithinRoot(dir: string, rel: string): string | null {
  const segments = (dir === '' ? rel : `${dir}/${rel}`).split('/');
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length === 0) return null; // escapes the root
      out.pop();
    } else {
      out.push(seg);
    }
  }
  return out.join('/');
}

function dirnameOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i);
}

function stripKnownExtension(p: string): { stem: string; ext: string | null } {
  for (const ext of ['.sdl.yaml', '.sdl.yml', '.yaml', '.yml']) {
    if (p.endsWith(ext)) return { stem: p.slice(0, -ext.length), ext };
  }
  return { stem: p, ext: null };
}

function basename(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? p : p.slice(i + 1);
}

// ─── Import declaration parsing (IM-001) ───

interface ImportEntry {
  /** As authored — no extension resolution yet. */
  rawPath: string;
  label: string;
}

/** Returns an error diagnostic, or the parsed entry. */
function parseImportEntry(raw: unknown): ImportEntry | Diagnostic {
  if (typeof raw === 'string') {
    if (raw.length === 0) return diag('IM-001', 'validation', 'An imports[] string entry must be nonempty.');
    if (hasUnsafePathSyntax(raw)) {
      return diag('IM-001', 'validation', `Import path "${raw}" uses forbidden syntax (absolute, backslash, drive prefix, URI scheme, or NUL).`);
    }
    const { stem } = stripKnownExtension(basename(raw));
    const label = stem;
    if (!IMPORT_LABEL_PATTERN.test(label)) {
      return diag('IM-001', 'validation', `Import label "${label}" derived from "${raw}" must match ${IMPORT_LABEL_PATTERN.source}.`);
    }
    return { rawPath: raw, label };
  }
  if (isRecord(raw)) {
    const extraKeys = Object.keys(raw).filter((k) => k !== 'name' && k !== 'path' && !k.startsWith('x-'));
    if (extraKeys.length > 0) {
      return diag('IM-001', 'validation', `Import object entry has fields other than name/path/x-*: ${extraKeys.join(', ')}.`);
    }
    const { name, path } = raw;
    if (typeof name !== 'string' || name.length === 0 || typeof path !== 'string' || path.length === 0) {
      return diag('IM-001', 'validation', 'Import object entry requires nonempty string "name" and "path".');
    }
    if (!IMPORT_LABEL_PATTERN.test(name)) {
      return diag('IM-001', 'validation', `Import name "${name}" must match ${IMPORT_LABEL_PATTERN.source}.`);
    }
    if (hasUnsafePathSyntax(path)) {
      return diag('IM-001', 'validation', `Import path "${path}" uses forbidden syntax (absolute, backslash, drive prefix, URI scheme, or NUL).`);
    }
    return { rawPath: path, label: name };
  }
  return diag('IM-001', 'validation', 'Every imports[] entry must be a nonempty string or a {name, path} object.');
}

interface ResolvedFile {
  path: string;
  content: string;
  /** Set when a non-.sdl.yaml/.sdl.yml extension was explicitly used. */
  nonstandardExtension: boolean;
}

/** Resolves one import entry to file content, honoring the suffix-trial rule (IM-001). */
function loadImportFile(canonicalStem: string, readFile: FileReader): ResolvedFile | 'missing' {
  const { ext } = stripKnownExtension(canonicalStem);
  if (ext === '.sdl.yaml' || ext === '.sdl.yml') {
    const content = readFile(canonicalStem);
    return content === null ? 'missing' : { path: canonicalStem, content, nonstandardExtension: false };
  }
  if (ext === '.yaml' || ext === '.yml') {
    const content = readFile(canonicalStem);
    return content === null ? 'missing' : { path: canonicalStem, content, nonstandardExtension: true };
  }
  // No recognized extension: try .sdl.yaml, then (only on absence) .sdl.yml.
  for (const candidateExt of SDL_EXTENSIONS) {
    const candidate = `${canonicalStem}${candidateExt}`;
    const content = readFile(candidate);
    if (content !== null) {
      return { path: candidate, content, nonstandardExtension: false };
    }
  }
  return 'missing';
}

// ─── Local (per-source) identity-keyed array duplicate check ───
// ST-001: "Check duplicate local declarations in the identity collections
// below. An invalid value cannot be repaired merely by overriding it in a
// later source." Scoped to the three arrays IM-004 names.

function checkLocalDuplicates(fragment: Record<string, unknown>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const checks: Array<{ path: Path; array: unknown }> = [
    { path: ['domain', 'entities'], array: isRecord(fragment.domain) ? fragment.domain.entities : undefined },
    { path: ['integrations', 'custom'], array: isRecord(fragment.integrations) ? fragment.integrations.custom : undefined },
    { path: ['features'], array: fragment.features },
  ];
  for (const { path, array } of checks) {
    if (!Array.isArray(array)) continue;
    const seen = new Set<string>();
    array.forEach((item) => {
      if (isRecord(item) && typeof item.name === 'string') {
        if (seen.has(item.name)) {
          diagnostics.push(diag('ID-002', 'validation', `Duplicate "${item.name}" within one source's ${path.join('.')}[].`, path));
        }
        seen.add(item.name);
      }
    });
  }
  return diagnostics;
}

// ─── Merge (IM-004) ───

function decodedEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeByIdentity(existing: unknown[], incoming: unknown[], path: Path, fileId: string, warnings: ComposeWarning[]): unknown[] {
  const out = existing.slice();
  const indexByName = new Map<string, number>();
  out.forEach((item, i) => {
    if (isRecord(item) && typeof item.name === 'string') indexByName.set(item.name, i);
  });
  for (const item of incoming) {
    if (!isRecord(item) || typeof item.name !== 'string') {
      out.push(item); // not identity-shaped; append defensively rather than drop
      continue;
    }
    const existingIndex = indexByName.get(item.name);
    if (existingIndex === undefined) {
      indexByName.set(item.name, out.length);
      out.push(item);
    } else {
      warnings.push({ rule: 'IM-004', kind: 'duplicate-array-item', path: [...path, existingIndex] });
      out[existingIndex] = item; // whole-entry replacement, not a recursive patch
    }
  }
  return out;
}

function deepMerge(
  accumulator: Record<string, unknown>,
  incoming: Record<string, unknown>,
  path: Path,
  fileId: string,
  warnings: ComposeWarning[],
): void {
  for (const [key, incomingValue] of Object.entries(incoming)) {
    const childPath = [...path, key];
    if (!(key in accumulator)) {
      accumulator[key] = incomingValue;
      continue;
    }
    const existingValue = accumulator[key];
    if (isRecord(existingValue) && isRecord(incomingValue)) {
      deepMerge(existingValue, incomingValue, childPath, fileId, warnings);
      continue;
    }
    if (Array.isArray(existingValue) && Array.isArray(incomingValue)) {
      if (IDENTITY_KEYED_ARRAY_PATHS.has(childPath.join('.'))) {
        accumulator[key] = mergeByIdentity(existingValue, incomingValue, childPath, fileId, warnings);
      } else {
        // Concatenation; an empty incoming array naturally contributes nothing.
        accumulator[key] = existingValue.concat(incomingValue);
      }
      continue;
    }
    // Any other combination — replace, warn if the values actually differ.
    if (!decodedEqual(existingValue, incomingValue)) {
      warnings.push({ rule: 'IM-004', kind: 'scalar-override', path: childPath });
    }
    accumulator[key] = incomingValue;
  }
}

// ─── Traversal (IM-002 / IM-003 / IM-005) ───

interface TraversalState {
  stack: string[];
  completed: Set<string>;
  accumulator: Record<string, unknown>;
  contributions: string[];
  diagnostics: Diagnostic[];
  warnings: ComposeWarning[];
  declaredVersion: string | undefined;
  maxImportDepth: number;
  failed: boolean;
}

export function compose(rootPath: string, rootSource: string, readFile: FileReader, options: ComposeOptions = {}): ComposeResult {
  const state: TraversalState = {
    stack: [],
    completed: new Set(),
    accumulator: {},
    contributions: [],
    diagnostics: [],
    warnings: [],
    declaredVersion: undefined,
    maxImportDepth: options.maxImportDepth ?? DEFAULT_MAX_IMPORT_DEPTH,
    failed: false,
  };

  function visitWithReader(canonicalPath: string, content: string, dir: string, depth: number): void {
    if (state.failed) return;

    if (state.stack.includes(canonicalPath)) {
      state.diagnostics.push(diag('IM-003', 'validation', `Circular import: ${[...state.stack, canonicalPath].join(' -> ')}.`));
      state.failed = true;
      return;
    }
    if (state.completed.has(canonicalPath)) {
      return;
    }
    if (depth > state.maxImportDepth) {
      state.diagnostics.push(diag('IM-005', 'resource', `Import depth exceeds the supported limit (${state.maxImportDepth}) at "${canonicalPath}".`));
      state.failed = true;
      return;
    }

    const parsed = parseInputProfile(content);
    if (parsed.outcome === 'reject') {
      state.diagnostics.push(...parsed.diagnostics.map((d) => ({ ...d, message: `[${canonicalPath}] ${d.message}` })));
      state.failed = true;
      return;
    }
    const fragment = parsed.value;
    if (!isRecord(fragment)) {
      state.diagnostics.push(diag('IN-001', 'validation', `[${canonicalPath}] Document root must be a mapping.`));
      state.failed = true;
      return;
    }

    if (SIDECAR_PATHS.has(canonicalPath)) {
      state.diagnostics.push(diag('IM-006', 'validation', `Imported file "${canonicalPath}" is a reserved sidecar path and cannot be an architecture module.`));
      state.failed = true;
      return;
    }
    const remainingKeys = Object.keys(fragment).filter((k) => k !== 'imports' && k !== 'sdlVersion');
    if (remainingKeys.length > 0 && remainingKeys.every((k) => k.startsWith('x-'))) {
      state.diagnostics.push(diag('IM-006', 'validation', `Imported file "${canonicalPath}" contains only x-* extension fields; it is a discovery sidecar, not an architecture module.`));
      state.failed = true;
      return;
    }

    if (typeof fragment.sdlVersion === 'string') {
      if (state.declaredVersion === undefined) {
        state.declaredVersion = fragment.sdlVersion;
      } else if (fragment.sdlVersion !== state.declaredVersion) {
        state.diagnostics.push(
          diag('ST-003', 'validation', `"${canonicalPath}" declares sdlVersion "${fragment.sdlVersion}", but "${state.declaredVersion}" was already established.`),
        );
        state.failed = true;
        return;
      }
    }

    const localDuplicates = checkLocalDuplicates(fragment);
    if (localDuplicates.length > 0) {
      state.diagnostics.push(...localDuplicates);
      state.failed = true;
      return;
    }

    state.stack.push(canonicalPath);

    const rawImports = Array.isArray(fragment.imports) ? fragment.imports : [];
    const seenLabels = new Set<string>();
    const entries: ImportEntry[] = [];
    for (const raw of rawImports) {
      const result = parseImportEntry(raw);
      if ('rule' in result) {
        state.diagnostics.push(result);
        state.failed = true;
        state.stack.pop();
        return;
      }
      if (seenLabels.has(result.label)) {
        state.diagnostics.push(diag('IM-001', 'validation', `Duplicate import label "${result.label}" in "${canonicalPath}".`));
        state.failed = true;
        state.stack.pop();
        return;
      }
      seenLabels.add(result.label);
      entries.push(result);
    }

    const dirOfThisFile = dirnameOf(canonicalPath);
    for (const entry of entries) {
      if (state.failed) break;
      const stem = joinWithinRoot(dirOfThisFile, entry.rawPath);
      if (stem === null) {
        state.diagnostics.push(diag('IM-001', 'validation', `Import path "${entry.rawPath}" in "${canonicalPath}" escapes the import root.`));
        state.failed = true;
        break;
      }
      const loaded = loadImportFile(stem, readFile);
      if (loaded === 'missing') {
        state.diagnostics.push(diag('IM-005', 'validation', `Imported file not found: "${stem}" (tried .sdl.yaml, .sdl.yml).`));
        state.failed = true;
        break;
      }
      if (loaded.nonstandardExtension) {
        state.warnings.push({ rule: 'IM-001', kind: 'nonstandard-extension', path: [] });
      }
      visitWithReader(loaded.path, loaded.content, dirnameOf(loaded.path), depth + 1);
    }

    if (state.failed) {
      state.stack.pop();
      return;
    }

    const ownContent = { ...fragment };
    delete ownContent.imports;
    deepMerge(state.accumulator, ownContent, [], canonicalPath, state.warnings);
    state.contributions.push(canonicalPath);
    state.completed.add(canonicalPath);
    state.stack.pop();
  }

  visitWithReader(rootPath, rootSource, dirnameOf(rootPath), 0);

  if (state.diagnostics.length === 0) {
    return {
      outcome: 'accept',
      document: state.accumulator,
      diagnostics: [],
      warnings: state.warnings,
      contributions: state.contributions,
    };
  }
  const outcome = state.diagnostics.some((d) => d.category === 'resource') ? 'resource-failure' : 'reject';
  return {
    outcome,
    document: undefined,
    diagnostics: state.diagnostics,
    warnings: state.warnings,
    contributions: state.contributions,
  };
}
