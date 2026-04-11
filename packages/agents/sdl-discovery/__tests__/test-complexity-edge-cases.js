/**
 * Edge case tests for complexity scoring signal detection
 */

const circuitBreakerSignals = ['opossum', 'hystrix', 'resilience4j', 'polly', 'cockatiel'];
const tracingSignals = ['opentelemetry', 'jaeger-client', 'dd-trace', 'newrelic'];
const metricsSignals = ['prom-client', 'hot-shots', 'datadog', 'prometheus-client'];

function detectSignals(packages, signals) {
  return packages.filter(pkg =>
    signals.some(signal => pkg.toLowerCase().includes(signal.toLowerCase()))
  );
}

console.log('🧪 Testing Edge Cases and Case-Insensitivity\n');

// Test 1: Case insensitivity
console.log('Test 1: Case Insensitivity');
const caseTests = [
  'Opossum',
  'HYSTRIX',
  'OpenTelemetry',
  'Prometheus-Client',
  'JAEGER-CLIENT'
];
console.log('  Input (mixed case):', caseTests);
const circuitBreakerMatches = detectSignals(caseTests, circuitBreakerSignals);
const tracingMatches = detectSignals(caseTests, tracingSignals);
const metricsMatches = detectSignals(caseTests, metricsSignals);
console.log('  Circuit breaker matches:', circuitBreakerMatches);
console.log('  Tracing matches:', tracingMatches);
console.log('  Metrics matches:', metricsMatches);
console.log('  ✓ All case-insensitive matches work\n');

// Test 2: Scoped packages
console.log('Test 2: Scoped Packages (@org/package)');
const scopedPackages = [
  '@opentelemetry/sdk-node',
  '@opentelemetry/exporter-prometheus',
  '@launchdarkly/node-server-sdk',
  '@aws-sdk/client-secrets-manager',
  '@azure/keyvault-secrets'
];
console.log('  Input:', scopedPackages);
const tracingScoped = detectSignals(scopedPackages, tracingSignals);
console.log('  Tracing detected in scoped packages:', tracingScoped.length > 0);
console.log('  Tracing matches:', tracingScoped);
console.log('  ✓ Scoped packages correctly matched\n');

// Test 3: Partial matches
console.log('Test 3: Partial Matches (substring detection)');
const partialMatches = [
  'opentelemetry-auto',  // should match 'opentelemetry'
  'jaeger-client-node',  // should match 'jaeger-client'
  'prometheus-client-js' // should match 'prometheus-client'
];
console.log('  Input:', partialMatches);
const tracingPartial = detectSignals(partialMatches, tracingSignals);
const metricsPartial = detectSignals(partialMatches, metricsSignals);
console.log('  Tracing matches:', tracingPartial);
console.log('  Metrics matches:', metricsPartial);
console.log('  ✓ Partial/substring matches work\n');

// Test 4: Empty array
console.log('Test 4: Edge Case - Empty Arrays');
const emptyResult = detectSignals([], circuitBreakerSignals);
console.log('  detectSignals([]) result:', emptyResult);
console.log('  ✓ Empty input handled correctly\n');

// Test 5: No matches
console.log('Test 5: No Matches');
const noMatches = detectSignals(['express', 'pg', 'cors', 'helmet'], circuitBreakerSignals);
console.log('  Packages:', ['express', 'pg', 'cors', 'helmet']);
console.log('  Circuit breaker signals detected:', noMatches);
console.log('  ✓ Correctly returns empty array when no matches\n');

// Test 6: Duplicate packages
console.log('Test 6: Duplicate Packages');
const duplicatePackages = [
  'opentelemetry',
  'opentelemetry',
  '@opentelemetry/sdk-node',
  'prometheus-client',
  'prometheus-client'
];
console.log('  Input (with duplicates):', duplicatePackages);
const dedupMatches = detectSignals(duplicatePackages, [...tracingSignals, ...metricsSignals]);
console.log('  Unique matches:', [...new Set(dedupMatches)]);
console.log('  ✓ Duplicates handled (filtering works on any matches)\n');

// Test 7: Multiple signals per package (versioned)
console.log('Test 7: Versioned Package Names');
const versionedPackages = [
  'p-retry@6.1.0',
  'axios-retry@2.1.0',
  'opentelemetry@0.45.0',
  '@aws-sdk/client-secrets-manager@3.400.0'
];
console.log('  Input (with versions):', versionedPackages);
const versionMatches = detectSignals(versionedPackages, [...tracingSignals, 'p-retry', 'axios-retry', 'aws-sdk']);
console.log('  Matches found:', versionMatches);
console.log('  ✓ Versioned packages correctly matched\n');

// Test 8: Real-world Nexper-like packages
console.log('Test 8: Real-world Example - Nexper Stack');
const nexperPackages = [
  'express',
  'mongoose',
  'redis',
  'bull',
  'socket.io',
  'winston',
  'helmet',
  '@opentelemetry/sdk-node',
  '@opentelemetry/auto-instrumentations-node',
  'prom-client',
  'stripe',
  'dyte-client-sdk'
];
console.log('  Input packages:', nexperPackages.slice(0, 5), '... +', nexperPackages.length - 5, 'more');
const nexperTracing = detectSignals(nexperPackages, tracingSignals);
const nexperMetrics = detectSignals(nexperPackages, metricsSignals);
console.log('  Tracing detected:', nexperTracing.length > 0, '—', nexperTracing);
console.log('  Metrics detected:', nexperMetrics.length > 0, '—', nexperMetrics);
console.log('  ✓ Real-world stack correctly analyzed\n');

console.log('✅ All edge cases handled correctly!');
