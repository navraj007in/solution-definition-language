import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { validate } from '../validator';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const EXAMPLE = join(REPO_ROOT, 'examples', 'single-file', 'typed-endpoints.yaml');

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

describe('typed endpoints[]', () => {
  it('validates the canonical typed-endpoints example', () => {
    const yaml = readFileSync(EXAMPLE, 'utf-8');
    const parsed = parse(yaml);
    assert.equal(parsed.errors.length, 0);
    const result = validate(parsed.data);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  });

  it('accepts a service with a minimal endpoint', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          { id: 'health', path: '/health', method: 'GET', response: { status: 200 } },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('rejects an endpoint missing id / path / method / response', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [{ path: '/x' }],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects an HTTP method outside the canonical enum', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          { id: 'get-thing', path: '/x', method: 'TRACE', response: { status: 200 } },
        ],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects a status outside 100-599', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          { id: 'get-thing', path: '/x', method: 'GET', response: { status: 99 } },
        ],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('rejects a non-kebab-case endpoint id', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          { id: 'ListCharges', path: '/x', method: 'GET', response: { status: 200 } },
        ],
      }),
    );
    assert.equal(result.valid, false);
  });

  it('accepts auth as enum string', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          { id: 'get-thing', path: '/x', method: 'GET', auth: 'required', response: { status: 200 } },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts auth as object with scopes', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          {
            id: 'get-thing',
            path: '/x',
            method: 'GET',
            auth: { required: true, scopes_all: ['admin'] },
            response: { status: 200 },
          },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts inline body fields with typed params', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          {
            id: 'create-thing',
            path: '/x',
            method: 'POST',
            request: {
              body: {
                kind: 'object',
                fields: [
                  { name: 'amount', type: 'integer', required: true, min: 1 },
                  { name: 'currency', type: 'string', required: true, maxLength: 3 },
                ],
              },
            },
            response: { status: 201 },
          },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts ref body for shared schemas', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          {
            id: 'get-by-id',
            path: '/x',
            method: 'GET',
            response: { status: 200, body: { kind: 'ref', ref: 'Charge' } },
          },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });

  it('accepts declared error responses with status + code', () => {
    const result = validate(
      withService({
        name: 'svc',
        kind: 'backend',
        endpoints: [
          {
            id: 'get-thing',
            path: '/x',
            method: 'POST',
            response: { status: 201 },
            errors: [
              { status: 400, code: 'VALIDATION', retryable: false },
              { status: 402, code: 'PAYMENT_FAILED', retryable: true },
            ],
          },
        ],
      }),
    );
    assert.equal(result.valid, true);
  });
});
