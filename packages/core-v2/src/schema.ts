/**
 * Loads the canonical v2 structural schema directly from spec/v2/ at
 * runtime, rather than keeping a package-local copy.
 *
 * @sdl/core (1.1) keeps a copy of its schema inside packages/sdl/src/schema/
 * and mirrors it to a top-level schema/ directory, with a CI check
 * (`check:schema-mirror`) to catch the two drifting apart — that mirror had
 * in fact drifted before that check existed. Loading spec/v2/sdl-v2.schema.json
 * directly here sidesteps that whole class of bug: there is only ever one
 * copy, so there is nothing to keep in sync.
 *
 * The tradeoff: this only works from within this monorepo checkout. If
 * @sdl/core-v2 is ever actually published, this needs to change to bundle
 * the schema file into the package (e.g. copy it in at build time, the way
 * @sdl/core does) so a standalone install still has it.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', '..', '..', 'spec', 'v2', 'sdl-v2.schema.json');

export const sdlV2Schema: object = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;
