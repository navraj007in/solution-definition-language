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

/** Function that reads a file given its path relative to the root. */
export type FileReader = (relativePath: string) => string | null;

/**
 * Maximum import nesting depth — portability limit, not a language semantic.
 * See spec/SDL-v1.1.md "Modular SDL and Import Semantics § Depth Limit".
 * Spec requires implementations to support at least 3 levels; this satisfies that requirement.
 * Imports beyond this depth are skipped with a warning (never a hard error).
 */
const MAX_IMPORT_DEPTH = 3;
const SDL_EXTENSIONS = ['.sdl.yaml', '.sdl.yml'];

// ─── Helpers ───

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
      target[key] = [...targetVal, ...sourceVal];
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

// ─── Public API ───

/**
 * Resolve imports from a root SDL document.
 * Accepts a `readFile` function so it works in both filesystem and API contexts.
 *
 * @param rootYaml - The root SDL YAML string
 * @param readFile - Function that reads an imported file by relative path (returns null if not found)
 * @param rootPath - Identifier for the root file (for error messages)
 */
export function parseWithImports(
  rootYaml: string,
  readFile: FileReader,
  rootPath: string = 'root',
): ResolvedSdl {
  return resolveFile(rootYaml, readFile, rootPath, new Set(), 0);
}

function resolveFile(
  yaml: string,
  readFile: FileReader,
  filePath: string,
  visited: Set<string>,
  depth: number,
): ResolvedSdl {
  const result: ResolvedSdl = {
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

  const imports = Array.isArray(parsed.imports) ? parsed.imports as string[] : [];

  // Validate import paths
  for (const imp of imports) {
    if (typeof imp !== 'string') continue;
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
      if (typeof importPath !== 'string') continue;

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
  } else if (imports.length > 0 && depth >= MAX_IMPORT_DEPTH) {
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
  const imports = Array.isArray(parsed.imports) ? parsed.imports as string[] : [];

  for (const imp of imports) {
    if (typeof imp !== 'string') continue;
    const content = readFile(imp);
    if (!content) continue;

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
