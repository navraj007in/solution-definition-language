import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { compile, compileWithImports } from '../index';

const repoRoot = join(__dirname, '..', '..', '..', '..');
const singleFileExamplesDir = join(repoRoot, 'examples', 'single-file');
const templatesDir = join(repoRoot, 'templates');

const positiveSingleFileExamples = [
  'taskflow.yaml',
  'saas-gcp.yaml',
  'ecommerce-aws.yaml',
  'microservices-small-team.yaml',
  'mobile-railway.yaml',
  'minimal-noauth.yaml',
];

const multiFileRoots = [
  join(repoRoot, 'examples', 'multi-file', 'medchat', 'solution.sdl.yaml'),
  join(repoRoot, 'examples', 'multi-file', 'nexper-crm', 'solution.sdl.yaml'),
];

describe('example corpus', () => {
  it('compiles positive single-file examples', () => {
    for (const filename of positiveSingleFileExamples) {
      const yaml = readFileSync(join(singleFileExamplesDir, filename), 'utf-8');
      const result = compile(yaml);
      assert.equal(result.success, true, `${filename} failed: ${JSON.stringify(result.errors, null, 2)}`);
    }
  });

  it('compiles starter templates', () => {
    const templateFiles = readdirSync(templatesDir)
      .filter(name => name.endsWith('.sdl.yaml'))
      .sort();

    for (const filename of templateFiles) {
      const yaml = readFileSync(join(templatesDir, filename), 'utf-8');
      const result = compile(yaml);
      assert.equal(result.success, true, `${filename} failed: ${JSON.stringify(result.errors, null, 2)}`);
    }
  });

  it('compiles multi-file showcase examples with imports', () => {
    for (const rootPath of multiFileRoots) {
      const yaml = readFileSync(rootPath, 'utf-8');
      const baseDir = dirname(rootPath);
      const result = compileWithImports(
        yaml,
        (importPath) => {
          const fullPath = join(baseDir, importPath);
          try {
            return readFileSync(fullPath, 'utf-8');
          } catch {
            return null;
          }
        },
        rootPath,
      );

      assert.equal(result.resolveErrors.length, 0, `${rootPath} resolve errors: ${JSON.stringify(result.resolveErrors, null, 2)}`);
      assert.equal(result.success, true, `${rootPath} failed: ${JSON.stringify(result.errors, null, 2)}`);
    }
  });
});
