#!/usr/bin/env node
// Verifies (without mutating anything) that the committed top-level schema
// mirror (schema/sdl-v1.1.schema.json) is byte-identical to the source of
// truth (packages/sdl/src/schema/sdl-v1.1.schema.json).
//
// This is deliberately non-mutating: `npm run sync:schema` regenerates the
// mirror and can therefore hide drift if it runs before this check in CI.
// This script only reads and compares.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = join(__dirname, '..', 'src', 'schema', 'sdl-v1.1.schema.json');
const mirror = join(__dirname, '..', '..', '..', 'schema', 'sdl-v1.1.schema.json');

const sourceContent = readFileSync(source, 'utf8');
let mirrorContent;
try {
  mirrorContent = readFileSync(mirror, 'utf8');
} catch (err) {
  console.error(`[check:schema-mirror] Could not read mirror at ${mirror}: ${err.message}`);
  process.exit(1);
}

if (sourceContent !== mirrorContent) {
  console.error(
    `[check:schema-mirror] schema/sdl-v1.1.schema.json is out of sync with ` +
      `packages/sdl/src/schema/sdl-v1.1.schema.json.\n` +
      `Run "npm run sync:schema" in packages/sdl and commit the result.`,
  );
  process.exit(1);
}

console.log('[check:schema-mirror] schema mirror is in sync');
