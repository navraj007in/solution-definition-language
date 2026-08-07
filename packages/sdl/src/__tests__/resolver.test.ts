import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWithImports, type FileReader } from '../resolver';

/** Build a FileReader from an in-memory map of relative-path → YAML string. */
function makeReader(files: Record<string, string>): FileReader {
  return (relativePath) => {
    return Object.prototype.hasOwnProperty.call(files, relativePath)
      ? files[relativePath]
      : null;
  };
}

const ROOT_HEAD = `sdlVersion: "1.1"\n`;
const SOLUTION_FRAGMENT = `solution:\n  name: From-Module\n`;
const ARCH_FRAGMENT = `architecture:\n  style: modular-monolith\n`;

describe('resolver — Form A (path with explicit extension)', () => {
  it('loads a module with an explicit .sdl.yaml extension', () => {
    const reader = makeReader({
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - sdl/services.sdl.yaml\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    assert.equal((result.document.solution as { name: string }).name, 'From-Module');
    assert.equal(result.modules[0].path, 'sdl/services.sdl.yaml');
  });

  it('also loads a module with .sdl.yml', () => {
    const reader = makeReader({
      'sdl/services.sdl.yml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - sdl/services.sdl.yml\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0);
    assert.equal((result.document.solution as { name: string }).name, 'From-Module');
  });
});

describe('resolver — Form B (extension inferred)', () => {
  it('appends .sdl.yaml when the path has no extension', () => {
    const reader = makeReader({
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - sdl/services\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    assert.equal((result.document.solution as { name: string }).name, 'From-Module');
    // modules[] records the *resolved* path, not the declared one.
    assert.equal(result.modules[0].path, 'sdl/services.sdl.yaml');
  });

  it('falls back to .sdl.yml when .sdl.yaml is absent', () => {
    const reader = makeReader({
      'sdl/services.sdl.yml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - sdl/services\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0);
    assert.equal(result.modules[0].path, 'sdl/services.sdl.yml');
  });

  it('errors when neither candidate exists, naming both', () => {
    const reader = makeReader({});
    const root = ROOT_HEAD + `imports:\n  - sdl/missing\n`;
    const result = parseWithImports(root, reader, 'root');

    const missing = result.errors.find(e => e.type === 'missing-file');
    assert.ok(missing, 'expected a missing-file error');
    assert.match(missing!.message, /sdl\/missing\.sdl\.yaml/);
    assert.match(missing!.message, /sdl\/missing\.sdl\.yml/);
  });

  it('warns when path ends in .yaml but not .sdl.yaml — and does not append a second extension', () => {
    const reader = makeReader({
      'sdl/services.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - sdl/services.yaml\n`;
    const result = parseWithImports(root, reader, 'root');

    const warnings = result.warnings.filter(w => w.message.includes('should end with .sdl.yaml'));
    assert.equal(warnings.length, 1);
    // File still loads as-is (warning, not error) so authors can migrate.
    assert.equal((result.document.solution as { name: string }).name, 'From-Module');
  });
});

describe('resolver — Form C (named imports)', () => {
  it('accepts {name, path} with implicit extension in path', () => {
    const reader = makeReader({
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - name: services\n    path: sdl/services\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    assert.equal((result.document.solution as { name: string }).name, 'From-Module');
  });

  it('accepts {name, path} with explicit extension in path', () => {
    const reader = makeReader({
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - name: services\n    path: sdl/services.sdl.yaml\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0);
  });

  it('flags duplicate names within one imports list as a conflict error', () => {
    const reader = makeReader({
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
      'sdl/other.sdl.yaml': ARCH_FRAGMENT,
    });
    const root = ROOT_HEAD +
      `imports:\n` +
      `  - name: shared\n    path: sdl/services\n` +
      `  - name: shared\n    path: sdl/other\n`;
    const result = parseWithImports(root, reader, 'root');

    const conflict = result.errors.find(e => e.type === 'conflict' && e.message.includes('Duplicate import name "shared"'));
    assert.ok(conflict, `expected duplicate-name conflict, got: ${JSON.stringify(result.errors)}`);
  });

  it('warns when an explicit name violates the identifier pattern (e.g. starts with a digit)', () => {
    const reader = makeReader({
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - name: 1services\n    path: sdl/services\n`;
    const result = parseWithImports(root, reader, 'root');

    const warning = result.warnings.find(w => w.message.includes('Import name "1services"'));
    assert.ok(warning, 'expected a name-pattern warning');
  });

  it('allows kebab-case names (hyphens are permitted)', () => {
    const reader = makeReader({
      'sdl/billing-api.sdl.yaml': SOLUTION_FRAGMENT,
    });
    const root = ROOT_HEAD + `imports:\n  - name: billing-api\n    path: sdl/billing-api\n`;
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0);
    const nameWarnings = result.warnings.filter(w => w.message.includes('Import name'));
    assert.equal(nameWarnings.length, 0);
  });

  it('rejects entries missing required fields (name without path, etc.)', () => {
    const reader = makeReader({});
    const root = ROOT_HEAD + `imports:\n  - name: orphan\n`;
    const result = parseWithImports(root, reader, 'root');

    const skipped = result.warnings.find(w => w.message.includes('Skipping invalid imports[]'));
    assert.ok(skipped, 'expected the malformed entry to be skipped with a warning');
  });
});

describe('resolver — mixed forms', () => {
  it('processes A, B, and C together in one imports list', () => {
    const reader = makeReader({
      'sdl/auth.sdl.yaml': `auth:\n  strategy: oidc\n`,
      'sdl/services.sdl.yaml': SOLUTION_FRAGMENT,
      'sdl/deployment.sdl.yaml': `deployment:\n  cloud: aws\n`,
    });
    const root = ROOT_HEAD +
      `imports:\n` +
      `  - sdl/auth.sdl.yaml\n` +              // Form A
      `  - sdl/services\n` +                   // Form B
      `  - name: deployment\n    path: sdl/deployment\n`;  // Form C
    const result = parseWithImports(root, reader, 'root');

    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    assert.equal((result.document.auth as { strategy: string }).strategy, 'oidc');
    assert.equal((result.document.solution as { name: string }).name, 'From-Module');
    assert.equal((result.document.deployment as { cloud: string }).cloud, 'aws');
    assert.equal(result.modules.length, 3);
  });
});
