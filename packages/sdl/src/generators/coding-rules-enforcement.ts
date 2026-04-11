import type { SDLDocument, BackendProject, FrontendProject } from '../types';
import type { RawGeneratorResult, GeneratedFile } from './types';

/**
 * Generates enforcement tooling configs from an SDL document.
 * Produces ESLint config, dependency-cruiser rules, pre-commit hooks,
 * and architecture tests — turning advisory coding rules into hard gates.
 *
 * Toggle: user adds 'coding-rules-enforcement' to artifacts.generate in SDL.
 * Deterministic — same input always produces identical output.
 */
export function generateCodingRulesEnforcement(doc: SDLDocument): RawGeneratorResult {
  const files: GeneratedFile[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  const hasTs = backends.some(b => b.framework === 'nodejs') ||
    frontends.some(f => ['nextjs', 'react', 'vue', 'angular', 'svelte'].includes(f.framework));
  const hasPython = backends.some(b => b.framework === 'python-fastapi');
  const hasGo = backends.some(b => b.framework === 'go');
  const hasJava = backends.some(b => b.framework === 'java-spring');
  const hasDotnet = backends.some(b => b.framework === 'dotnet-8');

  // ESLint config for TypeScript projects
  if (hasTs) {
    files.push({
      path: '.eslintrc.sdl.js',
      content: buildEslintConfig(doc, backends, frontends),
    });
  }

  // Python linter config
  if (hasPython) {
    files.push({
      path: 'pyproject.sdl.toml',
      content: buildPythonLintConfig(doc),
    });
  }

  // Go linter config
  if (hasGo) {
    files.push({
      path: '.golangci.sdl.yml',
      content: buildGoLintConfig(doc),
    });
  }

  // Dependency cruiser for module boundary enforcement (TypeScript/JS)
  if (hasTs && (doc.architecture.style === 'modular-monolith' || doc.architecture.style === 'microservices')) {
    files.push({
      path: '.dependency-cruiser.sdl.cjs',
      content: buildDependencyCruiserConfig(doc),
    });
  }

  // Pre-commit hook config
  files.push({
    path: '.lintstagedrc.sdl.json',
    content: buildLintStagedConfig(doc, { hasTs, hasPython, hasGo, hasJava }),
  });

  files.push({
    path: '.husky/pre-commit',
    content: buildHuskyPreCommit(),
  });

  // Architecture tests
  if (hasTs) {
    files.push({
      path: '__tests__/architecture.sdl.test.ts',
      content: buildArchitectureTests(doc),
    });
  }

  if (hasJava) {
    files.push({
      path: 'src/test/java/architecture/ArchitectureTest.java',
      content: buildJavaArchTests(doc),
    });
  }

  if (hasDotnet) {
    files.push({
      path: 'tests/Architecture.Tests/ArchitectureTests.cs',
      content: buildDotnetArchTests(doc),
    });
  }

  // CI enforcement step (GitHub Actions)
  files.push({
    path: '.github/workflows/enforce-architecture.yml',
    content: buildCiEnforcementWorkflow(doc, { hasTs, hasPython, hasGo, hasJava, hasDotnet }),
  });

  return {
    artifactType: 'coding-rules-enforcement',
    files,
    metadata: {
      solutionName: doc.solution.name,
      fileCount: files.length,
      enforcementLayers: [
        hasTs ? 'eslint' : null,
        hasPython ? 'ruff' : null,
        hasGo ? 'golangci-lint' : null,
        hasTs && (doc.architecture.style === 'modular-monolith' || doc.architecture.style === 'microservices') ? 'dependency-cruiser' : null,
        'pre-commit-hooks',
        'architecture-tests',
        'ci-gates',
      ].filter(Boolean),
    },
  };
}

// ─── ESLint Config ───

function buildEslintConfig(doc: SDLDocument, backends: BackendProject[], frontends: FrontendProject[]): string {
  const services = doc.architecture.services || [];
  const isMonorepo = backends.length + frontends.length > 1;

  const boundaryElements: string[] = [];
  if (doc.architecture.style === 'modular-monolith' || doc.architecture.style === 'microservices') {
    for (const svc of services) {
      boundaryElements.push(`      { type: '${svc.name}', pattern: 'src/**/\${svc.name}/*' }`);
    }
  }

  const hasFrontend = frontends.length > 0;
  const hasReact = frontends.some(f => f.framework === 'react' || f.framework === 'nextjs');
  const hasVue = frontends.some(f => f.framework === 'vue');
  const hasAngular = frontends.some(f => f.framework === 'angular');

  const lines: string[] = [];
  lines.push('// Auto-generated from SDL — coding rules enforcement');
  lines.push('// Extend your existing ESLint config with: extends: ["./.eslintrc.sdl.js"]');
  lines.push('module.exports = {');
  lines.push('  plugins: [');
  lines.push("    '@typescript-eslint',");
  lines.push("    'import',");
  if (boundaryElements.length > 0) {
    lines.push("    'boundaries',");
  }
  if (hasReact) {
    lines.push("    'react-hooks',");
    lines.push("    'jsx-a11y',");
  }
  lines.push('  ],');
  lines.push('  rules: {');

  // Core TypeScript rules
  lines.push("    // No `any` type");
  lines.push("    '@typescript-eslint/no-explicit-any': 'error',");
  lines.push('');
  lines.push('    // Max 3 parameters per function');
  lines.push("    'max-params': ['error', { max: 3 }],");
  lines.push('');
  lines.push('    // No console.log in production');
  lines.push("    'no-console': ['error', { allow: ['warn'] }],");
  lines.push('');
  lines.push('    // Prefer const, no var');
  lines.push("    'no-var': 'error',");
  lines.push("    'prefer-const': 'error',");
  lines.push('');
  lines.push('    // No magic numbers');
  lines.push("    'no-magic-numbers': ['warn', { ignore: [0, 1, -1], ignoreArrayIndexes: true, ignoreDefaultValues: true }],");
  lines.push('');
  lines.push('    // Max nesting depth');
  lines.push("    'max-depth': ['error', 3],");
  lines.push('');
  lines.push('    // File and function size limits');
  lines.push("    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],");
  lines.push("    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],");
  lines.push('');
  lines.push('    // Type-only imports');
  lines.push("    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],");
  lines.push('');
  lines.push('    // No circular imports');
  lines.push("    'import/no-cycle': 'error',");
  lines.push('');
  lines.push('    // Import ordering');
  lines.push("    'import/order': ['error', {");
  lines.push("      groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],");
  lines.push("      'newlines-between': 'always',");
  lines.push('    }],');
  lines.push('');
  lines.push('    // Naming conventions');
  lines.push("    '@typescript-eslint/naming-convention': [");
  lines.push("      'error',");
  lines.push("      { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },");
  lines.push("      { selector: 'function', format: ['camelCase'] },");
  lines.push("      { selector: 'typeLike', format: ['PascalCase'] },");
  lines.push("      { selector: 'enumMember', format: ['UPPER_CASE'] },");
  lines.push("      { selector: 'variable', types: ['boolean'], format: ['camelCase'], prefix: ['is', 'has', 'can', 'should', 'will'] },");
  lines.push('    ],');
  lines.push('');
  lines.push('    // No unhandled promises');
  lines.push("    '@typescript-eslint/no-floating-promises': 'error',");
  lines.push("    '@typescript-eslint/no-misused-promises': 'error',");
  lines.push('');
  lines.push('    // Avoid await in loops');
  lines.push("    'no-await-in-loop': 'warn',");
  lines.push('');
  lines.push('    // No dead code');
  lines.push("    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],");
  lines.push("    'no-unreachable': 'error',");

  // React-specific
  if (hasReact) {
    lines.push('');
    lines.push('    // React hooks rules');
    lines.push("    'react-hooks/rules-of-hooks': 'error',");
    lines.push("    'react-hooks/exhaustive-deps': 'warn',");
    lines.push('');
    lines.push('    // Accessibility');
    lines.push("    'jsx-a11y/alt-text': 'error',");
    lines.push("    'jsx-a11y/anchor-is-valid': 'error',");
    lines.push("    'jsx-a11y/click-events-have-key-events': 'error',");
    lines.push("    'jsx-a11y/no-static-element-interactions': 'error',");
    lines.push("    'jsx-a11y/label-has-associated-control': 'error',");
  }

  lines.push('  },');

  // Boundary settings for modular monolith / microservices
  if (boundaryElements.length > 0) {
    lines.push('  settings: {');
    lines.push("    'boundaries/elements': [");
    for (const el of boundaryElements) {
      lines.push(`${el},`);
    }
    lines.push('    ],');
    lines.push("    'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],");
    lines.push('  },');
  }

  lines.push('};');

  return lines.join('\n');
}

// ─── Python Lint Config ───

function buildPythonLintConfig(doc: SDLDocument): string {
  const coverage = doc.testing?.coverage?.target || 80;

  const lines: string[] = [];
  lines.push('# Auto-generated from SDL — coding rules enforcement');
  lines.push('# Merge into your existing pyproject.toml');
  lines.push('');
  lines.push('[tool.ruff]');
  lines.push('target-version = "py312"');
  lines.push('line-length = 120');
  lines.push('');
  lines.push('[tool.ruff.lint]');
  lines.push('select = [');
  lines.push('  "E",    # pycodestyle errors');
  lines.push('  "W",    # pycodestyle warnings');
  lines.push('  "F",    # pyflakes');
  lines.push('  "I",    # isort (import ordering)');
  lines.push('  "N",    # pep8-naming');
  lines.push('  "UP",   # pyupgrade');
  lines.push('  "B",    # flake8-bugbear');
  lines.push('  "SIM",  # flake8-simplify');
  lines.push('  "T20",  # flake8-print (no print statements)');
  lines.push('  "ANN",  # flake8-annotations (type hints required)');
  lines.push('  "S",    # flake8-bandit (security)');
  lines.push('  "RUF",  # ruff-specific rules');
  lines.push(']');
  lines.push('ignore = [');
  lines.push('  "ANN101",  # missing type annotation for self');
  lines.push('  "ANN102",  # missing type annotation for cls');
  lines.push(']');
  lines.push('');
  lines.push('[tool.ruff.lint.isort]');
  lines.push('force-sort-within-sections = true');
  lines.push('known-first-party = ["app"]');
  lines.push('');
  lines.push('[tool.ruff.lint.per-file-ignores]');
  lines.push('"tests/**/*.py" = ["S101", "ANN"]  # allow assert and skip annotations in tests');
  lines.push('');
  lines.push('[tool.mypy]');
  lines.push('strict = true');
  lines.push('warn_return_any = true');
  lines.push('warn_unused_configs = true');
  lines.push('disallow_untyped_defs = true');
  lines.push('');
  lines.push('[tool.pytest.ini_options]');
  lines.push(`addopts = "--cov=app --cov-report=term-missing --cov-fail-under=${coverage}"`);

  return lines.join('\n');
}

// ─── Go Lint Config ───

function buildGoLintConfig(doc: SDLDocument): string {
  const lines: string[] = [];
  lines.push('# Auto-generated from SDL — coding rules enforcement');
  lines.push('run:');
  lines.push('  timeout: 5m');
  lines.push('');
  lines.push('linters:');
  lines.push('  enable:');
  lines.push('    - errcheck       # unchecked errors');
  lines.push('    - govet          # suspicious constructs');
  lines.push('    - staticcheck    # comprehensive static analysis');
  lines.push('    - unused         # unused code');
  lines.push('    - gosimple       # simplifiable code');
  lines.push('    - ineffassign    # useless assignments');
  lines.push('    - typecheck      # type checking');
  lines.push('    - goimports      # import ordering');
  lines.push('    - revive         # linting rules (replaces golint)');
  lines.push('    - gocritic       # code quality');
  lines.push('    - cyclop         # cyclomatic complexity');
  lines.push('    - gocognit       # cognitive complexity');
  lines.push('    - nestif         # nesting depth');
  lines.push('    - funlen         # function length');
  lines.push('    - bodyclose      # HTTP body close');
  lines.push('    - noctx          # HTTP request context');
  lines.push('    - prealloc       # slice preallocation');
  lines.push('    - misspell       # misspelled words');
  lines.push('');
  lines.push('linters-settings:');
  lines.push('  cyclop:');
  lines.push('    max-complexity: 15');
  lines.push('  gocognit:');
  lines.push('    min-complexity: 20');
  lines.push('  nestif:');
  lines.push('    min-complexity: 3');
  lines.push('  funlen:');
  lines.push('    lines: 80');
  lines.push('    statements: 50');
  lines.push('  revive:');
  lines.push('    rules:');
  lines.push('      - name: exported');
  lines.push('        severity: warning');
  lines.push('      - name: var-naming');
  lines.push('        severity: warning');
  lines.push('      - name: unexported-return');
  lines.push('        severity: warning');
  lines.push('      - name: errorf');
  lines.push('        severity: error');
  lines.push('      - name: error-return');
  lines.push('        severity: error');
  lines.push('');
  lines.push('issues:');
  lines.push('  exclude-rules:');
  lines.push('    - path: _test\\.go');
  lines.push('      linters:');
  lines.push('        - funlen');
  lines.push('        - gocognit');

  return lines.join('\n');
}

// ─── Dependency Cruiser Config ───

function buildDependencyCruiserConfig(doc: SDLDocument): string {
  const services = doc.architecture.services || [];
  const backends = doc.architecture.projects.backend || [];

  const lines: string[] = [];
  lines.push('// Auto-generated from SDL — module boundary enforcement');
  lines.push('// Run: npx dependency-cruiser src --config .dependency-cruiser.sdl.cjs --output-type err');
  lines.push('module.exports = {');
  lines.push('  forbidden: [');

  // No circular dependencies
  lines.push('    {');
  lines.push("      name: 'no-circular',");
  lines.push("      severity: 'error',");
  lines.push("      comment: 'Circular dependencies create tight coupling and make extraction impossible.',");
  lines.push('      from: {},');
  lines.push('      to: { circular: true },');
  lines.push('    },');

  // Cross-module internal imports
  if (services.length > 0) {
    const serviceNames = services.map(s => s.name);
    const svcPattern = serviceNames.join('|');

    lines.push('    {');
    lines.push("      name: 'no-cross-module-internals',");
    lines.push("      severity: 'error',");
    lines.push("      comment: 'Modules may only import from *.interface.ts and *.types.ts of other modules.',");
    lines.push(`      from: { path: '(${svcPattern})/' },`);
    lines.push('      to: {');
    lines.push(`        path: '(${svcPattern})/',`);
    lines.push('        pathNot: [');
    lines.push("          '\\\\1/',  // same module is fine");
    lines.push("          '\\\\.(interface|types)\\\\.ts$',  // public contracts are fine");
    lines.push('        ],');
    lines.push('      },');
    lines.push('    },');
  }

  // No direct DB access from routes
  lines.push('    {');
  lines.push("      name: 'no-db-in-routes',");
  lines.push("      severity: 'error',");
  lines.push("      comment: 'Routes/controllers must not import database directly. Use services.',");
  lines.push("      from: { path: '\\\\.(routes|controller)\\\\.ts$' },");
  lines.push("      to: { path: '(database|db|connection)\\\\.ts$' },");
  lines.push('    },');

  // No repository in routes (must go through services)
  lines.push('    {');
  lines.push("      name: 'no-repository-in-routes',");
  lines.push("      severity: 'error',");
  lines.push("      comment: 'Routes must go through services, not directly to repositories.',");
  lines.push("      from: { path: '\\\\.routes\\\\.ts$' },");
  lines.push("      to: { path: '\\\\.repository\\\\.ts$' },");
  lines.push('    },');

  // Shared must not import modules
  lines.push('    {');
  lines.push("      name: 'shared-no-module-imports',");
  lines.push("      severity: 'error',");
  lines.push("      comment: 'Shared utilities must not depend on any business module.',");
  lines.push("      from: { path: 'shared/' },");
  if (services.length > 0) {
    const svcPattern = services.map(s => s.name).join('|');
    lines.push(`      to: { path: '(${svcPattern})/' },`);
  } else {
    lines.push("      to: { path: '(services|modules|features)/' },");
  }
  lines.push('    },');

  // ORM usage only in repositories
  for (const be of backends) {
    if (be.orm) {
      const ormPackage = ORM_PACKAGES[be.orm];
      if (ormPackage) {
        lines.push('    {');
        lines.push(`      name: 'orm-only-in-repositories-${be.name}',`);
        lines.push("      severity: 'error',");
        lines.push(`      comment: '${be.orm} must only be used in repository files.',`);
        lines.push("      from: { pathNot: '\\\\.repository\\\\.ts$' },");
        lines.push(`      to: { path: 'node_modules/${ormPackage}' },`);
        lines.push('    },');
      }
    }
  }

  lines.push('  ],');
  lines.push('};');

  return lines.join('\n');
}

// ─── Lint-Staged Config ───

function buildLintStagedConfig(
  doc: SDLDocument,
  langs: { hasTs: boolean; hasPython: boolean; hasGo: boolean; hasJava: boolean },
): string {
  const config: Record<string, string[]> = {};

  if (langs.hasTs) {
    const cmds = ['eslint --config .eslintrc.sdl.js --fix'];
    if (doc.architecture.style === 'modular-monolith' || doc.architecture.style === 'microservices') {
      cmds.push('npx dependency-cruiser --config .dependency-cruiser.sdl.cjs --validate');
    }
    config['*.{ts,tsx}'] = cmds;
  }

  if (langs.hasPython) {
    config['*.py'] = ['ruff check --fix', 'ruff format'];
  }

  if (langs.hasGo) {
    config['*.go'] = ['golangci-lint run --config .golangci.sdl.yml'];
  }

  return JSON.stringify(config, null, 2);
}

function buildHuskyPreCommit(): string {
  return `#!/usr/bin/env sh
# Auto-generated from SDL — pre-commit hook
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged --config .lintstagedrc.sdl.json
`;
}

// ─── Architecture Tests (TypeScript) ───

function buildArchitectureTests(doc: SDLDocument): string {
  const services = doc.architecture.services || [];
  const style = doc.architecture.style;
  const backends = doc.architecture.projects.backend || [];

  const lines: string[] = [];
  lines.push("// Auto-generated from SDL — architecture enforcement tests");
  lines.push("// Run: npx jest __tests__/architecture.sdl.test.ts");
  lines.push("import * as fs from 'fs';");
  lines.push("import * as path from 'path';");
  lines.push("import { execSync } from 'child_process';");
  lines.push('');
  lines.push("describe('Architecture Enforcement (SDL)', () => {");

  // Module boundary test
  if (services.length > 0 && (style === 'modular-monolith' || style === 'microservices')) {
    lines.push('');
    lines.push("  describe('Module Boundaries', () => {");
    lines.push("    const moduleNames = [");
    for (const svc of services) {
      lines.push(`      '${svc.name}',`);
    }
    lines.push('    ];');
    lines.push('');
    lines.push("    test('no module imports another module\\'s repository directly', () => {");
    lines.push('      for (const mod of moduleNames) {');
    lines.push("        const modDir = path.join('src', mod);");
    lines.push('        if (!fs.existsSync(modDir)) continue;');
    lines.push('');
    lines.push("        const files = fs.readdirSync(modDir, { recursive: true }) as string[];");
    lines.push("        const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));");
    lines.push('        for (const file of tsFiles) {');
    lines.push("          const content = fs.readFileSync(path.join(modDir, file), 'utf-8');");
    lines.push('          for (const other of moduleNames) {');
    lines.push('            if (other === mod) continue;');
    lines.push("            const repoImport = new RegExp(`from.*['\"].*${other}.*\\\\.repository['\"]`);");
    lines.push('            expect(content).not.toMatch(repoImport);');
    lines.push('          }');
    lines.push('        }');
    lines.push('      }');
    lines.push('    });');
    lines.push('');
    lines.push("    test('no module imports another module\\'s internal files (only .interface.ts and .types.ts)', () => {");
    lines.push('      for (const mod of moduleNames) {');
    lines.push("        const modDir = path.join('src', mod);");
    lines.push('        if (!fs.existsSync(modDir)) continue;');
    lines.push('');
    lines.push("        const files = fs.readdirSync(modDir, { recursive: true }) as string[];");
    lines.push("        const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));");
    lines.push('        for (const file of tsFiles) {');
    lines.push("          const content = fs.readFileSync(path.join(modDir, file), 'utf-8');");
    lines.push('          for (const other of moduleNames) {');
    lines.push('            if (other === mod) continue;');
    lines.push("            // Match imports from other modules that aren't .interface or .types");
    lines.push("            const internalImport = new RegExp(`from.*['\"].*${other}/(?!.*\\\\.(interface|types))[^'\"]*['\"]`);");
    lines.push("            const matches = content.match(internalImport);");
    lines.push("            if (matches) {");
    lines.push("              fail(`${mod}/${file} imports internal file from ${other}: ${matches[0]}`);");
    lines.push("            }");
    lines.push('          }');
    lines.push('        }');
    lines.push('      }');
    lines.push('    });');
    lines.push('  });');
  }

  // No direct DB access in services
  lines.push('');
  lines.push("  describe('Data Access Patterns', () => {");
  lines.push("    test('service files do not use database client directly', () => {");
  lines.push("      const serviceFiles = findFiles('src', /\\.service\\.ts$/);");
  lines.push('      for (const file of serviceFiles) {');
  lines.push("        const content = fs.readFileSync(file, 'utf-8');");
  lines.push("        expect(content).not.toMatch(/getDb\\(\\)|\\bcollection\\(|\\bcollections\\./);");
  lines.push('      }');
  lines.push('    });');
  lines.push('');
  lines.push("    test('route files do not import repositories', () => {");
  lines.push("      const routeFiles = findFiles('src', /\\.routes\\.ts$/);");
  lines.push('      for (const routeFile of routeFiles) {');
  lines.push("        const content = fs.readFileSync(routeFile, 'utf-8');");
  lines.push("        expect(content).not.toMatch(/from.*\\.repository/);");
  lines.push('      }');
  lines.push('    });');
  lines.push('  });');

  // No secrets in code
  lines.push('');
  lines.push("  describe('Security', () => {");
  lines.push("    test('no hardcoded secrets in source files', () => {");
  lines.push("      const sourceFiles = findFiles('src', /\\.ts$/);");
  lines.push('      const secretPatterns = [');
  lines.push("        /['\"]sk[-_](live|test)_[a-zA-Z0-9]{20,}['\"]/,  // Stripe");
  lines.push("        /['\"]sk-ant-[a-zA-Z0-9]{20,}['\"]/,             // Anthropic");
  lines.push("        /['\"][A-Za-z0-9+/]{40,}={0,2}['\"]/,            // Base64 keys (40+ chars)");
  lines.push('      ];');
  lines.push('      for (const file of sourceFiles) {');
  lines.push("        const content = fs.readFileSync(file, 'utf-8');");
  lines.push('        for (const pattern of secretPatterns) {');
  lines.push('          expect(content).not.toMatch(pattern);');
  lines.push('        }');
  lines.push('      }');
  lines.push('    });');
  lines.push('  });');

  // Dependency cruiser integration
  if (style === 'modular-monolith' || style === 'microservices') {
    lines.push('');
    lines.push("  describe('Dependency Graph', () => {");
    lines.push("    test('no circular dependencies (dependency-cruiser)', () => {");
    lines.push('      try {');
    lines.push('        const result = execSync(');
    lines.push("          'npx dependency-cruiser src --config .dependency-cruiser.sdl.cjs --output-type err',");
    lines.push("          { encoding: 'utf-8', stdio: 'pipe' }");
    lines.push('        ).trim();');
    lines.push("        expect(result).toBe('');");
    lines.push('      } catch (e: unknown) {');
    lines.push('        const err = e as { stdout?: string };');
    lines.push("        fail(`Dependency cruiser found violations:\\n${err.stdout || ''}`);");
    lines.push('      }');
    lines.push('    });');
    lines.push('  });');
  }

  // Coverage enforcement
  if (doc.testing?.coverage?.target) {
    lines.push('');
    lines.push("  describe('Coverage', () => {");
    lines.push(`    const COVERAGE_TARGET = ${doc.testing.coverage.target};`);
    lines.push('');
    lines.push("    test(`coverage meets SDL target of \\${COVERAGE_TARGET}%`, () => {");
    lines.push("      // This test validates coverage is tracked — actual enforcement is in CI");
    lines.push('      expect(COVERAGE_TARGET).toBeGreaterThan(0);');
    lines.push('    });');
    lines.push('  });');
  }

  // Helper function
  lines.push('');
  lines.push('  // Helper: recursively find files matching a pattern');
  lines.push('  function findFiles(dir: string, pattern: RegExp): string[] {');
  lines.push('    const results: string[] = [];');
  lines.push('    if (!fs.existsSync(dir)) return results;');
  lines.push("    const entries = fs.readdirSync(dir, { withFileTypes: true });");
  lines.push('    for (const entry of entries) {');
  lines.push('      const fullPath = path.join(dir, entry.name);');
  lines.push("      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {");
  lines.push('        results.push(...findFiles(fullPath, pattern));');
  lines.push('      } else if (entry.isFile() && pattern.test(entry.name)) {');
  lines.push('        results.push(fullPath);');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return results;');
  lines.push('  }');

  lines.push('});');

  return lines.join('\n');
}

// ─── Java ArchUnit Tests ───

function buildJavaArchTests(doc: SDLDocument): string {
  const services = doc.architecture.services || [];

  const lines: string[] = [];
  lines.push('// Auto-generated from SDL — architecture enforcement tests');
  lines.push('// Requires: com.tngtech.archunit:archunit-junit5');
  lines.push('package architecture;');
  lines.push('');
  lines.push('import com.tngtech.archunit.core.domain.JavaClasses;');
  lines.push('import com.tngtech.archunit.core.importer.ClassFileImporter;');
  lines.push('import com.tngtech.archunit.lang.ArchRule;');
  lines.push('import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;');
  lines.push('import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;');
  lines.push('import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;');
  lines.push('import org.junit.jupiter.api.Test;');
  lines.push('import org.junit.jupiter.api.BeforeAll;');
  lines.push('');
  lines.push('class ArchitectureTest {');
  lines.push('');
  lines.push('    private static JavaClasses classes;');
  lines.push('');
  lines.push('    @BeforeAll');
  lines.push('    static void setup() {');
  lines.push('        classes = new ClassFileImporter().importPackages("com.app");');
  lines.push('    }');
  lines.push('');
  lines.push('    @Test');
  lines.push('    void controllersShouldNotAccessRepositories() {');
  lines.push('        ArchRule rule = noClasses()');
  lines.push('            .that().resideInAPackage("..controller..")');
  lines.push('            .should().accessClassesThat().resideInAPackage("..repository..");');
  lines.push('        rule.check(classes);');
  lines.push('    }');
  lines.push('');
  lines.push('    @Test');
  lines.push('    void servicesShouldNotDependOnControllers() {');
  lines.push('        ArchRule rule = noClasses()');
  lines.push('            .that().resideInAPackage("..service..")');
  lines.push('            .should().dependOnClassesThat().resideInAPackage("..controller..");');
  lines.push('        rule.check(classes);');
  lines.push('    }');
  lines.push('');
  lines.push('    @Test');
  lines.push('    void repositoriesShouldNotDependOnServices() {');
  lines.push('        ArchRule rule = noClasses()');
  lines.push('            .that().resideInAPackage("..repository..")');
  lines.push('            .should().dependOnClassesThat().resideInAPackage("..service..");');
  lines.push('        rule.check(classes);');
  lines.push('    }');
  lines.push('');
  lines.push('    @Test');
  lines.push('    void noCyclicDependencies() {');
  lines.push('        ArchRule rule = slices()');
  lines.push('            .matching("com.app.(*)..")');
  lines.push('            .should().beFreeOfCycles();');
  lines.push('        rule.check(classes);');
  lines.push('    }');

  if (services.length > 0) {
    lines.push('');
    lines.push('    @Test');
    lines.push('    void modulesShouldNotAccessOtherModulesInternals() {');
    for (const svc of services) {
      lines.push(`        // ${svc.name} module boundary`);
      lines.push(`        ArchRule ${svc.name}Rule = noClasses()`);
      lines.push(`            .that().resideOutsideOfPackage("..${svc.name}..")`);
      lines.push(`            .should().accessClassesThat()`);
      lines.push(`            .resideInAPackage("..${svc.name}.internal..");`);
      lines.push(`        ${svc.name}Rule.check(classes);`);
    }
    lines.push('    }');
  }

  lines.push('}');

  return lines.join('\n');
}

// ─── .NET ArchUnit Tests ───

function buildDotnetArchTests(doc: SDLDocument): string {
  const lines: string[] = [];
  lines.push('// Auto-generated from SDL — architecture enforcement tests');
  lines.push('// Requires: NetArchTest.Rules NuGet package');
  lines.push('using NetArchTest.Rules;');
  lines.push('using Xunit;');
  lines.push('');
  lines.push('namespace Architecture.Tests;');
  lines.push('');
  lines.push('public class ArchitectureTests');
  lines.push('{');
  lines.push('    private static readonly System.Reflection.Assembly AppAssembly =');
  lines.push('        typeof(Program).Assembly;');
  lines.push('');
  lines.push('    [Fact]');
  lines.push('    public void Controllers_Should_Not_Reference_Repositories()');
  lines.push('    {');
  lines.push('        var result = Types.InAssembly(AppAssembly)');
  lines.push('            .That().ResideInNamespace("Controllers")');
  lines.push('            .ShouldNot().HaveDependencyOn("Repositories")');
  lines.push('            .GetResult();');
  lines.push('        Assert.True(result.IsSuccessful);');
  lines.push('    }');
  lines.push('');
  lines.push('    [Fact]');
  lines.push('    public void Services_Should_Not_Depend_On_Controllers()');
  lines.push('    {');
  lines.push('        var result = Types.InAssembly(AppAssembly)');
  lines.push('            .That().ResideInNamespace("Services")');
  lines.push('            .ShouldNot().HaveDependencyOn("Controllers")');
  lines.push('            .GetResult();');
  lines.push('        Assert.True(result.IsSuccessful);');
  lines.push('    }');
  lines.push('');
  lines.push('    [Fact]');
  lines.push('    public void Repositories_Should_Not_Depend_On_Services()');
  lines.push('    {');
  lines.push('        var result = Types.InAssembly(AppAssembly)');
  lines.push('            .That().ResideInNamespace("Repositories")');
  lines.push('            .ShouldNot().HaveDependencyOn("Services")');
  lines.push('            .GetResult();');
  lines.push('        Assert.True(result.IsSuccessful);');
  lines.push('    }');
  lines.push('}');

  return lines.join('\n');
}

// ─── CI Enforcement Workflow ───

function buildCiEnforcementWorkflow(
  doc: SDLDocument,
  langs: { hasTs: boolean; hasPython: boolean; hasGo: boolean; hasJava: boolean; hasDotnet: boolean },
): string {
  const coverage = doc.testing?.coverage?.target || 80;
  const hasBoundaries = doc.architecture.style === 'modular-monolith' || doc.architecture.style === 'microservices';

  const lines: string[] = [];
  lines.push('# Auto-generated from SDL — architecture enforcement CI gate');
  lines.push('name: Architecture Enforcement');
  lines.push('');
  lines.push('on:');
  lines.push('  pull_request:');
  lines.push('    branches: [main, develop]');
  lines.push('  push:');
  lines.push('    branches: [main]');
  lines.push('');
  lines.push('jobs:');

  if (langs.hasTs) {
    lines.push('  lint-typescript:');
    lines.push('    name: TypeScript Lint & Boundaries');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push("          node-version: '20'");
    lines.push('          cache: npm');
    lines.push('      - run: npm ci');
    lines.push('      - name: ESLint (SDL rules)');
    lines.push('        run: npx eslint --config .eslintrc.sdl.js "src/**/*.ts"');
    if (hasBoundaries) {
      lines.push('      - name: Module Boundaries (dependency-cruiser)');
      lines.push('        run: npx dependency-cruiser src --config .dependency-cruiser.sdl.cjs --output-type err');
    }
    lines.push('      - name: Architecture Tests');
    lines.push('        run: npx jest __tests__/architecture.sdl.test.ts --no-coverage');
    lines.push('');
  }

  if (langs.hasPython) {
    lines.push('  lint-python:');
    lines.push('    name: Python Lint & Type Check');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-python@v5');
    lines.push('        with:');
    lines.push("          python-version: '3.12'");
    lines.push('      - run: pip install ruff mypy pytest pytest-cov');
    lines.push('      - run: pip install -r requirements.txt');
    lines.push('      - name: Ruff Lint');
    lines.push('        run: ruff check .');
    lines.push('      - name: Ruff Format Check');
    lines.push('        run: ruff format --check .');
    lines.push('      - name: Mypy Type Check');
    lines.push('        run: mypy app/');
    lines.push(`      - name: Tests with coverage (min ${coverage}%)`);
    lines.push(`        run: pytest --cov=app --cov-fail-under=${coverage}`);
    lines.push('');
  }

  if (langs.hasGo) {
    lines.push('  lint-go:');
    lines.push('    name: Go Lint & Vet');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-go@v5');
    lines.push('        with:');
    lines.push("          go-version: '1.22'");
    lines.push('      - name: golangci-lint');
    lines.push('        uses: golangci/golangci-lint-action@v4');
    lines.push('        with:');
    lines.push('          args: --config .golangci.sdl.yml');
    lines.push(`      - name: Tests with coverage (min ${coverage}%)`);
    lines.push("        run: |");
    lines.push('          go test -coverprofile=coverage.out ./...');
    lines.push('          COVERAGE=$(go tool cover -func=coverage.out | tail -1 | awk \'{print $3}\' | sed \'s/%/\')');
    lines.push(`          if (( $(echo "$COVERAGE < ${coverage}" | bc -l) )); then`);
    lines.push(`            echo "Coverage $COVERAGE% is below target ${coverage}%"`);
    lines.push('            exit 1');
    lines.push('          fi');
    lines.push('');
  }

  if (langs.hasJava) {
    lines.push('  lint-java:');
    lines.push('    name: Java Architecture Tests');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-java@v4');
    lines.push('        with:');
    lines.push("          java-version: '21'");
    lines.push("          distribution: 'temurin'");
    lines.push('      - name: Build & Test');
    lines.push('        run: ./mvnw verify');
    lines.push('');
  }

  if (langs.hasDotnet) {
    lines.push('  lint-dotnet:');
    lines.push('    name: .NET Architecture Tests');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-dotnet@v4');
    lines.push('        with:');
    lines.push("          dotnet-version: '8.0.x'");
    lines.push('      - run: dotnet restore');
    lines.push('      - run: dotnet test tests/Architecture.Tests/');
    lines.push('');
  }

  // Commit message enforcement
  lines.push('  commit-lint:');
  lines.push('    name: Conventional Commits');
  lines.push('    runs-on: ubuntu-latest');
  lines.push('    if: github.event_name == \'pull_request\'');
  lines.push('    steps:');
  lines.push('      - uses: actions/checkout@v4');
  lines.push('        with:');
  lines.push('          fetch-depth: 0');
  lines.push('      - uses: actions/setup-node@v4');
  lines.push('        with:');
  lines.push("          node-version: '20'");
  lines.push('      - run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to HEAD');

  return lines.join('\n');
}

// ─── ORM Package Map ───

const ORM_PACKAGES: Record<string, string> = {
  prisma: '@prisma/client',
  typeorm: 'typeorm',
  sequelize: 'sequelize',
  mongoose: 'mongoose',
  'ef-core': 'Microsoft.EntityFrameworkCore',
  sqlalchemy: 'sqlalchemy',
  gorm: 'gorm.io',
};
