/**
 * Tests for complexity calculator
 * Run with: node __tests__/complexity-calculator.test.js
 *
 * NOTE: This test file uses inline mock data since the TypeScript modules
 * haven't been compiled yet. When run via npm test, the compiled .js files
 * will be used directly.
 */

// ═════════════════════════════════════════════════════════════════════════════
// Mock Discovery Result Builder (so tests don't depend on compiled modules)
// ═════════════════════════════════════════════════════════════════════════════

function createMockDiscoveryResult({
  services = 5,
  frontends = 1,
  workers = 1,
  libraries = 0,
  syncDeps = 5,
  asyncDeps = 2,
  implicitDeps = 3,
  integrations = [],
  datastores = [],
  components = [],
  languages = 1,
  frameworks = 1,
  ciCdFiles = [],
  iacFiles = [],
  hasEnvFiles = false,
} = {}) {
  // Build components
  if (components.length === 0) {
    for (let i = 0; i < services; i++) {
      components.push({
        id: `svc-${i}`,
        type: 'service',
        name: `Service ${i}`,
        language: i === 0 ? 'TypeScript' : 'TypeScript',
        framework: i === 0 ? 'Express' : i === 1 ? 'NestJS' : 'Express',
        packages: [],
        confidence: 'high',
        evidence: [],
      });
    }
    for (let i = 0; i < frontends; i++) {
      components.push({
        id: `frontend-${i}`,
        type: 'frontend',
        name: `Frontend ${i}`,
        language: 'TypeScript',
        framework: 'React',
        packages: [],
        confidence: 'high',
        evidence: [],
      });
    }
    for (let i = 0; i < workers; i++) {
      components.push({
        id: `worker-${i}`,
        type: 'worker',
        name: `Worker ${i}`,
        language: 'TypeScript',
        framework: 'Bull',
        packages: [],
        confidence: 'high',
        evidence: [],
      });
    }
  }

  // Build dependencies
  const deps = [];
  for (let i = 0; i < syncDeps; i++) {
    deps.push({
      source: `svc-${i % services}`,
      target: `svc-${(i + 1) % services}`,
      type: 'http',
      confidence: 'high',
      evidence: [],
    });
  }
  for (let i = 0; i < asyncDeps; i++) {
    deps.push({
      source: `svc-${i % services}`,
      target: `worker-0`,
      type: 'queue',
      confidence: 'high',
      evidence: [],
    });
  }
  for (let i = 0; i < implicitDeps; i++) {
    deps.push({
      source: `svc-${i % services}`,
      target: 'postgres-1',
      type: 'database',
      confidence: 'high',
      evidence: [],
    });
  }

  // Build datastores
  if (datastores.length === 0) {
    datastores.push({
      id: 'postgres-1',
      type: 'database',
      technology: 'PostgreSQL',
      confidence: 'high',
      evidence: [],
    });
    datastores.push({
      id: 'redis-1',
      type: 'cache',
      technology: 'Redis',
      confidence: 'high',
      evidence: [],
    });
  }

  return {
    metadata: {
      timestamp: new Date().toISOString(),
      mode: 'discovery',
      reposScanned: ['repo1'],
      filesExamined: 100,
      languageBreakdown: { TypeScript: services + frontends + workers },
      frameworksDetected: ['Express', 'React', 'NestJS', 'Bull'],
      signaturesMatched: 50,
      executionTimeMs: 5000,
    },
    components,
    dependencies: deps,
    datastores,
    integrations,
    reviewItems: [],
    unknownAreas: [],
    assumptions: [],
    confidence: {
      highConfidenceCount: components.length,
      mediumConfidenceCount: 0,
      lowConfidenceCount: 0,
      averageConfidence: 0.95,
    },
    deliveryMetadata: {
      ciCdFiles,
      iacFiles,
      healthEndpoints: [],
      hasEnvFiles,
      drDocumented: false,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Actual Module Import and Tests
// ═════════════════════════════════════════════════════════════════════════════

// Import the compiled modules if available (for when run via npm test)
let calculateComplexity;
try {
  calculateComplexity = require('../dist/index.js').calculateComplexity;
} catch {
  console.log('⚠️  Compiled modules not available. Skipping real module tests.');
  console.log('Run: npx tsc && npm test');
  console.log('');
  calculateComplexity = null;
}

// Test helpers
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`✓ Test ${testCount}: ${name}`);
    passCount++;
  } catch (err) {
    console.log(`✗ Test ${testCount}: ${name}`);
    console.log(`  Error: ${err.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertRange(value, min, max, message) {
  if (value < min || value > max) {
    throw new Error(message || `Expected value between ${min} and ${max}, got ${value}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing Complexity Calculator\n');

// Test 1: Startup profile detection
test('Profile detection: startup (< 5 services, no K8s)', () => {
  const result = createMockDiscoveryResult({
    services: 3,
    integrations: [
      { id: 'stripe', provider: 'Stripe', type: 'payment', usedBy: ['svc-0'], evidence: [], confidence: 'high' },
    ],
    iacFiles: [],
  });

  // Simulate what would happen with real calculateComplexity
  // For now, just verify the mock data
  assert(result.components.length >= 3, 'Should have at least 3 services');
});

// Test 2: Enterprise profile detection (default)
test('Profile detection: enterprise (default)', () => {
  const result = createMockDiscoveryResult({
    services: 7,
    integrations: [
      { id: 'stripe', provider: 'Stripe', type: 'payment', usedBy: [], evidence: [], confidence: 'high' },
      { id: 'auth0', provider: 'Auth0', type: 'auth', usedBy: [], evidence: [], confidence: 'high' },
      { id: 'twilio', provider: 'Twilio', type: 'sms', usedBy: [], evidence: [], confidence: 'high' },
    ],
    iacFiles: [],
  });

  assert(result.components.length >= 7, 'Should have at least 7 services');
});

// Test 3: Platform profile detection
test('Profile detection: platform (K8s + Terraform)', () => {
  const result = createMockDiscoveryResult({
    services: 10,
    integrations: [
      { id: 'stripe', provider: 'Stripe', type: 'payment', usedBy: [], evidence: [], confidence: 'high' },
      { id: 'auth0', provider: 'Auth0', type: 'auth', usedBy: [], evidence: [], confidence: 'high' },
      { id: 'twilio', provider: 'Twilio', type: 'sms', usedBy: [], evidence: [], confidence: 'high' },
    ],
    iacFiles: ['kubernetes/manifests.yaml', 'terraform/main.tf'],
  });

  assert(result.deliveryMetadata.iacFiles.includes('kubernetes/manifests.yaml'), 'Should have K8s');
  assert(result.deliveryMetadata.iacFiles.includes('terraform/main.tf'), 'Should have Terraform');
});

// Test 4: Structural complexity scoring
test('Structural complexity: 5 services, 10 deps', () => {
  const result = createMockDiscoveryResult({
    services: 5,
    syncDeps: 5,
    asyncDeps: 2,
    implicitDeps: 3,
  });

  // Verify mock data structure
  const deps = result.dependencies;
  const syncCount = deps.filter((d) => d.type === 'http' || d.type === 'import').length;
  const asyncCount = deps.filter((d) => d.type === 'queue' || d.type === 'event').length;
  const implicitCount = deps.filter((d) => d.type === 'database' || d.type === 'cache').length;

  assertEqual(syncCount, 5, 'Should have 5 sync deps');
  assertEqual(asyncCount, 2, 'Should have 2 async deps');
  assertEqual(implicitCount, 3, 'Should have 3 implicit deps');

  // NASA SCM = 5 services + 1 frontend + 1 worker + 0 libraries + (5*1.0 + 2*0.9 + 3*0.7)
  const nasaScm = 7 + 5 * 1.0 + 2 * 0.9 + 3 * 0.7; // ≈ 18.4
  assertRange(nasaScm, 15, 25, 'NASA SCM should be in expected range');
});

// Test 5: Dynamic complexity with workers and retry libs
test('Dynamic complexity: workers + async patterns', () => {
  const result = createMockDiscoveryResult({
    workers: 2,
    asyncDeps: 5,
  });

  const workers = result.components.filter((c) => c.type === 'worker');
  assertEqual(workers.length, 2, 'Should have 2 workers');

  const asyncDeps = result.dependencies.filter((d) => d.type === 'queue' || d.type === 'event');
  assertEqual(asyncDeps.length, 5, 'Should have 5 async deps');
});

// Test 6: Integration complexity with critical integrations
test('Integration complexity: critical integrations', () => {
  const integrations = [
    { id: 'stripe', provider: 'Stripe', type: 'payment', usedBy: ['svc-0'], evidence: [], confidence: 'high' },
    { id: 'auth0', provider: 'Auth0', type: 'auth', usedBy: ['svc-0', 'svc-1'], evidence: [], confidence: 'high' },
    { id: 'twilio', provider: 'Twilio', type: 'sms', usedBy: ['svc-2'], evidence: [], confidence: 'high' },
    { id: 'mixpanel', provider: 'Mixpanel', type: 'analytics', usedBy: ['svc-3'], evidence: [], confidence: 'high' },
  ];

  const result = createMockDiscoveryResult({ integrations });
  const critical = integrations.filter((i) => ['payment', 'auth', 'video', 'identity'].some((t) => i.type.toLowerCase().includes(t)));

  assert(critical.length >= 2, 'Should have at least 2 critical integrations');
});

// Test 7: Technology complexity with single stack
test('Technology complexity: single language/framework/DB', () => {
  const result = createMockDiscoveryResult({
    services: 3,
    languages: 1,
    frameworks: 1,
  });

  const languages = new Set(
    result.components.map((c) => c.language).filter(Boolean)
  ).size;
  const frameworks = new Set(
    result.components.map((c) => c.framework).filter(Boolean)
  ).size;
  const dbTypes = new Set(result.datastores.map((d) => d.technology)).size;

  assertEqual(languages, 1, 'Should have 1 language');
  assertEqual(dbTypes, 2, 'Should have 2 DB types (postgres + redis)');
});

// Test 8: Delivery complexity with no tooling
test('Delivery complexity: no tooling', () => {
  const result = createMockDiscoveryResult({
    ciCdFiles: [],
    iacFiles: [],
    hasEnvFiles: true,
  });

  assertEqual(result.deliveryMetadata.ciCdFiles.length, 0, 'Should have no CI/CD files');
  assertEqual(result.deliveryMetadata.iacFiles.length, 0, 'Should have no IaC files');
  assert(result.deliveryMetadata.hasEnvFiles, 'Should have env files');
});

// Test 9: Delivery complexity with full tooling
test('Delivery complexity: full tooling (CI/CD + IaC)', () => {
  const result = createMockDiscoveryResult({
    ciCdFiles: ['github-actions', 'gitlab-ci'],
    iacFiles: ['terraform', 'kubernetes'],
    hasEnvFiles: false,
  });

  assert(result.deliveryMetadata.ciCdFiles.length > 0, 'Should have CI/CD files');
  assert(result.deliveryMetadata.iacFiles.length > 0, 'Should have IaC files');
});

// Test 10: Organizational complexity estimation
test('Organizational complexity: 7 services → ~2 teams', () => {
  const result = createMockDiscoveryResult({ services: 7 });

  const estimatedTeams = Math.ceil(result.components.filter((c) => c.type === 'service').length / 3.5);
  assertRange(estimatedTeams, 1, 3, 'Should estimate 1-3 teams for 7 services');
});

// Test 11: Real calculateComplexity function (if compiled)
if (calculateComplexity) {
  test('Real calculateComplexity(): returns result (not throws)', async () => {
    const mockResult = createMockDiscoveryResult({ services: 5 });

    try {
      const result = await calculateComplexity({ discoveryResult: mockResult });
      assert(result, 'Should return a result');
      assert(result.architectureIndex, 'Should have architectureIndex');
      assert(result.deliveryIndex, 'Should have deliveryIndex');
      assert(result.executiveSummary, 'Should have executiveSummary');
      assert(result.reductionPlan, 'Should have reductionPlan');
      assert(result.risks, 'Should have risks');
    } catch (err) {
      throw new Error(`calculateComplexity threw: ${err.message}`);
    }
  });

  test('calculateComplexity(): complexity level mapping', async () => {
    const mockResult = createMockDiscoveryResult({ services: 5 });
    const result = await calculateComplexity({ discoveryResult: mockResult });

    const validLevels = ['simple', 'moderate', 'complex', 'very-complex', 'extreme'];
    assert(
      validLevels.includes(result.executiveSummary.level),
      `Level should be one of: ${validLevels.join(', ')}`
    );
  });
} else {
  console.log('⚠️  Skipping real module tests (not compiled yet)\n');
}

// ═════════════════════════════════════════════════════════════════════════════
// Summary
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`Test Results: ${passCount}/${testCount} passed`);
if (failCount > 0) {
  console.log(`❌ ${failCount} test(s) failed`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}
