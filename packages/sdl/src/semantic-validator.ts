/**
 * Semantic validation layer for SDL documents.
 *
 * Runs after AJV schema validation passes, implementing 14 cross-section
 * relational rules that AJV cannot check (reference integrity, uniqueness,
 * cycle detection, etc.).
 *
 * These rules are defined in spec/SDL-v1.1.md under "Conditional Rules (Errors)".
 */

import type { SDLDocument, ValidationError } from './types';

/**
 * Validates SDL semantic constraints.
 * Returns an empty array if valid; returns errors with code, path, message, and optional fix.
 * Does NOT modify the input document.
 */
export function validateSemantics(sdl: SDLDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  // Run all rule groups
  errors.push(...checkReferenceIntegrity(sdl));
  errors.push(...checkUniqueness(sdl));
  errors.push(...checkConfigCompleteness(sdl));
  errors.push(...checkResiliencePerformance(sdl));
  errors.push(...checkDeploymentIntegrity(sdl));

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get all project names across all project types and services
 */
function getAllProjectNames(sdl: SDLDocument): Set<string> {
  const names = new Set<string>();

  // Frontend projects
  for (const p of sdl.architecture.projects.frontend ?? []) {
    names.add(p.name);
  }

  // Backend projects
  for (const p of sdl.architecture.projects.backend ?? []) {
    names.add(p.name);
  }

  // Mobile projects
  for (const p of sdl.architecture.projects.mobile ?? []) {
    names.add(p.name);
  }

  // Services
  for (const s of sdl.architecture.services ?? []) {
    names.add(s.name);
  }

  return names;
}

/**
 * Get all service names
 */
function getServiceNames(sdl: SDLDocument): Set<string> {
  const names = new Set<string>();
  for (const s of sdl.architecture.services ?? []) {
    names.add(s.name);
  }
  return names;
}

/**
 * Get all domain entity names
 */
function getEntityNames(sdl: SDLDocument): Set<string> {
  const names = new Set<string>();
  for (const e of sdl.domain?.entities ?? []) {
    names.add(e.name);
  }
  return names;
}

/**
 * Parse availability percentage string like "99.9%" to a number
 * Returns the percentage as a decimal (e.g., "99.9%" → 99.9)
 * Returns null if format is invalid
 */
function parseAvailabilityPercent(s: string | undefined): number | null {
  if (!s) return null;
  const match = s.trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Detect cycles in a directed graph using DFS
 * Returns service name if a cycle exists, null otherwise
 */
function detectCycle(servicesByName: Map<string, string[]>): string | null {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(node: string): boolean {
    if (visited.has(node)) return false;
    if (visiting.has(node)) return true; // Cycle detected

    visiting.add(node);
    const deps = servicesByName.get(node) ?? [];
    for (const dep of deps) {
      if (dfs(dep)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  // Check each unvisited service
  for (const serviceName of servicesByName.keys()) {
    if (!visited.has(serviceName)) {
      if (dfs(serviceName)) return serviceName;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Rule Groups
// ─────────────────────────────────────────────────────────────────────────

/**
 * SEM-001: Domain relationships must reference existing entity names
 * SEM-002: Service dependencies must reference known service names
 * SEM-003: Service cannot depend on itself
 * SEM-004: Service dependencies must not form cycles
 * SEM-005: SLO service names must reference known project/service names
 */
function checkReferenceIntegrity(sdl: SDLDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  const serviceNames = getServiceNames(sdl);
  const projectNames = getAllProjectNames(sdl);
  const entityNames = getEntityNames(sdl);

  // SEM-001: Domain relationship targets must exist
  for (const rel of sdl.domain?.relationships ?? []) {
    if (!entityNames.has(rel.from)) {
      errors.push({
        type: 'error',
        code: 'DOMAIN_RELATIONSHIP_ENTITY_UNKNOWN',
        path: `domain.relationships[${rel.from}].from`,
        message: `Domain relationship source entity '${rel.from}' does not exist in domain.entities`,
        fix: `Add entity '${rel.from}' to domain.entities, or change the relationship source`,
      });
    }

    if (!entityNames.has(rel.to)) {
      errors.push({
        type: 'error',
        code: 'DOMAIN_RELATIONSHIP_ENTITY_UNKNOWN',
        path: `domain.relationships[${rel.to}].to`,
        message: `Domain relationship target entity '${rel.to}' does not exist in domain.entities`,
        fix: `Add entity '${rel.to}' to domain.entities, or change the relationship target`,
      });
    }
  }

  // SEM-002, SEM-003, SEM-004: Service dependencies
  const servicesByName = new Map<string, string[]>();
  for (const svc of sdl.architecture.services ?? []) {
    const deps = svc.dependencies ?? [];
    servicesByName.set(svc.name, deps);

    // SEM-003: Self-dependency check
    if (deps.includes(svc.name)) {
      errors.push({
        type: 'error',
        code: 'SERVICE_SELF_DEPENDENCY',
        path: `architecture.services[${svc.name}].dependencies`,
        message: `Service '${svc.name}' cannot depend on itself`,
        fix: `Remove '${svc.name}' from its own dependencies array`,
      });
    }

    // SEM-002: Dependency existence check
    for (const dep of deps) {
      if (dep !== svc.name && !serviceNames.has(dep)) {
        errors.push({
          type: 'error',
          code: 'SERVICE_DEPENDENCY_UNKNOWN',
          path: `architecture.services[${svc.name}].dependencies`,
          message: `Service '${svc.name}' depends on unknown service '${dep}'`,
          fix: `Add service '${dep}' to architecture.services, or remove it from the dependency list`,
        });
      }
    }
  }

  // SEM-004: Cycle detection
  const cycleService = detectCycle(servicesByName);
  if (cycleService) {
    errors.push({
      type: 'error',
      code: 'SERVICE_DEPENDENCY_CYCLE',
      path: `architecture.services[${cycleService}].dependencies`,
      message: `Service dependency graph contains a cycle (detected starting from '${cycleService}')`,
      fix: `Remove circular dependencies from architecture.services[*].dependencies`,
    });
  }

  // SEM-005: SLO service name references
  for (const slo of sdl.slos?.services ?? []) {
    if (!projectNames.has(slo.name) && !serviceNames.has(slo.name)) {
      errors.push({
        type: 'error',
        code: 'SLO_SERVICE_UNKNOWN',
        path: `slos.services[${slo.name}].name`,
        message: `SLO references unknown service or project '${slo.name}'`,
        fix: `Change slos.services[].name to match an existing project or service name`,
      });
    }
  }

  return errors;
}

/**
 * SEM-007: Project names must be globally unique
 * SEM-008: Domain entity names must be unique
 */
function checkUniqueness(sdl: SDLDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  // SEM-007: Project name uniqueness
  const projectNames = new Map<string, string[]>(); // name → [type1, type2, ...]
  const addProjectName = (name: string, type: string) => {
    if (!projectNames.has(name)) {
      projectNames.set(name, []);
    }
    projectNames.get(name)!.push(type);
  };

  for (const p of sdl.architecture.projects.frontend ?? []) addProjectName(p.name, 'frontend');
  for (const p of sdl.architecture.projects.backend ?? []) addProjectName(p.name, 'backend');
  for (const p of sdl.architecture.projects.mobile ?? []) addProjectName(p.name, 'mobile');
  for (const s of sdl.architecture.services ?? []) addProjectName(s.name, 'service');

  for (const [name, types] of projectNames) {
    if (types.length > 1) {
      errors.push({
        type: 'error',
        code: 'PROJECT_NAME_DUPLICATE',
        path: 'architecture.projects',
        message: `Project name '${name}' is used in multiple project types: ${types.join(', ')}`,
        fix: `Rename one of the projects to make names unique across all project types`,
      });
    }
  }

  // SEM-008: Domain entity name uniqueness
  const entityNames = new Map<string, number>();
  for (const e of sdl.domain?.entities ?? []) {
    if (entityNames.has(e.name)) {
      entityNames.set(e.name, (entityNames.get(e.name) ?? 0) + 1);
    } else {
      entityNames.set(e.name, 1);
    }
  }

  for (const [name, count] of entityNames) {
    if (count > 1) {
      errors.push({
        type: 'error',
        code: 'DOMAIN_ENTITY_NAME_DUPLICATE',
        path: 'domain.entities',
        message: `Entity name '${name}' appears ${count} times in domain.entities (must be unique)`,
        fix: `Rename duplicate entities to have unique names`,
      });
    }
  }

  return errors;
}

/**
 * SEM-009: Compliance framework names must be recognized
 * SEM-010: Auth strategy requiring provider should have one set
 */
function checkConfigCompleteness(sdl: SDLDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  const KNOWN_COMPLIANCE_FRAMEWORKS = new Set([
    'GDPR',
    'HIPAA',
    'SOC2',
    'SOC2-Type2',
    'PCI-DSS',
    'ISO27001',
    'ISO 27001',
    'SOX',
    'CCPA',
    'FERPA',
    'FISMA',
    // Lowercase variants
    'gdpr',
    'hipaa',
    'soc2',
    'pci-dss',
    'iso27001',
    'iso 27001',
    'sox',
    'ccpa',
    'ferpa',
    'fisma',
  ]);

  // SEM-009: Compliance framework names
  for (const fw of sdl.compliance?.frameworks ?? []) {
    if (!KNOWN_COMPLIANCE_FRAMEWORKS.has(fw.name)) {
      errors.push({
        type: 'error',
        code: 'COMPLIANCE_FRAMEWORK_UNKNOWN',
        path: `compliance.frameworks[${fw.name}].name`,
        message: `Compliance framework '${fw.name}' is not a recognized framework`,
        fix: `Use one of: GDPR, HIPAA, SOC2, SOC2-Type2, PCI-DSS, ISO27001, SOX, CCPA, FERPA, FISMA`,
      });
    }
  }

  // SEM-010: Auth provider for passwordless/magic-link
  if (sdl.auth) {
    const strategy = sdl.auth.strategy;
    const hasProvider = sdl.auth.provider !== undefined;

    if ((strategy === 'passwordless' || strategy === 'magic-link') && !hasProvider) {
      errors.push({
        type: 'error',
        code: 'AUTH_PROVIDER_MISSING',
        path: 'auth.provider',
        message: `Auth strategy '${strategy}' requires a provider to be specified`,
        fix: `Add auth.provider (e.g., 'auth0', 'cognito', 'clerk', 'supabase', 'firebase')`,
      });
    }
  }

  return errors;
}

/**
 * SEM-011: Resilience circuit breaker threshold must be 1-99
 * SEM-012: Resilience retry max attempts must be >= 1
 * SEM-013: SLO availability must be in range 90.0-99.999%
 */
function checkResiliencePerformance(sdl: SDLDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  // SEM-011: Circuit breaker threshold
  if (sdl.resilience?.circuitBreaker?.threshold !== undefined) {
    const threshold = sdl.resilience.circuitBreaker.threshold;
    if (typeof threshold === 'number' && (threshold < 1 || threshold > 99)) {
      errors.push({
        type: 'error',
        code: 'RESILIENCE_THRESHOLD_INVALID',
        path: 'resilience.circuitBreaker.threshold',
        message: `Circuit breaker threshold must be between 1 and 99 (got ${threshold})`,
        fix: `Set resilience.circuitBreaker.threshold to a value between 1 and 99`,
      });
    }
  }

  // SEM-012: Retry max attempts
  if (sdl.resilience?.retryPolicy?.maxAttempts !== undefined) {
    const maxAttempts = sdl.resilience.retryPolicy.maxAttempts;
    if (typeof maxAttempts === 'number' && maxAttempts < 1) {
      errors.push({
        type: 'error',
        code: 'RESILIENCE_RETRY_ATTEMPTS_INVALID',
        path: 'resilience.retryPolicy.maxAttempts',
        message: `Retry maxAttempts must be at least 1 (got ${maxAttempts})`,
        fix: `Set resilience.retryPolicy.maxAttempts to 1 or higher`,
      });
    }
  }

  // SEM-013: SLO availability range
  for (const slo of sdl.slos?.services ?? []) {
    if (slo.availability !== undefined) {
      const percent = parseAvailabilityPercent(slo.availability);
      if (percent !== null && (percent < 90.0 || percent > 99.999)) {
        errors.push({
          type: 'error',
          code: 'SLO_AVAILABILITY_OUT_OF_RANGE',
          path: `slos.services[${slo.name}].availability`,
          message: `SLO availability must be between 90.0% and 99.999% (got ${slo.availability})`,
          fix: `Set availability to a percentage between 90.0 and 99.999`,
        });
      }
      if (percent === null && slo.availability.trim() !== '') {
        errors.push({
          type: 'error',
          code: 'SLO_AVAILABILITY_OUT_OF_RANGE',
          path: `slos.services[${slo.name}].availability`,
          message: `SLO availability format invalid: '${slo.availability}' (expected format like '99.9%')`,
          fix: `Use format like '99.9%', '99.95%', or '99.999%'`,
        });
      }
    }
  }

  return errors;
}

/**
 * SEM-014: Deployment environment names must be unique
 */
function checkDeploymentIntegrity(sdl: SDLDocument): ValidationError[] {
  const errors: ValidationError[] = [];

  const envNames = new Map<string, number>();
  for (const env of sdl.deployment?.ciCd?.environments ?? []) {
    if (envNames.has(env.name)) {
      envNames.set(env.name, (envNames.get(env.name) ?? 0) + 1);
    } else {
      envNames.set(env.name, 1);
    }
  }

  for (const [name, count] of envNames) {
    if (count > 1) {
      errors.push({
        type: 'error',
        code: 'DEPLOYMENT_ENV_NAME_DUPLICATE',
        path: 'deployment.ciCd.environments',
        message: `Environment name '${name}' appears ${count} times (must be unique)`,
        fix: `Rename duplicate environments to have unique names`,
      });
    }
  }

  return errors;
}
