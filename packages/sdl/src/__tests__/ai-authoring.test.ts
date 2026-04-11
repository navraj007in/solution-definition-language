/**
 * AI Authoring Robustness Fixtures
 *
 * These tests simulate realistic mistakes that AI tools make when generating
 * SDL. Each test asserts that the validator catches the mistake (producing a
 * specific error or warning) so that future changes do not silently regress
 * the validator's ability to detect common AI-generated errors.
 *
 * Categories:
 *   1. Wrong enum casing       — values correct in letter, wrong in case
 *   2. Stale vocabulary        — values from old examples or README
 *   3. Wrong section shapes    — contracts as array, features as object, etc.
 *   4. Invented fields         — plausible-sounding keys not in the schema
 *   5. Missing required fields — omitting required sub-fields in optional sections
 *   6. Over-inference          — AI setting fields the normalizer fills
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../index';

// ─── helpers ───

function makeBase(overrides: string = ''): string {
  return `
sdlVersion: "1.1"
solution:
  name: Test App
  description: Test description.
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
${overrides}
`.trim();
}

function errorsFor(yaml: string): string[] {
  const result = compile(yaml);
  return result.errors.map(e => e.code);
}

function errorPathsFor(yaml: string): string[] {
  const result = compile(yaml);
  return result.errors.map(e => e.path);
}

function isValid(yaml: string): boolean {
  return compile(yaml).success;
}

// ─── 1. Wrong enum casing ───

describe('AI authoring — wrong enum casing', () => {
  it('rejects stage: mvp (should be MVP)', () => {
    const yaml = makeBase().replace('stage: MVP', 'stage: mvp');
    assert.ok(!isValid(yaml));
  });

  it('rejects stage: growth (should be Growth)', () => {
    const yaml = makeBase().replace('stage: MVP', 'stage: growth');
    assert.ok(!isValid(yaml));
  });

  it('rejects stage: enterprise (should be Enterprise)', () => {
    const yaml = makeBase().replace('stage: MVP', 'stage: enterprise');
    assert.ok(!isValid(yaml));
  });

  it('rejects architecture.style: Modular-Monolith (wrong case)', () => {
    const yaml = makeBase().replace('style: modular-monolith', 'style: Modular-Monolith');
    assert.ok(!isValid(yaml));
  });

  it('rejects architecture.style: Microservices (wrong case)', () => {
    const yaml = makeBase().replace('style: modular-monolith', 'style: Microservices');
    assert.ok(!isValid(yaml));
  });
});

// ─── 2. Stale vocabulary ───

describe('AI authoring — stale vocabulary', () => {
  it('rejects framework: express (use nodejs)', () => {
    const yaml = makeBase().replace('framework: nodejs', 'framework: express');
    assert.ok(!isValid(yaml));
  });

  it('rejects framework: next (use nextjs)', () => {
    const yaml = makeBase(`
architecture:
  style: modular-monolith
  projects:
    frontend:
      - name: web
        framework: next
    backend:
      - name: api
        framework: nodejs
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects framework: fastapi (use python-fastapi)', () => {
    const yaml = makeBase().replace('framework: nodejs', 'framework: fastapi');
    assert.ok(!isValid(yaml));
  });

  it('rejects auth.strategy: jwt (use oidc + sessions.accessToken)', () => {
    const yaml = makeBase(`
auth:
  strategy: jwt
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects auth.strategy: session-based', () => {
    const yaml = makeBase(`
auth:
  strategy: session-based
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects data.primaryDatabase.type: mysql8 (use mysql)', () => {
    const yaml = makeBase().replace('type: postgres', 'type: mysql8');
    assert.ok(!isValid(yaml));
  });

  it('rejects deployment.cloud: heroku (not in enum)', () => {
    const yaml = makeBase(`
deployment:
  cloud: heroku
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects deployment.ciCd.provider: github (use github-actions)', () => {
    const yaml = makeBase(`
deployment:
  cloud: aws
  ciCd:
    provider: github
`);
    assert.ok(!isValid(yaml));
  });
});

// ─── 3. Wrong section shapes ───

describe('AI authoring — wrong section shapes', () => {
  it('rejects contracts as a top-level array', () => {
    const yaml = makeBase(`
contracts:
  - name: User API
    type: rest
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects features as a phase-keyed object', () => {
    const yaml = makeBase(`
features:
  phase1:
    - name: Login
  phase2:
    - name: Dashboard
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects slos as a top-level array', () => {
    const yaml = makeBase(`
slos:
  - name: api
    availability: "99.9%"
`);
    assert.ok(!isValid(yaml));
  });

  it('accepts contracts with apis array (correct shape)', () => {
    const yaml = makeBase(`
contracts:
  apis:
    - name: User API
      type: rest
`);
    assert.ok(isValid(yaml));
  });

  it('accepts features as flat array (correct shape)', () => {
    const yaml = makeBase(`
features:
  - name: Login
    priority: critical
  - name: Dashboard
    priority: high
`);
    assert.ok(isValid(yaml));
  });

  it('accepts slos with services array (correct shape)', () => {
    const yaml = makeBase(`
slos:
  services:
    - name: api
      availability: "99.9%"
      latencyP95: "200ms"
`);
    assert.ok(isValid(yaml));
  });
});

// ─── 4. Invented fields ───

describe('AI authoring — invented fields without x- prefix', () => {
  it('rejects unknown root section without x- prefix', () => {
    const yaml = makeBase(`
navigationPatterns:
  primary: sidebar
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects unknown field inside auth without x- prefix', () => {
    const yaml = makeBase(`
auth:
  strategy: oidc
  provider: auth0
  tokenExpiry: 3600
`);
    assert.ok(!isValid(yaml));
  });

  it('accepts unknown field inside auth with x- prefix', () => {
    const yaml = makeBase(`
auth:
  strategy: oidc
  provider: auth0
  x-tokenExpiry: 3600
`);
    assert.ok(isValid(yaml));
  });

  it('rejects unknown field inside solution without x- prefix', () => {
    const yaml = makeBase().replace(
      'stage: MVP',
      'stage: MVP\n  internalRef: PROJ-123'
    );
    assert.ok(!isValid(yaml));
  });

  it('accepts unknown field inside solution with x- prefix', () => {
    const yaml = makeBase().replace(
      'stage: MVP',
      'stage: MVP\n  x-internalRef: PROJ-123'
    );
    assert.ok(isValid(yaml));
  });

  it('rejects invented field inside contracts.apis[] item', () => {
    const yaml = makeBase(`
contracts:
  apis:
    - name: User API
      type: rest
      version: v1
      basePath: /api/v1
`);
    assert.ok(!isValid(yaml));
  });

  it('accepts x- extension on contracts.apis[] item', () => {
    const yaml = makeBase(`
contracts:
  apis:
    - name: User API
      type: rest
      x-version: v1
      x-basePath: /api/v1
`);
    assert.ok(isValid(yaml));
  });
});

// ─── 5. Missing required fields inside optional sections ───

describe('AI authoring — missing required fields in optional sections', () => {
  it('rejects auth without strategy', () => {
    const yaml = makeBase(`
auth:
  provider: auth0
`);
    const paths = errorPathsFor(yaml);
    assert.ok(paths.some(p => p.includes('auth')));
  });

  it('rejects features item without name', () => {
    const yaml = makeBase(`
features:
  - priority: high
    description: Login feature
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects contracts.apis[] item without name', () => {
    const yaml = makeBase(`
contracts:
  apis:
    - type: rest
      owner: team-api
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects domain.entities[] item without name', () => {
    const yaml = makeBase(`
domain:
  entities:
    - fields:
        - name: id
          type: uuid
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects domain.entities[].fields[] item without type', () => {
    const yaml = makeBase(`
domain:
  entities:
    - name: User
      fields:
        - name: id
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects slos.services[] item without name', () => {
    const yaml = makeBase(`
slos:
  services:
    - availability: "99.9%"
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects features item with invalid priority enum', () => {
    const yaml = makeBase(`
features:
  - name: Login
    priority: urgent
`);
    assert.ok(!isValid(yaml));
  });

  it('rejects contracts.apis[] item with invalid type enum', () => {
    const yaml = makeBase(`
contracts:
  apis:
    - name: User API
      type: openapi
`);
    assert.ok(!isValid(yaml));
  });
});

// ─── 6. Over-inference — AI setting normalizer-filled fields ───

describe('AI authoring — over-inference (AI setting normalizer defaults)', () => {
  it('accepts explicit deployment.ciCd.provider matching the default', () => {
    // AI setting the default value explicitly is fine — normaliser won't overwrite
    const yaml = makeBase(`
deployment:
  cloud: aws
  ciCd:
    provider: github-actions
`);
    const result = compile(yaml);
    assert.ok(result.success);
    // ciCd.provider should NOT appear in inferences when explicitly set
    const inferredPaths = result.inferences.map(i => i.path);
    assert.ok(!inferredPaths.includes('deployment.ciCd.provider'));
  });

  it('infers deployment.ciCd.provider when omitted', () => {
    const yaml = makeBase(`
deployment:
  cloud: aws
`);
    const result = compile(yaml);
    assert.ok(result.success);
    const inferredPaths = result.inferences.map(i => i.path);
    assert.ok(inferredPaths.includes('deployment.ciCd.provider'));
  });

  it('infers solution.regions.primary when regions omitted', () => {
    const yaml = makeBase();
    const result = compile(yaml);
    assert.ok(result.success);
    const inferredPaths = result.inferences.map(i => i.path);
    assert.ok(inferredPaths.includes('solution.regions.primary'));
  });

  it('does not infer solution.regions.primary when explicitly set', () => {
    const yaml = `
sdlVersion: "1.1"
solution:
  name: Test App
  description: Test description.
  stage: MVP
  regions:
    primary: eu-west-1
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
data:
  primaryDatabase:
    type: postgres
    hosting: managed
`.trim();
    const result = compile(yaml);
    assert.ok(result.success);
    const inferredPaths = result.inferences.map(i => i.path);
    assert.ok(!inferredPaths.includes('solution.regions.primary'));
  });

  it('infers ORM when absent', () => {
    const yaml = makeBase();
    const result = compile(yaml);
    assert.ok(result.success);
    const inferredPaths = result.inferences.map(i => i.path);
    assert.ok(inferredPaths.some(p => p.includes('.orm')));
  });

  it('does not infer ORM when explicitly set', () => {
    const yaml = `
sdlVersion: "1.1"
solution:
  name: Test App
  description: Test description.
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
        orm: typeorm
data:
  primaryDatabase:
    type: postgres
    hosting: managed
`.trim();
    const result = compile(yaml);
    assert.ok(result.success);
    const inferredPaths = result.inferences.map(i => i.path);
    assert.ok(!inferredPaths.some(p => p.includes('.orm')));
  });
});
