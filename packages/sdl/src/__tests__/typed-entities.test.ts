import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { validate } from '../validator';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const EXAMPLE = join(REPO_ROOT, 'examples', 'single-file', 'typed-entities.yaml');

function baseValid(): Record<string, unknown> {
  return {
    sdlVersion: '1.1',
    solution: { name: 'Demo', description: 'Ten chars+', stage: 'MVP' },
    architecture: {
      style: 'modular-monolith',
      projects: { backend: [{ name: 'api', framework: 'nodejs' }] },
    },
    data: { primaryDatabase: { type: 'postgres', hosting: 'managed' } },
  };
}

function withEntities(entities: Record<string, unknown>[]): Record<string, unknown> {
  const base = baseValid();
  base.domain = { entities };
  return base;
}

describe('typed domain.entities', () => {
  it('validates the canonical typed-entities example', () => {
    const yaml = readFileSync(EXAMPLE, 'utf-8');
    const parsed = parse(yaml);
    assert.equal(parsed.errors.length, 0);
    const result = validate(parsed.data);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  });

  it('accepts a minimal entity (name only)', () => {
    const result = validate(withEntities([{ name: 'Customer' }]));
    assert.equal(result.valid, true);
  });

  it('rejects a non-PascalCase entity name', () => {
    const result = validate(withEntities([{ name: 'customer' }]));
    assert.equal(result.valid, false);
  });

  it('rejects a non-snake_case table override', () => {
    const result = validate(
      withEntities([{ name: 'Customer', table: 'CustomerTable' }]),
    );
    assert.equal(result.valid, false);
  });

  it('accepts a snake_case table override', () => {
    const result = validate(
      withEntities([{ name: 'Customer', table: 'customers' }]),
    );
    assert.equal(result.valid, true);
  });

  it('rejects an entity field missing name or type', () => {
    const result = validate(
      withEntities([
        { name: 'Customer', fields: [{ name: 'id' }] },
      ]),
    );
    assert.equal(result.valid, false);
  });

  it('accepts an index with just fields[]', () => {
    const result = validate(
      withEntities([
        {
          name: 'Customer',
          fields: [{ name: 'email', type: 'string' }],
          indexes: [{ fields: ['email'], unique: true }],
        },
      ]),
    );
    assert.equal(result.valid, true);
  });

  it('rejects an index without fields', () => {
    const result = validate(
      withEntities([
        {
          name: 'Customer',
          indexes: [{ unique: true }],
        },
      ]),
    );
    assert.equal(result.valid, false);
  });

  it('accepts a check constraint with expression', () => {
    const result = validate(
      withEntities([
        {
          name: 'Charge',
          fields: [{ name: 'amount_cents', type: 'integer' }],
          constraints: [{ type: 'check', expression: 'amount_cents > 0' }],
        },
      ]),
    );
    assert.equal(result.valid, true);
  });

  it('accepts a unique constraint with fields', () => {
    const result = validate(
      withEntities([
        {
          name: 'Charge',
          fields: [
            { name: 'customer_id', type: 'uuid' },
            { name: 'currency', type: 'string' },
          ],
          constraints: [
            { type: 'unique', fields: ['customer_id', 'currency'] },
          ],
        },
      ]),
    );
    assert.equal(result.valid, true);
  });

  it('rejects a constraint with type outside the enum', () => {
    const result = validate(
      withEntities([
        {
          name: 'Customer',
          constraints: [{ type: 'partial' }],
        },
      ]),
    );
    assert.equal(result.valid, false);
  });

  it('accepts an enum field for closed values', () => {
    const result = validate(
      withEntities([
        {
          name: 'Charge',
          fields: [
            { name: 'status', type: 'string', enum: ['pending', 'paid', 'failed'] },
          ],
        },
      ]),
    );
    assert.equal(result.valid, true);
  });

  it('rejects an unknown field property without x- prefix', () => {
    const result = validate(
      withEntities([
        {
          name: 'Customer',
          fields: [{ name: 'id', type: 'uuid', unknownProp: 'x' }],
        },
      ]),
    );
    assert.equal(result.valid, false);
  });

  it('accepts x-* extension fields on entity field props', () => {
    const result = validate(
      withEntities([
        {
          name: 'Customer',
          fields: [
            { name: 'id', type: 'uuid', 'x-orm-hint': 'id-generation' },
          ],
        },
      ]),
    );
    assert.equal(result.valid, true);
  });

  it('accepts per-entity relationships with target/type/foreignKey', () => {
    const result = validate(
      withEntities([
        {
          name: 'Charge',
          relationships: [
            { name: 'customer', type: 'many-to-one', target: 'Customer', foreignKey: 'customer_id' },
          ],
        },
      ]),
    );
    assert.equal(result.valid, true);
  });

  it('rejects a relationship type outside the enum', () => {
    const result = validate(
      withEntities([
        {
          name: 'Charge',
          relationships: [{ target: 'Customer', type: 'many-to-some' }],
        },
      ]),
    );
    assert.equal(result.valid, false);
  });

  it('rejects a relationship missing target', () => {
    const result = validate(
      withEntities([
        {
          name: 'Charge',
          relationships: [{ type: 'many-to-one' }],
        },
      ]),
    );
    assert.equal(result.valid, false);
  });
});
