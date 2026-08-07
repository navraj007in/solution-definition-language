import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../index';
import { generateCiCdPipeline } from '../generators/cicd';
import { DEFAULT_RUNTIME_VERSION, resolveRuntimeVersion } from '../constants';
import type { SDLDocument } from '../types';

/**
 * `dotnet-8` was the only framework enum value that encoded its runtime version
 * in the identifier, which forced a schema change on every .NET release. The
 * canonical form is unversioned `dotnet` plus an optional `runtimeVersion`.
 *
 * These tests pin the alias contract from `reference/canonical-contract.md`:
 * documented, tested, normalizing to exactly one stored form, with a stated
 * removal target (SDL v2.0).
 */

function docWith(backend: Record<string, unknown>): string {
  return `sdlVersion: "1.1"
solution:
  name: "Framework Version Test"
  description: "Exercises backend framework alias normalization and runtimeVersion"
  stage: MVP
architecture:
  style: modular-monolith
  projects:
    backend:
      - ${Object.entries(backend).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n        ')}
data:
  primaryDatabase:
    type: postgres
    hosting: managed
`;
}

function backendOf(doc: SDLDocument) {
  return doc.architecture.projects.backend![0];
}

describe('backend framework version decoupling', () => {
  it('accepts the canonical unversioned `dotnet` value', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet' }));
    assert.equal(result.success, true, JSON.stringify(result.errors));
    assert.equal(backendOf(result.document!).framework, 'dotnet');
  });

  it('accepts an explicit runtimeVersion', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet', runtimeVersion: '10.0' }));
    assert.equal(result.success, true, JSON.stringify(result.errors));
    assert.equal(backendOf(result.document!).runtimeVersion, '10.0');
  });

  it('normalizes the deprecated `dotnet-8` alias to dotnet + runtimeVersion 8.0', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet-8' }));
    assert.equal(result.success, true, JSON.stringify(result.errors));

    const be = backendOf(result.document!);
    assert.equal(be.framework, 'dotnet', 'alias must normalize to exactly one canonical stored form');
    assert.equal(be.runtimeVersion, '8.0', 'the version encoded in the alias must be preserved');
  });

  it('records both alias rewrites as inferences', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet-8' }));
    const paths = result.inferences.map(i => i.path);

    assert.ok(paths.includes('architecture.projects.backend[0].framework'));
    assert.ok(paths.includes('architecture.projects.backend[0].runtimeVersion'));
  });

  it('lets an explicit runtimeVersion win over the version in the alias', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet-8', runtimeVersion: '10.0' }));
    const be = backendOf(result.document!);

    assert.equal(be.framework, 'dotnet');
    assert.equal(be.runtimeVersion, '10.0', 'explicit runtimeVersion is the more specific statement of intent');
  });

  it('defaults runtimeVersion per framework when omitted', () => {
    for (const framework of Object.keys(DEFAULT_RUNTIME_VERSION)) {
      assert.equal(
        resolveRuntimeVersion(framework, undefined),
        DEFAULT_RUNTIME_VERSION[framework],
        `${framework} must fall back to its table default`,
      );
    }
  });

  it('has no version-bearing values left in the framework enum', () => {
    // Guards against a future `dotnet-11` / `nodejs-24` being added to the enum
    // rather than expressed through runtimeVersion.
    const canonical = Object.keys(DEFAULT_RUNTIME_VERSION);
    for (const framework of canonical) {
      assert.ok(
        !/\d/.test(framework),
        `canonical framework '${framework}' encodes a version — put it in runtimeVersion instead`,
      );
    }
  });
});

describe('runtimeVersion drives generator output', () => {
  it('uses the project runtimeVersion in the Dockerfile base images', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet', runtimeVersion: '10.0' }));
    const files = generateCiCdPipeline(result.document!).files;
    const dockerfile = files.find(f => f.path.includes('Dockerfile'))!;

    assert.ok(dockerfile.content.includes('mcr.microsoft.com/dotnet/sdk:10.0'));
    assert.ok(dockerfile.content.includes('mcr.microsoft.com/dotnet/aspnet:10.0'));
    assert.ok(!dockerfile.content.includes('8.0'), 'no stale hard-coded version should survive');
  });

  it('falls back to the framework default when runtimeVersion is absent', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet' }));
    const files = generateCiCdPipeline(result.document!).files;
    const dockerfile = files.find(f => f.path.includes('Dockerfile'))!;

    assert.ok(dockerfile.content.includes(`mcr.microsoft.com/dotnet/sdk:${DEFAULT_RUNTIME_VERSION['dotnet']}`));
  });

  it('carries the alias version through to generated artifacts', () => {
    const result = compile(docWith({ name: 'api', framework: 'dotnet-8' }));
    const files = generateCiCdPipeline(result.document!).files;
    const dockerfile = files.find(f => f.path.includes('Dockerfile'))!;

    assert.ok(
      dockerfile.content.includes('mcr.microsoft.com/dotnet/sdk:8.0'),
      'a dotnet-8 document must still generate .NET 8 images, not the current default',
    );
  });
});
