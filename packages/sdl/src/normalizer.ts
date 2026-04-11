import type { SDLDocument, BackendProject, Inference } from './types';
import {
  CLOUD_RUNTIME_MAP,
  FRAMEWORK_ORM_MAP,
  AVAILABILITY_BY_STAGE,
} from './constants';

export interface NormalizeResult {
  document: SDLDocument;
  inferences: Inference[];
}

// Helper to set optional properties on typed objects without Record<string, unknown> casts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setProperty(obj: any, key: string, value: unknown): void {
  obj[key] = value;
}

/**
 * Applies auto-inference defaults to a validated SDL document.
 * Returns a deep clone (never mutates input) plus a list of every field
 * that was inferred rather than explicitly authored.
 */
export function normalize(sdl: SDLDocument): NormalizeResult {
  const document = structuredClone(sdl);
  const inferences: Inference[] = [];

  applyLegacySectionDefaults(document, inferences);
  applyRegionDefaults(document, inferences);
  applyDatabaseNameDefault(document, inferences);
  applyFrontendTypeDefaults(document, inferences);
  applyBackendTypeDefaults(document, inferences);
  applyRuntimeDefaults(document, inferences);
  applyNetworkingDefaults(document, inferences);
  applyCiCdDefaults(document, inferences);
  applyAvailabilityDefaults(document, inferences);
  applySecurityDefaults(document, inferences);
  applyOrmDefaults(document, inferences);
  applyTestingDefaults(document, inferences);
  applyObservabilityDefaults(document, inferences);

  return { document, inferences };
}

function applyLegacySectionDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.product) {
    setProperty(sdl, 'product', { personas: [], coreFlows: [] });
    inf.push({ path: 'product', value: { personas: [], coreFlows: [] }, reason: 'product section absent — initialised with empty personas and coreFlows' });
  } else {
    if (!sdl.product.personas) {
      setProperty(sdl.product, 'personas', []);
      inf.push({ path: 'product.personas', value: [], reason: 'product.personas absent — defaulted to empty array' });
    }
    if (!sdl.product.coreFlows) {
      setProperty(sdl.product, 'coreFlows', []);
      inf.push({ path: 'product.coreFlows', value: [], reason: 'product.coreFlows absent — defaulted to empty array' });
    }
  }

  if (!sdl.deployment) {
    const cloud = inferDefaultCloud(sdl);
    setProperty(sdl, 'deployment', { cloud });
    inf.push({ path: 'deployment.cloud', value: cloud, reason: `deployment section absent — cloud inferred as '${cloud}' from project mix (${sdl.architecture.projects.backend?.length ?? 0} backend, ${sdl.architecture.projects.frontend?.length ?? 0} frontend)` });
  }

  if (!sdl.nonFunctional) {
    const target = AVAILABILITY_BY_STAGE[sdl.solution.stage] ?? '99.9%';
    const scaling = defaultScalingForStage(sdl.solution.stage);
    setProperty(sdl, 'nonFunctional', { availability: { target }, scaling });
    inf.push({ path: 'nonFunctional.availability.target', value: target, reason: `nonFunctional absent — availability target defaulted from stage '${sdl.solution.stage}'` });
    inf.push({ path: 'nonFunctional.scaling', value: scaling, reason: `nonFunctional absent — scaling defaults applied for stage '${sdl.solution.stage}'` });
  } else {
    if (!sdl.nonFunctional.availability) {
      const target = AVAILABILITY_BY_STAGE[sdl.solution.stage] ?? '99.9%';
      setProperty(sdl.nonFunctional, 'availability', { target });
      inf.push({ path: 'nonFunctional.availability.target', value: target, reason: `nonFunctional.availability absent — target defaulted from stage '${sdl.solution.stage}'` });
    }
    if (!sdl.nonFunctional.scaling) {
      const scaling = defaultScalingForStage(sdl.solution.stage);
      setProperty(sdl.nonFunctional, 'scaling', scaling);
      inf.push({ path: 'nonFunctional.scaling', value: scaling, reason: `nonFunctional.scaling absent — defaults applied for stage '${sdl.solution.stage}'` });
    }
  }

  if (!sdl.artifacts) {
    setProperty(sdl, 'artifacts', { generate: [] });
    inf.push({ path: 'artifacts.generate', value: [], reason: 'artifacts section absent — defaulted to empty generate list' });
  }
}

function inferDefaultCloud(sdl: SDLDocument): 'vercel' | 'railway' {
  const frontendCount = sdl.architecture.projects.frontend?.length ?? 0;
  const backendCount = sdl.architecture.projects.backend?.length ?? 0;
  const mobileCount = sdl.architecture.projects.mobile?.length ?? 0;
  return backendCount > 0 || mobileCount > 0 ? 'railway' : frontendCount > 0 ? 'vercel' : 'railway';
}

function defaultScalingForStage(stage: SDLDocument['solution']['stage']): { expectedUsersMonth1: number; expectedUsersYear1: number } {
  switch (stage) {
    case 'Growth':
      return { expectedUsersMonth1: 1000, expectedUsersYear1: 10000 };
    case 'Enterprise':
      return { expectedUsersMonth1: 10000, expectedUsersYear1: 100000 };
    case 'MVP':
    default:
      return { expectedUsersMonth1: 100, expectedUsersYear1: 1000 };
  }
}

// ─── Rule 1: solution.regions.primary → "us-east-1" ───

function applyRegionDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.solution.regions) {
    setProperty(sdl.solution, 'regions', { primary: 'us-east-1' });
    inf.push({ path: 'solution.regions.primary', value: 'us-east-1', reason: 'solution.regions absent — primary region defaulted to us-east-1' });
  } else if (!sdl.solution.regions.primary) {
    sdl.solution.regions.primary = 'us-east-1';
    inf.push({ path: 'solution.regions.primary', value: 'us-east-1', reason: 'solution.regions.primary absent — defaulted to us-east-1' });
  }
}

// ─── Rule 2: data.primaryDatabase.name → "{name}_db" ───

function applyDatabaseNameDefault(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.data.primaryDatabase.name) {
    const name = sdl.solution.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') + '_db';
    sdl.data.primaryDatabase.name = name;
    inf.push({ path: 'data.primaryDatabase.name', value: name, reason: `data.primaryDatabase.name absent — derived from solution.name '${sdl.solution.name}'` });
  }
}

// ─── Rule 3: frontend[].type → "web" ───

function applyFrontendTypeDefaults(sdl: SDLDocument, inf: Inference[]): void {
  const frontends = sdl.architecture.projects.frontend;
  if (!frontends) return;
  for (const fe of frontends) {
    if (!fe.type) {
      fe.type = 'web';
      inf.push({ path: `architecture.projects.frontend[${fe.name}].type`, value: 'web', reason: `frontend project '${fe.name}' type absent — defaulted to 'web'` });
    }
  }
}

// ─── Rule 4: backend[].type → "backend" ───

function applyBackendTypeDefaults(sdl: SDLDocument, inf: Inference[]): void {
  const backends = sdl.architecture.projects.backend;
  if (!backends) return;
  for (const be of backends) {
    if (!be.type) {
      be.type = 'backend';
      inf.push({ path: `architecture.projects.backend[${be.name}].type`, value: 'backend', reason: `backend project '${be.name}' type absent — defaulted to 'backend'` });
    }
  }
}

// ─── Rule 5-6: deployment.runtime → from cloud mapping ───

function applyRuntimeDefaults(sdl: SDLDocument, inf: Inference[]): void {
  const cloud = sdl.deployment.cloud;
  const mapping = CLOUD_RUNTIME_MAP[cloud];
  if (!mapping) return;
  if (!sdl.deployment) return;

  if (!sdl.deployment.runtime) {
    setProperty(sdl.deployment, 'runtime', {});
  }
  const runtime = sdl.deployment.runtime!;

  if (!runtime.frontend && mapping.frontend) {
    runtime.frontend = mapping.frontend;
    inf.push({ path: 'deployment.runtime.frontend', value: mapping.frontend, reason: `deployment.runtime.frontend absent — inferred from cloud '${cloud}'` });
  }
  if (!runtime.backend && mapping.backend) {
    runtime.backend = mapping.backend;
    inf.push({ path: 'deployment.runtime.backend', value: mapping.backend, reason: `deployment.runtime.backend absent — inferred from cloud '${cloud}'` });
  }
}

// ─── Rule 7: deployment.networking.publicApi → true ───

function applyNetworkingDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.deployment) return;
  if (!sdl.deployment.networking) {
    setProperty(sdl.deployment, 'networking', { publicApi: true });
    inf.push({ path: 'deployment.networking.publicApi', value: true, reason: 'deployment.networking absent — publicApi defaulted to true' });
  } else if (sdl.deployment.networking.publicApi === undefined) {
    sdl.deployment.networking.publicApi = true;
    inf.push({ path: 'deployment.networking.publicApi', value: true, reason: 'deployment.networking.publicApi absent — defaulted to true' });
  }
}

// ─── Rule 8: deployment.ciCd.provider → "github-actions" ───

function applyCiCdDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.deployment) return;
  if (!sdl.deployment.ciCd) {
    setProperty(sdl.deployment, 'ciCd', { provider: 'github-actions' });
    inf.push({ path: 'deployment.ciCd.provider', value: 'github-actions', reason: 'deployment.ciCd absent — provider defaulted to github-actions' });
  }
}

// ─── Rule 9: nonFunctional.availability.target → stage-based ───

function applyAvailabilityDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.nonFunctional?.availability) return;
  if (!sdl.nonFunctional.availability.target) {
    const target = AVAILABILITY_BY_STAGE[sdl.solution.stage] ?? '99.9%';
    sdl.nonFunctional.availability.target = target;
    inf.push({ path: 'nonFunctional.availability.target', value: target, reason: `nonFunctional.availability.target absent — defaulted from stage '${sdl.solution.stage}'` });
  }
}

// ─── Rules 10-12: security defaults ───

function applySecurityDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.nonFunctional?.security) return;
  const security = sdl.nonFunctional.security;

  if (security.pii && security.encryptionAtRest === undefined) {
    security.encryptionAtRest = true;
    inf.push({ path: 'nonFunctional.security.encryptionAtRest', value: true, reason: 'nonFunctional.security.pii is true — encryptionAtRest defaulted to true' });
  }

  if (security.encryptionInTransit === undefined) {
    security.encryptionInTransit = true;
    inf.push({ path: 'nonFunctional.security.encryptionInTransit', value: true, reason: 'nonFunctional.security.encryptionInTransit absent — defaulted to true' });
  }
}

// ─── Rule 13: backend ORM → from framework + DB mapping ───

function applyOrmDefaults(sdl: SDLDocument, inf: Inference[]): void {
  const backends = sdl.architecture.projects.backend;
  if (!backends) return;

  const dbType = sdl.data.primaryDatabase.type;

  for (const be of backends) {
    if (be.orm) continue;

    const frameworkMap = FRAMEWORK_ORM_MAP[be.framework];
    if (!frameworkMap) continue;

    const orm = frameworkMap[dbType];
    if (orm) {
      setProperty(be, 'orm', orm);
      inf.push({ path: `architecture.projects.backend[${be.name}].orm`, value: orm, reason: `orm absent — inferred from framework '${be.framework}' + database '${dbType}'` });
    }
  }
}

// ─── Rule 14: testing.unit.framework → from backend framework ───

const FRAMEWORK_TEST_MAP: Record<string, string> = {
  nodejs: 'vitest',
  'python-fastapi': 'pytest',
  'dotnet-8': 'xunit',
  go: 'go-test',
  'java-spring': 'junit',
  'ruby-rails': 'rspec',
  'php-laravel': 'phpunit',
};

function applyTestingDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.testing) return;

  const backends = sdl.architecture.projects.backend;
  if (!backends || backends.length === 0) return;

  if (sdl.testing.unit && !sdl.testing.unit.framework) {
    const primary = backends[0];
    const testFw = FRAMEWORK_TEST_MAP[primary.framework];
    if (testFw) {
      setProperty(sdl.testing.unit, 'framework', testFw);
      inf.push({ path: 'testing.unit.framework', value: testFw, reason: `testing.unit.framework absent — inferred from primary backend framework '${primary.framework}'` });
    }
  }
}

// ─── Rule 15: observability.logging defaults ───

const FRAMEWORK_LOGGING_MAP: Record<string, string> = {
  nodejs: 'pino',
  'python-fastapi': 'structured',
  'dotnet-8': 'serilog',
  go: 'zerolog',
  'java-spring': 'log4j',
};

function applyObservabilityDefaults(sdl: SDLDocument, inf: Inference[]): void {
  if (!sdl.observability) return;

  if (sdl.observability.logging) {
    if (sdl.observability.logging.structured === undefined) {
      sdl.observability.logging.structured = true;
      inf.push({ path: 'observability.logging.structured', value: true, reason: 'observability.logging.structured absent — defaulted to true' });
    }
    if (!sdl.observability.logging.provider) {
      const backends = sdl.architecture.projects.backend;
      if (backends && backends.length > 0) {
        const provider = FRAMEWORK_LOGGING_MAP[backends[0].framework];
        if (provider) {
          setProperty(sdl.observability.logging, 'provider', provider);
          inf.push({ path: 'observability.logging.provider', value: provider, reason: `observability.logging.provider absent — inferred from primary backend framework '${backends[0].framework}'` });
        }
      }
    }
  }

  if (sdl.observability.tracing) {
    if (sdl.observability.tracing.samplingRate === undefined) {
      sdl.observability.tracing.samplingRate = 0.1;
      inf.push({ path: 'observability.tracing.samplingRate', value: 0.1, reason: 'observability.tracing.samplingRate absent — defaulted to 0.1 (10%)' });
    }
  }
}
