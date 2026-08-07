import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..', '..', '..', '..');

const packageSchemaPath = join(repoRoot, 'packages', 'sdl', 'src', 'schema', 'sdl-v1.1.schema.json');
const publishedSchemaPath = join(repoRoot, 'schema', 'sdl-v1.1.schema.json');

/**
 * `schema/sdl-v1.1.schema.json` is a published mirror of the schema that
 * `@sdl/core` actually compiles. Both declare the same `$id`, so if they drift
 * apart, two different documents claim to be the same schema: anyone
 * validating against the published URL gets different results than the
 * package produces.
 *
 * This has happened before — the mirror sat several releases behind and was
 * missing every `additionalProperties: false` hardening on contracts, domain,
 * compliance, slos, and resilience, while README pointed at it as canonical.
 *
 * `npm run build` re-copies the mirror (via `sync:schema`); this test fails the
 * build if someone edits the mirror directly or bypasses the script.
 */
describe('published schema mirror', () => {
  it('is byte-identical to the schema the package compiles', () => {
    const packageSchema = readFileSync(packageSchemaPath, 'utf-8');
    const publishedSchema = readFileSync(publishedSchemaPath, 'utf-8');

    assert.equal(
      publishedSchema,
      packageSchema,
      'schema/sdl-v1.1.schema.json has drifted from packages/sdl/src/schema/sdl-v1.1.schema.json. ' +
        'Edit the package copy (the source of truth), then run `npm run sync:schema` from packages/sdl.',
    );
  });

  it('both copies declare the same $id', () => {
    const a = JSON.parse(readFileSync(packageSchemaPath, 'utf-8'));
    const b = JSON.parse(readFileSync(publishedSchemaPath, 'utf-8'));
    assert.equal(a.$id, b.$id);
  });
});
