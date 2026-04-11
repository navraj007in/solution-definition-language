import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../parser';
import { normalize } from '../normalizer';
import type { SDLDocument } from '../types';

const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const loadSDL = (name: string): SDLDocument => {
  const yaml = readFileSync(join(FIXTURES_DIR, name), 'utf-8');
  return parse(yaml).data as SDLDocument;
};

describe('normalize', () => {
  it('does not mutate the input', () => {
    const original = loadSDL('taskflow.yaml');
    const originalStr = JSON.stringify(original);
    normalize(original);
    assert.equal(JSON.stringify(original), originalStr);
  });

  it('adds solution.regions.primary default', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.solution.regions, undefined);

    const { document } = normalize(sdl);
    assert.ok(document.solution.regions);
    assert.equal(document.solution.regions!.primary, 'us-east-1');
  });

  it('derives data.primaryDatabase.name from solution.name', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.data.primaryDatabase.name, undefined);

    const { document } = normalize(sdl);
    assert.equal(document.data.primaryDatabase.name, 'taskflow_db');
  });

  it('sets frontend type to "web" by default', () => {
    const sdl = loadSDL('taskflow.yaml');
    const { document } = normalize(sdl);
    assert.equal(document.architecture.projects.frontend![0].type, 'web');
  });

  it('sets backend type to "backend" by default', () => {
    const sdl = loadSDL('taskflow.yaml');
    const { document } = normalize(sdl);
    assert.equal(document.architecture.projects.backend![0].type, 'backend');
  });

  it('infers deployment.runtime from cloud provider', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.deployment.runtime, undefined);

    const { document } = normalize(sdl);
    assert.ok(document.deployment.runtime);
    assert.equal(document.deployment.runtime!.frontend, 'vercel');
    assert.equal(document.deployment.runtime!.backend, 'vercel');
  });

  it('infers AWS runtime correctly', () => {
    const sdl = loadSDL('taskflow.yaml');
    sdl.deployment.cloud = 'aws';

    const { document } = normalize(sdl);
    assert.equal(document.deployment.runtime!.frontend, 's3+cloudfront');
    assert.equal(document.deployment.runtime!.backend, 'ecs');
  });

  it('sets deployment.networking.publicApi to true', () => {
    const sdl = loadSDL('taskflow.yaml');
    const { document } = normalize(sdl);
    assert.ok(document.deployment.networking);
    assert.equal(document.deployment.networking!.publicApi, true);
  });

  it('sets deployment.ciCd.provider to github-actions', () => {
    const sdl = loadSDL('taskflow.yaml');
    const { document } = normalize(sdl);
    assert.ok(document.deployment.ciCd);
    assert.equal(document.deployment.ciCd!.provider, 'github-actions');
  });

  it('infers ORM from framework + database', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.architecture.projects.backend![0].orm, undefined);

    const { document } = normalize(sdl);
    assert.equal(document.architecture.projects.backend![0].orm, 'prisma');
  });

  it('does not override explicitly set values', () => {
    const sdl = loadSDL('taskflow.yaml');
    sdl.architecture.projects.backend![0].orm = 'typeorm';
    sdl.deployment.runtime = { frontend: 'netlify', backend: 'lambda' };

    const { document } = normalize(sdl);
    assert.equal(document.architecture.projects.backend![0].orm, 'typeorm');
    assert.equal(document.deployment.runtime!.frontend, 'netlify');
    assert.equal(document.deployment.runtime!.backend, 'lambda');
  });

  it('returns inferences array with entries for each defaulted field', () => {
    const sdl = loadSDL('taskflow.yaml');
    const { inferences } = normalize(sdl);
    assert.ok(inferences.length > 0);
    const paths = inferences.map(i => i.path);
    assert.ok(paths.some(p => p === 'solution.regions.primary'));
    assert.ok(paths.some(p => p === 'data.primaryDatabase.name'));
    assert.ok(paths.some(p => p === 'deployment.ciCd.provider'));
    assert.ok(paths.some(p => p === 'deployment.networking.publicApi'));
  });

  it('inference entries have path, value, and reason', () => {
    const sdl = loadSDL('taskflow.yaml');
    const { inferences } = normalize(sdl);
    for (const inf of inferences) {
      assert.ok(typeof inf.path === 'string' && inf.path.length > 0, `path missing on inference: ${JSON.stringify(inf)}`);
      assert.ok(inf.value !== undefined, `value missing on inference: ${JSON.stringify(inf)}`);
      assert.ok(typeof inf.reason === 'string' && inf.reason.length > 0, `reason missing on inference: ${JSON.stringify(inf)}`);
    }
  });

  it('returns empty inferences for fully specified document', () => {
    const sdl = loadSDL('taskflow.yaml');
    // Pre-fill everything the normalizer would default
    sdl.solution.regions = { primary: 'eu-west-1' };
    sdl.data.primaryDatabase.name = 'mydb';
    sdl.deployment.runtime = { frontend: 'vercel', backend: 'vercel' };
    sdl.deployment.networking = { publicApi: true };
    sdl.deployment.ciCd = { provider: 'github-actions' };
    sdl.architecture.projects.frontend![0].type = 'web';
    sdl.architecture.projects.backend![0].type = 'backend';
    sdl.architecture.projects.backend![0].orm = 'prisma';

    const { inferences } = normalize(sdl);
    const paths = inferences.map(i => i.path);
    assert.ok(!paths.includes('solution.regions.primary'));
    assert.ok(!paths.includes('data.primaryDatabase.name'));
    assert.ok(!paths.includes('deployment.ciCd.provider'));
  });

  it('compile result includes inferences', () => {
    // Verify the compile() pipeline surfaces inferences end-to-end
    const { compile } = require('../index');
    const yaml = readFileSync(join(FIXTURES_DIR, 'taskflow.yaml'), 'utf-8');
    const result = compile(yaml);
    assert.ok(result.success);
    assert.ok(Array.isArray(result.inferences));
    assert.ok(result.inferences.length > 0);
  });
});
