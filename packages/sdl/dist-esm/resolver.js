import { parse as yamlParse } from 'yaml';
const MAX_IMPORT_DEPTH = 3;
const SDL_EXTENSIONS = ['.sdl.yaml', '.sdl.yml'];
// ─── Helpers ───
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
            target[key] = [...targetVal, ...sourceVal];
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
                message: `Key "${currentPath.join('.')}" overridden by ${sourceModule}`,
                sourceModule,
            });
            target[key] = sourceVal;
        }
    }
}
// ─── Public API ───
/**
 * Resolve imports from a root SDL document.
 * Accepts a `readFile` function so it works in both filesystem and API contexts.
 *
 * @param rootYaml - The root SDL YAML string
 * @param readFile - Function that reads an imported file by relative path (returns null if not found)
 * @param rootPath - Identifier for the root file (for error messages)
 */
export function parseWithImports(rootYaml, readFile, rootPath = 'root') {
    return resolveFile(rootYaml, readFile, rootPath, new Set(), 0);
}
function resolveFile(yaml, readFile, filePath, visited, depth) {
    const result = {
        document: {},
        modules: [],
        warnings: [],
        errors: [],
    };
    if (visited.has(filePath)) {
        result.errors.push({
            type: 'circular-import',
            message: `Circular import detected: ${filePath}`,
            sourceModule: filePath,
        });
        return result;
    }
    visited.add(filePath);
    const parsed = parseYaml(yaml);
    if (!parsed) {
        result.errors.push({
            type: 'parse-error',
            message: `Failed to parse YAML: ${filePath}`,
            sourceModule: filePath,
        });
        return result;
    }
    const imports = Array.isArray(parsed.imports) ? parsed.imports : [];
    // Validate import paths
    for (const imp of imports) {
        if (typeof imp !== 'string')
            continue;
        const hasValidExt = SDL_EXTENSIONS.some(ext => imp.endsWith(ext));
        if (!hasValidExt) {
            result.warnings.push({
                type: 'scalar-override',
                path: ['imports'],
                message: `Import "${imp}" should end with .sdl.yaml or .sdl.yml`,
                sourceModule: filePath,
            });
        }
    }
    // Process imports first (they form the base)
    if (imports.length > 0 && depth < MAX_IMPORT_DEPTH) {
        for (const importPath of imports) {
            if (typeof importPath !== 'string')
                continue;
            const importContent = readFile(importPath);
            if (importContent === null) {
                result.errors.push({
                    type: 'missing-file',
                    message: `Imported file not found: ${importPath}`,
                    sourceModule: filePath,
                });
                continue;
            }
            const sub = resolveFile(importContent, readFile, importPath, visited, depth + 1);
            result.errors.push(...sub.errors);
            result.warnings.push(...sub.warnings);
            result.modules.push(...sub.modules);
            if (Object.keys(sub.document).length > 0) {
                const sections = Object.keys(sub.document).filter(k => k !== 'imports');
                result.modules.push({
                    path: importPath,
                    sections,
                    hash: simpleHash(JSON.stringify(sub.document)),
                });
                deepMerge(result.document, sub.document, importPath, [], result.warnings, result.errors);
            }
        }
    }
    else if (imports.length > 0 && depth >= MAX_IMPORT_DEPTH) {
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
    const imports = Array.isArray(parsed.imports) ? parsed.imports : [];
    for (const imp of imports) {
        if (typeof imp !== 'string')
            continue;
        const content = readFile(imp);
        if (!content)
            continue;
        const moduleDoc = parseYaml(content);
        if (!moduleDoc) {
            results.push({ module: imp, errors: [{ path: '', message: `Failed to parse module: ${imp}` }] });
            continue;
        }
        const validation = validateFn(moduleDoc);
        if (!validation.valid) {
            results.push({ module: imp, errors: validation.errors });
        }
    }
    return results;
}
