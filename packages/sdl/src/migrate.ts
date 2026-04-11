import { parse } from './parser';
import { compile } from './index';

export interface MigrationChange {
  path: string;
  from: unknown;
  to: unknown;
  reason: string;
}

export interface MigrateResult {
  /** Whether the input was already valid with no changes needed */
  clean: boolean;
  /** List of transformations applied */
  changes: MigrationChange[];
  /** The migrated document as a plain object (pass to a YAML serializer to get YAML) */
  document: Record<string, unknown>;
  /** Whether the migrated document compiles cleanly */
  compilesClean: boolean;
  /** Compilation errors remaining after migration (should be empty for fully handled docs) */
  remainingErrors: string[];
}

/**
 * Detects stale or invalid SDL patterns and returns a corrected document.
 * Does not mutate the input string. Returns both the corrected document and
 * a list of changes made so callers can show a diff.
 *
 * Migration cases handled:
 * - solution.stage casing: mvp→MVP, growth→Growth, enterprise→Enterprise
 * - frontend.framework: next→nextjs
 * - backend.framework: express→nodejs, fastapi→python-fastapi
 * - auth.strategy: jwt→oidc (+ sessions.accessToken: jwt)
 * - contracts as top-level array → contracts.apis: [...]
 * - features as phase-keyed object → flat array with x-phase annotation
 * - slos as top-level array → slos.services: [...]
 * - unknown root keys without x- prefix → prefixed with x-
 */
export function migrate(yamlString: string): MigrateResult {
  const parseResult = parse(yamlString);
  // Work on raw parsed object even if it has errors — migration should handle invalid docs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = parseResult.data as Record<string, any>;

  if (!doc || typeof doc !== 'object') {
    return {
      clean: false,
      changes: [],
      document: {},
      compilesClean: false,
      remainingErrors: ['Could not parse YAML'],
    };
  }

  // Deep clone to avoid mutating parsed data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = JSON.parse(JSON.stringify(doc));
  const changes: MigrationChange[] = [];

  // ─── Migration rules ───

  // 1. solution.stage casing
  if (result.solution?.stage) {
    const stageMap: Record<string, string> = {
      mvp: 'MVP',
      growth: 'Growth',
      enterprise: 'Enterprise',
    };
    const normalized = stageMap[String(result.solution.stage).toLowerCase()];
    if (normalized && result.solution.stage !== normalized) {
      changes.push({ path: 'solution.stage', from: result.solution.stage, to: normalized, reason: 'stage enum must be correctly cased' });
      result.solution.stage = normalized;
    }
  }

  // 2. frontend framework aliases
  const frontends = result.architecture?.projects?.frontend;
  if (Array.isArray(frontends)) {
    for (let i = 0; i < frontends.length; i++) {
      const frameworkMap: Record<string, string> = { next: 'nextjs' };
      const fw = frontends[i]?.framework;
      if (fw && frameworkMap[fw]) {
        changes.push({ path: `architecture.projects.frontend[${i}].framework`, from: fw, to: frameworkMap[fw], reason: 'stale framework alias' });
        frontends[i].framework = frameworkMap[fw];
      }
    }
  }

  // 3. backend framework aliases
  const backends = result.architecture?.projects?.backend;
  if (Array.isArray(backends)) {
    for (let i = 0; i < backends.length; i++) {
      const frameworkMap: Record<string, string> = {
        express: 'nodejs',
        fastapi: 'python-fastapi',
      };
      const fw = backends[i]?.framework;
      if (fw && frameworkMap[fw]) {
        changes.push({ path: `architecture.projects.backend[${i}].framework`, from: fw, to: frameworkMap[fw], reason: 'stale framework alias' });
        backends[i].framework = frameworkMap[fw];
      }
    }
  }

  // 4. auth.strategy: jwt → oidc + sessions.accessToken: jwt
  if (result.auth?.strategy === 'jwt') {
    changes.push({ path: 'auth.strategy', from: 'jwt', to: 'oidc', reason: 'jwt is not a valid strategy; use oidc with sessions.accessToken: jwt for token format' });
    result.auth.strategy = 'oidc';
    if (!result.auth.provider) {
      result.auth.provider = 'custom';
      changes.push({ path: 'auth.provider', from: undefined, to: 'custom', reason: 'oidc strategy requires a provider; defaulted to custom — update to your actual provider' });
    }
    if (!result.auth.sessions) result.auth.sessions = {};
    if (!result.auth.sessions.accessToken) {
      result.auth.sessions.accessToken = 'jwt';
      changes.push({ path: 'auth.sessions.accessToken', from: undefined, to: 'jwt', reason: 'added to preserve jwt token format intent' });
    }
  }

  // 5. contracts as array → contracts.apis
  if (Array.isArray(result.contracts)) {
    const apis = result.contracts;
    changes.push({ path: 'contracts', from: 'array', to: 'object with apis array', reason: 'contracts must be an object with an apis array' });
    result.contracts = { apis };
  }

  // 6. features as phase-keyed object → flat array with x-phase annotation
  if (result.features && !Array.isArray(result.features) && typeof result.features === 'object') {
    const flat: Record<string, unknown>[] = [];
    for (const [phase, items] of Object.entries(result.features)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          flat.push({ ...(item as object), 'x-phase': phase });
        }
      }
    }
    changes.push({ path: 'features', from: 'phase-keyed object', to: 'flat array with x-phase', reason: 'features must be a flat array; phase info moved to x-phase extension field' });
    result.features = flat;
  }

  // 7. slos as array → slos.services
  if (Array.isArray(result.slos)) {
    const services = result.slos;
    changes.push({ path: 'slos', from: 'array', to: 'object with services array', reason: 'slos must be an object with a services array' });
    result.slos = { services };
  }

  // 8. Unknown root keys without x- prefix → prefix with x-
  const knownRootKeys = new Set([
    'sdlVersion', 'solution', 'product', 'architecture', 'auth', 'data',
    'integrations', 'nonFunctional', 'deployment', 'constraints', 'techDebt',
    'technicalDebt', 'evolution', 'testing', 'observability', 'artifacts',
    'contracts', 'domain', 'features', 'compliance', 'slos', 'resilience',
    'costs', 'backupDr', 'design',
  ]);
  for (const key of Object.keys(result)) {
    if (!knownRootKeys.has(key) && !key.startsWith('x-')) {
      const newKey = `x-${key}`;
      changes.push({ path: key, from: key, to: newKey, reason: 'unknown root key must be prefixed with x-' });
      result[newKey] = result[key];
      delete result[key];
    }
  }

  // ─── Verify ───
  const clean = changes.length === 0;

  // Serialize and re-compile to check if migration was sufficient
  const { stringify } = require('yaml');
  const migratedYaml = stringify(result);
  const compileResult = compile(migratedYaml);

  return {
    clean,
    changes,
    document: result,
    compilesClean: compileResult.success,
    remainingErrors: compileResult.errors.map((e) => `${e.path}: ${e.message}`),
  };
}
