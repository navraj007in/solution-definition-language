#!/usr/bin/env node
// Packs the package exactly as it would be published, installs the tarball
// into a scratch project, and verifies both consumption paths actually work
// under native Node — not just under a bundler / ts-node moduleResolution.
//
//   1. CommonJS:      require('@sdl/core')
//   2. Native ESM:    import ... from '@sdl/core' (no "type": "module"
//                      needed in the consumer — the package's own exports
//                      map must resolve correctly either way)
//
// This exists because `tsc`'s "bundler" moduleResolution happily compiles
// extension-less relative imports that native Node ESM cannot resolve, so a
// green `npm test` (which only runs the CJS build under node --test) is not
// sufficient evidence that the published package works.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: pkgRoot, encoding: 'utf8', ...opts });
}

console.log('[test:packed] npm pack...');
const packOutput = run('npm', ['pack', '--json']);
const [packInfo] = JSON.parse(packOutput);
const tarballPath = join(pkgRoot, packInfo.filename);

const scratch = mkdtempSync(join(tmpdir(), 'sdl-core-packed-'));
let failed = false;

try {
  cpSync(tarballPath, join(scratch, packInfo.filename));

  run('npm', ['init', '-y'], { cwd: scratch });
  console.log('[test:packed] installing tarball into scratch project...');
  run('npm', ['install', '--no-audit', '--no-fund', `./${packInfo.filename}`], { cwd: scratch });

  // 1. CommonJS consumer.
  writeFileSync(
    join(scratch, 'cjs-check.cjs'),
    `const sdl = require('@sdl/core');\n` +
      `if (typeof sdl.compile !== 'function') throw new Error('compile is not a function (CJS)');\n` +
      `if (typeof sdl.parse !== 'function') throw new Error('parse is not a function (CJS)');\n` +
      `console.log('[test:packed] CJS require() OK');\n`,
  );
  run('node', ['cjs-check.cjs'], { cwd: scratch });

  // 2. Native ESM consumer — no "type": "module" in the consumer's own
  //    package.json, so this exercises the package's exports map exactly as
  //    a real downstream ESM project would.
  writeFileSync(
    join(scratch, 'esm-check.mjs'),
    `import { compile, parse } from '@sdl/core';\n` +
      `if (typeof compile !== 'function') throw new Error('compile is not a function (ESM)');\n` +
      `if (typeof parse !== 'function') throw new Error('parse is not a function (ESM)');\n` +
      `console.log('[test:packed] native ESM import OK');\n`,
  );
  run('node', ['esm-check.mjs'], { cwd: scratch });

  console.log('[test:packed] PASS — packed package works via require() and native ESM import()');
} catch (err) {
  failed = true;
  console.error('[test:packed] FAIL');
  console.error(err.stdout ?? err.message);
  console.error(err.stderr ?? '');
} finally {
  if (existsSync(tarballPath)) rmSync(tarballPath);
  rmSync(scratch, { recursive: true, force: true });
}

if (failed) process.exit(1);
