import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { compile } from '../index';

const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const fixture = (name: string) => readFileSync(join(FIXTURES_DIR, name), 'utf-8');

describe('compile', () => {
  it('compiles TaskFlow end-to-end', () => {
    const result = compile(fixture('taskflow.yaml'));

    assert.equal(result.success, true);
    assert.equal(result.errors.length, 0);
    assert.ok(result.document);
    assert.ok(result.summary);

    // Verify normalization applied
    const doc = result.document!;
    assert.equal(doc.solution.regions!.primary, 'us-east-1');
    assert.equal(doc.data.primaryDatabase.name, 'taskflow_db');
    assert.equal(doc.deployment.runtime!.frontend, 'vercel');
    assert.equal(doc.deployment.runtime!.backend, 'vercel');
    assert.equal(doc.deployment.networking!.publicApi, true);
    assert.equal(doc.deployment.ciCd!.provider, 'github-actions');
    assert.equal(doc.architecture.projects.backend![0].orm, 'prisma');
    assert.equal(doc.architecture.projects.frontend![0].type, 'web');
    assert.equal(doc.architecture.projects.backend![0].type, 'backend');

    // Verify summary
    assert.equal(result.summary!.architecture, 'modular-monolith');
    assert.equal(result.summary!.projects, 2);
    assert.equal(result.summary!.artifactsToGenerate, 5);
  });

  it('is deterministic (same input → same output)', () => {
    const yaml = fixture('taskflow.yaml');
    const result1 = compile(yaml);
    const result2 = compile(yaml);

    assert.deepEqual(result1.document, result2.document);
    assert.deepEqual(result1.summary, result2.summary);
  });

  it('returns errors for invalid YAML', () => {
    const result = compile('bad: {yaml: [');
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.equal(result.document, null);
  });

  it('returns errors for schema violations', () => {
    const result = compile(fixture('missing-required.yaml'));
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.equal(result.document, null);
  });

  it('returns errors for conditional rule violations', () => {
    const result = compile(fixture('azure-cloudformation.yaml'));
    assert.equal(result.success, false);

    const codes = result.errors.map(e => e.code);
    assert.ok(codes.includes('INCOMPATIBLE_CLOUD_IAC'));
  });

  it('returns warnings for microservices with small team', () => {
    const result = compile(fixture('microservices-small-team.yaml'));
    assert.equal(result.success, true);

    const codes = result.warnings.map(w => w.code);
    assert.ok(codes.includes('COMPLEXITY_EXCEEDS_TEAM_CAPACITY'));
  });
});
