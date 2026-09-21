#!/usr/bin/env node
// Post-processes the tsc "bundler"-resolution ESM output in dist-esm/ so it
// is loadable by Node's native ESM resolver, which (unlike bundlers) requires
// fully-specified relative import paths.
//
// This does two things, scoped tightly to actual import/export declarations
// so it never touches string/template-literal content that merely contains
// the substring "from '...'" (e.g. codegen templates in generators/scaffold):
//
//   1. Appends ".js" to bare relative specifiers, or "/index.js" when the
//      specifier resolves to a directory.
//   2. Rewrites relative JSON imports (`import x from './schema/foo.json'`)
//      into a createRequire()-based load, since native ESM JSON imports
//      require import-attribute syntax that differs across Node versions,
//      while createRequire's require() loads JSON everywhere uniformly.
//
// It also writes dist-esm/package.json with {"type":"module"} so Node does
// not have to guess (and warn) about the module type of these files.

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEsm = join(__dirname, '..', 'dist-esm');

// Matches a top-level import/export declaration with a relative specifier,
// e.g.:
//   import { foo } from './bar'
//   export { foo } from './bar'
//   export * from './bar'
//   import foo from './bar'
// Anchored to the start of a line (optionally indented) so it cannot match
// a relative-looking string buried inside an unrelated expression.
const IMPORT_RE = /^([ \t]*(?:import|export)(?:\s+type)?\s[^;\n]*?from\s+)(['"])(\.[^'"]+)\2/gm;

function resolveSpecifier(fileDir, spec) {
  if (extname(spec) === '.json') {
    return { kind: 'json', spec };
  }
  const abs = join(fileDir, spec);
  try {
    if (statSync(abs).isDirectory()) {
      return { kind: 'js', spec: `${spec}/index.js` };
    }
  } catch {
    // Not a directory (or doesn't exist pre-extension) — treat as a file.
  }
  return { kind: 'js', spec: `${spec}.js` };
}

function fixFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  const fileDir = dirname(filePath);
  let jsonImportNeeded = false;

  let out = original.replace(IMPORT_RE, (match, prefix, quote, spec) => {
    const resolved = resolveSpecifier(fileDir, spec);
    if (resolved.kind === 'json') {
      jsonImportNeeded = true;
      return match; // rewritten separately below, once we know the binding name
    }
    return `${prefix}${quote}${resolved.spec}${quote}`;
  });

  if (jsonImportNeeded) {
    // Rewrite `import NAME from './x.json';` -> createRequire-based load.
    // (JSON is only ever consumed via a default import in this codebase.)
    const JSON_IMPORT_RE = /^[ \t]*import\s+(\w+)\s+from\s+(['"])(\.[^'"]+\.json)\2;?/gm;
    const needsCreateRequire = JSON_IMPORT_RE.test(out);
    if (needsCreateRequire) {
      out = out.replace(JSON_IMPORT_RE, (_match, binding, quote, spec) => {
        return `import { createRequire as __createRequire } from 'node:module';\nconst __require = __createRequire(import.meta.url);\nconst ${binding} = __require(${quote}${spec}${quote});`;
      });
    }
  }

  if (out !== original) {
    writeFileSync(filePath, out);
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fixFile(full);
    }
  }
}

walk(distEsm);
writeFileSync(join(distEsm, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');

console.log('[fix-esm-output] rewrote relative specifiers and wrote dist-esm/package.json');
