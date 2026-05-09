import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { validate } from '../validator';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const EXAMPLE = join(REPO_ROOT, 'examples', 'single-file', 'typed-dependencies.yaml');

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

function withService(svc: Record<string, unknown>): Record<string, unknown> {
  const base = baseValid();
  (base.architecture as Record<string, unknown>).services = [svc];
  return base;
}

describe('typed service dependencies', () => {
  it('validates the canonical typed-dependencies example', () => {
    const yaml = readFileSync(EXAMPLE, 'utf-8');
    const parsed = parse(yaml);
    assert.equal(parsed.errors.length, 0);
    const result = validate(parsed.data);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  });

  it('accepts bare-string deps (back-compat)', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: ['other-service', 'redis'],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts a typed dep with kind=service + consumes', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [
          { kind: 'service', ref: 'billing', consumes: ['list-charges'] },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts a typed dep with kind=database + access', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [{ kind: 'database', ref: 'pg', access: 'read-write' }],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts a mixed list (bare strings + typed)', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [
          'simple-string',
          { kind: 'cache', ref: 'redis' },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('rejects a typed dep without ref', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [{ kind: 'service' }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects a typed dep without kind', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [{ ref: 'thing' }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects a kind outside the canonical enum', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [{ kind: 'storage', ref: 's3' }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects an access outside the canonical enum', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [{ kind: 'database', ref: 'pg', access: 'admin' }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('accepts kind=queue with access=producer', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [{ kind: 'queue', ref: 'events', access: 'producer' }],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts kind=external with consumes verb-paths', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [
          {
            kind: 'external',
            ref: 'stripe',
            consumes: ['POST /v1/charges', 'POST /v1/refunds'],
          },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts x-* extension fields on a typed dep', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [
          { kind: 'database', ref: 'pg', 'x-pool-size': 20 },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('rejects an unknown property on a typed dep without x- prefix', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        dependencies: [
          { kind: 'database', ref: 'pg', poolSize: 20 },
        ],
      }),
    );
    assert.equal(result.valid, false);
  });
});
