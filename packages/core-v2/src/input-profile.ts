/**
 * SDL v2 input profile — spec/v2/FOUNDATIONS.md § "Input and value model",
 * rules IN-001 through IN-005. This is stage one of ST-001–ST-003
 * ("input → local structural checks → ..."); nothing past raw YAML
 * decoding is checked here. See README.md for what's implemented.
 */

import { parseDocument, isMap, isSeq, isScalar } from 'yaml';
import type { Node as YamlNode } from 'yaml';
import type { Diagnostic } from './diagnostics.js';

export interface InputProfileResult {
  outcome: 'accept' | 'reject';
  /** The decoded document on accept; undefined on reject. */
  value: unknown;
  diagnostics: Diagnostic[];
}

function violation(rule: string, message: string, path: Array<string | number> = []): Diagnostic {
  return { rule, severity: 'error', category: 'validation', stage: 'input', message, path };
}

/**
 * Parses one SDL source against the v2 input profile.
 *
 * Deliberately narrow: this only answers "is this UTF-8 text a well-formed
 * SDL v2 input document" (IN-001–IN-005). It says nothing about whether the
 * decoded value is a valid *SDL* document — that starts at ST-001, which
 * needs the structural schema (sdl-v2.schema.json) and isn't wired up here
 * yet.
 */
export function parseInputProfile(source: string): InputProfileResult {
  const doc = parseDocument(source, { uniqueKeys: true, merge: false });
  const diagnostics: Diagnostic[] = [];

  // --- IN-001: exactly one document; %YAML directive (if present) must be
  // 1.2; no other directives are permitted. ---
  if (doc.errors.some((e) => e.code === 'MULTIPLE_DOCS')) {
    diagnostics.push(violation('IN-001', 'Source contains more than one YAML document; exactly one is required.'));
  }
  for (const e of doc.errors.filter((e) => e.code === 'DUPLICATE_KEY')) {
    diagnostics.push(violation('IN-002', `Duplicate mapping key: ${firstLine(e.message)}`));
  }
  for (const e of doc.errors.filter((e) => e.code !== 'MULTIPLE_DOCS' && e.code !== 'DUPLICATE_KEY')) {
    diagnostics.push(violation('IN-001', `Invalid YAML syntax: ${firstLine(e.message)}`));
  }
  if (doc.directives.yaml.explicit && doc.directives.yaml.version !== '1.2') {
    diagnostics.push(
      violation('IN-001', `An explicit %YAML directive must specify 1.2; found ${doc.directives.yaml.version}.`),
    );
  }
  // The library seeds `directives.tags` with only the default '!!' handle;
  // anything more means a %TAG directive was present, which IN-001 forbids
  // alongside any directive other than %YAML.
  if (Object.keys(doc.directives.tags).length > 1) {
    diagnostics.push(violation('IN-001', 'Only the %YAML directive is permitted; %TAG and other directives are forbidden.'));
  }

  // The checks above operate on a source that may not have parsed the way
  // its author intended (e.g. after MULTIPLE_DOCS, `doc.contents` is only
  // the first document). Stop rather than layering uncertain findings on
  // top of an unreliable parse.
  if (diagnostics.length > 0) {
    return { outcome: 'reject', value: undefined, diagnostics };
  }

  // --- IN-001 (root shape): the root must be a mapping. A blank document
  // decodes to null and fails this the same way a scalar or sequence root
  // does. ---
  const root = doc.contents;
  if (!isMap(root)) {
    diagnostics.push(violation('IN-001', 'Document root must be a mapping.'));
    return { outcome: 'reject', value: undefined, diagnostics };
  }

  // --- IN-002 (key type) / IN-003 (explicit tags, merge keys) ---
  walkNodes(root, [], diagnostics);
  if (diagnostics.length > 0) {
    return { outcome: 'reject', value: undefined, diagnostics };
  }

  // --- IN-004: anchors/aliases expand by value within one source; an
  // unknown alias is an error (toJS() throws a ReferenceError for it). A
  // *cyclic* alias, however, does NOT make toJS() throw — the library
  // resolves aliases as object references, so a self-referential anchor
  // produces a genuinely self-referential JS object. That cycle is only
  // caught below, by walkValue's ancestor tracking (a naive recursive walk
  // would stack-overflow on it instead).
  let value: unknown;
  try {
    value = doc.toJS();
  } catch (err) {
    diagnostics.push(violation('IN-004', classifyAliasError(err)));
    return { outcome: 'reject', value: undefined, diagnostics };
  }

  // --- IN-004 (cyclic expansion) / IN-005 (NaN and infinities) ---
  walkValue(value, [], new Set(), diagnostics);
  if (diagnostics.length > 0) {
    return { outcome: 'reject', value: undefined, diagnostics };
  }

  return { outcome: 'accept', value, diagnostics: [] };
}

function firstLine(message: string): string {
  return message.split('\n')[0] ?? message;
}

/** Recursively checks for non-string keys, explicit tags, and merge keys. */
function walkNodes(node: YamlNode, path: Array<string | number>, diagnostics: Diagnostic[]): void {
  if (isMap(node)) {
    if (node.tag) {
      diagnostics.push(violation('IN-003', `Explicit node tag "${node.tag}" is forbidden.`, path));
    }
    for (const pair of node.items) {
      const key = pair.key;
      if (!isScalar(key) || typeof key.value !== 'string') {
        diagnostics.push(violation('IN-002', 'Every mapping key must resolve to a string.', path));
        continue;
      }
      if (key.value === '<<') {
        diagnostics.push(violation('IN-003', 'Merge key "<<" is forbidden.', [...path, key.value]));
        continue;
      }
      const childPath = [...path, key.value];
      const child = pair.value;
      if (isMap(child) || isSeq(child) || isScalar(child)) {
        walkNodes(child, childPath, diagnostics);
      }
      // Alias nodes carry no tag of their own and reference content that was
      // (or will be) walked at its own anchor-definition site, so there is
      // nothing further to check structurally at an alias reference.
    }
  } else if (isSeq(node)) {
    if (node.tag) {
      diagnostics.push(violation('IN-003', `Explicit node tag "${node.tag}" is forbidden.`, path));
    }
    node.items.forEach((item, i) => {
      const childPath = [...path, i];
      if (isMap(item) || isSeq(item) || isScalar(item)) {
        walkNodes(item, childPath, diagnostics);
      }
    });
  } else if (isScalar(node)) {
    if (node.tag) {
      diagnostics.push(violation('IN-003', `Explicit node tag "${node.tag}" is forbidden.`, path));
    }
  }
}

function classifyAliasError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('Unresolved alias')) {
    return `Unresolved alias: ${message}`;
  }
  if (message.includes('Excessive alias count')) {
    return `Excessive alias expansion (resource limit): ${message}`;
  }
  // Defensive fallback — not currently reachable for a genuine cycle (see
  // walkValue), but kept in case some other codepath through toJS() throws
  // for a reason this classifier doesn't yet distinguish.
  return `Alias resolution failed: ${message}`;
}

/**
 * Walks the decoded value checking IN-005 (finite numbers) and IN-004
 * (cyclic alias expansion — see the comment at this function's call site).
 * Tracks the current *ancestor* path (not all visited objects), so a value
 * reached twice via two independent, non-nested paths — the ordinary result
 * of two keys aliasing the same anchor — is not mistaken for a cycle.
 * Returns true if a cycle was found, so the caller stops descending.
 */
function walkValue(value: unknown, path: Array<string | number>, ancestors: Set<object>, diagnostics: Diagnostic[]): boolean {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      diagnostics.push(violation('IN-005', `Value at "${path.join('.') || '(root)'}" is not a finite number.`, path));
    }
    return false;
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (ancestors.has(value)) {
    diagnostics.push(violation('IN-004', 'Cyclic alias expansion detected.', path));
    return true;
  }
  ancestors.add(value);
  let cyclic = false;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length && !cyclic; i++) {
      cyclic = walkValue(value[i], [...path, i], ancestors, diagnostics);
    }
  } else {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (cyclic) break;
      cyclic = walkValue(v, [...path, k], ancestors, diagnostics);
    }
  }
  ancestors.delete(value);
  return cyclic;
}
