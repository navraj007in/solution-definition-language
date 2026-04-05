import type { SDLDocument, BackendProject } from './types';
import {
  CLOUD_RUNTIME_MAP,
  FRAMEWORK_ORM_MAP,
  AVAILABILITY_BY_STAGE,
} from './constants';

// Helper to set optional properties on typed objects without Record<string, unknown> casts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setProperty(obj: any, key: string, value: unknown): void {
  obj[key] = value;
}

/**
 * Applies auto-inference defaults to a validated SDL document.
 * Returns a deep clone — never mutates the input.
 */
export function normalize(sdl: SDLDocument): SDLDocument {
  const result = structuredClone(sdl);

  applyRegionDefaults(result);
  applyDatabaseNameDefault(result);
  applyFrontendTypeDefaults(result);
  applyBackendTypeDefaults(result);
  applyRuntimeDefaults(result);
  applyNetworkingDefaults(result);
  applyCiCdDefaults(result);
  applyAvailabilityDefaults(result);
  applySecurityDefaults(result);
  applyOrmDefaults(result);
  applyTestingDefaults(result);
  applyObservabilityDefaults(result);

  return result;
}

// ─── Rule 1: solution.regions.primary → "us-east-1" ───

function applyRegionDefaults(sdl: SDLDocument): void {
  if (!sdl.solution.regions) {
    setProperty(sdl.solution, 'regions', { primary: 'us-east-1' });
  } else if (!sdl.solution.regions.primary) {
    sdl.solution.regions.primary = 'us-east-1';
  }
}

// ─── Rule 2: data.primaryDatabase.name → "{name}_db" ───

function applyDatabaseNameDefault(sdl: SDLDocument): void {
  if (!sdl.data.primaryDatabase.name) {
    sdl.data.primaryDatabase.name = sdl.solution.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') + '_db';
  }
}

// ─── Rule 3: frontend[].type → "web" ───

function applyFrontendTypeDefaults(sdl: SDLDocument): void {
  const frontends = sdl.architecture.projects.frontend;
  if (!frontends) return;
  for (const fe of frontends) {
    if (!fe.type) {
      fe.type = 'web';
    }
  }
}

// ─── Rule 4: backend[].type → "backend" ───

function applyBackendTypeDefaults(sdl: SDLDocument): void {
  const backends = sdl.architecture.projects.backend;
  if (!backends) return;
  for (const be of backends) {
    if (!be.type) {
      be.type = 'backend';
    }
  }
}

// ─── Rule 5-6: deployment.runtime → from cloud mapping ───

function applyRuntimeDefaults(sdl: SDLDocument): void {
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
  }
  if (!runtime.backend && mapping.backend) {
    runtime.backend = mapping.backend;
  }
}

// ─── Rule 7: deployment.networking.publicApi → true ───

function applyNetworkingDefaults(sdl: SDLDocument): void {
  if (!sdl.deployment) return;
  if (!sdl.deployment.networking) {
    setProperty(sdl.deployment, 'networking', { publicApi: true });
  } else if (sdl.deployment.networking.publicApi === undefined) {
    sdl.deployment.networking.publicApi = true;
  }
}

// ─── Rule 8: deployment.ciCd.provider → "github-actions" ───

function applyCiCdDefaults(sdl: SDLDocument): void {
  if (!sdl.deployment) return;
  if (!sdl.deployment.ciCd) {
    setProperty(sdl.deployment, 'ciCd', { provider: 'github-actions' });
  }
}

// ─── Rule 9: nonFunctional.availability.target → stage-based ───

function applyAvailabilityDefaults(sdl: SDLDocument): void {
  if (!sdl.nonFunctional?.availability) return;
  if (!sdl.nonFunctional.availability.target) {
    sdl.nonFunctional.availability.target =
      AVAILABILITY_BY_STAGE[sdl.solution.stage] ?? '99.9';
  }
}

// ─── Rules 10-12: security defaults ───

function applySecurityDefaults(sdl: SDLDocument): void {
  if (!sdl.nonFunctional?.security) return;

  const security = sdl.nonFunctional.security;

  // Rule 10: pii defaults to false (schema already requires it, but just in case)
  // This is handled by schema validation — pii is required when security exists

  // Rule 11: encryptionAtRest → true if pii is true
  if (security.pii && security.encryptionAtRest === undefined) {
    security.encryptionAtRest = true;
  }

  // Rule 12: encryptionInTransit → true
  if (security.encryptionInTransit === undefined) {
    security.encryptionInTransit = true;
  }
}

// ─── Rule 13: backend ORM → from framework + DB mapping ───

function applyOrmDefaults(sdl: SDLDocument): void {
  const backends = sdl.architecture.projects.backend;
  if (!backends) return;

  const dbType = sdl.data.primaryDatabase.type;

  for (const be of backends) {
    if (be.orm) continue; // Already set

    const frameworkMap = FRAMEWORK_ORM_MAP[be.framework];
    if (!frameworkMap) continue;

    const orm = frameworkMap[dbType];
    if (orm) {
      setProperty(be, 'orm', orm);
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

function applyTestingDefaults(sdl: SDLDocument): void {
  if (!sdl.testing) return;

  const backends = sdl.architecture.projects.backend;
  if (!backends || backends.length === 0) return;

  if (sdl.testing.unit && !sdl.testing.unit.framework) {
    const primary = backends[0];
    const testFw = FRAMEWORK_TEST_MAP[primary.framework];
    if (testFw) {
      setProperty(sdl.testing.unit, 'framework', testFw);
    }
  }
}

// ─── Rule 15: observability.logging.structured → true ───

const FRAMEWORK_LOGGING_MAP: Record<string, string> = {
  nodejs: 'pino',
  'python-fastapi': 'structured',
  'dotnet-8': 'serilog',
  go: 'zerolog',
  'java-spring': 'log4j',
};

function applyObservabilityDefaults(sdl: SDLDocument): void {
  if (!sdl.observability) return;

  if (sdl.observability.logging) {
    if (sdl.observability.logging.structured === undefined) {
      sdl.observability.logging.structured = true;
    }
    if (!sdl.observability.logging.provider) {
      const backends = sdl.architecture.projects.backend;
      if (backends && backends.length > 0) {
        const provider = FRAMEWORK_LOGGING_MAP[backends[0].framework];
        if (provider) {
          setProperty(sdl.observability.logging, 'provider', provider);
        }
      }
    }
  }

  if (sdl.observability.tracing) {
    if (sdl.observability.tracing.samplingRate === undefined) {
      sdl.observability.tracing.samplingRate = 0.1;
    }
  }
}
