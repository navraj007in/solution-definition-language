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

    const result = normalize(sdl);
    assert.ok(result.solution.regions);
    assert.equal(result.solution.regions!.primary, 'us-east-1');
  });

  it('derives data.primaryDatabase.name from solution.name', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.data.primaryDatabase.name, undefined);

    const result = normalize(sdl);
    assert.equal(result.data.primaryDatabase.name, 'taskflow_db');
  });

  it('sets frontend type to "web" by default', () => {
    const sdl = loadSDL('taskflow.yaml');
    const result = normalize(sdl);
    assert.equal(result.architecture.projects.frontend![0].type, 'web');
  });

  it('sets backend type to "backend" by default', () => {
    const sdl = loadSDL('taskflow.yaml');
    const result = normalize(sdl);
    assert.equal(result.architecture.projects.backend![0].type, 'backend');
  });

  it('infers deployment.runtime from cloud provider', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.deployment.runtime, undefined);

    const result = normalize(sdl);
    assert.ok(result.deployment.runtime);
    assert.equal(result.deployment.runtime!.frontend, 'vercel');
    assert.equal(result.deployment.runtime!.backend, 'vercel');
  });

  it('infers AWS runtime correctly', () => {
    const sdl = loadSDL('taskflow.yaml');
    sdl.deployment.cloud = 'aws';

    const result = normalize(sdl);
    assert.equal(result.deployment.runtime!.frontend, 's3+cloudfront');
    assert.equal(result.deployment.runtime!.backend, 'ecs');
  });

  it('sets deployment.networking.publicApi to true', () => {
    const sdl = loadSDL('taskflow.yaml');
    const result = normalize(sdl);
    assert.ok(result.deployment.networking);
    assert.equal(result.deployment.networking!.publicApi, true);
  });

  it('sets deployment.ciCd.provider to github-actions', () => {
    const sdl = loadSDL('taskflow.yaml');
    const result = normalize(sdl);
    assert.ok(result.deployment.ciCd);
    assert.equal(result.deployment.ciCd!.provider, 'github-actions');
  });

  it('infers ORM from framework + database', () => {
    const sdl = loadSDL('taskflow.yaml');
    assert.equal(sdl.architecture.projects.backend![0].orm, undefined);

    const result = normalize(sdl);
    assert.equal(result.architecture.projects.backend![0].orm, 'prisma');
  });

  it('does not override explicitly set values', () => {
    const sdl = loadSDL('taskflow.yaml');
    sdl.architecture.projects.backend![0].orm = 'typeorm';
    sdl.deployment.runtime = { frontend: 'netlify', backend: 'lambda' };

    const result = normalize(sdl);
    assert.equal(result.architecture.projects.backend![0].orm, 'typeorm');
    assert.equal(result.deployment.runtime!.frontend, 'netlify');
    assert.equal(result.deployment.runtime!.backend, 'lambda');
  });
});
