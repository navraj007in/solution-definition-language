import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { compile, compileWithImports } from '../index';

const repoRoot = join(__dirname, '..', '..', '..', '..');
const singleFileExamplesDir = join(repoRoot, 'examples', 'single-file');
const templatesDir = join(repoRoot, 'templates');
const conformanceValidDir = join(repoRoot, 'examples', 'conformance', 'valid');
const conformanceInvalidDir = join(repoRoot, 'examples', 'conformance', 'invalid');

const positiveSingleFileExamples = [
  'taskflow.yaml',
  'saas-gcp.yaml',
  'ecommerce-aws.yaml',
  'microservices-small-team.yaml',
  'mobile-railway.yaml',
  'minimal-noauth.yaml',
  'canonical.sdl.yaml',
];

const multiFileRoots = [
  join(repoRoot, 'examples', 'multi-file', 'medchat', 'solution.sdl.yaml'),
  join(repoRoot, 'examples', 'multi-file', 'nexper-crm', 'solution.sdl.yaml'),
];

/** Each invalid conformance example must fail with the named error code. */
const negativeConformanceExamples: Array<{ file: string; expectedCode: string }> = [
  { file: 'slo-unknown-service.yaml',         expectedCode: 'SLO_SERVICE_UNKNOWN' },
  { file: 'domain-relationship-unknown.yaml', expectedCode: 'DOMAIN_RELATIONSHIP_ENTITY_UNKNOWN' },
  { file: 'duplicate-project-names.yaml',     expectedCode: 'PROJECT_NAME_DUPLICATE' },
  { file: 'compliance-framework-unknown.yaml',expectedCode: 'COMPLIANCE_FRAMEWORK_UNKNOWN' },
  { file: 'service-dependency-cycle.yaml',    expectedCode: 'SERVICE_DEPENDENCY_CYCLE' },
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

describe('conformance corpus', () => {
  it('compiles all valid conformance examples', () => {
    const files = readdirSync(conformanceValidDir).filter(f => f.endsWith('.yaml') || f.endsWith('.sdl.yaml'));
    assert.ok(files.length > 0, 'No valid conformance examples found');

    for (const filename of files) {
      const yaml = readFileSync(join(conformanceValidDir, filename), 'utf-8');
      const result = compile(yaml);
      assert.equal(result.success, true, `${filename} failed: ${JSON.stringify(result.errors, null, 2)}`);
    }
  });

  for (const { file, expectedCode } of negativeConformanceExamples) {
    it(`rejects ${file} with ${expectedCode}`, () => {
      const yaml = readFileSync(join(conformanceInvalidDir, file), 'utf-8');
      const result = compile(yaml);
      assert.equal(result.success, false, `${file} should have failed but succeeded`);
      const codes = result.errors.map(e => e.code);
      assert.ok(
        codes.includes(expectedCode),
        `${file} expected error code ${expectedCode}, got: ${JSON.stringify(codes)}`,
      );
    });
  }
});
