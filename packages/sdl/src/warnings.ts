import type { SDLDocument, ValidationWarning } from './types';
import { BUDGET_MONTHLY_CEILING } from './constants';

export function detectWarnings(sdl: SDLDocument): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  warnings.push(...checkComplexityVsTeam(sdl));
  warnings.push(...checkTimelineVsScope(sdl));
  warnings.push(...checkAuthForMultiPersona(sdl));
  warnings.push(...checkBudgetVsInfrastructure(sdl));
  return warnings;
}

// ─── Warning 1: Microservices with small team ───

function checkComplexityVsTeam(sdl: SDLDocument): ValidationWarning[] {
  if (sdl.architecture.style !== 'microservices') return [];

  const team = sdl.constraints?.team;
  if (!team) return [];

  const totalDevs = team.developers ?? (
    (team.backend ?? 0) + (team.frontend ?? 0) + (team.fullstack ?? 0)
  );
  const devops = team.devops ?? 0;
  const serviceCount = sdl.architecture.services?.length ?? 0;

  if (totalDevs < 3 || devops === 0) {
    return [{
      type: 'warning',
      code: 'COMPLEXITY_EXCEEDS_TEAM_CAPACITY',
      path: 'architecture.style',
      message: `Microservices with ${serviceCount} service(s) may be too complex for ${totalDevs} developer(s) and ${devops} DevOps engineer(s)`,
      recommendation: 'Consider "modular-monolith" for MVP — plan microservices migration when the team grows',
    }];
  }
  return [];
}

// ─── Warning 2: Aggressive timeline vs scope ───

function checkTimelineVsScope(sdl: SDLDocument): ValidationWarning[] {
  const timeline = sdl.constraints?.timeline;
  if (!timeline) return [];

  const weeks = parseWeeks(timeline);
  if (weeks === null || weeks === 0) return [];

  const team = sdl.constraints?.team;
  const totalDevs = team?.developers ?? (
    (team?.backend ?? 0) + (team?.frontend ?? 0) + (team?.fullstack ?? 0)
  );
  if (totalDevs === 0) return [];

  const frontendCount = sdl.architecture.projects.frontend?.length ?? 0;
  const backendCount = sdl.architecture.projects.backend?.length ?? 0;
  const mobileCount = sdl.architecture.projects.mobile?.length ?? 0;
  const projectCount = frontendCount + backendCount + mobileCount;
  const flowCount = sdl.product?.coreFlows?.length ?? 0;

  // Heuristic: each project+flow combination needs roughly 1.5 dev-weeks
  const estimatedWeeks = (projectCount * flowCount * 1.5) / totalDevs;

  if (estimatedWeeks > weeks) {
    return [{
      type: 'warning',
      code: 'TIMELINE_TOO_AGGRESSIVE',
      path: 'constraints.timeline',
      message: `${projectCount} project(s) with ${flowCount} core flow(s) and ${totalDevs} developer(s) may not fit in ${weeks} weeks`,
      recommendation: `Estimated ${Math.ceil(estimatedWeeks)} dev-weeks needed — consider reducing scope, extending timeline, or adding developers`,
    }];
  }
  return [];
}

// ─── Warning 3: Multi-persona without auth ───

function checkAuthForMultiPersona(sdl: SDLDocument): ValidationWarning[] {
  if (sdl.auth) return [];

  const personas = sdl.product?.personas ?? [];
  if (personas.length <= 1) return [];

  const hasAdmin = personas.some(p =>
    p.accessLevel === 'admin' ||
    p.name.toLowerCase().includes('admin') ||
    p.name.toLowerCase().includes('manager')
  );

  if (hasAdmin || personas.length > 2) {
    return [{
      type: 'warning',
      code: 'MISSING_RECOMMENDED_FIELD',
      path: 'auth',
      message: `${personas.length} personas defined (including ${personas.map(p => p.name).join(', ')}) but no auth configuration`,
      recommendation: 'Add an auth section with strategy and roles to control access per persona',
    }];
  }
  return [];
}

// ─── Warning 4: Budget vs infrastructure mismatch ───

function checkBudgetVsInfrastructure(sdl: SDLDocument): ValidationWarning[] {
  const budget = sdl.constraints?.budget;
  if (!budget || budget === 'custom') return [];

  const ceiling = BUDGET_MONTHLY_CEILING[budget];
  if (!ceiling) return [];

  let estimatedCost = 0;

  // Cloud platform base cost
  const cloud = sdl.deployment?.cloud;
  if (cloud !== undefined && ['aws', 'gcp', 'azure'].includes(cloud)) {
    estimatedCost += 100;
  }

  // Database hosting
  const db = sdl.data.primaryDatabase;
  if (db.hosting === 'self-hosted') {
    estimatedCost += 200;
  } else if (db.hosting === 'managed') {
    estimatedCost += 50;
  }

  // Secondary databases
  if (sdl.data.secondaryDatabases) {
    estimatedCost += sdl.data.secondaryDatabases.length * 80;
  }

  // Cache
  if (sdl.data.cache?.type === 'redis') {
    estimatedCost += 30;
  }

  // Search
  if (sdl.data.search?.provider) {
    estimatedCost += 100;
  }

  // Kubernetes-based runtimes
  const runtime = sdl.deployment?.runtime;
  if (runtime?.backend === 'kubernetes' || runtime?.frontend === 'kubernetes') {
    estimatedCost += 300;
  }

  // CDN
  if (sdl.integrations?.cdn?.provider) {
    estimatedCost += 20;
  }

  // Monitoring
  if (sdl.integrations?.monitoring?.provider) {
    estimatedCost += 50;
  }

  // Scale multiplier based on expected users
  const users = sdl.nonFunctional?.scaling.expectedUsersYear1 ?? 0;
  if (users > 10000) {
    estimatedCost *= 2;
  } else if (users > 5000) {
    estimatedCost *= 1.5;
  }

  if (estimatedCost > ceiling) {
    return [{
      type: 'warning',
      code: 'BUDGET_INFRASTRUCTURE_MISMATCH',
      path: 'constraints.budget',
      message: `Estimated infrastructure cost (~$${Math.round(estimatedCost)}/mo) may exceed ${budget} budget ceiling ($${ceiling}/mo)`,
      recommendation: `Consider managed/serverless options to reduce costs, or upgrade budget tier to "${budget === 'startup' ? 'scaleup' : 'enterprise'}"`,
    }];
  }
  return [];
}

// ─── Helpers ───

function parseWeeks(timeline: string): number | null {
  const match = timeline.match(/(\d+)\s*-?\s*weeks?/i);
  if (match) return parseInt(match[1], 10);

  const monthMatch = timeline.match(/(\d+)\s*-?\s*months?/i);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 4;

  return null;
}
