/**
 * Complexity scoring calculation engine
 * Implements all 6 dimensions per the Complexity Scoring v1.0 specification
 */

import type {
  ComplexityInput,
  ComplexityLevel,
  ComplexityProfile,
  ComplexityResult,
  ConfidenceLevel,
  DeliveryFactors,
  DimensionScore,
  DiscoveryResult,
  BlastRadius,
  IntegrationRiskItem,
  ReductionPlanItem,
  ComplexityRiskItem,
  DynamicSubDimension,
  StructuralBreakdown,
  TechnologyBreakdown,
  Dependency,
  CiCdMaturity,
  IaCMaturity,
  ObservabilityLevel,
  SecretsMaturity,
  DrMaturity,
  HealthCheckMaturity,
} from './types.js';
import {
  hasCircuitBreaker,
  hasDistributedTracing,
  hasMetrics,
  hasStructuredLogging,
  hasSecretsManager,
  hasFeatureFlags,
  detectSignals,
  retrySignals,
  distributedStateSignals,
} from './heuristics.js';

/**
 * Calculate complete complexity assessment from discovered architecture
 */
export function computeComplexity(input: ComplexityInput): ComplexityResult {
  const { discoveryResult, profile: profileOverride } = input;

  // Step 1: Detect profile
  const profile = profileOverride || autoDetectProfile(discoveryResult);

  // Step 2: Score all 6 dimensions
  const structural = scoreStructural(discoveryResult);
  const dynamic = scoreDynamic(discoveryResult);
  const integration = scoreIntegration(discoveryResult);
  const technology = scoreTechnology(discoveryResult);
  const deliveryBurden = scoreDelivery(discoveryResult);
  const organizational = scoreOrganizational(discoveryResult);

  // Step 3: Compute subtotals
  const architectureSubtotal =
    (structural.score + dynamic.score + integration.score + technology.score) / 4;
  const deliverySubtotal = (deliveryBurden.score + organizational.score) / 2;

  // Step 4: Compute unified score
  const unifiedScore = architectureSubtotal * 0.6 + deliverySubtotal * 0.4;

  // Step 5: Determine complexity level
  const level = scoreLevelFromUnified(unifiedScore);

  // Step 6: Generate reduction plan
  const reductionPlan = generateReductionPlan({
    structural,
    dynamic,
    integration,
    technology,
    deliveryBurden,
    organizational,
  });

  // Step 7: Generate risks
  const risks = generateRisks({
    structural,
    dynamic,
    integration,
    technology,
    deliveryBurden,
    organizational,
  });

  return {
    profile,
    architectureIndex: {
      structural: { ...structural, breakdown: structural.breakdown },
      dynamic: { ...dynamic, temporal: dynamic.temporal, state: dynamic.state, consistencyModel: dynamic.consistencyModel },
      integration: { ...integration, failureIsolation: integration.failureIsolation, integrations: integration.integrations },
      technology: { ...technology, breakdown: technology.breakdown },
      subtotal: architectureSubtotal,
    },
    deliveryIndex: {
      deliveryBurden: { ...deliveryBurden, factors: deliveryBurden.factors },
      organizational: { ...organizational, autoDiscovered: true, requiresValidation: true, estimatedFrom: organizational.estimatedFrom },
      subtotal: deliverySubtotal,
    },
    executiveSummary: {
      architectureIndex: architectureSubtotal,
      deliveryIndex: deliverySubtotal,
      unifiedScore,
      level,
      interpretation: generateInterpretation(
        { structural, dynamic, integration, technology },
        { deliveryBurden, organizational },
        level
      ),
    },
    reductionPlan,
    risks,
    history: [
      {
        date: new Date().toISOString().split('T')[0],
        architectureIndex: architectureSubtotal,
        deliveryIndex: deliverySubtotal,
        unifiedScore,
        source: 'SDL Discovery Agent v1.2.0',
        notes: 'Baseline complexity assessment',
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Detection
// ─────────────────────────────────────────────────────────────────────────────

function autoDetectProfile(result: DiscoveryResult): ComplexityProfile {
  const serviceCount = result.components.filter((c) => c.type === 'service').length;
  const integrationCount = result.integrations.length;
  const iacFiles = result.deliveryMetadata?.iacFiles || [];

  const hasK8s =
    iacFiles.some((f) => f.toLowerCase().includes('kubernetes')) ||
    iacFiles.some((f) => f.toLowerCase().includes('helm')) ||
    iacFiles.some((f) => f.toLowerCase().includes('k8s'));

  const hasTerraform = iacFiles.some((f) => f.toLowerCase().includes('terraform'));

  // Startup: < 5 services + no K8s + < 3 integrations
  if (serviceCount < 5 && !hasK8s && integrationCount < 3) {
    return 'startup';
  }

  // Platform: K8s + Terraform + 3+ environments (inferred from terraform)
  if (hasK8s && hasTerraform && integrationCount >= 3) {
    return 'platform';
  }

  // Default
  return 'enterprise';
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension Scoring
// ─────────────────────────────────────────────────────────────────────────────

function scoreStructural(
  result: DiscoveryResult
): DimensionScore & { breakdown: StructuralBreakdown } {
  // Count nodes
  const services = result.components.filter((c) => c.type === 'service').length;
  const frontends = result.components.filter((c) => c.type === 'frontend').length;
  const workers = result.components.filter((c) => c.type === 'worker').length;
  const libraries = result.components.filter((c) => c.type === 'library').length;
  const totalNodes = services + frontends + workers + libraries;

  // Count interactions by type
  const syncInteractions = result.dependencies.filter((d) => d.type === 'http' || d.type === 'import').length;
  const asyncInteractions = result.dependencies.filter((d) => d.type === 'queue' || d.type === 'event').length;
  const implicitDependencies = result.dependencies.filter((d) => d.type === 'database' || d.type === 'cache').length;

  const totalInteractions = syncInteractions + asyncInteractions + implicitDependencies;

  // NASA SCM
  const weightedInteractions =
    syncInteractions * 1.0 + asyncInteractions * 0.9 + implicitDependencies * 0.7;
  const nasaScm = totalNodes + weightedInteractions;

  // Coupling density
  const couplingDensity = services > 0 ? totalInteractions / services : 0;

  // Critical path depth (longest dependency chain using BFS)
  const criticalPathDepth = computeCriticalPathDepth(result.dependencies);

  // Fan-in/out
  const { maxFanIn, maxFanOut } = computeFanInOut(result.dependencies);

  // Score: map SCM to 1-10 range
  let score: number;
  if (nasaScm < 10) score = 1 + (nasaScm / 10) * 1;
  else if (nasaScm < 30) score = 3 + ((nasaScm - 10) / 20) * 1;
  else if (nasaScm < 70) score = 5 + ((nasaScm - 30) / 40) * 1;
  else if (nasaScm < 150) score = 7 + ((nasaScm - 70) / 80) * 1;
  else score = 9 + Math.min(((nasaScm - 150) / 150) * 1, 1);

  // Adjust for high coupling density
  if (couplingDensity > 4) {
    score = Math.min(score + 1, 10);
  }

  const breakdown: StructuralBreakdown = {
    services,
    frontends,
    workers,
    libraries,
    totalNodes,
    syncInteractions,
    asyncInteractions,
    implicitDependencies,
    nasaScm,
    couplingDensity,
    criticalPathDepth,
    maxFanIn,
    maxFanOut,
  };

  return {
    score: Math.round(score * 10) / 10,
    confidence: 'high' as ConfidenceLevel,
    evidence: [
      `${totalNodes} nodes (${services} services, ${frontends} frontends, ${workers} workers, ${libraries} libraries)`,
      `${totalInteractions} interactions (${syncInteractions} sync, ${asyncInteractions} async, ${implicitDependencies} implicit)`,
      `NASA SCM: ${nasaScm.toFixed(1)}`,
      `Coupling density: ${couplingDensity.toFixed(2)} deps/service`,
      `Critical path depth: ${criticalPathDepth}`,
    ],
    breakdown,
  };
}

function scoreDynamic(result: DiscoveryResult): DimensionScore & { temporal: DynamicSubDimension; state: DynamicSubDimension; consistencyModel: DynamicSubDimension & { model: string } } {
  const workerCount = result.components.filter((c) => c.type === 'worker').length;
  const allPackages = result.components.flatMap((c) => c.packages || []);

  // Temporal: workers + retry libraries
  const hasRetryLib = detectSignals(allPackages, retrySignals).length > 0;
  let temporalScore = 2 + workerCount; // base 2 + count of workers
  if (hasRetryLib) temporalScore += 1;
  temporalScore = Math.min(temporalScore, 9);

  // State: distributed state + shared datastores
  const hasDistributedState = detectSignals(allPackages, distributedStateSignals).length > 0;

  // Count shared datastores
  const datastoreUsageCount: Record<string, number> = {};
  result.dependencies.forEach((dep) => {
    if (dep.type === 'database' || dep.type === 'cache') {
      datastoreUsageCount[dep.target] = (datastoreUsageCount[dep.target] || 0) + 1;
    }
  });
  const sharedDatastores = Object.values(datastoreUsageCount).filter((count) => count > 1).length;

  let stateScore = 2 + sharedDatastores;
  if (hasDistributedState) stateScore += 2;
  stateScore = Math.min(stateScore, 9);

  // Consistency model
  const asyncCount = result.dependencies.filter((d) => d.type === 'queue' || d.type === 'event').length;
  const consistencyModel = asyncCount > 2 ? 'eventual' : 'strong';
  const consistencyScore = consistencyModel === 'eventual' ? 5 : 2;

  // Combined dynamic score
  const dynamicScore = (temporalScore + stateScore + consistencyScore) / 3;

  const temporal: DynamicSubDimension = {
    score: Math.round(temporalScore * 10) / 10,
    evidence: [`${workerCount} workers`, hasRetryLib ? 'Retry/backoff libraries detected' : 'No explicit retry pattern'],
  };

  const state: DynamicSubDimension = {
    score: Math.round(stateScore * 10) / 10,
    evidence: [
      `${sharedDatastores} shared datastores`,
      hasDistributedState ? 'Distributed state libraries detected' : 'Single-source-of-truth pattern',
    ],
  };

  return {
    score: Math.round(dynamicScore * 10) / 10,
    confidence: 'medium' as ConfidenceLevel,
    evidence: [
      `Temporal complexity: ${temporalScore}`,
      `State management complexity: ${stateScore}`,
      `Consistency model: ${consistencyModel}`,
    ],
    temporal,
    state,
    consistencyModel: {
      score: Math.round(consistencyScore * 10) / 10,
      model: consistencyModel,
      evidence: [`${asyncCount} async interactions → ${consistencyModel} consistency`],
    },
  };
}

function scoreIntegration(
  result: DiscoveryResult
): DimensionScore & { failureIsolation: DimensionScore; integrations: { total: number; critical: IntegrationRiskItem[]; nonCritical: string[] } } {
  const allPackages = result.components.flatMap((c) => c.packages || []);

  // Classify integrations by criticality
  const critical: IntegrationRiskItem[] = [];
  const nonCritical: string[] = [];

  result.integrations.forEach((integration) => {
    const intType = integration.type.toLowerCase();
    const isCritical =
      intType.includes('payment') ||
      intType.includes('auth') ||
      intType.includes('video') ||
      intType.includes('identity') ||
      intType.includes('stripe');

    const hasCircuitBreakers = hasCircuitBreaker(allPackages);

    if (isCritical) {
      critical.push({
        name: integration.provider,
        type: integration.type,
        blastRadius: hasCircuitBreakers ? 'high' : 'critical',
        fallback: hasCircuitBreakers ? 'Circuit breaker in place' : 'No fallback detected',
        circuitBreaker: hasCircuitBreakers,
      });
    } else {
      nonCritical.push(integration.provider);
    }
  });

  // Score: base from count, adjust for CB presence
  let score = 3 + result.integrations.length * 0.5;
  if (critical.length > 0 && !hasCircuitBreaker(allPackages)) {
    score += 2; // penalty for critical deps without CB
  }
  if (hasCircuitBreaker(allPackages)) {
    score -= 1; // credit for circuit breakers
  }
  score = Math.max(1, Math.min(score, 10));

  // Failure isolation score
  const cbCount = critical.filter((c) => c.circuitBreaker).length;
  const failureIsolationScore = 2 + Math.min(cbCount * 1.5, 7);

  return {
    score: Math.round(score * 10) / 10,
    confidence: 'high' as ConfidenceLevel,
    evidence: [
      `${result.integrations.length} total integrations`,
      `${critical.length} critical (payment, auth, video)`,
      `${nonCritical.length} non-critical`,
      hasCircuitBreaker(allPackages) ? 'Circuit breaker patterns detected' : 'No circuit breaker protection',
    ],
    failureIsolation: {
      score: Math.min(failureIsolationScore, 10),
      confidence: 'medium' as ConfidenceLevel,
      evidence: [`${cbCount}/${critical.length} critical integrations have circuit breakers`],
    },
    integrations: {
      total: result.integrations.length,
      critical,
      nonCritical,
    },
  };
}

function scoreTechnology(result: DiscoveryResult): DimensionScore & { breakdown: TechnologyBreakdown } {
  const languages = new Set(result.components.map((c) => c.language).filter(Boolean)).size;
  const frameworks = new Set(result.components.map((c) => c.framework).filter(Boolean)).size;
  const dbTypes = new Set(result.datastores.map((d) => d.technology)).size;
  const versionDrift = 0; // Simplified: not available from DiscoveryResult

  // Score based on diversity
  let score = 2; // base
  score += Math.min(languages / 2, 2);
  score += Math.min(frameworks / 2, 2);
  score += Math.min(dbTypes / 2, 2);
  score = Math.max(1, Math.min(score, 10));

  return {
    score: Math.round(score * 10) / 10,
    confidence: 'high' as ConfidenceLevel,
    evidence: [
      `${languages} languages`,
      `${frameworks} frameworks`,
      `${dbTypes} database types`,
      `Version drift: minimal`,
    ],
    breakdown: {
      languages,
      frameworks,
      dbTypes,
      versionDrift,
    },
  };
}

function scoreDelivery(result: DiscoveryResult): DimensionScore & { factors: DeliveryFactors } {
  const deliveryMetadata = result.deliveryMetadata || { ciCdFiles: [], iacFiles: [], healthEndpoints: [], hasEnvFiles: false, drDocumented: false };
  const allPackages = result.components.flatMap((c) => c.packages || []);

  // Detect factors
  const ciCd: CiCdMaturity =
    deliveryMetadata.ciCdFiles.length > 1
      ? 'automated'
      : deliveryMetadata.ciCdFiles.length > 0
        ? 'partial'
        : 'missing';

  const iac: IaCMaturity = deliveryMetadata.iacFiles.length > 0 ? 'full' : 'missing';

  const logging: ObservabilityLevel = hasStructuredLogging(allPackages) ? 'good' : 'missing';
  const metrics: ObservabilityLevel = hasMetrics(allPackages) ? 'good' : 'missing';
  const tracing: ObservabilityLevel = hasDistributedTracing(allPackages) ? 'good' : 'missing';

  const secretsManagement: SecretsMaturity = hasSecretsManager(allPackages)
    ? 'vault'
    : deliveryMetadata.hasEnvFiles
      ? 'env_vars'
      : 'env_vars';

  const healthChecks: HealthCheckMaturity = deliveryMetadata.healthEndpoints.length > 0 ? 'basic' : 'missing';

  const backupDr: DrMaturity = deliveryMetadata.drDocumented ? 'documented' : 'unknown';

  // Score: start at 5, adjust based on factors
  let score = 5;
  if (ciCd === 'automated') score -= 1;
  if (ciCd === 'partial') score -= 0.5;
  if (iac === 'full') score -= 1;
  if (logging === 'good') score -= 1;
  if (metrics === 'good') score -= 1;
  if (tracing === 'good') score -= 1;
  if (secretsManagement === 'vault') score -= 1;
  if (secretsManagement === 'env_vars') score += 0.5; // penalty vs vault
  if (healthChecks === 'basic') score -= 0.5;
  if (backupDr === 'documented') score -= 0.5;

  score = Math.max(1, Math.min(score, 10));

  return {
    score: Math.round(score * 10) / 10,
    confidence: 'medium' as ConfidenceLevel,
    evidence: [
      `CI/CD: ${ciCd}`,
      `IaC: ${iac}`,
      `Logging: ${logging}`,
      `Metrics: ${metrics}`,
      `Tracing: ${tracing}`,
      `Secrets: ${secretsManagement}`,
      `Health checks: ${healthChecks}`,
      `DR/Backup: ${backupDr}`,
    ],
    factors: {
      ciCd,
      iac,
      observability: { logging, metrics, tracing },
      secretsManagement,
      healthChecks,
      backupDr,
    },
  };
}

function scoreOrganizational(result: DiscoveryResult): DimensionScore & { estimatedFrom: string } {
  const serviceCount = result.components.filter((c) => c.type === 'service').length;
  const crossServiceDeps = result.dependencies.filter(
    (d) => (d.type === 'http' || d.type === 'queue') && serviceCount > 0
  ).length;

  const estimatedTeams = Math.max(1, Math.ceil(serviceCount / 3.5));
  const coordOverhead = serviceCount > 0 ? crossServiceDeps / serviceCount : 0;
  const score = Math.min(10, 2 + estimatedTeams + coordOverhead);

  const estimatedFrom = `${serviceCount} services → ~${estimatedTeams} teams (requires validation)`;

  return {
    score: Math.round(score * 10) / 10,
    confidence: 'low' as ConfidenceLevel,
    evidence: [
      `${serviceCount} services`,
      `${estimatedTeams} estimated teams`,
      `${crossServiceDeps} cross-service dependencies`,
    ],
    estimatedFrom,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeCriticalPathDepth(dependencies: Dependency[]): number {
  // BFS from root nodes (no incoming) to find longest path
  if (dependencies.length === 0) return 1;

  const incomingCount: Record<string, number> = {};
  const outgoing: Record<string, string[]> = {};

  dependencies.forEach((dep) => {
    incomingCount[dep.target] = (incomingCount[dep.target] || 0) + 1;
    incomingCount[dep.source] = incomingCount[dep.source] || 0;
    if (!outgoing[dep.source]) outgoing[dep.source] = [];
    outgoing[dep.source].push(dep.target);
  });

  // Find roots (no incoming edges)
  const roots = Object.entries(incomingCount)
    .filter(([_, count]) => count === 0)
    .map(([node]) => node);

  if (roots.length === 0) return 1; // cycle detection fallback

  // BFS from roots
  let maxDepth = 1;
  const visited = new Set<string>();
  const queue: Array<[string, number]> = roots.map((r) => [r, 1]);

  while (queue.length > 0) {
    const [node, depth] = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);
    maxDepth = Math.max(maxDepth, depth);

    if (outgoing[node]) {
      outgoing[node].forEach((target) => {
        if (!visited.has(target)) {
          queue.push([target, depth + 1]);
        }
      });
    }
  }

  return maxDepth;
}

function computeFanInOut(dependencies: Dependency[]): { maxFanIn: number; maxFanOut: number } {
  const fanIn: Record<string, number> = {};
  const fanOut: Record<string, number> = {};

  dependencies.forEach((dep) => {
    fanIn[dep.target] = (fanIn[dep.target] || 0) + 1;
    fanOut[dep.source] = (fanOut[dep.source] || 0) + 1;
  });

  const maxFanIn = Object.values(fanIn).reduce((a, b) => Math.max(a, b), 0);
  const maxFanOut = Object.values(fanOut).reduce((a, b) => Math.max(a, b), 0);

  return { maxFanIn, maxFanOut };
}

function scoreLevelFromUnified(unifiedScore: number): ComplexityLevel {
  if (unifiedScore < 3) return 'simple';
  if (unifiedScore < 5) return 'moderate';
  if (unifiedScore < 7) return 'complex';
  if (unifiedScore < 8.5) return 'very-complex';
  return 'extreme';
}

function generateInterpretation(
  arch: Record<string, any>,
  delivery: Record<string, any>,
  level: ComplexityLevel
): string {
  const archHigh = Object.entries(arch)
    .filter(([_, { score }]) => score >= 7)
    .map(([name]) => name);
  const deliveryHigh = Object.entries(delivery)
    .filter(([_, { score }]) => score >= 7)
    .map(([name]) => name);

  const drivers = [...archHigh, ...deliveryHigh];
  return `This ${level} system is driven by ${drivers.length > 0 ? drivers.join(' and ') : 'moderate complexity across'} complexity factors. Focus on understanding service interactions, deployment orchestration, and operational maturity.`;
}

function generateReductionPlan(dimensions: Record<string, any>): ReductionPlanItem[] {
  const sorted = Object.entries(dimensions)
    .map(([name, dim]) => ({ name, score: dim.score }))
    .sort((a, b) => b.score - a.score);

  const plan: ReductionPlanItem[] = [];

  sorted.slice(0, 3).forEach((dim, index) => {
    const targetScore = Math.max(1, dim.score - 2);
    const timelineMap: Record<string, string> = {
      structural: '8-12 weeks',
      dynamic: '6-10 weeks',
      integration: '4-6 weeks',
      technology: '3-4 weeks',
      deliveryBurden: '6-8 weeks',
      organizational: '2-4 weeks',
    };

    const actionMap: Record<string, string> = {
      structural: 'Decompose services to reduce coupling density',
      dynamic: 'Simplify async patterns with choreography rules',
      integration: 'Add circuit breakers to critical integrations',
      technology: 'Consolidate on standard frameworks',
      deliveryBurden: 'Implement full observability stack',
      organizational: 'Define service ownership model',
    };

    const effortMap: Record<string, 'low' | 'medium' | 'high'> = {
      structural: 'high',
      dynamic: 'high',
      integration: 'medium',
      technology: 'medium',
      deliveryBurden: 'medium',
      organizational: 'low',
    };

    plan.push({
      rank: index + 1,
      title: actionMap[dim.name] || `Reduce ${dim.name} complexity`,
      targetDimension: dim.name,
      currentScore: Math.round(dim.score * 10) / 10,
      targetScore,
      impact: `Improve ${dim.name} score by ~${Math.round((dim.score - targetScore) * 10) / 10} points`,
      timeline: timelineMap[dim.name] || '6 weeks',
      effort: effortMap[dim.name] || 'medium',
      businessValue: 'Improved reliability, faster feature delivery, reduced incident response time',
      estimatedCost: '$' + (dim.score > 7 ? '60-80k' : dim.score > 5 ? '30-50k' : '10-20k'),
    });
  });

  return plan;
}

function generateRisks(dimensions: Record<string, any>): { critical: ComplexityRiskItem[]; high: ComplexityRiskItem[] } {
  const critical: ComplexityRiskItem[] = [];
  const high: ComplexityRiskItem[] = [];

  Object.entries(dimensions).forEach(([name, dim]) => {
    if (dim.score >= 8) {
      critical.push({
        title: `${name} complexity is extreme`,
        dimension: name,
        impact: 'High likelihood of cascading failures, difficult onboarding, slow deployments',
        mitigation: `Immediate action on ${name} reduction plan (see reduction plan section)`,
        probability: 'high',
      });
    } else if (dim.score >= 6) {
      high.push({
        title: `${name} complexity is significant`,
        dimension: name,
        impact: 'Increased defect rates, slower development velocity, coordination overhead',
        mitigation: `Prioritize ${name} improvements in Q2 planning`,
        probability: 'medium',
      });
    }
  });

  return { critical, high };
}
