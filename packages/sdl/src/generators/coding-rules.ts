import type { SDLDocument, BackendProject, FrontendProject, MobileProject } from '../types';
import type { GeneratorResult, GeneratedFile } from './types';
import { type ParsedADR, adrsToCodingRules } from './adr-rules';

/** AI tools that sync-ai can generate instruction files for */
export type AITarget = 'claude' | 'cursor' | 'copilot' | 'aider';

export interface CodingRulesOptions {
  /** Parsed, accepted ADRs to incorporate as decision constraints */
  adrs?: ParsedADR[];
  /**
   * Which AI tools to generate files for.
   * Defaults to all four if omitted.
   */
  targets?: AITarget[];
}

/**
 * Generates AI-consumable coding rules from an SDL document.
 * Produces CLAUDE.md, .cursorrules, .github/copilot-instructions.md, and .aider/conventions.md
 * so that any AI coding tool enforces the architecture across sessions.
 *
 * Deterministic — same input always produces identical output.
 */
export function generateCodingRules(doc: SDLDocument, options?: CodingRulesOptions): GeneratorResult {
  const files: GeneratedFile[] = [];
  const targets = options?.targets ?? (['claude', 'cursor', 'copilot', 'aider'] as AITarget[]);
  const adrs = options?.adrs ?? [];

  const rules = buildRules(doc);
  const adrRuleStrings = adrsToCodingRules(adrs);
  const markdown = renderRulesMarkdown(doc, rules, adrRuleStrings);
  const copilotMarkdown = adrRuleStrings.length > 0
    ? renderRulesMarkdown(doc, rules, adrRuleStrings, { compact: true })
    : markdown;

  // CLAUDE.md — Claude Code / Claude Agent SDK
  if (targets.includes('claude')) {
    files.push({ path: 'CLAUDE.md', content: markdown });
  }

  // .cursor/rules/architecture.mdc — Cursor IDE (new rules dir format)
  if (targets.includes('cursor')) {
    files.push({ path: '.cursor/rules/architecture.mdc', content: renderCursorRules(doc, markdown) });
  }

  // .github/copilot-instructions.md — GitHub Copilot
  if (targets.includes('copilot')) {
    files.push({ path: '.github/copilot-instructions.md', content: copilotMarkdown });
  }

  // .aider/conventions.md — Aider
  if (targets.includes('aider')) {
    files.push({ path: '.aider/conventions.md', content: markdown });
  }

  // Per-component files — each component gets full AI rules at its own path
  // Supports both monorepo (subdirectories) and multi-repo (each has own CLAUDE.md)
  const allProjects = [
    ...(doc.architecture.projects.backend || []).map(p => ({ project: p, type: 'backend' as const })),
    ...(doc.architecture.projects.frontend || []).map(p => ({ project: p, type: 'frontend' as const })),
    ...(doc.architecture.projects.mobile || []).map(p => ({ project: p, type: 'frontend' as const })),
  ];

  for (const { project, type } of allProjects) {
    const componentPath = (project as any).path ?? project.name;
    if (componentPath === '.' || componentPath === './') continue; // root component uses root files

    const projectRules = renderProjectRules(doc, project, type);
    if (!projectRules) continue;

    if (targets.includes('claude')) {
      files.push({ path: `${componentPath}/CLAUDE.md`, content: projectRules });
    }
    if (targets.includes('cursor')) {
      files.push({ path: `${componentPath}/.cursor/rules/architecture.mdc`, content: renderCursorRules(doc, projectRules) });
    }
    if (targets.includes('copilot')) {
      files.push({ path: `${componentPath}/.github/copilot-instructions.md`, content: projectRules });
    }
    if (targets.includes('aider')) {
      files.push({ path: `${componentPath}/.aider/conventions.md`, content: projectRules });
    }
  }

  const activeTargetLabels: string[] = [];
  if (targets.includes('claude')) activeTargetLabels.push('claude-code');
  if (targets.includes('cursor')) activeTargetLabels.push('cursor');
  if (targets.includes('copilot')) activeTargetLabels.push('github-copilot');
  if (targets.includes('aider')) activeTargetLabels.push('aider');

  return {
    artifactType: 'coding-rules',
    files,
    metadata: {
      solutionName: doc.solution.name,
      ruleCount: rules.length,
      adrCount: adrs.length,
      targetTools: activeTargetLabels,
    },
  };
}

/** Wraps shared markdown in Cursor's .mdc frontmatter format */
function renderCursorRules(doc: SDLDocument, content: string): string {
  const header = [
    '---',
    `description: Architecture rules for ${doc.solution.name}`,
    'globs: ["**/*"]',
    'alwaysApply: true',
    '---',
    '',
  ].join('\n');
  return header + content;
}

// ─── Rule Types ───

interface Rule {
  category: string;
  rules: string[];
}

// ─── Rule Builder ───

function buildRules(doc: SDLDocument): Rule[] {
  const rules: Rule[] = [];

  rules.push(buildArchitectureRules(doc));
  rules.push(buildFileStructureRules(doc));
  rules.push(buildDataAccessRules(doc));
  rules.push(buildApiPatternRules(doc));

  if (doc.auth && doc.auth.strategy !== 'none') {
    rules.push(buildAuthRules(doc));
  }

  rules.push(buildErrorHandlingRules(doc));

  if (doc.integrations) {
    rules.push(buildIntegrationRules(doc));
  }

  if (doc.testing) {
    rules.push(buildTestingRules(doc));
  }

  if (doc.observability) {
    rules.push(buildObservabilityRules(doc));
  }

  if (doc.nonFunctional.security) {
    rules.push(buildSecurityRules(doc));
  }

  if (doc.data.cache && doc.data.cache.type !== 'none') {
    rules.push(buildCachingRules(doc));
  }

  if (doc.data.queues) {
    rules.push(buildQueueRules(doc));
  }

  // Code quality rules (always generated, framework-aware)
  rules.push(buildCodeQualityRules(doc));
  rules.push(buildDesignPatternRules(doc));
  rules.push(buildFileSizeStructureRules(doc));
  rules.push(buildApiDesignQualityRules(doc));
  rules.push(buildDatabaseQueryRules(doc));
  rules.push(buildTestingQualityRules(doc));
  rules.push(buildPerformanceRules(doc));
  rules.push(buildImportOrganizationRules(doc));
  rules.push(buildTechDebtAvoidanceRules(doc));
  rules.push(buildResilienceRules(doc));
  rules.push(buildInputValidationRules(doc));
  rules.push(buildConcurrencyRules(doc));
  rules.push(buildConfigurationRules(doc));
  rules.push(buildMigrationDeploymentSafetyRules(doc));
  rules.push(buildDocumentationRules(doc));
  rules.push(buildGitWorkflowRules(doc));

  // Conditional categories
  const frontends = doc.architecture.projects.frontend || [];
  if (frontends.length > 0) {
    rules.push(buildAccessibilityRules(doc));
    rules.push(buildStateManagementRules(doc));
  }

  const mobiles = doc.architecture.projects.mobile || [];
  if (mobiles.length > 0) {
    rules.push(buildMobileRules(doc));
  }

  if (doc.solution.regions && (doc.solution.regions.primary !== doc.solution.regions.secondary?.[0] && (doc.solution.regions.secondary?.length || 0) > 0)) {
    rules.push(buildInternationalizationRules(doc));
  }

  // Filter out empty categories
  return rules.filter((r) => r.rules.length > 0);
}

// ─── Individual Rule Builders ───

function buildArchitectureRules(doc: SDLDocument): Rule {
  const style = doc.architecture.style;
  const rules: string[] = [];

  if (style === 'modular-monolith') {
    rules.push('Architecture: Modular Monolith. Single deployable with clear module boundaries.');
    rules.push('Each module MUST communicate through typed interfaces, never through direct database access or shared mutable state.');
    rules.push('Modules MUST NOT import from another module\'s internal files — only from its public interface and types.');
    rules.push('Each module owns its own database tables/collections. No cross-module joins or shared tables.');
    rules.push('DTOs cross module boundaries, not database models. All inter-module data must be plain serializable objects.');
  } else if (style === 'microservices') {
    rules.push('Architecture: Microservices. Each service is independently deployable.');
    rules.push('Services communicate via well-defined API contracts (REST/gRPC/events). No shared databases.');
    rules.push('Each service owns its data store exclusively. No direct database access across service boundaries.');
    rules.push('All inter-service communication MUST go through the defined API contracts, never shared libraries with business logic.');
    rules.push('Services MUST be independently testable and deployable.');
  } else if (style === 'serverless') {
    rules.push('Architecture: Serverless. Functions are stateless and event-driven.');
    rules.push('Each function MUST be stateless. No in-memory state between invocations.');
    rules.push('Use managed services for state (database, cache, queues). Functions are compute-only.');
    rules.push('Keep function cold start times minimal — lazy-load heavy dependencies.');
  }

  // Services/boundaries
  const services = doc.architecture.services || [];
  if (services.length > 0) {
    const serviceList = services.map((s) => `${s.name} (${s.kind})`).join(', ');
    rules.push(`Defined service boundaries: ${serviceList}. Do not create new services without updating the SDL.`);
  }

  return { category: 'Architecture', rules };
}

function buildFileStructureRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  for (const be of backends) {
    const fw = be.framework;
    rules.push(...getBackendFileRules(be));

    if (be.orm) {
      const ormLabel = ORM_LABELS[be.orm] || be.orm;
      rules.push(`ORM: ${ormLabel}. All database queries MUST go through the ORM. No raw SQL unless in dedicated repository/query files.`);
      rules.push(`Schema changes MUST use ${ormLabel} migrations. Never modify the database schema manually.`);
    }
  }

  for (const fe of frontends) {
    rules.push(...getFrontendFileRules(fe));
  }

  return { category: 'File Structure & Conventions', rules };
}

function buildDataAccessRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const db = doc.data.primaryDatabase;
  const dbLabel = DB_LABELS[db.type] || db.type;

  rules.push(`Primary database: ${dbLabel} (${db.hosting}). All data access MUST go through the designated data access layer.`);

  // Pattern enforcement based on architecture style
  if (doc.architecture.style === 'modular-monolith') {
    rules.push('Each module MUST use the repository pattern. Route handlers and controllers MUST NOT contain database queries directly.');
    rules.push('Database client/connection MUST be injected via dependency injection, not imported directly in business logic.');
  }

  const secondaries = doc.data.secondaryDatabases || [];
  for (const secondary of secondaries) {
    const secLabel = DB_LABELS[secondary.type] || secondary.type;
    rules.push(`Secondary database: ${secLabel}${secondary.role ? ` (${secondary.role})` : ''}. Must be accessed through its own dedicated repository.`);
  }

  if (doc.data.search) {
    rules.push(`Search engine: ${doc.data.search.provider}. Full-text search queries MUST use the search provider, not database LIKE/ILIKE queries.`);
  }

  return { category: 'Data Access', rules };
}

function buildApiPatternRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];

  for (const be of backends) {
    const apiStyle = be.apiStyle || 'rest';

    if (apiStyle === 'rest') {
      rules.push(`API style: REST. Use standard HTTP methods (GET, POST, PUT, PATCH, DELETE) with proper status codes.`);
      if (be.apiVersioning && be.apiVersioning !== 'none') {
        rules.push(`API versioning: ${be.apiVersioning}. All endpoints MUST include version prefix.`);
      }
    } else if (apiStyle === 'graphql') {
      rules.push('API style: GraphQL. All data fetching MUST go through the GraphQL layer. No REST endpoints for data that GraphQL serves.');
    } else if (apiStyle === 'grpc') {
      rules.push('API style: gRPC. Service definitions MUST be defined in .proto files first. Code is generated from proto definitions.');
    }
  }

  // Service communication patterns
  const services = doc.architecture.services || [];
  for (const svc of services) {
    if (svc.exposes?.http?.basePath) {
      rules.push(`Service "${svc.name}" base path: ${svc.exposes.http.basePath}. All routes for this service MUST use this prefix.`);
    }
    if (svc.exposes?.http?.openapi) {
      rules.push(`Service "${svc.name}" MUST maintain an OpenAPI spec that matches its actual routes.`);
    }
  }

  return { category: 'API Patterns', rules };
}

function buildAuthRules(doc: SDLDocument): Rule {
  const auth = doc.auth!;
  const rules: string[] = [];

  if (auth.provider) {
    const providerLabel = AUTH_LABELS[auth.provider] || auth.provider;
    rules.push(`Auth provider: ${providerLabel}. Do NOT implement custom auth logic — use the provider SDK.`);
  } else {
    rules.push(`Auth strategy: ${auth.strategy}. Custom implementation.`);
  }

  if (auth.roles && auth.roles.length > 0) {
    rules.push(`Defined roles: ${auth.roles.join(', ')}. All protected endpoints MUST enforce role-based access control.`);
    rules.push('Authorization checks MUST happen at the route/middleware level, not inside business logic.');
  }

  if (auth.sessions?.accessToken === 'jwt') {
    rules.push('Auth tokens: JWT. Validate tokens on every request via middleware. Never decode tokens manually in route handlers.');
  }

  if (auth.mfa) {
    rules.push('MFA is required. Auth flows MUST support MFA challenge/response.');
  }

  rules.push('NEVER log, expose, or return auth tokens, passwords, or secrets in API responses or error messages.');

  return { category: 'Authentication & Authorization', rules };
}

function buildErrorHandlingRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];

  rules.push('Use typed error classes (e.g., NotFoundError, ValidationError, AuthError). NEVER throw raw strings or generic Error.');
  rules.push('All route handlers MUST catch errors and pass them to the error handling middleware. Do not swallow errors silently.');
  rules.push('API error responses MUST use consistent format: { error: { code, message } }. Never expose stack traces in production.');

  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('Express: Every route handler MUST wrap logic in try/catch and call next(err) on failure.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('FastAPI: Use HTTPException with proper status codes. Register global exception handlers.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('.NET: Use Result<T> or typed exceptions. Register global exception middleware.');
    }
  }

  return { category: 'Error Handling', rules };
}

function buildIntegrationRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const integ = doc.integrations!;

  rules.push('All third-party integrations MUST be wrapped in a service/adapter class. Business logic MUST NOT call external APIs directly.');
  rules.push('External API keys and secrets MUST come from environment variables. Never hardcode credentials.');

  if (integ.payments) {
    rules.push(`Payments: ${integ.payments.provider || 'configured provider'}. NEVER handle raw card data. Use hosted fields or checkout sessions for PCI compliance.`);
    rules.push('Payment webhooks MUST verify signatures before processing. Never trust unverified webhook payloads.');
  }

  if (integ.email) {
    rules.push(`Email: ${integ.email.provider || 'configured provider'}. Use the email service abstraction for all outbound email. Never send email directly from route handlers.`);
  }

  if (integ.monitoring) {
    rules.push(`Monitoring: ${integ.monitoring.provider || 'configured provider'}. Error tracking must be configured. Do not suppress exceptions before they reach the monitoring layer.`);
  }

  return { category: 'External Integrations', rules };
}

function buildTestingRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const testing = doc.testing!;

  if (testing.unit?.framework) {
    rules.push(`Unit test framework: ${testing.unit.framework}. All business logic MUST have unit tests.`);
  }

  if (testing.e2e?.framework && testing.e2e.framework !== 'none') {
    rules.push(`E2E test framework: ${testing.e2e.framework}. Critical user flows MUST have E2E coverage.`);
  }

  if (testing.coverage?.target) {
    rules.push(`Test coverage target: ${testing.coverage.target}%.${testing.coverage.enforce ? ' Coverage is enforced in CI — PRs below target will be rejected.' : ''}`);
  }

  rules.push('Tests MUST NOT depend on external services. Mock all external dependencies (APIs, databases) in unit tests.');

  return { category: 'Testing', rules };
}

function buildObservabilityRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const obs = doc.observability!;

  if (obs.logging) {
    if (obs.logging.provider) {
      rules.push(`Logging: ${obs.logging.provider}. Use the configured logger for all log output. Do NOT use console.log/print in production code.`);
    }
    if (obs.logging.structured) {
      rules.push('Logging MUST be structured (JSON). Always include contextual fields: requestId, userId, service, operation.');
    }
    if (obs.logging.level) {
      rules.push(`Default log level: ${obs.logging.level}. Use appropriate levels: error for failures, warn for recoverable issues, info for key events, debug for troubleshooting.`);
    }
  }

  if (obs.tracing?.provider && obs.tracing.provider !== 'none') {
    rules.push(`Distributed tracing: ${obs.tracing.provider}. Propagate trace context (request IDs, trace headers) across all service calls.`);
  }

  if (obs.metrics?.provider && obs.metrics.provider !== 'none') {
    rules.push(`Metrics: ${obs.metrics.provider}. Key operations MUST emit metrics (latency, error rate, throughput).`);
  }

  return { category: 'Observability', rules };
}

function buildSecurityRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const security = doc.nonFunctional.security!;

  rules.push('Validate all user input at system boundaries. Never trust client-side validation alone.');
  rules.push('Use parameterized queries / ORM methods. NEVER concatenate user input into SQL/NoSQL queries.');

  if (security.pii) {
    rules.push('This system handles PII (personally identifiable information). PII fields MUST be identified in the data model. Log redaction MUST be applied to PII fields.');
  }

  if (security.phi) {
    rules.push('This system handles PHI (protected health information). HIPAA compliance required. Encrypt PHI at rest and in transit. Audit log all PHI access.');
  }

  if (security.pci) {
    rules.push('This system is PCI-DSS scoped. NEVER store full card numbers, CVV, or raw card data. Use tokenization from the payment provider.');
  }

  if (security.encryptionAtRest) {
    rules.push('Encryption at rest: REQUIRED. Database and file storage MUST use encryption at rest.');
  }

  if (security.encryptionInTransit) {
    rules.push('Encryption in transit: REQUIRED. All API endpoints MUST use HTTPS. No unencrypted inter-service communication.');
  }

  if (security.auditLogging && security.auditLogging !== 'none') {
    rules.push(`Audit logging: ${security.auditLogging}. Security-sensitive operations MUST produce audit log entries.`);
  }

  // Compliance frameworks
  const compliance = doc.nonFunctional.compliance?.frameworks || [];
  if (compliance.length > 0) {
    rules.push(`Compliance frameworks: ${compliance.join(', ').toUpperCase()}. All code changes must maintain compliance. Do not introduce patterns that violate these frameworks.`);
  }

  return { category: 'Security', rules };
}

function buildCachingRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const cache = doc.data.cache!;
  const cacheLabel = cache.type === 'redis' ? 'Redis' : cache.type === 'memcached' ? 'Memcached' : cache.type || 'cache';

  rules.push(`Cache: ${cacheLabel}. Cache access MUST go through a cache service/wrapper, not direct client calls in business logic.`);

  if (cache.useCase) {
    rules.push(`Cache use cases: ${cache.useCase.join(', ')}. Only cache data matching these use cases. Do not use the cache as a primary data store.`);
  }

  rules.push('All cached data MUST have a TTL. Never cache without expiration.');
  rules.push('Cache invalidation MUST happen when the underlying data changes. Stale reads are acceptable only where explicitly documented.');

  return { category: 'Caching', rules };
}

function buildQueueRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const queues = doc.data.queues!;
  const queueLabel = queues.provider || 'message queue';

  rules.push(`Message queue: ${queueLabel}. Async operations MUST use the queue, not fire-and-forget HTTP calls.`);

  if (queues.useCase) {
    rules.push(`Queue use cases: ${queues.useCase.join(', ')}. Only queue operations matching these use cases.`);
  }

  rules.push('Queue consumers MUST be idempotent. The same message delivered twice must not cause duplicate side effects.');
  rules.push('Failed messages MUST go to a dead-letter queue. Never silently drop failed messages.');

  return { category: 'Message Queues', rules };
}

// ─── Code Quality Rules ───

function buildCodeQualityRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  // Universal code quality
  rules.push('Functions MUST do one thing. If a function name requires "and" to describe it, split it.');
  rules.push('Max 3 parameters per function. Beyond that, use an options/config object.');
  rules.push('Prefer early returns over deeply nested conditionals. Guard clauses at the top, happy path at the bottom.');
  rules.push('No magic numbers or strings. Extract constants with descriptive names.');
  rules.push('Prefer immutable data. Use `const`/`readonly`/`final` by default. Only use mutable state when necessary.');

  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('TypeScript: Avoid `any`. Use `unknown` when the type is truly unknown, then narrow with type guards.');
      rules.push('TypeScript: Use `interface` for object shapes, `type` for unions/intersections/utility types.');
      rules.push('Naming: camelCase for variables/functions, PascalCase for classes/interfaces/types, UPPER_SNAKE_CASE for constants.');
      rules.push('Async: Use `Promise.all()` for independent async operations. NEVER `await` independent calls sequentially.');
      rules.push('Async: Every Promise chain MUST have error handling. No unhandled promise rejections.');
      rules.push('Avoid `new Date()` scattered in business logic. Inject time as a dependency or use a clock service for testability.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('Python: Use type hints on ALL function signatures and return types. No untyped functions.');
      rules.push('Python: Use `dataclass` or `Pydantic` for all data structures. No plain dicts for domain objects.');
      rules.push('Naming: snake_case for variables/functions, PascalCase for classes, UPPER_SNAKE_CASE for constants.');
      rules.push('Async: Use `asyncio.gather()` for independent async operations. NEVER `await` independent calls sequentially.');
      rules.push('Use list comprehensions and generator expressions over manual loops where readability allows.');
    } else if (be.framework === 'go') {
      rules.push('Go: Accept interfaces, return structs. Keep interfaces small (1-3 methods).');
      rules.push('Go: Handle every error. Never use `_` to discard errors. Wrap errors with context using `fmt.Errorf("... : %w", err)`.');
      rules.push('Go: Use table-driven tests. Group related test cases in test tables.');
      rules.push('Naming: camelCase/PascalCase (exported = PascalCase). No getters — use `Name()` not `GetName()`.');
    } else if (be.framework === 'java-spring') {
      rules.push('Java: Use `record` for immutable DTOs. Use `sealed` interfaces where appropriate.');
      rules.push('Java: Use `Optional<T>` instead of null returns. Never call `.get()` without `.isPresent()` or use `.orElseThrow()`.');
      rules.push('Java: Use `var` for local variables where the type is obvious from the right side.');
      rules.push('Naming: camelCase for variables/methods, PascalCase for classes, UPPER_SNAKE_CASE for constants.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('C#: Use `record` for immutable DTOs. Use primary constructors where applicable.');
      rules.push('C#: Prefer pattern matching and switch expressions over if-else chains.');
      rules.push('C#: Use `async Task<T>` return types for async methods. Never use `async void` except in event handlers.');
      rules.push('Naming: PascalCase for public members, _camelCase for private fields, camelCase for parameters/locals.');
    } else if (be.framework === 'ruby-rails') {
      rules.push('Ruby: Follow Ruby Style Guide. Prefer `&&`/`||` over `and`/`or`. Use `unless` for simple negations.');
      rules.push('Ruby: Use symbols over strings for keys. Prefer `each` over `for`.');
      rules.push('Naming: snake_case for methods/variables, PascalCase for classes/modules, UPPER_SNAKE_CASE for constants.');
    } else if (be.framework === 'php-laravel') {
      rules.push('PHP: Use strict types (`declare(strict_types=1)`) in every file.');
      rules.push('PHP: Use typed properties and return types. No mixed types unless truly necessary.');
      rules.push('Naming: camelCase for methods/variables, PascalCase for classes, UPPER_SNAKE_CASE for constants.');
    }
  }

  for (const fe of frontends) {
    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      rules.push('React: Components MUST be functional components. No class components.');
      rules.push('React: Custom hooks MUST start with `use`. Extract reusable logic into custom hooks.');
      rules.push('React: Use `useMemo` / `useCallback` only when you have measured a performance issue. Do not memoize by default.');
      rules.push('React: Props interface MUST be defined above the component. Name it `<ComponentName>Props`.');
      rules.push('React: Avoid inline function definitions in JSX for event handlers in lists (creates new reference each render).');
      rules.push('React: Co-locate component, styles, tests, and types in the same directory for feature components.');
    } else if (fe.framework === 'vue') {
      rules.push('Vue: Use `<script setup>` with Composition API. No Options API in new components.');
      rules.push('Vue: Use `defineProps` with TypeScript interface. No runtime prop validation when types are available.');
      rules.push('Vue: Extract reusable logic into composables (`use<Name>`).');
    } else if (fe.framework === 'angular') {
      rules.push('Angular: Use signals for state management in components. Prefer signals over RxJS for component state.');
      rules.push('Angular: Use `inject()` function over constructor injection.');
      rules.push('Angular: Use standalone components. No NgModule declarations for new components.');
    } else if (fe.framework === 'svelte') {
      rules.push('Svelte: Use runes ($state, $derived, $effect) for reactivity. No legacy reactive declarations.');
      rules.push('Svelte: Keep components small. Extract complex logic into separate .ts utility files.');
    }
  }

  return { category: 'Code Quality', rules };
}

// ─── Software Design Patterns & Class Structure ───

function buildDesignPatternRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];
  const style = doc.architecture.style;

  // ── SOLID Principles (universal) ──
  rules.push('');
  rules.push('### SOLID Principles');
  rules.push('**Single Responsibility (SRP):** Every class, module, and function MUST have one reason to change. If a class handles both user validation and email sending, split it into `UserValidator` and `EmailService`.');
  rules.push('**Open/Closed (OCP):** Classes should be open for extension, closed for modification. Use strategy pattern, plugin interfaces, or composition to add behavior without changing existing code.');
  rules.push('**Liskov Substitution (LSP):** Subtypes MUST be substitutable for their base types without altering correctness. If overriding a method changes preconditions, postconditions, or invariants, the hierarchy is wrong — use composition instead.');
  rules.push('**Interface Segregation (ISP):** No class should be forced to implement methods it does not use. Prefer small, focused interfaces over large "god" interfaces. Split `IUserService { create, update, delete, sendEmail, generateReport }` into `IUserCrud` + `IUserNotifications` + `IUserReporting`.');
  rules.push('**Dependency Inversion (DIP):** High-level modules MUST NOT depend on low-level modules. Both should depend on abstractions. Inject dependencies through constructor parameters or DI containers, never instantiate them inline.');

  // ── Composition vs Inheritance ──
  rules.push('');
  rules.push('### Composition Over Inheritance');
  rules.push('Prefer composition over inheritance. Use interfaces/protocols and delegate to collaborators instead of building deep class hierarchies.');
  rules.push('Inheritance depth MUST NOT exceed 2 levels (Base → Child is fine, Base → Child → GrandChild is the maximum). Beyond that, use composition or mixins.');
  rules.push('Use inheritance only for true "is-a" relationships where the Liskov Substitution Principle holds. For "has-a" or "uses-a" relationships, use composition.');

  // ── Class Structure & Organization ──
  rules.push('');
  rules.push('### Class Structure');
  rules.push('Classes MUST follow a consistent internal ordering: 1) Static fields/constants 2) Instance fields 3) Constructor 4) Public methods 5) Protected methods 6) Private methods.');
  rules.push('A class MUST NOT have more than 7 public methods (excluding getters/setters). If it has more, it likely violates SRP — split by responsibility.');
  rules.push('Constructor parameters MUST NOT exceed 5. If more are needed, group related params into a config/options object, or the class has too many responsibilities.');

  // ── Design Patterns (conditional by architecture style) ──
  rules.push('');
  rules.push('### Design Patterns');

  // Repository pattern — for any project with a database
  if (style === 'modular-monolith' || style === 'microservices') {
    rules.push('**Repository Pattern:** All data access MUST go through repository classes. Services depend on repository interfaces, not concrete implementations. This enables swapping storage backends and simplifies testing.');
  }

  // Factory pattern — when there are multiple service types or complex object creation
  rules.push('**Factory Pattern:** Use factory functions or classes when object creation involves conditional logic or complex setup. Never scatter `new` calls with configuration logic across the codebase.');

  // Strategy pattern — for varying behavior
  rules.push('**Strategy Pattern:** When a function has 3+ conditional branches that select different behavior (e.g., payment providers, notification channels, export formats), extract each branch into a strategy class implementing a common interface.');

  // Observer/Event pattern — for decoupled communication
  if (style === 'modular-monolith') {
    rules.push('**Observer/Event Pattern:** Use events for cross-module side effects. When user signup triggers welcome email + analytics + onboarding, the auth module emits an event — it does not call email, analytics, or onboarding directly.');
  } else if (style === 'microservices') {
    rules.push('**Event-Driven:** Use async events (message queue/event bus) for cross-service side effects. Services MUST NOT synchronously call other services for non-critical operations. Use events for eventual consistency.');
  }

  // Adapter pattern — for integrations
  rules.push('**Adapter Pattern:** All third-party integrations (payment, email, storage, search) MUST be wrapped in an adapter that implements your own interface. Swapping Stripe for another provider should require only a new adapter, not changes to business logic.');

  // ── Data Objects & Value Types ──
  rules.push('');
  rules.push('### Data Objects & Value Types');
  rules.push('**DTOs (Data Transfer Objects):** Use plain, serializable objects to transfer data across boundaries (API, module, service). DTOs MUST NOT contain business logic or methods.');
  rules.push('**Entities:** Domain objects with identity (e.g., User, Order). Entities contain business rules and validation. They are NOT database models — map between them.');
  rules.push('**Value Objects:** Immutable objects defined by their attributes, not identity (e.g., Money, Email, DateRange). Use value objects instead of primitives for domain concepts with validation or formatting rules.');

  // ── Language-specific OOP/design guidance ──
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('');
      rules.push('### TypeScript Design');
      rules.push('Use `interface` for defining contracts between modules. Use `abstract class` only when you need shared implementation (template method pattern).');
      rules.push('Use discriminated unions (`type Shape = Circle | Square`) over class hierarchies for types with a fixed set of variants.');
      rules.push('Use the module pattern: export functions and types from index files. Keep internal implementation private (not exported).');
      rules.push('For dependency injection, use constructor injection with interfaces. Avoid service locator or global singletons in business logic.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('');
      rules.push('### Python Design');
      rules.push('Use Protocol classes (structural subtyping) over ABC for defining interfaces. This enables duck typing with type safety.');
      rules.push('Use `@dataclass(frozen=True)` or Pydantic `BaseModel` for value objects. Immutability by default.');
      rules.push('Use dependency injection via FastAPI `Depends()`. Define dependencies as functions or classes implementing a protocol.');
      rules.push('Prefer plain functions over classes for stateless operations. Use classes when you need encapsulated state or multiple related operations on the same data.');
    } else if (be.framework === 'java-spring') {
      rules.push('');
      rules.push('### Java/Spring Design');
      rules.push('Use constructor injection (`@RequiredArgsConstructor` with Lombok or explicit constructor). Never use field injection (`@Autowired` on fields).');
      rules.push('Use `sealed interface` for closed type hierarchies (e.g., event types, command types). Use `record` for immutable DTOs and value objects.');
      rules.push('Follow the hexagonal architecture pattern: domain core has no framework dependencies. Spring annotations live in the adapter/infrastructure layer only.');
      rules.push('Use `@Service` for business logic, `@Repository` for data access, `@Controller` for HTTP. Never mix these roles.');
    } else if (be.framework === 'go') {
      rules.push('');
      rules.push('### Go Design');
      rules.push('Accept interfaces, return structs. Define interfaces at the call site (consumer), not at the implementation site.');
      rules.push('Keep interfaces small: 1-3 methods. The larger the interface, the weaker the abstraction. `io.Reader` has 1 method — that is the goal.');
      rules.push('Use struct embedding for composition, not inheritance. Embed interfaces in structs for partial implementation.');
      rules.push('Use functional options pattern (`WithTimeout(5s)`) for configurable constructors instead of large config structs.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('');
      rules.push('### C#/.NET Design');
      rules.push('Use the built-in DI container. Register services with appropriate lifetimes: Transient for stateless, Scoped for per-request, Singleton for shared state.');
      rules.push('Use `record` types for DTOs and value objects. Use `sealed` on classes that are not designed for inheritance.');
      rules.push('Use the MediatR/mediator pattern for complex command/query workflows to keep controllers thin.');
      rules.push('Use `IOptions<T>` pattern for configuration. Never inject `IConfiguration` directly into services.');
    } else if (be.framework === 'ruby-rails') {
      rules.push('');
      rules.push('### Ruby/Rails Design');
      rules.push('Use service objects (POROs) for business logic that spans multiple models. One public method per service object: `call` or `execute`.');
      rules.push('Use form objects for complex validations that span multiple models. Do not put cross-model validation in controllers.');
      rules.push('Use query objects for complex database queries. Keep ActiveRecord scopes simple (1-2 conditions). Anything more complex goes in a query object.');
      rules.push('Prefer modules with `include` for shared behavior over deep class inheritance.');
    } else if (be.framework === 'php-laravel') {
      rules.push('');
      rules.push('### PHP/Laravel Design');
      rules.push('Use Action classes (single-responsibility) for business logic. One public `handle()` or `execute()` method per action.');
      rules.push('Use Form Requests for validation. Never validate in controllers directly.');
      rules.push('Use Repository pattern to abstract Eloquent queries. Controllers and services depend on repository interfaces.');
      rules.push('Use Laravel\'s service container for DI. Bind interfaces to implementations in service providers.');
    }
  }

  // ── Frontend-specific patterns ──
  for (const fe of frontends) {
    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      rules.push('');
      rules.push('### React Component Design');
      rules.push('Separate presentational components (UI only, receive data via props) from container components (data fetching, state management).');
      rules.push('Use custom hooks to encapsulate reusable stateful logic. A hook should do one thing — compose multiple hooks for complex behavior.');
      rules.push('Use the compound component pattern (e.g., `<Tabs><Tab/><TabPanel/></Tabs>`) for complex UI components instead of a single component with many props.');
      rules.push('Use context sparingly and close to the consumer. Global context for truly global state (auth, theme). Feature-level context for feature state. Never use context as a prop-drilling shortcut for 1-2 levels.');
    } else if (fe.framework === 'vue') {
      rules.push('');
      rules.push('### Vue Component Design');
      rules.push('Use composables (`use<Name>`) for reusable stateful logic. A composable should do one thing and return reactive refs.');
      rules.push('Use provide/inject for dependency injection in component trees. Define injection keys as typed symbols.');
      rules.push('Separate smart components (data fetching, store interaction) from dumb components (props in, events out).');
    } else if (fe.framework === 'angular') {
      rules.push('');
      rules.push('### Angular Design');
      rules.push('Use services for all business logic and data access. Components handle UI only — delegate to services for anything else.');
      rules.push('Use the facade pattern for complex feature modules: a single facade service that composes multiple lower-level services.');
      rules.push('Use RxJS operators for data transformation pipelines. Keep `.subscribe()` calls to a minimum — prefer `async` pipe in templates.');
    }
  }

  // ── Layered Architecture (always applicable) ──
  rules.push('');
  rules.push('### Layered Architecture');
  rules.push('Code MUST be organized into clear layers with unidirectional dependencies:');
  rules.push('**Routes/Controllers** → **Services/Use Cases** → **Repositories/Data Access** → **Database**');
  rules.push('Each layer may only call the layer directly below it. Routes MUST NOT call repositories. Services MUST NOT import route-level concerns (request/response objects).');
  rules.push('Cross-cutting concerns (logging, auth, validation) live in middleware/decorators/interceptors — not scattered across layers.');

  return { category: 'Software Design Patterns & Class Structure', rules };
}

function buildFileSizeStructureRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  // Universal file size limits
  rules.push('Files MUST NOT exceed 500 lines of code. If a file grows beyond this, split it by responsibility.');
  rules.push('Functions/methods MUST NOT exceed 50 lines (excluding blank lines and comments). This is the ESLint default and aligns with Google style guide recommendations (~40 lines). Extract sub-functions with descriptive names.');
  rules.push('Classes MUST NOT exceed 300 lines. If a class is larger, it likely has multiple responsibilities — split it.');

  // When to split
  rules.push('Split triggers: If a file has 2+ unrelated groups of functions, if a class has methods that don\'t use the same fields, or if you need to scroll to understand the flow — it\'s time to split.');
  rules.push('Split by responsibility, not by type. Prefer `user-auth.ts` + `user-profile.ts` over `functions.ts` + `classes.ts`.');

  // Framework-specific structure
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('TypeScript: Route files define routes only — no business logic, no DB queries. If a route file exceeds 200 lines, group routes into sub-routers.');
      rules.push('TypeScript: Service files contain business logic only. If a service exceeds 500 lines, extract domain-specific sub-services.');
      rules.push('TypeScript: Repository files contain data access only. One repository per entity/collection. If a repository exceeds 300 lines, use query-builder helpers.');
      rules.push('TypeScript: Type/interface files define shapes only — no implementation. Group related types in one file, split unrelated types into separate files.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('Python: Route modules define endpoints only. If a router exceeds 200 lines, split into sub-routers by feature.');
      rules.push('Python: Service modules contain business logic. If a service exceeds 500 lines, split into domain-specific services.');
      rules.push('Python: No module should have more than 10 top-level functions. Group related functions into classes or split into sub-modules.');
    } else if (be.framework === 'java-spring') {
      rules.push('Java: One public class per file. Controller classes MUST NOT exceed 200 lines — split endpoints into sub-controllers by feature.');
      rules.push('Java: Service classes MUST NOT exceed 500 lines. Extract domain logic into sub-services or strategy classes.');
    } else if (be.framework === 'go') {
      rules.push('Go: Files MUST NOT exceed 500 lines. Split into multiple files within the same package by concern.');
      rules.push('Go: Interfaces MUST stay small (1-5 methods). If an interface grows beyond 5 methods, split into focused interfaces.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('C#: One class per file. Controllers MUST NOT exceed 200 lines — use partial classes or sub-controllers.');
      rules.push('C#: If a service class exceeds 500 lines, apply the mediator pattern or extract strategy classes.');
    }
  }

  for (const fe of frontends) {
    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      rules.push('React: Components MUST NOT exceed 150 lines (including JSX). If a component is larger, extract sub-components or custom hooks.');
      rules.push('React: Custom hooks MUST NOT exceed 100 lines. If a hook is complex, compose smaller hooks together.');
      rules.push('React: If a component file has more than 3 useEffect calls, extract effects into custom hooks.');
    } else if (fe.framework === 'vue') {
      rules.push('Vue: Single-file components MUST NOT exceed 200 lines. If `<script setup>` exceeds 100 lines, extract composables.');
      rules.push('Vue: Templates MUST NOT exceed 100 lines. Extract sub-components for complex template sections.');
    } else if (fe.framework === 'angular') {
      rules.push('Angular: Component TypeScript files MUST NOT exceed 150 lines. Extract logic into services.');
      rules.push('Angular: Templates MUST NOT exceed 100 lines. Use sub-components for complex sections.');
    } else if (fe.framework === 'svelte') {
      rules.push('Svelte: Component files MUST NOT exceed 200 lines. Extract logic into separate .ts files and import.');
    }
  }

  // Monorepo / large project specific
  if (doc.architecture.style === 'modular-monolith') {
    rules.push('Modules MUST have a flat internal structure. If a module directory exceeds 10 files, organize into sub-folders by concern (routes/, services/, repositories/).');
  }

  return { category: 'File Size & Structure', rules };
}

function buildApiDesignQualityRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];

  for (const be of backends) {
    const apiStyle = be.apiStyle || 'rest';

    if (apiStyle === 'rest') {
      rules.push('API responses MUST use a consistent envelope: `{ data, error, meta }`. Never return raw arrays or objects at the top level.');
      rules.push('List endpoints MUST support pagination. Use cursor-based pagination for feeds, offset-based for admin/dashboards.');
      rules.push('Pagination responses MUST include: `meta: { total, page/cursor, limit, hasMore }`.');
      rules.push('Use plural nouns for resource endpoints: `/users`, `/orders`. Not `/user`, `/order`.');
      rules.push('Nested resources MUST NOT go deeper than 2 levels: `/users/:id/orders` is fine, `/users/:id/orders/:id/items/:id` is not — flatten it.');
      rules.push('Use HTTP status codes correctly: 200 success, 201 created, 204 no content, 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 422 unprocessable, 429 rate limited, 500 server error.');
      rules.push('Filter, sort, and search MUST use query parameters: `?status=active&sort=-createdAt&q=search`. Not custom headers or body params on GET.');
      rules.push('Dates in API responses MUST use ISO 8601 format (UTC). Never return timestamps or locale-specific formats.');
      rules.push('IDs in API responses MUST be strings. Even if they are numeric internally, serialize as strings for forward compatibility.');
    } else if (apiStyle === 'graphql') {
      rules.push('GraphQL: Use Relay-style pagination (edges/nodes/pageInfo) for list fields.');
      rules.push('GraphQL: Mutations MUST return the modified object. Input types MUST be suffixed with `Input`.');
      rules.push('GraphQL: Use DataLoader for batch loading to prevent N+1 queries in resolvers.');
      rules.push('GraphQL: Errors MUST use the `errors` array with extensions for machine-readable codes. Do not return errors in the `data` field.');
    }
  }

  return { category: 'API Design Quality', rules };
}

function buildDatabaseQueryRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const db = doc.data.primaryDatabase;

  rules.push('Prevent N+1 queries: Use eager loading / joins / batch queries for related data. Never query in a loop.');
  rules.push('All list queries MUST be paginated. Never return unbounded result sets.');
  rules.push('Batch writes when possible: Use bulk insert/update operations instead of individual writes in a loop.');

  if (db.type === 'postgres' || db.type === 'mysql' || db.type === 'sqlserver' || db.type === 'cockroachdb' || db.type === 'planetscale') {
    rules.push('Add database indexes for columns used in WHERE, ORDER BY, and JOIN clauses. Document index strategy in migration files.');
    rules.push('Use transactions for operations that modify multiple tables. Wrap in try/catch and rollback on failure.');
    rules.push('Use `SELECT` only the columns you need. Avoid `SELECT *` in production queries.');
    rules.push('Soft deletes: If the SDL specifies soft deletes, all queries MUST filter by `deleted_at IS NULL` by default. Use a query scope/middleware for this.');
  }

  if (db.type === 'mongodb') {
    rules.push('Design documents for your query patterns. Embed data you read together, reference data you query independently.');
    rules.push('Create compound indexes that match your query filters + sort order. Use `explain()` to verify index usage.');
    rules.push('Use `$lookup` sparingly. If you need frequent joins, reconsider document structure or use denormalization.');
    rules.push('Use MongoDB aggregation pipelines for complex queries. Add `$match` as early as possible to reduce pipeline data.');
  }

  if (db.type === 'dynamodb') {
    rules.push('Design single-table. Plan partition key and sort key based on access patterns before writing any code.');
    rules.push('Use GSIs (Global Secondary Indexes) for alternate query patterns. Avoid scans — always query by key.');
    rules.push('Use BatchGetItem / BatchWriteItem for multi-item operations. Max 25 items per batch.');
  }

  return { category: 'Database Query Quality', rules };
}

function buildTestingQualityRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];

  rules.push('Test names MUST describe the expected behavior: `should return 404 when user not found`, not `test getUser`.');
  rules.push('Follow Arrange-Act-Assert (AAA) pattern. Separate setup, execution, and verification with blank lines.');
  rules.push('Each test MUST be independent. No shared mutable state between tests. No test ordering dependencies.');
  rules.push('Test the behavior, not the implementation. Tests should not break when internal code is refactored.');
  rules.push('Use factories/builders for test data. Never hardcode IDs, emails, or dates that aren\'t relevant to the assertion.');

  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('Test files: co-locate at `<file>.test.ts` or `<file>.spec.ts` next to the source file, or in `__tests__/` directory.');
      rules.push('Use `describe` blocks to group related tests by method/feature. Use nested `describe` for edge cases.');
      rules.push('Mock external dependencies at the boundary (service interface), not at the implementation detail level.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('Test files: `tests/test_<module>.py`. Use `pytest` fixtures for setup/teardown.');
      rules.push('Use `pytest.mark.parametrize` for testing multiple inputs with the same assertion.');
    } else if (be.framework === 'go') {
      rules.push('Test files: `<file>_test.go` in the same package. Use table-driven tests for multiple cases.');
      rules.push('Use `testify/assert` or `testify/require` for readable assertions. Use `require` for fatal checks.');
    } else if (be.framework === 'java-spring') {
      rules.push('Test files: same package structure under `src/test/java`. Use `@Nested` classes for grouping.');
      rules.push('Use `@MockBean` for Spring context mocks, `@Mock` + `@InjectMocks` for unit tests without Spring.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('Test files: separate test project mirroring source structure. Use `[Theory]` + `[InlineData]` for parametric tests.');
      rules.push('Use `Moq` or `NSubstitute` for mocking. Verify mock interactions only when side effects matter.');
    }
  }

  return { category: 'Testing Quality', rules };
}

function buildPerformanceRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];

  // Backend performance
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('Node.js: Never block the event loop. Offload CPU-heavy tasks to worker threads or a queue.');
      rules.push('Node.js: Use connection pooling for database connections. Never create a new connection per request.');
      rules.push('Node.js: Stream large responses (files, exports). Never buffer entire large datasets in memory.');
    }
  }
  if (doc.architecture.style === 'serverless') {
    rules.push('Minimize cold starts: Lazy-import heavy modules. Keep function bundles small. Use provisioned concurrency for critical paths.');
  }

  // Frontend performance
  for (const fe of frontends) {
    if (fe.framework === 'nextjs' || fe.framework === 'react' || fe.framework === 'vue' || fe.framework === 'svelte' || fe.framework === 'angular') {
      rules.push('Lazy-load routes and heavy components. Only the initial route should be in the main bundle.');
      rules.push('Images MUST use lazy loading (`loading="lazy"`) and explicit width/height to prevent layout shifts.');
      rules.push('Use code splitting per route at minimum. Split further for heavy features (editors, charts, maps).');
    }

    if (fe.framework === 'nextjs') {
      rules.push('Next.js: Use `next/image` for all images. Never use raw `<img>` tags.');
      rules.push('Next.js: Use Server Components by default. Add `"use client"` only when the component needs interactivity or browser APIs.');
      rules.push('Next.js: Use `loading.tsx` for suspense boundaries. Use `error.tsx` for error boundaries.');
    }

    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      rules.push('Virtualize long lists (>100 items). Use `react-window` or `@tanstack/virtual` instead of rendering all items.');
    }
  }

  return { category: 'Performance', rules };
}

function buildImportOrganizationRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  const hasTs = backends.some(b => b.framework === 'nodejs') || frontends.some(f => ['nextjs', 'react', 'vue', 'angular', 'svelte'].includes(f.framework));
  const hasPython = backends.some(b => b.framework === 'python-fastapi');
  const hasGo = backends.some(b => b.framework === 'go');
  const hasJava = backends.some(b => b.framework === 'java-spring');

  if (hasTs) {
    rules.push('Import order (TypeScript): 1) Node built-ins (`node:fs`, `node:path`) 2) External packages (`express`, `zod`) 3) Internal aliases (`@/lib`, `@/components`) 4) Relative imports (`./utils`, `../types`). Separate groups with a blank line.');
    rules.push('Use `import type { X }` for type-only imports. Keeps runtime bundle clean.');
    rules.push('Barrel exports (`index.ts`): Use only for public module APIs. Never re-export everything from a deep tree — it kills tree-shaking.');
  }

  if (hasPython) {
    rules.push('Import order (Python): 1) Standard library 2) Third-party packages 3) Local/project imports. Separate groups with a blank line. Use `isort` to enforce.');
    rules.push('Use absolute imports for cross-module references. Relative imports only within the same package.');
  }

  if (hasGo) {
    rules.push('Import order (Go): 1) Standard library 2) External modules 3) Internal packages. Separate groups with a blank line. Use `goimports` to enforce.');
  }

  if (hasJava) {
    rules.push('Import order (Java): 1) `java.*` 2) `javax.*` 3) Third-party 4) Project packages. No wildcard imports (`*`).');
  }

  // Circular dependency prevention (all languages)
  rules.push('No circular imports/dependencies. If module A imports from B, B MUST NOT import from A. Use interfaces or events to break cycles.');

  return { category: 'Import Organization', rules };
}

function buildTechDebtAvoidanceRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  // Dependency hygiene
  rules.push('Before adding a new dependency, check: 1) Does a built-in/existing dependency already solve this? 2) Is the package actively maintained? 3) What is its bundle size impact? Prefer built-in solutions over micro-packages.');
  rules.push('Pin dependency versions exactly (`"express": "4.21.0"`, not `"^4.21.0"`). Use lockfiles. Run `npm audit` / `pip audit` / `go mod verify` in CI.');
  rules.push('Review and update dependencies monthly. Track outdated packages. A dependency 2+ major versions behind is tech debt.');

  // Code hygiene
  rules.push('No TODO/FIXME/HACK comments without a linked issue/ticket. If it needs fixing, track it. Untracked TODOs become permanent debt.');
  rules.push('Dead code MUST be deleted, not commented out. If unused imports, variables, functions, or files exist, remove them. Version control is the archive.');
  rules.push('No copy-paste duplication. If logic is duplicated across 3+ places, extract it. Two occurrences is fine — three is a pattern that needs abstraction.');
  rules.push('Feature flags and temporary workarounds MUST have an expiry date or linked issue. Remove them when the feature ships or the workaround is resolved.');

  // Abstraction discipline
  rules.push('Don\'t abstract prematurely. Wait for 3 concrete use cases before creating a shared utility, base class, or generic solution. Wrong abstractions are worse than duplication.');
  rules.push('Keep abstractions shallow. If understanding a function requires reading 4+ files of indirection, the abstraction has negative value — flatten it.');
  rules.push('Every abstraction MUST have at least 2 consumers. If a "shared" utility is used in exactly one place, inline it.');

  // Naming and readability
  rules.push('Names MUST be searchable and unambiguous. `getUserOrders` not `getData`. `maxRetryAttempts` not `n`. `isAuthenticated` not `flag`.');
  rules.push('Boolean variables and functions MUST read as yes/no questions: `isValid`, `hasPermission`, `canDelete`, `shouldRetry`. Not `valid`, `permission`, `delete`, `retry`.');
  rules.push('Avoid abbreviations except widely understood ones (URL, HTTP, ID, API, DB, DTO). `usr`, `mgr`, `svc`, `btn` create cognitive debt for every reader.');

  // Configuration and environment
  rules.push('No environment-specific `if (env === "production")` branches in business logic. Use configuration objects or strategy patterns instead.');

  // Framework-specific debt traps
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('TypeScript: Keep `tsconfig.json` strict. Never disable strict checks to "fix" type errors — fix the actual types.');
      rules.push('Do not add `@ts-ignore` or `@ts-expect-error` without a comment explaining why and a linked issue to fix it.');
      rules.push('Avoid monkey-patching prototypes, global augmentations, or module-level side effects. They create hidden coupling.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('Keep `pyproject.toml` or `requirements.txt` clean. No unused dependencies. Pin versions.');
      rules.push('Use `# type: ignore` only with a comment explaining why. Do not suppress type errors globally.');
    } else if (be.framework === 'java-spring') {
      rules.push('Avoid Spring annotation magic for business logic. If behavior requires reading 5 annotations to understand, make it explicit.');
      rules.push('Do not suppress deprecation warnings. Replace deprecated APIs promptly.');
    } else if (be.framework === 'ruby-rails') {
      rules.push('Avoid global concerns and monkey-patches. Keep Rails initializers focused. Each should do one thing.');
      rules.push('ActiveRecord callbacks create hidden side effects. Prefer service objects for multi-step business logic.');
    } else if (be.framework === 'php-laravel') {
      rules.push('Avoid "God" models with 50+ methods. Extract domain logic into service classes.');
      rules.push('Do not override framework internals. Use intended extension points (middleware, service providers, events).');
    }
  }

  for (const fe of frontends) {
    if (fe.framework === 'vue') {
      rules.push('Vue: Do not mix Options API and Composition API in the same codebase. Consistency prevents cognitive overhead.');
    }
  }

  // Explicit tech debt from SDL
  const techDebt = doc.technicalDebt || [];
  if (techDebt.length > 0) {
    rules.push('');
    rules.push('### Known Technical Debt (from SDL)');
    rules.push('The following items are acknowledged tech debt with planned mitigation. Do NOT add to them without updating the SDL:');
    for (const item of techDebt) {
      const priority = item.priority ? ` [${item.priority.toUpperCase()}]` : '';
      const mitigation = item.mitigationPlan ? ` Mitigation: ${item.mitigationPlan}` : '';
      rules.push(`- **${item.decision}**${priority}: ${item.reason}.${mitigation}`);
    }
  }

  // Evolution triggers
  const evolution = doc.evolution;
  if (evolution?.triggers && evolution.triggers.length > 0) {
    rules.push('');
    rules.push('### Architecture Evolution Triggers');
    rules.push('These conditions trigger architecture changes. Monitor for them and do not introduce code that conflicts with planned evolution:');
    for (const trigger of evolution.triggers) {
      const effort = trigger.estimatedEffort ? ` (est. ${trigger.estimatedEffort})` : '';
      rules.push(`- When **${trigger.condition}** → ${trigger.action}${effort}`);
    }
  }

  return { category: 'Tech Debt Avoidance', rules };
}

function buildAccessibilityRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const frontends = doc.architecture.projects.frontend || [];
  const compliance = doc.nonFunctional.compliance?.frameworks || [];
  const hasWcag = compliance.some(f => f === 'soc2'); // WCAG not in enum, but SOC2 implies accessible

  rules.push('All interactive elements MUST be keyboard accessible. Tab order must be logical. No keyboard traps.');
  rules.push('Use semantic HTML elements: `<button>` for actions, `<a>` for navigation, `<nav>`, `<main>`, `<article>`, `<aside>` for structure. No `<div onclick>`.');
  rules.push('All images MUST have `alt` text. Decorative images use `alt=""`. Informative images describe the content.');
  rules.push('Form inputs MUST have associated `<label>` elements or `aria-label`. No placeholder-only labels.');
  rules.push('Color MUST NOT be the only way to convey information. Use icons, text, or patterns alongside color.');
  rules.push('Minimum color contrast ratio: 4.5:1 for normal text, 3:1 for large text (WCAG AA).');
  rules.push('Focus indicators MUST be visible. Never use `outline: none` without providing an alternative focus style.');
  rules.push('Dynamic content changes MUST be announced to screen readers. Use `aria-live` regions for async updates, toasts, and status messages.');
  rules.push('Modals and dialogs MUST trap focus while open and return focus to the trigger element on close.');

  for (const fe of frontends) {
    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      rules.push('React: Use `<button>` not `<div role="button">`. If you need a custom component, implement `onKeyDown` for Enter/Space.');
      rules.push('React: Use `next/link` or `<Link>` for navigation. Never use `<a>` without `href` or `<div onClick>` for navigation.');
      rules.push('React: Lists of interactive items MUST have `role` and `aria-*` attributes (e.g., `role="listbox"`, `aria-selected`).');
    } else if (fe.framework === 'vue') {
      rules.push('Vue: Use `v-focus` directive or `ref` for focus management. Handle focus on route changes.');
    } else if (fe.framework === 'angular') {
      rules.push('Angular: Use `cdkTrapFocus` for dialogs. Use `LiveAnnouncer` for dynamic content announcements.');
    }
  }

  if (hasWcag || compliance.length > 0) {
    rules.push('WCAG 2.1 AA compliance is required. All new features MUST pass automated a11y testing (axe-core or similar) before merge.');
  }

  return { category: 'Accessibility', rules };
}

function buildInternationalizationRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const frontends = doc.architecture.projects.frontend || [];
  const backends = doc.architecture.projects.backend || [];
  const regions = doc.solution.regions;

  rules.push('No hardcoded user-facing strings. ALL text displayed to users MUST go through the i18n system (translation files/keys).');
  rules.push('Use ICU MessageFormat or equivalent for pluralization, gender, and variable interpolation. No string concatenation for translated text.');
  rules.push('Date, time, number, and currency formatting MUST use locale-aware formatters (`Intl.DateTimeFormat`, `Intl.NumberFormat`). Never format manually.');
  rules.push('Do not assume left-to-right text direction. Use logical CSS properties (`margin-inline-start` not `margin-left`) if RTL support is needed.');
  rules.push('Translation keys MUST be namespaced by feature: `auth.login.title`, `dashboard.stats.total`. No flat key structures.');
  rules.push('Do not embed text in images, SVGs, or icons. Use CSS/HTML text that can be translated.');

  if (regions) {
    const allRegions = [regions.primary, ...(regions.secondary || [])].filter(Boolean);
    if (allRegions.length > 0) {
      rules.push(`Target regions: ${allRegions.join(', ')}. Ensure translation files exist for all target locales before shipping.`);
    }
  }

  for (const fe of frontends) {
    if (fe.framework === 'nextjs') {
      rules.push('Next.js: Use `next-intl` or built-in i18n routing. Configure locale detection and fallback in `next.config.js`.');
    } else if (fe.framework === 'react') {
      rules.push('React: Use `react-intl` or `react-i18next`. Wrap the app in an i18n provider. Extract strings with the library CLI.');
    } else if (fe.framework === 'vue') {
      rules.push('Vue: Use `vue-i18n`. Configure fallback locale. Use `$t()` in templates and `t()` in `<script setup>`.');
    } else if (fe.framework === 'angular') {
      rules.push('Angular: Use `@angular/localize` or `ngx-translate`. Extract messages with `ng extract-i18n`.');
    }
  }

  for (const be of backends) {
    rules.push('Backend: User-facing error messages and email content MUST support localization. Accept `Accept-Language` header and pass locale context.');
    rules.push('Store user locale preference in the user profile. Use it as the default for all responses.');
  }

  return { category: 'Internationalization (i18n)', rules };
}

function buildMobileRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const mobiles = doc.architecture.projects.mobile || [];

  // Universal mobile rules
  rules.push('Design for offline-first where possible. Cache critical data locally. Show stale data with a sync indicator rather than a loading spinner.');
  rules.push('Handle network transitions gracefully. Queue mutations when offline and sync when connectivity returns.');
  rules.push('Request permissions lazily — only when the feature that needs the permission is first used. Never ask for all permissions at launch.');
  rules.push('Deep links MUST be registered and handled. Map URL paths to screens/routes consistently with the web app.');
  rules.push('Handle app lifecycle events (background, foreground, terminate). Save state before backgrounding. Restore on foreground.');
  rules.push('Support both light and dark mode. Use system theme detection with user override option.');
  rules.push('Touch targets MUST be at least 44x44pt (iOS) / 48x48dp (Android). No tiny tap targets.');

  for (const mob of mobiles) {
    if (mob.framework === 'react-native') {
      rules.push('React Native: Use functional components with hooks. No class components.');
      rules.push('React Native: Use `FlatList` or `FlashList` for lists. Never use `ScrollView` for dynamic-length lists.');
      rules.push('React Native: Use `react-navigation` for routing. Define navigation types for type-safe navigation.');
      rules.push('React Native: Avoid `Animated` API for complex animations — use `react-native-reanimated` for 60fps UI-thread animations.');
      rules.push('React Native: Use platform-specific files (`*.ios.ts`, `*.android.ts`) only when platform behavior truly differs. Prefer cross-platform code.');
      rules.push('React Native: Store sensitive data (tokens, keys) in secure storage (`react-native-keychain`), not AsyncStorage.');
    } else if (mob.framework === 'flutter') {
      rules.push('Flutter: Use `StatelessWidget` by default. Only use `StatefulWidget` when local mutable state is needed.');
      rules.push('Flutter: Use `const` constructors wherever possible for widget performance.');
      rules.push('Flutter: Use `ListView.builder` for dynamic lists. Never build all list items at once.');
      rules.push('Flutter: State management: Use the project\'s chosen solution (Riverpod/BLoC/Provider) consistently. Do not mix approaches.');
      rules.push('Flutter: Use `go_router` or `auto_route` for declarative routing with type-safe parameters.');
      rules.push('Flutter: Store sensitive data with `flutter_secure_storage`, not `SharedPreferences`.');
    } else if (mob.framework === 'swift') {
      rules.push('Swift: Use SwiftUI for new screens. UIKit only for features that SwiftUI does not yet support.');
      rules.push('Swift: Use `@Observable` (iOS 17+) or `ObservableObject` for state management. Minimize `@State` in complex views.');
      rules.push('Swift: Use `NavigationStack` for navigation. Define routes as a typed enum.');
      rules.push('Swift: Use Keychain Services for storing credentials. Never use UserDefaults for sensitive data.');
      rules.push('Swift: Use structured concurrency (`async`/`await`, `TaskGroup`). Avoid GCD dispatch queues in new code.');
    } else if (mob.framework === 'kotlin') {
      rules.push('Kotlin: Use Jetpack Compose for new screens. XML layouts only for legacy screens.');
      rules.push('Kotlin: Use ViewModel + StateFlow for state management. Collect flows with `collectAsStateWithLifecycle()`.');
      rules.push('Kotlin: Use Navigation Compose with type-safe arguments. Define routes as sealed classes.');
      rules.push('Kotlin: Use EncryptedSharedPreferences or Android Keystore for sensitive data. Never use plain SharedPreferences.');
      rules.push('Kotlin: Use Kotlin coroutines for async work. No RxJava in new code.');
    } else if (mob.framework === 'ionic') {
      rules.push('Ionic: Use Capacitor plugins for native functionality. Cordova plugins only if no Capacitor equivalent exists.');
      rules.push('Ionic: Use `ion-virtual-scroll` or `@ionic/angular` virtual scroll for long lists.');
      rules.push('Ionic: Use Capacitor Preferences for non-sensitive storage. Use a secure storage plugin for tokens.');
    }

    // Platform-specific rules
    if (mob.platform === 'ios' || mob.platform === 'cross-platform') {
      rules.push('iOS: Support the latest 2 major iOS versions. Test on both iPhone and iPad if iPad is supported.');
      rules.push('iOS: Follow Apple Human Interface Guidelines for UI patterns (navigation, tab bars, sheets).');
    }
    if (mob.platform === 'android' || mob.platform === 'cross-platform') {
      rules.push('Android: Target the latest SDK. Set `minSdkVersion` based on your user demographics (API 26+ covers 95%+ of devices).');
      rules.push('Android: Follow Material Design 3 guidelines. Use Material Components library.');
    }
  }

  return { category: 'Mobile Development', rules };
}

function buildMigrationDeploymentSafetyRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const db = doc.data.primaryDatabase;

  // Database migration safety
  rules.push('Database migrations MUST be backward-compatible. The old code must work with the new schema during rolling deploys.');
  rules.push('Adding columns: Always make new columns nullable or provide a default value. Never add a required column without a data migration.');
  rules.push('Renaming columns/tables: Use a 3-step process: 1) Add new column, 2) Migrate data + dual-write, 3) Remove old column in a later release.');
  rules.push('Deleting columns: First stop reading from the column in code, deploy, then remove the column in a separate migration.');
  rules.push('Never modify a migration that has been applied to any shared environment (staging/production). Create a new migration to fix issues.');
  rules.push('Large data migrations MUST run as background jobs, not in the migration file itself. Lock-free migrations for tables with >100K rows.');

  if (db.type === 'postgres' || db.type === 'mysql' || db.type === 'sqlserver') {
    rules.push('Avoid exclusive table locks in migrations. Use `CREATE INDEX CONCURRENTLY` (Postgres) or equivalent. No `ALTER TABLE ... LOCK=EXCLUSIVE` on busy tables.');
  }

  if (db.type === 'mongodb') {
    rules.push('MongoDB schema changes: Add new fields as optional. Never remove fields that old code reads from without a transition period.');
    rules.push('For large collection updates, use a background migration script with batch processing and progress tracking. Never run `updateMany` on millions of documents in a single operation.');
  }

  // API versioning & backward compatibility
  rules.push('API changes MUST be backward-compatible within a version. Adding fields to responses is safe. Removing fields or changing types is a breaking change.');
  rules.push('Breaking API changes require a new version. Deprecate the old version with a sunset timeline. Never remove old versions without notice.');

  // Deployment safety
  rules.push('All deployments MUST support zero-downtime. Use rolling deploys, blue-green, or canary strategies.');
  rules.push('New features behind feature flags for the first release. Turn on gradually (canary → percentage → full). Remove the flag after stable.');
  rules.push('Rollback plan: Every deployment MUST be rollback-safe. If the new version fails, the previous version must work with the current data/schema.');
  rules.push('Health checks: Every service MUST expose a health endpoint. Load balancers MUST verify health before routing traffic to new instances.');

  // CI/CD safety
  const ciCd = doc.deployment.ciCd;
  if (ciCd) {
    rules.push(`CI/CD: ${ciCd.provider}. All PRs MUST pass the full test suite + lint + build before merge. No manual bypasses.`);
    const envs = ciCd.environments || [];
    if (envs.length > 1) {
      const envNames = envs.map(e => e.name).join(' → ');
      rules.push(`Deployment pipeline: ${envNames}. Code promotes through environments in order. No skipping staging.`);
    }
  }

  return { category: 'Migration & Deployment Safety', rules };
}

function buildDocumentationRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  // When to document
  rules.push('Document the WHY, not the WHAT. Code should be self-documenting for what it does. Comments explain why a non-obvious decision was made.');
  rules.push('Public APIs (exported functions, REST endpoints, library interfaces) MUST have documentation describing: purpose, parameters, return value, and error conditions.');
  rules.push('Complex algorithms, business rules, and workarounds MUST have inline comments explaining the reasoning.');
  rules.push('Do NOT add documentation to: trivial getters/setters, self-explanatory functions (`getUserById`), or private implementation details unless non-obvious.');

  // README standards
  rules.push('Every project/package MUST have a README with: 1) What it does (one paragraph), 2) How to set it up, 3) How to run it, 4) How to test it.');
  rules.push('READMEs MUST stay current. If setup steps change, update the README in the same PR. A wrong README is worse than no README.');

  // Framework-specific doc conventions
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('TypeScript: Use JSDoc `/** */` comments on exported functions and interfaces. Include `@param`, `@returns`, and `@throws` where applicable.');
      rules.push('TypeScript: Do NOT add JSDoc to internal/private functions unless the logic is non-obvious.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('Python: Use docstrings on all public functions and classes. Follow Google style docstrings (Args/Returns/Raises sections).');
      rules.push('FastAPI: Route functions MUST have docstrings — they become the OpenAPI operation description.');
    } else if (be.framework === 'go') {
      rules.push('Go: Exported functions/types MUST have a comment starting with the name: `// UserService handles user operations.`');
      rules.push('Go: Use `go doc` format. Package comments go in `doc.go`.');
    } else if (be.framework === 'java-spring') {
      rules.push('Java: Use Javadoc on all public methods and classes. Include `@param`, `@return`, `@throws`.');
      rules.push('Spring: Controller methods MUST have Swagger/OpenAPI annotations (`@Operation`, `@ApiResponse`).');
    } else if (be.framework === 'dotnet-8') {
      rules.push('C#: Use XML doc comments (`///`) on all public members. Include `<summary>`, `<param>`, `<returns>`.');
      rules.push('C#: Enable `<GenerateDocumentationFile>` in csproj to enforce documentation on public APIs.');
    }
  }

  // API documentation
  const hasApi = backends.length > 0;
  if (hasApi) {
    rules.push('API endpoints MUST be documented in OpenAPI/Swagger format. Keep the spec in sync with the implementation — generate from code annotations where possible.');
    rules.push('Document error responses for each endpoint. Consumers need to know what error codes to expect and handle.');
  }

  // Architecture documentation
  rules.push('Architecture decisions MUST be recorded as ADRs (Architecture Decision Records). Every significant technical choice gets an ADR.');
  rules.push('The SDL is the source of truth for architecture. If code deviates from the SDL, either update the code or update the SDL — never leave them out of sync.');

  return { category: 'Documentation', rules };
}

function buildGitWorkflowRules(doc: SDLDocument): Rule {
  const rules: string[] = [];

  rules.push('Commit messages: Use conventional commits format: `type(scope): description`. Types: feat, fix, refactor, test, docs, chore, ci.');
  rules.push('Commits MUST be atomic. One logical change per commit. Do not mix feature code, refactoring, and formatting in the same commit.');
  rules.push('Branch naming: `feature/<ticket>-short-description`, `fix/<ticket>-short-description`, `chore/<description>`.');
  rules.push('PRs MUST be reviewable in <30 minutes. If a PR is too large, split it into stacked PRs or feature-flagged increments.');
  rules.push('Never commit generated files (build output, node_modules, .env, compiled assets). Keep `.gitignore` up to date.');

  // Deployment-aware rules
  const gitEnvs = doc.deployment.ciCd?.environments || [];
  if (gitEnvs.length > 1) {
    const envList = gitEnvs.map(e => e.name).join(', ');
    rules.push(`Environments: ${envList}. Never push directly to the main/production branch. Use PRs with required reviews.`);
  }

  return { category: 'Git & Workflow', rules };
}

// ─── Resilience & Fault Tolerance ───

function buildResilienceRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const style = doc.architecture.style;
  const backends = doc.architecture.projects.backend || [];
  const hasIntegrations = !!doc.integrations;
  const hasQueues = !!doc.data.queues;

  // Timeouts (universal)
  rules.push('');
  rules.push('### Timeouts');
  rules.push('Every external call (HTTP, database, cache, queue) MUST have an explicit timeout. Never rely on defaults or unlimited timeouts.');
  rules.push('Timeout hierarchy: API gateway (30s) > request handler (25s) > external service call (5-10s) > database query (3-5s). Inner timeouts MUST be shorter than outer timeouts.');
  rules.push('When a timeout fires, return a meaningful error (504 or fallback). Never let requests hang silently.');

  // Retries
  rules.push('');
  rules.push('### Retries');
  rules.push('Use exponential backoff with jitter for retries. Never use fixed-interval retries — they cause thundering herd problems.');
  rules.push('Set a max retry count (typically 3). After max retries, fail gracefully — log the error, return a degraded response, or queue for later processing.');
  rules.push('Only retry idempotent operations (GET, PUT) or operations with idempotency keys. Never blindly retry POST/DELETE without ensuring idempotency.');

  // Circuit breakers (microservices / integrations)
  if (style === 'microservices' || hasIntegrations) {
    rules.push('');
    rules.push('### Circuit Breakers');
    rules.push('Wrap calls to external services and other microservices in circuit breakers. When failure rate exceeds threshold (e.g., 50% in 10s), open the circuit and fail fast.');
    rules.push('Circuit states: CLOSED (normal) → OPEN (failing fast) → HALF-OPEN (testing recovery). Log state transitions.');
    rules.push('Provide fallback behavior when a circuit is open: cached data, default values, or graceful degradation. Never return raw errors to users from an open circuit.');
  }

  // Graceful degradation
  rules.push('');
  rules.push('### Graceful Degradation');
  rules.push('Non-critical features (analytics, recommendations, notifications) MUST NOT block the critical path. If they fail, log and continue.');
  if (hasIntegrations) {
    rules.push('External integrations MUST have fallback behavior. If the email service is down, queue the email. If the payment provider times out, show "try again" — never leave the user in an unknown state.');
  }

  // Idempotency
  rules.push('');
  rules.push('### Idempotency');
  rules.push('All write endpoints that can be retried (payments, orders, state transitions) MUST support idempotency keys. Accepting the same request twice should produce the same result, not duplicate side effects.');
  rules.push('Use database unique constraints or idempotency key tables to prevent duplicate processing. Check before executing, not after.');

  // Bulkhead pattern (microservices)
  if (style === 'microservices') {
    rules.push('');
    rules.push('### Bulkhead Isolation');
    rules.push('Isolate resource pools (connection pools, thread pools, rate limits) per downstream dependency. A failing dependency should not exhaust resources needed by healthy dependencies.');
  }

  // Queue-specific resilience
  if (hasQueues) {
    rules.push('');
    rules.push('### Queue Resilience');
    rules.push('Queue consumers MUST be idempotent. Messages can be delivered more than once — design for at-least-once delivery.');
    rules.push('Use dead-letter queues (DLQ) for messages that fail processing after max retries. Monitor DLQ depth and alert on growth.');
    rules.push('Set visibility timeouts longer than the maximum processing time. If processing takes longer than the timeout, the message will be redelivered to another consumer.');
  }

  // Framework-specific
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('');
      rules.push('Node.js: Use `AbortController` with `setTimeout` for cancellable async operations. Clean up resources in the abort handler.');
      rules.push('Node.js: Handle `SIGTERM` and `SIGINT` for graceful shutdown — stop accepting new requests, finish in-flight requests, close DB connections, then exit.');
    } else if (be.framework === 'java-spring') {
      rules.push('');
      rules.push('Java: Use Resilience4j for circuit breakers, retries, rate limiting, and bulkheads. Configure via application properties, not hardcoded values.');
    } else if (be.framework === 'go') {
      rules.push('');
      rules.push('Go: Use `context.WithTimeout` for all external calls. Propagate context through the call chain. Check `ctx.Err()` before expensive operations.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('');
      rules.push('C#: Use Polly for retry policies, circuit breakers, and timeout policies. Register policies via `IHttpClientFactory` for HTTP clients.');
    }
  }

  return { category: 'Resilience & Fault Tolerance', rules };
}

// ─── Input Validation & Sanitization ───

function buildInputValidationRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];

  // Defense in depth
  rules.push('');
  rules.push('### Validation Strategy');
  rules.push('Validate at every system boundary: API input, file uploads, webhook payloads, queue messages, environment variables. Never trust data from outside your process.');
  rules.push('Use schema-first validation: define the expected shape, then validate against it. Never validate with scattered `if` checks across the handler.');
  rules.push('Validation MUST happen before any business logic executes. Parse and validate input at the boundary, then pass typed/validated objects to services.');

  // Fail-fast with clear errors
  rules.push('');
  rules.push('### Error Reporting');
  rules.push('Return all validation errors at once, not one at a time. Collect every field error and return them together so the client can fix all issues in one pass.');
  rules.push('Validation error responses MUST include: the field path, what was wrong, and what was expected. Example: `{ field: "email", message: "must be a valid email", received: "notanemail" }`.');

  // Framework-specific validation
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('');
      rules.push('### TypeScript Validation');
      rules.push('Use Zod, Valibot, or AJV for runtime validation at API boundaries. TypeScript types are compile-time only — they do NOT validate runtime input.');
      rules.push('Define a validation schema per endpoint. Parse request body/params/query with the schema at the top of the handler or in middleware.');
      rules.push('Use `.transform()` in schemas to coerce and normalize input (trim strings, parse dates, lowercase emails) during validation — not scattered in business logic.');
      rules.push('For reusable validation (email, phone, URL, UUID), create shared schema fragments and compose them into endpoint schemas.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('');
      rules.push('### Python Validation');
      rules.push('Use Pydantic models for all request/response validation. Define `BaseModel` subclasses with field validators. FastAPI validates automatically.');
      rules.push('Use `@field_validator` for custom field rules and `@model_validator` for cross-field validation. Never validate in the route handler body.');
      rules.push('Use `constr`, `conint`, `EmailStr`, `HttpUrl` for built-in constrained types. Prefer Pydantic constraints over manual checks.');
    } else if (be.framework === 'java-spring') {
      rules.push('');
      rules.push('### Java Validation');
      rules.push('Use Bean Validation (JSR 380) annotations: `@NotNull`, `@Size`, `@Email`, `@Pattern`, `@Valid` on nested objects. Add `@Validated` on controller classes.');
      rules.push('Create custom constraint annotations for domain-specific validation (e.g., `@ValidCurrency`, `@StrongPassword`). Keep validation declarative.');
      rules.push('Use `@ControllerAdvice` with `@ExceptionHandler(MethodArgumentNotValidException.class)` to transform validation errors into consistent API responses.');
    } else if (be.framework === 'go') {
      rules.push('');
      rules.push('### Go Validation');
      rules.push('Use `go-playground/validator` with struct tags for input validation. Validate at the handler level before passing to services.');
      rules.push('Return structured validation errors as a slice. Never return generic "invalid input" — tell the caller which field and why.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('');
      rules.push('### C# Validation');
      rules.push('Use FluentValidation for complex rules. Use Data Annotations for simple constraints. Register validators via DI.');
      rules.push('Use `IValidationFilter` or middleware to validate automatically before the action executes. Never call `.Validate()` manually in controllers.');
    } else if (be.framework === 'ruby-rails') {
      rules.push('');
      rules.push('### Ruby Validation');
      rules.push('Use Strong Parameters for mass assignment protection. Use model validations for business rules. Use Form Objects for complex multi-model validation.');
      rules.push('Custom validators go in `app/validators/`. Use `ActiveModel::Validations` for non-ActiveRecord objects.');
    } else if (be.framework === 'php-laravel') {
      rules.push('');
      rules.push('### PHP Validation');
      rules.push('Use Form Request classes for endpoint validation. Never validate in controllers directly. One Form Request class per endpoint.');
      rules.push('Use `Rule::` objects for complex validation. Use custom Rule classes in `app/Rules/` for reusable domain validation.');
    }
  }

  // Sanitization
  rules.push('');
  rules.push('### Sanitization');
  rules.push('Trim whitespace from string inputs. Normalize email to lowercase. Strip control characters from text fields.');
  rules.push('Sanitize HTML in user-generated content if rendered: use an allowlist approach (only permit specific tags). In API-only backends, reject HTML in text fields entirely.');
  rules.push('File uploads: validate MIME type (check magic bytes, not just extension), enforce max file size, scan for malware if storing user uploads, and never serve uploads from the same domain as the app.');

  // Frontend validation
  if (frontends.length > 0) {
    rules.push('');
    rules.push('### Frontend Validation');
    rules.push('Client-side validation is for UX only — it is NOT a security boundary. Always re-validate on the server.');
    rules.push('Show validation errors inline next to the field, not as a single alert. Validate on blur for individual fields, on submit for the full form.');
    rules.push('Disable submit buttons during async validation. Show loading state. Never let the user submit twice.');
  }

  return { category: 'Input Validation & Sanitization', rules };
}

// ─── State Management (Frontend) ───

function buildStateManagementRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const frontends = doc.architecture.projects.frontend || [];

  // Universal state principles
  rules.push('');
  rules.push('### State Categories');
  rules.push('Categorize state by scope before choosing where to put it:');
  rules.push('**Server state** (API data): Use a data-fetching library with caching (TanStack Query, SWR, Apollo). Never store fetched data in local state and manually keep it in sync.');
  rules.push('**UI state** (modals, tabs, accordion): Keep in component-local state. It does not belong in a global store.');
  rules.push('**Form state** (input values, validation): Use a form library (React Hook Form, Formik, VeeValidate) or component state. Not a global store.');
  rules.push('**App state** (auth, theme, feature flags): Global store or context. This is the only state that truly needs to be global.');
  rules.push('**URL state** (filters, pagination, search): Store in URL query parameters. The URL is state — use it. Enables deep linking and browser back/forward.');

  // Anti-patterns
  rules.push('');
  rules.push('### State Anti-patterns');
  rules.push('NEVER duplicate server data in a global store. Fetch it, cache it, invalidate it — do not copy it into Redux/Zustand/Pinia and try to keep it in sync manually.');
  rules.push('NEVER store derived data. If `fullName = firstName + lastName`, compute it. Do not store `fullName` separately.');
  rules.push('NEVER use global state as a prop-drilling shortcut for 1-2 levels. Pass props directly or use component composition.');

  // Framework-specific
  for (const fe of frontends) {
    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      rules.push('');
      rules.push('### React State Management');
      rules.push('Use `useState` for component-local UI state. Use `useReducer` for complex state with multiple sub-values or state transitions.');
      rules.push('Use TanStack Query (or SWR) for all server state. Configure `staleTime`, `gcTime`, and `refetchOnWindowFocus` per query. Invalidate on mutations.');
      rules.push('If a global store is needed (rare — auth, theme, feature flags), prefer Zustand over Redux. Zustand is simpler, has less boilerplate, and works well with React 18+.');
      rules.push('If using Redux, use Redux Toolkit (RTK). Never write Redux without RTK — no manual action creators, reducers, or `connect()`. Use RTK Query for server state.');
      rules.push('Context is NOT a state manager. Use it for dependency injection (theme, locale, auth token). If context value changes frequently, it triggers re-renders in all consumers — use a store instead.');

      if (fe.framework === 'nextjs') {
        rules.push('Next.js: Prefer Server Components for data fetching. Client-side state management is only for interactive client-side features.');
        rules.push('Next.js: Use `searchParams` for URL state in Server Components. Use `useSearchParams` in Client Components.');
      }
    } else if (fe.framework === 'vue') {
      rules.push('');
      rules.push('### Vue State Management');
      rules.push('Use `ref()` and `reactive()` for component-local state. Use composables (`use<Name>`) for reusable stateful logic.');
      rules.push('Use Pinia for global state. One store per domain (auth, cart, notifications). Never create a single monolithic store.');
      rules.push('Pinia stores: Use `defineStore` with the setup syntax (composition API style). Keep actions, getters, and state co-located in the store.');
      rules.push('Use VueQuery (TanStack Query for Vue) for server state. Same pattern as React: fetch, cache, invalidate.');
    } else if (fe.framework === 'angular') {
      rules.push('');
      rules.push('### Angular State Management');
      rules.push('Use signals for component-local state. Use `computed()` for derived state. Use `effect()` sparingly.');
      rules.push('Use NgRx for complex global state if the team requires it. For simpler apps, use Angular services with signals — no need for the full Redux pattern.');
      rules.push('If using NgRx: One feature store per module. Use `createFeature()` for co-located reducers/selectors. Use effects for side effects.');
      rules.push('Use the `async` pipe in templates instead of manual `.subscribe()` calls. Unsubscribed observables are memory leaks.');
    } else if (fe.framework === 'svelte') {
      rules.push('');
      rules.push('### Svelte State Management');
      rules.push('Use `$state` rune for component-local state. Use `$derived` for computed values. Use `$effect` for side effects.');
      rules.push('Use Svelte stores (`writable`, `readable`, `derived`) for shared state across components. Keep stores small and focused.');
      rules.push('For server state, use SvelteKit `load` functions. Avoid duplicating server data in client-side stores.');
    }
  }

  // State normalization for any framework with complex data
  if (frontends.length > 0) {
    rules.push('');
    rules.push('### State Shape');
    rules.push('Normalize nested data in stores: use flat maps keyed by ID (`{ [id]: entity }`) instead of deeply nested arrays. Avoids painful deep updates and makes lookups O(1).');
    rules.push('Keep state serializable (no class instances, functions, or DOM elements in state). State should be JSON-serializable for debugging, persistence, and SSR hydration.');
  }

  return { category: 'State Management', rules };
}

// ─── Concurrency & Race Conditions ───

function buildConcurrencyRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];
  const style = doc.architecture.style;
  const db = doc.data.primaryDatabase;

  // Universal concurrency
  rules.push('');
  rules.push('### Preventing Race Conditions');
  rules.push('Any operation that reads-then-writes MUST use atomic operations or optimistic locking. Read-modify-write without locking is a race condition waiting to happen.');
  rules.push('Use database-level atomicity: `UPDATE ... WHERE version = X` (optimistic locking), `findOneAndUpdate` (atomic), or `SELECT ... FOR UPDATE` (pessimistic locking). Never read a value, modify it in application code, and write it back without protection.');

  // Optimistic locking
  rules.push('');
  rules.push('### Optimistic Locking');
  rules.push('For low-contention data (user profiles, settings, content), use optimistic locking with a version field. Increment version on every write, reject writes with stale versions.');
  rules.push('When an optimistic lock fails (version mismatch), return 409 Conflict to the client with the current version. Let the client merge and retry.');

  // Database-specific
  if (db.type === 'postgres' || db.type === 'mysql' || db.type === 'sqlserver' || db.type === 'cockroachdb') {
    rules.push('');
    rules.push('### Database Concurrency (SQL)');
    rules.push('Use `SERIALIZABLE` or `REPEATABLE READ` isolation level for critical financial transactions. Default `READ COMMITTED` is fine for most operations.');
    rules.push('Use `SELECT ... FOR UPDATE` when you need to read a row and guarantee no one else modifies it before your write. Keep the lock duration minimal.');
    rules.push('Use advisory locks for application-level coordination (e.g., preventing duplicate cron job execution). Release locks explicitly.');
  }

  if (db.type === 'mongodb') {
    rules.push('');
    rules.push('### Database Concurrency (MongoDB)');
    rules.push('Use `findOneAndUpdate` with `$set`, `$inc`, `$push` for atomic field-level updates. Never read a document, modify it in code, and replace the whole document.');
    rules.push('Use MongoDB transactions only when updating multiple documents that must be consistent. Single-document operations are already atomic.');
    rules.push('Add a `version` field and use `{ version: expectedVersion }` in the filter for optimistic locking on documents with concurrent access.');
  }

  // Distributed systems
  if (style === 'microservices') {
    rules.push('');
    rules.push('### Distributed Concurrency');
    rules.push('Use distributed locks (Redis `SET NX EX`, ZooKeeper, or database advisory locks) for cross-service coordination. Always set a TTL — a crashed process must not hold a lock forever.');
    rules.push('Prefer saga pattern over distributed transactions. Each service performs its local transaction and publishes events. Compensating transactions undo previous steps on failure.');
    rules.push('Design for eventual consistency. Accept that not all data will be immediately consistent across services. Use events and idempotent handlers to converge.');
  }

  // Async concurrency patterns
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('');
      rules.push('### Node.js Concurrency');
      rules.push('Use `Promise.all()` for independent async operations. Use `Promise.allSettled()` when some failures are acceptable and you need all results.');
      rules.push('Rate-limit concurrent external calls. Use `p-limit`, `p-queue`, or semaphore patterns to avoid overwhelming downstream services (e.g., max 10 concurrent API calls).');
      rules.push('Use `AsyncLocalStorage` for request-scoped context (request ID, user ID, trace ID). Never use module-level variables for per-request state.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('');
      rules.push('### Python Concurrency');
      rules.push('Use `asyncio.gather()` for independent async operations. Use `asyncio.Semaphore` to limit concurrency to downstream services.');
      rules.push('Never mix sync and async code paths. Use `run_in_executor()` to run blocking I/O in a thread pool if a sync library is unavoidable.');
    } else if (be.framework === 'java-spring') {
      rules.push('');
      rules.push('### Java Concurrency');
      rules.push('Use `@Transactional` with appropriate isolation levels. Default to `READ_COMMITTED`. Use `SERIALIZABLE` only for critical sections.');
      rules.push('Prefer `CompletableFuture` for async composition. Use virtual threads (Java 21+) for I/O-bound concurrency instead of platform threads.');
      rules.push('Use `ConcurrentHashMap`, `AtomicInteger`, and other `java.util.concurrent` primitives. Never use `synchronized` on hot paths — it does not scale.');
    } else if (be.framework === 'go') {
      rules.push('');
      rules.push('### Go Concurrency');
      rules.push('Use channels for goroutine communication. Use `sync.Mutex` only when channels are inappropriate (protecting shared data structures).');
      rules.push('Always use `sync.WaitGroup` or `errgroup.Group` to wait for goroutines. Never fire-and-forget goroutines without tracking them.');
      rules.push('Use `context.Context` for cancellation propagation. Every goroutine that does I/O must accept and respect a context.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('');
      rules.push('### C# Concurrency');
      rules.push('Use `Task.WhenAll()` for independent async operations. Use `SemaphoreSlim` for concurrency limiting.');
      rules.push('Never use `Task.Run()` in ASP.NET request handlers — it wastes thread pool threads. Use `async/await` all the way down.');
    }
  }

  // Frontend concurrency
  const frontends = doc.architecture.projects.frontend || [];
  if (frontends.length > 0) {
    rules.push('');
    rules.push('### Frontend Concurrency');
    rules.push('Debounce rapid user actions (search input, window resize, button clicks). Use 300ms debounce for search, immediate + trailing for save buttons.');
    rules.push('Cancel in-flight requests when a new one supersedes them (e.g., search-as-you-type). Use `AbortController` or the data-fetching library\'s built-in cancellation.');
    rules.push('Disable submit buttons during async operations. Show loading state. Prevent double-submission of forms.');
  }

  return { category: 'Concurrency & Race Conditions', rules };
}

// ─── Environment & Configuration ───

function buildConfigurationRules(doc: SDLDocument): Rule {
  const rules: string[] = [];
  const backends = doc.architecture.projects.backend || [];

  // Config hierarchy
  rules.push('');
  rules.push('### Configuration Hierarchy');
  rules.push('Configuration precedence (highest wins): 1) Environment variables 2) `.env` files (per-environment) 3) Config files (JSON/YAML) 4) Hardcoded defaults in code.');
  rules.push('Environment variables for secrets and environment-specific values (DB URLs, API keys, ports). Config files for structural configuration (feature lists, default limits, business rules).');
  rules.push('Never commit `.env` files. Commit `.env.example` with all required keys, placeholder values, and comments explaining each variable.');

  // Validation at startup
  rules.push('');
  rules.push('### Startup Validation');
  rules.push('Validate ALL required configuration at application startup. Fail immediately with a clear error listing every missing/invalid variable. Never let the app start with broken config that crashes at runtime.');
  rules.push('Type-check configuration values at load time. A port must be a number, a URL must be valid, a timeout must be positive. Reject invalid values early.');

  // Framework-specific
  for (const be of backends) {
    if (be.framework === 'nodejs') {
      rules.push('');
      rules.push('### TypeScript Configuration');
      rules.push('Load all config in a single `config.ts` file. Export a typed, validated config object. Every module imports from `config.ts` — never reads `process.env` directly.');
      rules.push('Use Zod or a similar library to parse and validate `process.env` at startup. Fail fast with schema errors before the server starts.');
    } else if (be.framework === 'python-fastapi') {
      rules.push('');
      rules.push('### Python Configuration');
      rules.push('Use Pydantic `BaseSettings` for config. Define all env vars with types and defaults. Use `@validator` for complex validation. Load once at startup.');
    } else if (be.framework === 'java-spring') {
      rules.push('');
      rules.push('### Java/Spring Configuration');
      rules.push('Use `@ConfigurationProperties` for typed, validated config classes. Add `@Validated` and Bean Validation annotations. Never read from `Environment` or `@Value` in business logic.');
      rules.push('Use Spring profiles (`application-dev.yml`, `application-prod.yml`) for environment-specific config. Never use `@Profile` annotations in business logic — they belong in configuration classes.');
    } else if (be.framework === 'go') {
      rules.push('');
      rules.push('### Go Configuration');
      rules.push('Load config into a struct at startup. Use `envconfig`, `viper`, or `koanf`. Validate all required fields. Pass the config struct (or sub-structs) to constructors — never read `os.Getenv` in business logic.');
    } else if (be.framework === 'dotnet-8') {
      rules.push('');
      rules.push('### C# Configuration');
      rules.push('Use `IOptions<T>` pattern with typed config classes. Bind config sections in `Program.cs`. Use Data Annotations for validation. Never inject `IConfiguration` directly into services.');
    }
  }

  // Feature flags
  rules.push('');
  rules.push('### Feature Flags');
  rules.push('Use boolean feature flags for gradual rollouts and A/B testing. Store flags in configuration (env vars or config service), not hardcoded.');
  rules.push('Every feature flag MUST have: a name, an owner, a creation date, and a planned removal date. Feature flags without expiry become permanent dead code branches.');
  rules.push('Evaluate feature flags at the boundary (route handler, middleware, component render). Never scatter `if (featureEnabled)` checks deep in business logic.');
  rules.push('Remove feature flags promptly after rollout is complete. A codebase with 20+ stale feature flags is harder to reason about than the features themselves.');

  // Secrets management
  rules.push('');
  rules.push('### Secrets Management');
  rules.push('Secrets (API keys, database passwords, JWT secrets) MUST come from environment variables or a secrets manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager). Never in code, config files, or version control.');
  rules.push('Rotate secrets regularly. Design for rotation: the app should handle secret changes without restart where possible (e.g., reload from secrets manager).');
  rules.push('Use different secrets per environment. Development, staging, and production MUST NOT share API keys, database credentials, or signing secrets.');

  return { category: 'Environment & Configuration', rules };
}

// ─── Markdown Renderer ───

function renderRulesMarkdown(
  doc: SDLDocument,
  rules: Rule[],
  adrRules: string[] = [],
  opts: { compact?: boolean } = {},
): string {
  const lines: string[] = [];

  lines.push(`# ${doc.solution.name} — Architecture & Coding Rules`);
  lines.push('');
  lines.push(`> Auto-generated from SDL. Stage: ${doc.solution.stage}. Architecture: ${doc.architecture.style}.`);
  lines.push('>');
  lines.push('> These rules are the source of truth for how code should be written in this project.');
  lines.push('> AI coding tools (Claude Code, Cursor, Copilot) read this file to enforce architecture consistency across sessions.');
  lines.push('');

  // Architecture source files — tell AI tools where to look
  lines.push('## Architecture Source Files');
  lines.push('');
  lines.push('IMPORTANT: Before making any structural changes (adding services, databases, APIs, integrations), read and follow these source files:');
  lines.push('');
  lines.push('- **SDL (Source of Truth)**: `solution.sdl.yaml` at project root. If it has an `imports` array, also read each referenced module file (e.g., `sdl/services.sdl.yaml`, `sdl/data.sdl.yaml`, `sdl/auth.sdl.yaml`). The SDL defines every service, database, API endpoint, auth strategy, and deployment target.');
  lines.push('- **Architecture Output**: `architecture-output/` directory contains detailed blueprints:');
  lines.push('  - `executive-summary.md` — project overview and key decisions');
  lines.push('  - `data-model.md` — database schemas, relationships, ORM patterns');
  lines.push('  - `api-docs.md` — API endpoints, request/response schemas');
  lines.push('  - `security-scan.md` — security requirements and OWASP checklist');
  lines.push('  - `setup-env.md` — environment variables and configuration');
  lines.push('  - `cost-estimate.md` — infrastructure cost breakdown');
  lines.push('');
  lines.push('When generating code:');
  lines.push('- Cross-reference the SDL before creating new files, routes, or database tables');
  lines.push('- Use the exact service names, ports, and paths declared in the SDL');
  lines.push('- Follow the data model schemas defined in `architecture-output/data-model.md`');
  lines.push('- Follow the API contracts defined in `architecture-output/api-docs.md`');
  lines.push('- If the SDL doesn\'t cover what you need, flag it — don\'t invent architecture');
  lines.push('');

  // Tech stack summary
  lines.push('## Tech Stack');
  lines.push('');
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];
  const mobiles = doc.architecture.projects.mobile || [];

  for (const be of backends) {
    const fw = FRAMEWORK_LABELS[be.framework] || be.framework;
    const orm = be.orm ? ` + ${ORM_LABELS[be.orm] || be.orm}` : '';
    const api = be.apiStyle ? ` (${be.apiStyle.toUpperCase()})` : '';
    lines.push(`- **Backend "${be.name}"**: ${fw}${orm}${api}`);
  }
  for (const fe of frontends) {
    const fw = FRAMEWORK_LABELS[fe.framework] || fe.framework;
    const extras: string[] = [];
    if (fe.rendering) extras.push(fe.rendering.toUpperCase());
    if (fe.styling) extras.push(fe.styling);
    if (fe.stateManagement && fe.stateManagement !== 'none') extras.push(fe.stateManagement);
    lines.push(`- **Frontend "${fe.name}"**: ${fw}${extras.length ? ` (${extras.join(', ')})` : ''}`);
  }
  for (const mob of mobiles) {
    const fw = FRAMEWORK_LABELS[mob.framework] || mob.framework;
    lines.push(`- **Mobile "${mob.name}"**: ${fw} (${mob.platform})`);
  }

  const dbLabel = DB_LABELS[doc.data.primaryDatabase.type] || doc.data.primaryDatabase.type;
  lines.push(`- **Database**: ${dbLabel} (${doc.data.primaryDatabase.hosting})`);

  if (doc.data.cache && doc.data.cache.type !== 'none') {
    lines.push(`- **Cache**: ${doc.data.cache.type}`);
  }
  if (doc.data.queues) {
    lines.push(`- **Queue**: ${doc.data.queues.provider}`);
  }
  if (doc.data.search) {
    lines.push(`- **Search**: ${doc.data.search.provider}`);
  }

  lines.push(`- **Cloud**: ${CLOUD_LABELS[doc.deployment.cloud] || doc.deployment.cloud}`);

  if (doc.auth && doc.auth.strategy !== 'none') {
    const authLabel = doc.auth.provider ? AUTH_LABELS[doc.auth.provider] || doc.auth.provider : `custom (${doc.auth.strategy})`;
    lines.push(`- **Auth**: ${authLabel}`);
  }
  lines.push('');

  // Rules sections
  for (const section of rules) {
    lines.push(`## ${section.category}`);
    lines.push('');
    for (const rule of section.rules) {
      if (rule === '') {
        lines.push('');
      } else if (rule.startsWith('###')) {
        lines.push(rule);
      } else {
        lines.push(`- ${rule}`);
      }
    }
    lines.push('');
  }

  // Architecture decisions from ADRs (only if any accepted ADRs were provided)
  if (adrRules.length > 0) {
    lines.push('## Architecture Decisions (ADRs)');
    lines.push('');
    lines.push('> Accepted decisions — do not suggest alternatives unless an ADR is superseded.');
    lines.push('');
    for (const rule of adrRules) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  // Forbidden patterns — omit in compact mode (Copilot has limited context)
  if (!opts.compact) {
    lines.push('## Forbidden Patterns');
    lines.push('');
    lines.push(...getForbiddenPatterns(doc));
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Per-Project Rules ───

function renderProjectRules(doc: SDLDocument, project: BackendProject | FrontendProject | MobileProject, type: 'backend' | 'frontend'): string | null {
  const lines: string[] = [];
  const componentPath = (project as any).path ?? project.name;

  lines.push(`# ${project.name} — Architecture & Coding Rules`);
  lines.push('');
  lines.push(`> Auto-generated from SDL. Architecture: ${doc.architecture.style}. Component: ${project.name}.`);
  lines.push('>');
  lines.push('> These rules are the source of truth for how code should be written in this component.');
  lines.push('');
  lines.push('## Architecture Source Files');
  lines.push('');
  lines.push(`- **SDL (Source of Truth)**: \`solution.sdl.yaml\` at the monorepo/project root defines this component's architecture`);
  lines.push(`- **Architecture Output**: \`architecture-output/\` contains detailed blueprints (data model, API docs, security scan)`);
  lines.push(`- **This component**: \`${componentPath}/\` — ${type === 'backend' ? 'backend service' : 'frontend application'}`);
  lines.push('- Cross-reference the SDL before creating new files, routes, or database tables');
  lines.push('- If the SDL doesn\'t cover what you need, flag it — don\'t invent architecture');
  lines.push('');

  if (type === 'backend') {
    const be = project as BackendProject;
    const fw = FRAMEWORK_LABELS[be.framework] || be.framework;
    lines.push(`## Stack: ${fw}`);
    lines.push('');

    const fileRules = getBackendFileRules(be);
    if (fileRules.length > 0) {
      for (const rule of fileRules) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    if (be.orm) {
      lines.push(`## ORM: ${ORM_LABELS[be.orm] || be.orm}`);
      lines.push('');
      lines.push(`- All database queries MUST go through ${ORM_LABELS[be.orm] || be.orm}.`);
      lines.push('- Schema changes MUST use ORM migrations.');
      lines.push('- Repository classes encapsulate all data access. No ORM calls in route handlers or controllers.');
      lines.push('');
    }
  }

  if (type === 'frontend') {
    const fe = project as FrontendProject;
    const fw = FRAMEWORK_LABELS[fe.framework] || fe.framework;
    lines.push(`## Stack: ${fw}`);
    lines.push('');

    const fileRules = getFrontendFileRules(fe);
    if (fileRules.length > 0) {
      for (const rule of fileRules) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Framework-Specific File Rules ───

function getBackendFileRules(be: BackendProject): string[] {
  const rules: string[] = [];
  const fw = be.framework;

  if (fw === 'nodejs') {
    rules.push('Backend: Node.js + TypeScript. Strict mode enabled. All files MUST be TypeScript.');
    rules.push('Route handlers: `src/routes/<entity>.routes.ts`. Controllers: `src/controllers/<entity>.controller.ts`.');
    rules.push('Services: `src/services/<entity>.service.ts`. Repositories: `src/repositories/<entity>.repository.ts`.');
    rules.push('Types/DTOs: `src/types/<entity>.ts`. Shared utilities: `src/shared/` (keep minimal).');
    rules.push('No business logic in route handlers. Routes only parse request, call service, return response.');
  } else if (fw === 'python-fastapi') {
    rules.push('Backend: Python + FastAPI. Use type hints on all function signatures.');
    rules.push('Routes: `app/routes/<entity>.py`. Services: `app/services/<entity>.py`. Models: `app/models/<entity>.py`.');
    rules.push('Schemas (Pydantic): `app/schemas/<entity>.py`. Dependencies: `app/dependencies.py`.');
    rules.push('No business logic in route handlers. Routes only validate input, call service, return response.');
  } else if (fw === 'dotnet-8') {
    rules.push('Backend: .NET 8. Use C# with nullable reference types enabled.');
    rules.push('Controllers: `Controllers/<Entity>Controller.cs`. Services: `Services/<Entity>Service.cs`.');
    rules.push('Models: `Models/<Entity>.cs`. DTOs: `DTOs/<Entity>Dto.cs`. Repositories: `Repositories/<Entity>Repository.cs`.');
    rules.push('Use dependency injection for all services. Register in `Program.cs`.');
  } else if (fw === 'go') {
    rules.push('Backend: Go. Follow standard project layout.');
    rules.push('Handlers: `internal/handler/<entity>.go`. Services: `internal/service/<entity>.go`.');
    rules.push('Models: `internal/model/<entity>.go`. Repositories: `internal/repository/<entity>.go`.');
    rules.push('Use interfaces for service boundaries. Accept interfaces, return structs.');
  } else if (fw === 'java-spring') {
    rules.push('Backend: Java + Spring Boot. Use constructor injection for all dependencies.');
    rules.push('Controllers: `controller/<Entity>Controller.java`. Services: `service/<Entity>Service.java`.');
    rules.push('Repositories: `repository/<Entity>Repository.java`. Models: `model/<Entity>.java`. DTOs: `dto/<Entity>Dto.java`.');
  } else if (fw === 'ruby-rails') {
    rules.push('Backend: Ruby on Rails. Follow Rails conventions.');
    rules.push('Controllers: `app/controllers/<entity>_controller.rb`. Models: `app/models/<entity>.rb`.');
    rules.push('Services: `app/services/<entity>_service.rb`. Serializers: `app/serializers/<entity>_serializer.rb`.');
  } else if (fw === 'php-laravel') {
    rules.push('Backend: PHP + Laravel. Follow Laravel conventions.');
    rules.push('Controllers: `app/Http/Controllers/<Entity>Controller.php`. Models: `app/Models/<Entity>.php`.');
    rules.push('Services: `app/Services/<Entity>Service.php`. Requests: `app/Http/Requests/<Entity>Request.php`.');
  }

  return rules;
}

function getFrontendFileRules(fe: FrontendProject): string[] {
  const rules: string[] = [];
  const fw = fe.framework;

  if (fw === 'nextjs') {
    rules.push('Frontend: Next.js + TypeScript. Use the App Router (app/ directory).');
    rules.push('Pages: `app/<route>/page.tsx`. Layouts: `app/<route>/layout.tsx`. API routes: `app/api/<route>/route.ts`.');
    rules.push('Components: `components/<ComponentName>.tsx`. Reusable UI: `components/ui/`.');
  } else if (fw === 'react') {
    rules.push('Frontend: React + TypeScript (Vite).');
    rules.push('Pages: `src/pages/<PageName>.tsx`. Components: `src/components/<ComponentName>.tsx`.');
    rules.push('Hooks: `src/hooks/use<Name>.ts`. Utilities: `src/lib/` or `src/utils/`.');
  } else if (fw === 'vue') {
    rules.push('Frontend: Vue.js + TypeScript.');
    rules.push('Views: `src/views/<ViewName>.vue`. Components: `src/components/<ComponentName>.vue`.');
    rules.push('Composables: `src/composables/use<Name>.ts`. Stores: `src/stores/<name>.ts`.');
  } else if (fw === 'angular') {
    rules.push('Frontend: Angular + TypeScript. Follow Angular CLI conventions.');
    rules.push('Components: `src/app/<feature>/<component>.component.ts`. Services: `src/app/<feature>/<name>.service.ts`.');
    rules.push('Use standalone components. Lazy-load feature modules.');
  } else if (fw === 'svelte') {
    rules.push('Frontend: Svelte/SvelteKit + TypeScript.');
    rules.push('Routes: `src/routes/<path>/+page.svelte`. Components: `src/lib/components/<Name>.svelte`.');
    rules.push('Stores: `src/lib/stores/<name>.ts`. Server logic: `src/routes/<path>/+server.ts`.');
  }

  if (fe.styling) {
    rules.push(`Styling: ${fe.styling}. Use ONLY this styling approach. Do not mix styling methodologies.`);
  }

  if (fe.stateManagement && fe.stateManagement !== 'none') {
    rules.push(`State management: ${fe.stateManagement}. Global state MUST go through the state manager. Do not use prop drilling for shared state.`);
  }

  if (fe.rendering) {
    const renderLabels: Record<string, string> = {
      ssr: 'Server-Side Rendering. Pages that need SEO MUST use SSR. API calls in server components where possible.',
      ssg: 'Static Site Generation. Pre-render pages at build time. Use ISR for content that changes.',
      spa: 'Single Page Application. Client-side rendering only. Use loading states for async data.',
    };
    if (renderLabels[fe.rendering]) {
      rules.push(`Rendering: ${renderLabels[fe.rendering]}`);
    }
  }

  return rules;
}

// ─── Forbidden Patterns ───

function getForbiddenPatterns(doc: SDLDocument): string[] {
  const patterns: string[] = [];

  patterns.push('- NEVER commit secrets, API keys, or credentials to the repository. Use environment variables.');
  patterns.push('- NEVER bypass authentication middleware for protected routes.');
  patterns.push('- NEVER use `any` type in TypeScript unless absolutely unavoidable and documented.');

  if (doc.architecture.style === 'modular-monolith' || doc.architecture.style === 'microservices') {
    patterns.push('- NEVER access another module/service\'s database directly. Always go through its public interface.');
    patterns.push('- NEVER import internal implementation files from another module. Only import from interface/types.');
  }

  const fpBackends = doc.architecture.projects.backend || [];
  for (const be of fpBackends) {
    if (be.orm) {
      patterns.push(`- NEVER write raw SQL/queries outside of repository files. Use ${ORM_LABELS[be.orm] || be.orm}.`);
    }
  }

  if (doc.nonFunctional.security?.pii) {
    patterns.push('- NEVER log PII (email, name, phone, address) in plain text. Use log redaction.');
  }

  if (doc.integrations?.payments) {
    patterns.push('- NEVER store, log, or transmit raw credit card numbers or CVVs.');
  }

  if (doc.observability?.logging) {
    patterns.push('- NEVER use console.log/console.error/print in production code. Use the structured logger.');
  }

  patterns.push('- NEVER suppress or swallow errors silently. All errors must be handled, logged, or propagated.');
  patterns.push('- NEVER introduce new third-party dependencies without checking for existing alternatives in the project.');

  // File size anti-patterns
  patterns.push('- NEVER let a file exceed 500 lines. Split by responsibility before it gets there.');
  patterns.push('- NEVER let a function exceed 50 lines. Extract helpers with descriptive names.');
  patterns.push('- NEVER put business logic, data access, and routing in the same file. Separate concerns into distinct files.');
  patterns.push('- NEVER create "god objects" (classes with more than 7 public methods or files with 10+ unrelated exports). Split by domain and responsibility.');

  // Tech debt anti-patterns
  patterns.push('- NEVER add TODO/FIXME/HACK without a linked issue. Untracked debt becomes permanent.');
  patterns.push('- NEVER add a dependency that duplicates functionality already available in existing dependencies or the standard library.');
  patterns.push('- NEVER leave dead code (unused functions, unreachable branches, commented-out blocks). Delete it.');
  patterns.push('- NEVER disable linting rules or type checking for an entire file. Fix the issue or suppress with an inline comment and linked issue.');
  patterns.push('- NEVER add environment-specific branching (`if prod`) in business logic. Use config objects.');

  // Code quality anti-patterns
  patterns.push('- NEVER use magic numbers or strings. Extract into named constants.');
  patterns.push('- NEVER nest conditionals deeper than 3 levels. Refactor using early returns, guard clauses, or extraction.');
  patterns.push('- NEVER return unbounded lists from API endpoints. Always paginate.');
  patterns.push('- NEVER query a database inside a loop. Use batch queries or joins.');
  patterns.push('- NEVER commit commented-out code. Use version control to recover old code.');

  const fpBackends2 = doc.architecture.projects.backend || [];
  for (const be of fpBackends2) {
    if (be.framework === 'nodejs') {
      patterns.push('- NEVER use `var`. Use `const` by default, `let` only when reassignment is needed.');
      patterns.push('- NEVER `await` inside a loop for independent operations. Use `Promise.all()`.');
      patterns.push('- NEVER mix callback-style and Promise-style async patterns. Use async/await consistently.');
    } else if (be.framework === 'python-fastapi') {
      patterns.push('- NEVER use mutable default arguments in function signatures (e.g., `def f(x=[])`). Use `None` and create inside.');
      patterns.push('- NEVER use bare `except:`. Always catch specific exception types.');
    } else if (be.framework === 'go') {
      patterns.push('- NEVER ignore errors with `_`. Handle or wrap every error.');
      patterns.push('- NEVER use `panic` for normal error flow. Reserve for truly unrecoverable situations.');
    }
  }

  const frontends = doc.architecture.projects.frontend || [];
  for (const fe of frontends) {
    if (fe.framework === 'react' || fe.framework === 'nextjs') {
      patterns.push('- NEVER mutate state directly. Always use setter functions or immutable updates.');
      patterns.push('- NEVER use array index as React `key` for dynamic lists. Use stable unique identifiers.');
    }
  }

  // Accessibility anti-patterns
  if (frontends.length > 0) {
    patterns.push('- NEVER use `<div>` or `<span>` with `onClick` for interactive elements. Use `<button>` or `<a>`.');
    patterns.push('- NEVER remove focus outlines (`outline: none`) without providing an alternative visible focus indicator.');
    patterns.push('- NEVER use color as the sole indicator of state (error, success, active). Add icons or text.');
  }

  // Mobile anti-patterns
  const mobiles = doc.architecture.projects.mobile || [];
  if (mobiles.length > 0) {
    patterns.push('- NEVER store tokens or secrets in plain-text storage (AsyncStorage, SharedPreferences, UserDefaults). Use secure/encrypted storage.');
    patterns.push('- NEVER request all permissions at app launch. Request lazily when the feature is first used.');
  }

  // Migration anti-patterns
  patterns.push('- NEVER modify an already-applied migration. Create a new migration to fix issues.');
  patterns.push('- NEVER make a breaking API change without versioning. Adding fields is safe; removing/renaming is breaking.');
  patterns.push('- NEVER hardcode user-facing strings if the app targets multiple regions. Use the i18n system.');

  return patterns;
}

// ─── Label Maps ───

const FRAMEWORK_LABELS: Record<string, string> = {
  nextjs: 'Next.js',
  react: 'React (Vite)',
  vue: 'Vue.js',
  angular: 'Angular',
  svelte: 'SvelteKit',
  solid: 'SolidJS',
  nodejs: 'Node.js (Express/TypeScript)',
  'dotnet-8': '.NET 8 (C#)',
  'python-fastapi': 'Python (FastAPI)',
  go: 'Go',
  'java-spring': 'Java (Spring Boot)',
  'ruby-rails': 'Ruby on Rails',
  'php-laravel': 'PHP (Laravel)',
  'react-native': 'React Native',
  flutter: 'Flutter',
  swift: 'Swift',
  kotlin: 'Kotlin',
  ionic: 'Ionic',
};

const ORM_LABELS: Record<string, string> = {
  prisma: 'Prisma',
  typeorm: 'TypeORM',
  sequelize: 'Sequelize',
  mongoose: 'Mongoose',
  'ef-core': 'Entity Framework Core',
  sqlalchemy: 'SQLAlchemy',
  gorm: 'GORM',
};

const DB_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  sqlserver: 'SQL Server',
  mongodb: 'MongoDB',
  dynamodb: 'DynamoDB',
  cockroachdb: 'CockroachDB',
  planetscale: 'PlanetScale',
};

const AUTH_LABELS: Record<string, string> = {
  auth0: 'Auth0',
  'entra-id': 'Microsoft Entra ID',
  'entra-id-b2c': 'Microsoft Entra ID B2C',
  cognito: 'AWS Cognito',
  firebase: 'Firebase Auth',
  supabase: 'Supabase Auth',
  clerk: 'Clerk',
};

const CLOUD_LABELS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Azure',
  vercel: 'Vercel',
  railway: 'Railway',
  render: 'Render',
  'fly-io': 'Fly.io',
  cloudflare: 'Cloudflare',
};
