import { parse as yamlParse } from 'yaml';
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
const IDENTITY_KEYED_ARRAYS = [
    { path: 'domain.entities', key: 'name' },
    { path: 'integrations.custom', key: 'name' },
    { path: 'features', key: 'name' },
];
/**
 * Strip a recognised SDL extension if present. Used to derive a default `name`
 * from a path's filename stem.
 */
function stripSdlExtension(p) {
    for (const ext of SDL_EXTENSIONS) {
        if (p.endsWith(ext))
            return p.slice(0, -ext.length);
    }
    return p;
}
/** Last path segment of a forward-slash path, regardless of platform. */
function basenameStem(p) {
    const noExt = stripSdlExtension(p);
    const i = noExt.lastIndexOf('/');
    return i === -1 ? noExt : noExt.slice(i + 1);
}
/** Directory of a forward-slash path ('' when the path has no directory). */
function dirnameOf(p) {
    const i = p.lastIndexOf('/');
    return i === -1 ? '' : p.slice(0, i);
}
/**
 * Join a module's directory with a path it declares, collapsing `.` and `..`
 * segments. Pure string manipulation — no Node path module, so the resolver
 * stays portable to browser/API contexts. Leading `..` segments are preserved;
 * rejecting escapes from the project root is the host `readFile`'s job.
 */
function joinPath(dir, rel) {
    const segments = (dir === '' ? rel : `${dir}/${rel}`).split('/');
    const out = [];
    for (const seg of segments) {
        if (seg === '' || seg === '.')
            continue;
        if (seg === '..' && out.length > 0 && out[out.length - 1] !== '..') {
            out.pop();
        }
        else {
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
function normalizeImportEntry(raw) {
    if (typeof raw === 'string') {
        if (raw.length === 0)
            return null;
        return { name: basenameStem(raw), path: raw, nameExplicit: false };
    }
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw;
        const name = obj.name;
        const path = obj.path;
        if (typeof name !== 'string' || typeof path !== 'string')
            return null;
        if (name.length === 0 || path.length === 0)
            return null;
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
function loadImportFile(path, readFile) {
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
        if (content !== null)
            return { content, resolvedPath: candidate };
    }
    return null;
}
function simpleHash(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const chr = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}
function parseYaml(raw) {
    try {
        const parsed = yamlParse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Deep merge source into target. Arrays concatenate, objects merge recursively.
 * Scalar conflicts: last writer wins with warning.
 */
function deepMerge(target, source, sourceModule, pathPrefix, warnings, errors) {
    for (const key of Object.keys(source)) {
        if (key === 'imports')
            continue;
        const currentPath = [...pathPrefix, key];
        const targetVal = target[key];
        const sourceVal = source[key];
        if (targetVal === undefined) {
            target[key] = sourceVal;
        }
        else if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
            const identity = IDENTITY_KEYED_ARRAYS.find(e => e.path === currentPath.join('.'));
            target[key] = identity
                ? mergeIdentityKeyed(targetVal, sourceVal, identity.key, currentPath, sourceModule, warnings)
                : [...targetVal, ...sourceVal];
        }
        else if (targetVal !== null && sourceVal !== null &&
            typeof targetVal === 'object' && typeof sourceVal === 'object' &&
            !Array.isArray(targetVal) && !Array.isArray(sourceVal)) {
            deepMerge(targetVal, sourceVal, sourceModule, currentPath, warnings, errors);
        }
        else {
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
function mergeIdentityKeyed(base, incoming, idKey, path, sourceModule, warnings) {
    const out = [...base];
    for (const item of incoming) {
        const id = item !== null && typeof item === 'object'
            ? item[idKey]
            : undefined;
        const idx = typeof id === 'string'
            ? out.findIndex(e => e !== null && typeof e === 'object' && e[idKey] === id)
            : -1;
        if (idx >= 0) {
            warnings.push({
                type: 'duplicate-array-item',
                path: [...path, id],
                message: `"${path.join('.')}" entry "${id}" redefined by ${sourceModule} — the later module's entry replaces the earlier one (identity-keyed merge)`,
                sourceModule,
            });
            out[idx] = item;
        }
        else {
            out.push(item);
        }
    }
    return out;
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
export function parseWithImports(rootYaml, readFile, rootPath = 'root') {
    const ctx = { stack: new Set([rootPath]), loaded: new Set([rootPath]) };
    return resolveFile(rootYaml, readFile, rootPath, '', ctx, 0);
}
function resolveFile(yaml, readFile, filePath, baseDir, ctx, depth) {
    const result = {
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
    const rawImports = Array.isArray(parsed.imports) ? parsed.imports : [];
    // Normalise every entry up-front so the rest of the resolver works with one shape.
    const entries = [];
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
    const seenNames = new Set();
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
    }
    else if (entries.length > 0 && depth >= MAX_IMPORT_DEPTH) {
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
export function validatePerModule(rootYaml, readFile, validateFn) {
    const parsed = parseYaml(rootYaml);
    if (!parsed)
        return [{ module: 'root', errors: [{ path: '', message: 'Failed to parse root YAML' }] }];
    const results = [];
    const rawImports = Array.isArray(parsed.imports) ? parsed.imports : [];
    for (const raw of rawImports) {
        const entry = normalizeImportEntry(raw);
        if (entry === null)
            continue;
        const loaded = loadImportFile(entry.path, readFile);
        if (loaded === null)
            continue;
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
