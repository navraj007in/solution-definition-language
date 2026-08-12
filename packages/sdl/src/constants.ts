import type { BackendProject, BackendRuntime, FrontendRuntime } from './types';

// ─── Cloud → Runtime Mapping ───

// Typed against the runtime unions so a mapping outside the schema enums is a
// compile error, not a schema-invalid normalized document.
export const CLOUD_RUNTIME_MAP: Record<string, { frontend?: FrontendRuntime; backend?: BackendRuntime }> = {
  'vercel':   { frontend: 'vercel',            backend: 'vercel' },
  'aws':      { frontend: 's3+cloudfront',     backend: 'ecs' },
  'railway':  { frontend: 'railway',           backend: 'railway' },
  'gcp':      { frontend: 'cloudflare-pages',  backend: 'cloud-run' },
  'azure':    { frontend: 'static-web-apps',   backend: 'container-apps' },
};

// ─── Framework + DB → ORM Mapping ───

export const FRAMEWORK_ORM_MAP: Record<string, Record<string, NonNullable<BackendProject['orm']>>> = {
  'nodejs':         { postgres: 'prisma', mysql: 'prisma', sqlserver: 'prisma', mongodb: 'mongoose' },
  'python-fastapi': { postgres: 'sqlalchemy', mysql: 'sqlalchemy', sqlserver: 'sqlalchemy' },
  'dotnet':         { postgres: 'ef-core', mysql: 'ef-core', sqlserver: 'ef-core' },
  'go':             { postgres: 'gorm', mysql: 'gorm', sqlserver: 'gorm' },
  'java-spring':    { postgres: 'hibernate', mysql: 'hibernate', sqlserver: 'hibernate' },
};

// ─── Deprecated framework aliases → canonical value ───

/**
 * Legacy backend `framework` values that the normalizer rewrites to a canonical
 * value plus an explicit `runtimeVersion`.
 *
 * `dotnet-8` was the only framework enum value that carried its runtime version
 * in the identifier itself, which forced a schema change on every .NET release.
 * The canonical form is now unversioned `dotnet` + `runtimeVersion`.
 *
 * Per `reference/canonical-contract.md` → *Forward Policy*, this alias is
 * documented, tested, normalizes to one stored form, and is scheduled for
 * removal in SDL v2.0.
 */
export const DEPRECATED_FRAMEWORK_ALIASES: Record<string, { framework: string; runtimeVersion: string }> = {
  'dotnet-8': { framework: 'dotnet', runtimeVersion: '8.0' },
};

// ─── Framework → default runtime version ───

/**
 * Default toolchain version each backend framework is generated against.
 *
 * This is the single source of truth for every version string emitted by the
 * generators — CI setup-* actions, Dockerfile base images, and container image
 * tags all read from here. Before this table existed the same versions were
 * duplicated as string literals across `cicd.ts` and
 * `coding-rules-enforcement.ts`, and drifted years out of date unnoticed.
 *
 * A project can override any of these per-service with
 * `architecture.projects.backend[].runtimeVersion`.
 *
 * Maintenance: bump these when a framework's LTS/stable line moves. They are
 * generator defaults, not validation constraints — no SDL document is rejected
 * for targeting a different version.
 */
export const DEFAULT_RUNTIME_VERSION: Record<string, string> = {
  'nodejs':         '22',
  'python-fastapi': '3.13',
  'go':             '1.24',
  'dotnet':         '10.0',
  'java-spring':    '21',
  'ruby-rails':     '3.4',
  'php-laravel':    '8.4',
};

/**
 * Container base images per framework, parameterised by version.
 * `builder` is the SDK/full image, `runtime` the slim image for the final stage
 * (identical for interpreted runtimes that need no separate build image).
 */
export const RUNTIME_BASE_IMAGE: Record<string, (v: string) => { builder: string; runtime: string }> = {
  'nodejs':         v => ({ builder: `node:${v}-alpine`,             runtime: `node:${v}-alpine` }),
  'python-fastapi': v => ({ builder: `python:${v}-slim`,             runtime: `python:${v}-slim` }),
  'go':             v => ({ builder: `golang:${v}-alpine`,           runtime: 'alpine:latest' }),
  'dotnet':         v => ({ builder: `mcr.microsoft.com/dotnet/sdk:${v}`, runtime: `mcr.microsoft.com/dotnet/aspnet:${v}` }),
  'java-spring':    v => ({ builder: `eclipse-temurin:${v}-jdk`,     runtime: `eclipse-temurin:${v}-jre` }),
  'ruby-rails':     v => ({ builder: `ruby:${v}-slim`,               runtime: `ruby:${v}-slim` }),
  'php-laravel':    v => ({ builder: `php:${v}-fpm`,                 runtime: `php:${v}-fpm` }),
};

/**
 * Resolve the runtime version for a backend project: its explicit
 * `runtimeVersion` if set, otherwise the framework default.
 */
export function resolveRuntimeVersion(
  framework: string | undefined,
  runtimeVersion?: string,
): string {
  if (runtimeVersion) return runtimeVersion;
  return DEFAULT_RUNTIME_VERSION[framework ?? ''] ?? '';
}

// ─── Budget → Monthly Ceiling ($) ───

export const BUDGET_MONTHLY_CEILING: Record<string, number> = {
  'startup':    500,
  'scaleup':    2000,
  'enterprise': 10000,
};

// ─── Stage → Default Availability Target ───

export const AVAILABILITY_BY_STAGE: Record<string, string> = {
  'MVP':        '99.9',
  'Growth':     '99.95',
  'Enterprise': '99.99',
};

// ─── SQL database types (for ORM inference) ───

export const SQL_DATABASE_TYPES = new Set([
  'postgres', 'mysql', 'sqlserver', 'cockroachdb', 'planetscale',
]);
