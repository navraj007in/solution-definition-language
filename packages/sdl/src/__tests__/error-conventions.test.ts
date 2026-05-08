import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { validate } from '../validator';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const EXAMPLE = join(REPO_ROOT, 'examples', 'single-file', 'error-conventions.yaml');

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

function withErrorConventions(ec: Record<string, unknown>): Record<string, unknown> {
  const base = baseValid();
  (base.architecture as Record<string, unknown>).errorConventions = ec;
  return base;
}

describe('errorConventions', () => {
  it('validates the canonical error-conventions example', () => {
    const yaml = readFileSync(EXAMPLE, 'utf-8');
    const parsed = parse(yaml);
    assert.equal(parsed.errors.length, 0);
    const result = validate(parsed.data);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  });

  it('accepts an empty errorConventions object', () => {
    const result = validate(withErrorConventions({}));
    assert.equal(result.valid, true);
  });

  it('accepts envelope.kind=object with required fields', () => {
    const result = validate(
      withErrorConventions({
        envelope: {
          kind: 'object',
          fields: [
            { name: 'code', type: 'string', required: true },
            { name: 'message', type: 'string', required: true },
          ],
        },
      }),
    );
    assert.equal(result.valid, true);
  });

  it('rejects an envelope with kind other than object', () => {
    const result = validate(
      withErrorConventions({
        envelope: {
          kind: 'array',
          fields: [{ name: 'code', type: 'string' }],
        },
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects an envelope field missing name or type', () => {
    const result = validate(
      withErrorConventions({
        envelope: {
          kind: 'object',
          fields: [{ name: 'code' }],
        },
      }),
    );
    assert.equal(result.valid, false);
  });

  it('accepts a status_mapping entry with status + code', () => {
    const result = validate(
      withErrorConventions({
        status_mapping: [{ status: 404, code: 'NOT_FOUND' }],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('rejects a status_mapping status outside 100-599', () => {
    const result = validate(
      withErrorConventions({
        status_mapping: [{ status: 99, code: 'BAD' }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects a status_mapping entry without code', () => {
    const result = validate(
      withErrorConventions({
        status_mapping: [{ status: 400 }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('accepts retry_policy with all required fields', () => {
    const result = validate(
      withErrorConventions({
        retry_policy: {
          max_attempts: 3,
          backoff: 'exponential',
          base_ms: 100,
          cap_ms: 5000,
        },
      }),
    );
    assert.equal(result.valid, true);
  });

  it('rejects retry_policy with backoff outside the enum', () => {
    const result = validate(
      withErrorConventions({
        retry_policy: {
          max_attempts: 3,
          backoff: 'fibonacci',
          base_ms: 100,
          cap_ms: 5000,
        },
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects retry_policy missing max_attempts', () => {
    const result = validate(
      withErrorConventions({
        retry_policy: {
          backoff: 'exponential',
          base_ms: 100,
          cap_ms: 5000,
        },
      }),
    );
    assert.equal(result.valid, false);
  });
});
