import { parse as yamlParse } from 'yaml';

// ─── Types ───

export interface SdlModule {
  /** Relative path or identifier for this module */
  path: string;
  /** Top-level keys this module contributes */
  sections: string[];
  /** Content hash for change detection */
  hash: string;
}

export interface ResolveWarning {
  type: 'scalar-override' | 'duplicate-array-item';
  path: string[];
  message: string;
  sourceModule: string;
}

export interface ResolveError {
  type: 'conflict' | 'circular-import' | 'missing-file' | 'parse-error';
  path?: string[];
  message: string;
  sourceModule: string;
}

export interface ResolvedSdl {
  document: Record<string, unknown>;
  modules: SdlModule[];
  warnings: ResolveWarning[];
  errors: ResolveError[];
}

/**
 * Function that reads a file given its path relative to the root file's
 * directory. The resolver joins each nested module's directory onto the paths
 * it declares, so `readFile` always receives root-relative paths — hosts never
 * need to track which module is asking. Per the spec, hosts should reject
 * absolute paths and `..`-traversal that escapes the project root.
 */
export type FileReader = (relativePath: string) => string | null;

/**
 * Maximum import nesting depth — portability limit, not a language semantic.
 * See spec/SDL-v1.1.md "Modular SDL and Import Semantics § Depth Limit".
 * Spec requires implementations to support at least 3 levels; this satisfies that requirement.
 * Imports beyond this depth are skipped with a warning (never a hard error).
 */
const MAX_IMPORT_DEPTH = 3;
const SDL_EXTENSIONS = ['.sdl.yaml', '.sdl.yml'];
const IMPORT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Arrays merged by logical identity rather than concatenation.
 * See spec/SDL-v1.1.md "Array Merge Semantics: Concatenable vs. Identity-Keyed".
 * A duplicate identity across modules emits a `duplicate-array-item` warning
 * and the later module's entry replaces the earlier one (last writer wins,
 * consistent with the scalar rule).
 */
const IDENTITY_KEYED_ARRAYS: ReadonlyArray<{ path: string; key: string }> = [
  { path: 'domain.entities', key: 'name' },
  { path: 'integrations.custom', key: 'name' },
  { path: 'features', key: 'name' },
];

// ─── Helpers ───

/**
 * Normalized form of a single `imports[]` entry.
 *
 * `path` is the path *as written* by the author — extension may be missing
 * (Form B). `resolvedPath` is filled in once the file is located on disk.
 *
 * `name` defaults to the filename stem when not explicitly provided.
 */
interface ImportEntry {
  name: string;
  path: string;
  /** True when `name` was explicitly provided (Form C); false when inferred from the stem. */
  nameExplicit: boolean;
}

/**
 * Strip a recognised SDL extension if present. Used to derive a default `name`
 * from a path's filename stem.
 */
function stripSdlExtension(p: string): string {
  for (const ext of SDL_EXTENSIONS) {
    if (p.endsWith(ext)) return p.slice(0, -ext.length);
  }
  return p;
}

/** Last path segment of a forward-slash path, regardless of platform. */
function basenameStem(p: string): string {
  const noExt = stripSdlExtension(p);
  const i = noExt.lastIndexOf('/');
  return i === -1 ? noExt : noExt.slice(i + 1);
}

/** Directory of a forward-slash path ('' when the path has no directory). */
function dirnameOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i);
}

/**
 * Join a module's directory with a path it declares, collapsing `.` and `..`
 * segments. Pure string manipulation — no Node path module, so the resolver
 * stays portable to browser/API contexts. Leading `..` segments are preserved;
 * rejecting escapes from the project root is the host `readFile`'s job.
 */
function joinPath(dir: string, rel: string): string {
  const segments = (dir === '' ? rel : `${dir}/${rel}`).split('/');
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..' && out.length > 0 && out[out.length - 1] !== '..') {
      out.pop();
    } else {
      out.push(seg);
    }
  }
  return out.join('/');
}

/**
 * Normalise one entry from the raw `imports[]` array into an ImportEntry.
 *
 * Accepts:
 *  - Form A — string ending in `.sdl.yaml` / `.sdl.yml`            (existing)
 *  - Form B — string with the extension omitted                     (v1.1 amendment)
 *  - Form C — `{ name, path }` object; `path` may be Form A or B    (v1.1 amendment)
 *
 * Returns null when the entry is structurally invalid.
 */
function normalizeImportEntry(raw: unknown): ImportEntry | null {
  if (typeof raw === 'string') {
    if (raw.length === 0) return null;
    return { name: basenameStem(raw), path: raw, nameExplicit: false };
  }
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const name = obj.name;
    const path = obj.path;
    if (typeof name !== 'string' || typeof path !== 'string') return null;
    if (name.length === 0 || path.length === 0) return null;
    return { name, path, nameExplicit: true };
  }
  return null;
}

/**
 * Resolve a Form-B path (extension omitted) by trying each SDL extension in
 * order. Returns the loaded content + the path that actually resolved, or null.
 *
 * Form-A paths (extension already present) are tried as-is.
 *
 * Looks suspicious if the path has a non-SDL yaml extension (`.yaml` / `.yml`
 * without the `.sdl` segment) — in that case the resolver does NOT silently
 * append another extension; it loads the file verbatim and lets the caller
 * surface the warning.
 */
function loadImportFile(
  path: string,
  readFile: FileReader,
): { content: string; resolvedPath: string } | null {
  const hasSdlExt = SDL_EXTENSIONS.some(ext => path.endsWith(ext));
  const hasOtherYamlExt = !hasSdlExt && (path.endsWith('.yaml') || path.endsWith('.yml'));

  if (hasSdlExt || hasOtherYamlExt) {
    const content = readFile(path);
    return content === null ? null : { content, resolvedPath: path };
  }

  // Form B — try each SDL extension, .sdl.yaml first (preferred).
  for (const ext of SDL_EXTENSIONS) {
    const candidate = path + ext;
    const content = readFile(candidate);
    if (content !== null) return { content, resolvedPath: candidate };
  }
  return null;
}

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseYaml(raw: string): Record<string, unknown> | null {
  try {
    const parsed = yamlParse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deep merge source into target. Arrays concatenate, objects merge recursively.
 * Scalar conflicts: last writer wins with warning.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  sourceModule: string,
  pathPrefix: string[],
  warnings: ResolveWarning[],
  errors: ResolveError[],
): void {
  for (const key of Object.keys(source)) {
    if (key === 'imports') continue;

    const currentPath = [...pathPrefix, key];
    const targetVal = target[key];
    const sourceVal = source[key];

    if (targetVal === undefined) {
      target[key] = sourceVal;
    } else if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      const identity = IDENTITY_KEYED_ARRAYS.find(e => e.path === currentPath.join('.'));
      target[key] = identity
        ? mergeIdentityKeyed(targetVal, sourceVal, identity.key, currentPath, sourceModule, warnings)
        : [...targetVal, ...sourceVal];
    } else if (
      targetVal !== null && sourceVal !== null &&
      typeof targetVal === 'object' && typeof sourceVal === 'object' &&
      !Array.isArray(targetVal) && !Array.isArray(sourceVal)
    ) {
      deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
        sourceModule,
        currentPath,
        warnings,
        errors,
      );
    } else {
      warnings.push({
        type: 'scalar-override',
        path: currentPath,
        // last-writer-wins is normative per spec/SDL-v1.1.md "Merge Rules"
        message: `Key "${currentPath.join('.')}" overridden by ${sourceModule} (was: ${JSON.stringify(targetVal)}, now: ${JSON.stringify(sourceVal)})`,
        sourceModule,
      });
      target[key] = sourceVal;
    }
  }
}

/**
 * Merge an identity-keyed array: entries whose `idKey` value matches an
 * existing entry replace it (with a `duplicate-array-item` warning); new
 * identities append. Entries without a usable identity value fall back to
 * plain append.
 */
function mergeIdentityKeyed(
  base: unknown[],
  incoming: unknown[],
  idKey: string,
  path: string[],
  sourceModule: string,
  warnings: ResolveWarning[],
): unknown[] {
  const out = [...base];
  for (const item of incoming) {
    const id = item !== null && typeof item === 'object'
      ? (item as Record<string, unknown>)[idKey]
      : undefined;
    const idx = typeof id === 'string'
      ? out.findIndex(e => e !== null && typeof e === 'object' && (e as Record<string, unknown>)[idKey] === id)
      : -1;
    if (idx >= 0) {
      warnings.push({
        type: 'duplicate-array-item',
        path: [...path, id as string],
        message: `"${path.join('.')}" entry "${id}" redefined by ${sourceModule} — the later module's entry replaces the earlier one (identity-keyed merge)`,
        sourceModule,
      });
      out[idx] = item;
    } else {
      out.push(item);
    }
  }
  return out;
}

// ─── Public API ───

/**
 * Shared resolution state threaded through the recursive walk.
 *
 * `stack` holds the chain of files currently being resolved (root → … → leaf);
 * a file importing one of its own ancestors is a genuine cycle. `loaded` holds
 * every file already merged; hitting one again through a *different* branch
 * (a diamond dependency) is legal and is skipped silently — its content is
 * already in the accumulated document.
 */
interface ResolveContext {
  stack: Set<string>;
  loaded: Set<string>;
}

/**
 * Resolve imports from a root SDL document.
 * Accepts a `readFile` function so it works in both filesystem and API contexts.
 *
 * Import paths are resolved relative to the file that declares them (per the
 * spec's import constraints): the resolver prefixes each nested module's
 * directory, so `readFile` always receives paths relative to the root file's
 * directory.
 *
 * @param rootYaml - The root SDL YAML string
 * @param readFile - Function that reads an imported file by root-relative path (returns null if not found)
 * @param rootPath - Identifier for the root file (for error messages)
 */
export function parseWithImports(
  rootYaml: string,
  readFile: FileReader,
  rootPath: string = 'root',
): ResolvedSdl {
  const ctx: ResolveContext = { stack: new Set([rootPath]), loaded: new Set([rootPath]) };
  return resolveFile(rootYaml, readFile, rootPath, '', ctx, 0);
}

function resolveFile(
  yaml: string,
  readFile: FileReader,
  filePath: string,
  baseDir: string,
  ctx: ResolveContext,
  depth: number,
): ResolvedSdl {
  const result: ResolvedSdl = {
    document: {},
    modules: [],
    warnings: [],
    errors: [],
  };

  const parsed = parseYaml(yaml);
  if (!parsed) {
    result.errors.push({
      type: 'parse-error',
      message: `Failed to parse YAML: ${filePath}`,
      sourceModule: filePath,
    });
    return result;
  }

  const rawImports = Array.isArray(parsed.imports) ? parsed.imports as unknown[] : [];

  // Normalise every entry up-front so the rest of the resolver works with one shape.
  const entries: ImportEntry[] = [];
  for (const raw of rawImports) {
    const entry = normalizeImportEntry(raw);
    if (entry === null) {
      result.warnings.push({
        type: 'scalar-override',
        path: ['imports'],
        message: `Skipping invalid imports[] entry: must be a string or {name, path} object`,
        sourceModule: filePath,
      });
      continue;
    }
    entries.push(entry);
  }

  // Validate names: pattern + uniqueness within this file.
  const seenNames = new Set<string>();
  for (const entry of entries) {
    if (entry.nameExplicit && !IMPORT_NAME_PATTERN.test(entry.name)) {
      result.warnings.push({
        type: 'scalar-override',
        path: ['imports'],
        message: `Import name "${entry.name}" should match ${IMPORT_NAME_PATTERN.source}`,
        sourceModule: filePath,
      });
    }
    if (seenNames.has(entry.name)) {
      result.errors.push({
        type: 'conflict',
        path: ['imports'],
        message: `Duplicate import name "${entry.name}" in ${filePath}. Use explicit {name, path} entries to disambiguate.`,
        sourceModule: filePath,
      });
    }
    seenNames.add(entry.name);
  }

  // Surface a warning for paths that look like YAML but aren't `.sdl.yaml`/`.sdl.yml`.
  // Form B (no extension) is silent — the resolver will infer the extension below.
  for (const entry of entries) {
    const p = entry.path;
    const hasSdlExt = SDL_EXTENSIONS.some(ext => p.endsWith(ext));
    const hasOtherYamlExt = !hasSdlExt && (p.endsWith('.yaml') || p.endsWith('.yml'));
    if (hasOtherYamlExt) {
      result.warnings.push({
        type: 'scalar-override',
        path: ['imports'],
        message: `Import "${p}" should end with .sdl.yaml or .sdl.yml (or omit the extension entirely)`,
        sourceModule: filePath,
      });
    }
  }

  // Process imports first (they form the base)
  if (entries.length > 0 && depth < MAX_IMPORT_DEPTH) {
    for (const entry of entries) {
      // Paths are declared relative to the importing file; join its directory
      // so readFile receives a root-relative path.
      const joinedPath = joinPath(baseDir, entry.path);
      const loadedFile = loadImportFile(joinedPath, readFile);
      if (loadedFile === null) {
        const tried = SDL_EXTENSIONS.some(ext => joinedPath.endsWith(ext)) || joinedPath.endsWith('.yaml') || joinedPath.endsWith('.yml')
          ? joinedPath
          : `${joinedPath}.sdl.yaml | ${joinedPath}.sdl.yml`;
        result.errors.push({
          type: 'missing-file',
          message: `Imported file not found: ${tried}`,
          sourceModule: filePath,
        });
        continue;
      }

      const { content: importContent, resolvedPath } = loadedFile;

      if (ctx.stack.has(resolvedPath)) {
        result.errors.push({
          type: 'circular-import',
          message: `Circular import detected: ${resolvedPath} is already being resolved (import chain: ${[...ctx.stack].join(' → ')})`,
          sourceModule: filePath,
        });
        continue;
      }
      if (ctx.loaded.has(resolvedPath)) {
        // Diamond dependency: the module was already merged through another
        // branch. Legal — skip silently rather than double-merging.
        continue;
      }

      ctx.stack.add(resolvedPath);
      ctx.loaded.add(resolvedPath);
      const sub = resolveFile(importContent, readFile, resolvedPath, dirnameOf(resolvedPath), ctx, depth + 1);
      ctx.stack.delete(resolvedPath);
      result.errors.push(...sub.errors);
      result.warnings.push(...sub.warnings);
      result.modules.push(...sub.modules);

      if (Object.keys(sub.document).length > 0) {
        const sections = Object.keys(sub.document).filter(k => k !== 'imports');
        result.modules.push({
          path: resolvedPath,
          sections,
          hash: simpleHash(JSON.stringify(sub.document)),
        });
        deepMerge(result.document, sub.document, resolvedPath, [], result.warnings, result.errors);
      }
    }
  } else if (entries.length > 0 && depth >= MAX_IMPORT_DEPTH) {
    result.warnings.push({
      type: 'scalar-override',
      path: ['imports'],
      message: `Maximum import depth (${MAX_IMPORT_DEPTH}) reached, skipping imports in ${filePath}`,
      sourceModule: filePath,
    });
  }

  // Merge root content on top (root is final authority)
  const rootContent = { ...parsed };
  delete rootContent.imports;
  deepMerge(result.document, rootContent, filePath, [], result.warnings, result.errors);

  return result;
}

/**
 * Validate each module independently and attribute errors to their source module.
 */
export function validatePerModule(
  rootYaml: string,
  readFile: FileReader,
  validateFn: (data: unknown) => { valid: boolean; errors: Array<{ path: string; message: string }> },
): Array<{ module: string; errors: Array<{ path: string; message: string }> }> {
  const parsed = parseYaml(rootYaml);
  if (!parsed) return [{ module: 'root', errors: [{ path: '', message: 'Failed to parse root YAML' }] }];

  const results: Array<{ module: string; errors: Array<{ path: string; message: string }> }> = [];
  const rawImports = Array.isArray(parsed.imports) ? parsed.imports as unknown[] : [];

  for (const raw of rawImports) {
    const entry = normalizeImportEntry(raw);
    if (entry === null) continue;

    const loaded = loadImportFile(entry.path, readFile);
    if (loaded === null) continue;

    const moduleDoc = parseYaml(loaded.content);
    if (!moduleDoc) {
      results.push({ module: loaded.resolvedPath, errors: [{ path: '', message: `Failed to parse module: ${loaded.resolvedPath}` }] });
      continue;
    }

    const validation = validateFn(moduleDoc);
    if (!validation.valid) {
      results.push({ module: loaded.resolvedPath, errors: validation.errors });
    }
  }

  return results;
}
