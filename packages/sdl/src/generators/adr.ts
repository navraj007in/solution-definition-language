import type { SDLDocument } from '../types';
import type { RawGeneratorResult } from './types';

interface ADRSpec {
  number: string;
  slug: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives: { option: string; pros: string; cons: string }[];
}

/**
 * Generates Architecture Decision Records from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Produces ADRs for each major decision encoded in the SDL:
 *   1. Architecture pattern (always)
 *   2. Cloud/hosting (always)
 *   3. Authentication (if present)
 *   4. Primary database (always)
 *   5. ORM selection (if backend uses ORM)
 *   6. Frontend framework (per frontend project)
 *   7. Backend framework (per backend project)
 *   8. Cache strategy (if present)
 *   9. CI/CD provider (if present)
 */
export function generateADRs(doc: SDLDocument): RawGeneratorResult {
  const adrs: ADRSpec[] = [];
  let counter = 1;

  // 1. Architecture pattern — always
  adrs.push(buildArchitecturePatternADR(doc, counter++));

  // 2. Cloud/hosting — always
  adrs.push(buildCloudHostingADR(doc, counter++));

  // 3. Authentication — if auth section exists
  if (doc.auth && doc.auth.strategy !== 'none') {
    adrs.push(buildAuthenticationADR(doc, counter++));
  }

  // 4. Primary database — always
  adrs.push(buildDatabaseADR(doc, counter++));

  // 5. ORM — if any backend project has one
  const backends = doc.architecture.projects.backend || [];
  const backendsWithORM = backends.filter((be) => be.orm);
  if (backendsWithORM.length > 0) {
    adrs.push(buildORMADR(doc, backendsWithORM, counter++));
  }

  // 6. Per-frontend-project framework
  const frontends = doc.architecture.projects.frontend || [];
  for (const fe of frontends) {
    adrs.push(buildFrontendFrameworkADR(doc, fe, counter++));
  }

  // 7. Per-backend-project framework
  for (const be of backends) {
    adrs.push(buildBackendFrameworkADR(doc, be, counter++));
  }

  // 8. Cache strategy — if present
  if (doc.data.cache && doc.data.cache.type !== 'none') {
    adrs.push(buildCacheADR(doc, counter++));
  }

  // 9. CI/CD — if present
  if (doc.deployment.ciCd) {
    adrs.push(buildCiCdADR(doc, counter++));
  }

  const files = adrs.map((adr) => ({
    path: `artifacts/decisions/${adr.slug}.md`,
    content: renderMADR(adr),
  }));

  return {
    artifactType: 'adr',
    files,
    metadata: {
      solutionName: doc.solution.name,
      totalADRs: adrs.length,
      adrs: adrs.map((a) => ({ number: a.number, title: a.title })),
    },
  };
}

// ─── ADR Builders ───

function buildArchitecturePatternADR(doc: SDLDocument, n: number): ADRSpec {
  const style = doc.architecture.style;
  const frontendCount = (doc.architecture.projects.frontend || []).length;
  const backendCount = (doc.architecture.projects.backend || []).length;
  const mobileCount = (doc.architecture.projects.mobile || []).length;
  const totalProjects = frontendCount + backendCount + mobileCount;

  const styleLabels: Record<string, string> = {
    'modular-monolith': 'Modular Monolith',
    microservices: 'Microservices',
    serverless: 'Serverless',
  };

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-architecture-pattern`,
    title: 'Architecture Pattern',
    context: `${doc.solution.name} (${doc.solution.stage}) requires an architecture to support ${totalProjects} project(s) (${frontendCount} frontend, ${backendCount} backend${mobileCount > 0 ? `, ${mobileCount} mobile` : ''}). The team must choose an architecture pattern that balances development speed, scalability, and operational complexity.`,
    decision: `Adopt a ${styleLabels[style] || style} architecture. ${architectureRationale(style, doc)}`,
    consequences: architectureConsequences(style),
    alternatives: [
      { option: 'Modular Monolith', pros: 'Simple deployment, faster iteration, easier debugging', cons: 'Harder to scale individual components, risk of tight coupling' },
      { option: 'Microservices', pros: 'Independent scaling, tech diversity, isolated failures', cons: 'Higher complexity, distributed transactions, operational overhead' },
      { option: 'Serverless', pros: 'Zero ops, auto-scaling, pay-per-use', cons: 'Cold starts, vendor lock-in, limited execution time' },
    ],
  };
}

function buildCloudHostingADR(doc: SDLDocument, n: number): ADRSpec {
  const cloud = doc.deployment.cloud;
  const label = cloudLabel(cloud);

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-cloud-hosting`,
    title: 'Cloud & Hosting Platform',
    context: `${doc.solution.name} needs a hosting platform for its infrastructure. The choice affects cost, scalability, vendor lock-in, and the available managed services. Budget level: ${doc.constraints?.budget || 'not specified'}.`,
    decision: `Use ${label} as the primary cloud/hosting platform.${doc.deployment.runtime?.frontend ? ` Frontend hosted via ${doc.deployment.runtime.frontend}.` : ''}${doc.deployment.runtime?.backend ? ` Backend running on ${doc.deployment.runtime.backend}.` : ''}`,
    consequences: `Committed to ${label} ecosystem and pricing. Managed services reduce operational burden. ${cloudConsequences(cloud)}`,
    alternatives: [
      { option: 'AWS', pros: 'Broadest service catalog, mature, global reach', cons: 'Complex pricing, steep learning curve' },
      { option: 'Vercel', pros: 'Excellent Next.js support, edge functions, simple DX', cons: 'Limited backend support, costs at scale' },
      { option: 'Railway', pros: 'Simple deploy, generous free tier, great DX', cons: 'Smaller ecosystem, less enterprise features' },
      { option: 'GCP', pros: 'Strong data/ML services, competitive pricing', cons: 'Smaller market share, fewer third-party integrations' },
    ],
  };
}

function buildAuthenticationADR(doc: SDLDocument, n: number): ADRSpec {
  const auth = doc.auth!;
  const providerLabel = auth.provider ? displayName(auth.provider) : 'custom';
  const roleList = auth.roles?.join(', ') || 'default roles';

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-authentication`,
    title: 'Authentication & Authorization',
    context: `${doc.solution.name} requires user authentication with ${auth.strategy.toUpperCase()} strategy. Roles: ${roleList}.${auth.mfa ? ' Multi-factor authentication is required.' : ''}${auth.socialProviders?.length ? ` Social login via: ${auth.socialProviders.join(', ')}.` : ''}`,
    decision: `Use ${providerLabel} as the authentication provider with ${auth.strategy.toUpperCase()} strategy.${auth.sessions?.accessToken ? ` Access tokens: ${auth.sessions.accessToken.toUpperCase()}.` : ''}${auth.mfa ? ' MFA enabled.' : ''}`,
    consequences: auth.provider
      ? `Offloads identity management to ${providerLabel}. Simplifies email verification, password reset, and MFA. Vendor dependency for auth. ${auth.socialProviders?.length ? `Social login (${auth.socialProviders.join(', ')}) handled by provider.` : ''}`
      : 'Full control over the auth flow. Must implement email verification, password reset, and MFA manually. No vendor dependency.',
    alternatives: [
      { option: 'Auth0', pros: 'Feature-rich, social login, MFA built-in', cons: 'Cost at scale, vendor lock-in' },
      { option: 'Clerk', pros: 'Modern DX, pre-built UI components', cons: 'Newer platform, smaller ecosystem' },
      { option: 'Firebase Auth', pros: 'Free tier, Google integration', cons: 'Google ecosystem dependency' },
      { option: 'Custom JWT', pros: 'Full control, no vendor dependency', cons: 'More code, security responsibility' },
    ],
  };
}

function buildDatabaseADR(doc: SDLDocument, n: number): ADRSpec {
  const db = doc.data.primaryDatabase;
  const dbLabel = displayName(db.type);
  const hostingLabel = db.hosting === 'managed' ? 'managed instance' : db.hosting === 'serverless' ? 'serverless' : 'self-hosted instance';
  const secondaries = doc.data.secondaryDatabases || [];

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-primary-database`,
    title: 'Primary Database',
    context: `${doc.solution.name} needs a primary database for persistent storage. Expected scale: ${doc.nonFunctional.scaling.expectedUsersMonth1 || '?'} users month 1, ${doc.nonFunctional.scaling.expectedUsersYear1 || '?'} users year 1.${secondaries.length > 0 ? ` Additional databases: ${secondaries.map((s) => displayName(s.type)).join(', ')}.` : ''}`,
    decision: `Use ${dbLabel} as the primary database (${hostingLabel}).${db.name ? ` Instance: ${db.name}.` : ''}${db.size ? ` Size: ${db.size}.` : ''}`,
    consequences: `Must manage ${dbLabel} schema migrations and backups.${db.hosting === 'managed' ? ' Managed hosting reduces operational burden but adds vendor dependency.' : ' Self-hosted requires infrastructure management and monitoring.'}${doc.nonFunctional.backup ? ` Backup frequency: ${doc.nonFunctional.backup.frequency || 'daily'}.` : ''}`,
    alternatives: DB_ALTERNATIVES[db.type] || [
      { option: 'PostgreSQL', pros: 'ACID, rich query language, extensions', cons: 'Vertical scaling limits' },
      { option: 'MongoDB', pros: 'Flexible schema, horizontal scaling', cons: 'No ACID across documents by default' },
      { option: 'MySQL', pros: 'Widely supported, simple replication', cons: 'Fewer advanced features than PostgreSQL' },
    ],
  };
}

function buildORMADR(doc: SDLDocument, backendsWithORM: { name: string; orm?: string; framework: string }[], n: number): ADRSpec {
  const ormNames = [...new Set(backendsWithORM.map((be) => be.orm!))];
  const ormLabel = ormNames.map(displayName).join(', ');
  const projectList = backendsWithORM.map((be) => `${be.name} (${displayName(be.framework)})`).join(', ');

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-orm`,
    title: 'ORM / Data Access Layer',
    context: `Backend project(s) ${projectList} need a data access layer for ${displayName(doc.data.primaryDatabase.type)}. An ORM simplifies queries, migrations, and type safety but adds abstraction overhead.`,
    decision: `Use ${ormLabel} as the ORM / data access layer.`,
    consequences: `Type-safe database access. Schema migrations managed through the ORM. Must learn ORM-specific patterns and escape hatches for complex queries.`,
    alternatives: [
      { option: 'Prisma', pros: 'Excellent TypeScript support, auto-generated client, visual studio', cons: 'Performance overhead for complex queries, migration limitations' },
      { option: 'TypeORM', pros: 'Decorator-based, supports many databases', cons: 'Maintenance concerns, complex relation loading' },
      { option: 'Drizzle', pros: 'Lightweight, SQL-like syntax, fast', cons: 'Newer, smaller ecosystem' },
      { option: 'Raw SQL / Query Builder', pros: 'Full control, best performance', cons: 'No type safety, manual migrations' },
    ],
  };
}

function buildFrontendFrameworkADR(doc: SDLDocument, fe: { name: string; framework: string; rendering?: string; styling?: string; stateManagement?: string }, n: number): ADRSpec {
  const fwLabel = frameworkLabel(fe.framework);

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-frontend-${sanitize(fe.name)}`,
    title: `Frontend "${fe.name}" — Framework`,
    context: `The "${fe.name}" frontend project needs a framework. Rendering strategy: ${fe.rendering || 'default'}.${fe.styling ? ` Styling: ${fe.styling}.` : ''}${fe.stateManagement ? ` State management: ${fe.stateManagement}.` : ''}`,
    decision: `Use ${fwLabel} for the "${fe.name}" frontend.${fe.rendering ? ` Rendering: ${fe.rendering.toUpperCase()}.` : ''}`,
    consequences: `Team must have ${fwLabel} expertise. ${frameworkConsequences(fe.framework)}`,
    alternatives: [
      { option: 'Next.js', pros: 'SSR/SSG/ISR, file-based routing, React ecosystem', cons: 'Vercel-centric, complex for simple SPAs' },
      { option: 'React (Vite)', pros: 'Largest ecosystem, flexible, well-known', cons: 'No built-in SSR, routing/state choices needed' },
      { option: 'Vue', pros: 'Gentle learning curve, batteries-included', cons: 'Smaller ecosystem than React' },
      { option: 'Angular', pros: 'Enterprise-grade, opinionated, built-in tooling', cons: 'Steep learning curve, verbose' },
    ],
  };
}

function buildBackendFrameworkADR(doc: SDLDocument, be: { name: string; framework: string; apiStyle?: string; orm?: string }, n: number): ADRSpec {
  const fwLabel = frameworkLabel(be.framework);

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-backend-${sanitize(be.name)}`,
    title: `Backend "${be.name}" — Framework`,
    context: `The "${be.name}" backend project needs a framework and runtime. API style: ${be.apiStyle || 'REST'}.${be.orm ? ` ORM: ${displayName(be.orm)}.` : ''} Database: ${displayName(doc.data.primaryDatabase.type)}.`,
    decision: `Use ${fwLabel} for the "${be.name}" backend.${be.apiStyle ? ` API style: ${be.apiStyle.toUpperCase()}.` : ''}`,
    consequences: `Team must have ${fwLabel} expertise. ${backendConsequences(be.framework)}`,
    alternatives: [
      { option: 'Node.js (Express)', pros: 'Large ecosystem, JavaScript fullstack, fast iteration', cons: 'Single-threaded, callback complexity' },
      { option: 'Python (FastAPI)', pros: 'Async, auto-docs, type hints, great for ML', cons: 'Slower than compiled languages' },
      { option: 'Go', pros: 'Fast, compiled, excellent concurrency', cons: 'Verbose, smaller web ecosystem' },
      { option: '.NET 8', pros: 'Enterprise-grade, strong typing, high performance', cons: 'Microsoft ecosystem, steeper learning curve' },
    ],
  };
}

function buildCacheADR(doc: SDLDocument, n: number): ADRSpec {
  const cache = doc.data.cache!;
  const cacheType = displayName(cache.type || 'redis');
  const useCases = cache.useCase?.join(', ') || 'general caching';

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-caching`,
    title: 'Caching Strategy',
    context: `${doc.solution.name} needs a caching layer for: ${useCases}. Performance target: ${doc.nonFunctional.performance?.apiResponseTime || 'not specified'}.`,
    decision: `Use ${cacheType} for caching (${useCases}).`,
    consequences: `Faster response times for cached data. Must handle cache invalidation. Additional infrastructure to manage.${cache.required ? ' Cache is required — application may not function correctly without it.' : ''}`,
    alternatives: [
      { option: 'Redis', pros: 'Versatile data structures, pub/sub, persistence', cons: 'Memory-bound, operational overhead' },
      { option: 'Memcached', pros: 'Simple, multi-threaded, proven', cons: 'No persistence, fewer data structures' },
      { option: 'No cache (direct DB)', pros: 'Simpler architecture, no invalidation issues', cons: 'Higher latency, more DB load' },
    ],
  };
}

function buildCiCdADR(doc: SDLDocument, n: number): ADRSpec {
  const ciCd = doc.deployment.ciCd!;
  const providerLabel = ciCdLabel(ciCd.provider);
  const envCount = ciCd.environments?.length || 0;

  return {
    number: fmt(n),
    slug: `adr-${pad(n)}-ci-cd`,
    title: 'CI/CD Pipeline',
    context: `${doc.solution.name} needs automated build, test, and deployment pipelines. Cloud: ${cloudLabel(doc.deployment.cloud)}.${envCount > 0 ? ` Environments: ${ciCd.environments!.map((e) => e.name).join(', ')}.` : ''}`,
    decision: `Use ${providerLabel} for CI/CD pipelines.${envCount > 0 ? ` Deploy to ${envCount} environment(s).` : ''}${doc.deployment.infrastructure?.iac ? ` Infrastructure as Code: ${doc.deployment.infrastructure.iac}.` : ''}`,
    consequences: `Automated testing and deployment. Pipeline configuration as code.${ciCd.environments?.some((e) => !e.autoApproval) ? ' Manual approval required for some environments.' : ''}`,
    alternatives: [
      { option: 'GitHub Actions', pros: 'Tight GitHub integration, free for public repos, large marketplace', cons: 'GitHub lock-in, YAML complexity' },
      { option: 'GitLab CI', pros: 'Built into GitLab, powerful pipelines', cons: 'GitLab lock-in' },
      { option: 'CircleCI', pros: 'Fast, good caching, Docker support', cons: 'Cost at scale, separate service' },
    ],
  };
}

// ─── MADR Renderer ───

function renderMADR(adr: ADRSpec): string {
  const lines: string[] = [];

  lines.push(`# ${adr.number}: ${adr.title}`);
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('Accepted');
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(adr.context);
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(adr.decision);
  lines.push('');

  if (adr.alternatives.length > 0) {
    lines.push('## Alternatives Considered');
    lines.push('');
    lines.push('| Option | Pros | Cons |');
    lines.push('|---|---|---|');
    for (const alt of adr.alternatives) {
      lines.push(`| ${esc(alt.option)} | ${esc(alt.pros)} | ${esc(alt.cons)} |`);
    }
    lines.push('');
  }

  lines.push('## Consequences');
  lines.push('');
  lines.push(adr.consequences);
  lines.push('');

  return lines.join('\n');
}

// ─── Helpers ───

function fmt(n: number): string {
  return `ADR-${String(n).padStart(3, '0')}`;
}

function pad(n: number): string {
  return String(n).padStart(4, '0');
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

function displayName(s: string): string {
  const labels: Record<string, string> = {
    auth0: 'Auth0',
    'entra-id': 'Microsoft Entra ID',
    'entra-id-b2c': 'Microsoft Entra ID B2C',
    cognito: 'AWS Cognito',
    firebase: 'Firebase',
    supabase: 'Supabase',
    clerk: 'Clerk',
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    sqlserver: 'SQL Server',
    mongodb: 'MongoDB',
    dynamodb: 'DynamoDB',
    cockroachdb: 'CockroachDB',
    planetscale: 'PlanetScale',
    prisma: 'Prisma',
    typeorm: 'TypeORM',
    sequelize: 'Sequelize',
    mongoose: 'Mongoose',
    'ef-core': 'Entity Framework Core',
    sqlalchemy: 'SQLAlchemy',
    gorm: 'GORM',
    redis: 'Redis',
    memcached: 'Memcached',
  };
  return labels[s] || s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function frameworkLabel(fw: string): string {
  const labels: Record<string, string> = {
    nextjs: 'Next.js',
    react: 'React',
    vue: 'Vue.js',
    angular: 'Angular',
    svelte: 'Svelte',
    solid: 'SolidJS',
    nodejs: 'Node.js (Express)',
    'dotnet-8': '.NET 8',
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
  return labels[fw] || fw;
}

function cloudLabel(cloud: string): string {
  const labels: Record<string, string> = {
    aws: 'AWS',
    gcp: 'Google Cloud',
    azure: 'Azure',
    vercel: 'Vercel',
    railway: 'Railway',
    render: 'Render',
    'fly-io': 'Fly.io',
    cloudflare: 'Cloudflare',
  };
  return labels[cloud] || cloud;
}

function ciCdLabel(provider: string): string {
  const labels: Record<string, string> = {
    'github-actions': 'GitHub Actions',
    'gitlab-ci': 'GitLab CI/CD',
    'azure-devops': 'Azure DevOps',
    circleci: 'CircleCI',
    jenkins: 'Jenkins',
  };
  return labels[provider] || provider;
}

function esc(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function architectureRationale(style: string, doc: SDLDocument): string {
  const stage = doc.solution.stage;
  switch (style) {
    case 'modular-monolith':
      return `The system will be deployed as a single unit with clear internal module boundaries.${stage === 'MVP' ? ' Ideal for MVP — fast iteration with a clean path to extraction when scale demands it.' : ''}`;
    case 'microservices':
      return 'The system will be composed of independently deployable services with well-defined interfaces, each owning its own data.';
    case 'serverless':
      return 'The system will use serverless functions and managed services, eliminating server management and scaling automatically with demand.';
    default:
      return '';
  }
}

function architectureConsequences(style: string): string {
  switch (style) {
    case 'modular-monolith':
      return 'Simpler deployment and debugging. Faster initial development. Must maintain module boundaries to avoid coupling. Can extract modules to services later without rewriting consumer code.';
    case 'microservices':
      return 'Independent scaling and deployment per service. Higher operational complexity. Requires service discovery, inter-service communication patterns, and distributed tracing.';
    case 'serverless':
      return 'No server management. Auto-scaling and pay-per-use pricing. Cold starts may affect latency. Vendor lock-in for function runtime and triggers.';
    default:
      return '';
  }
}

function cloudConsequences(cloud: string): string {
  switch (cloud) {
    case 'aws':
      return 'Broadest service catalog. Complex pricing model. Strong enterprise adoption.';
    case 'vercel':
      return 'Optimized for frontend frameworks (especially Next.js). Limited backend compute options.';
    case 'railway':
      return 'Simple deployment model. Great developer experience. Smaller scale ceiling.';
    case 'gcp':
      return 'Strong data/ML services. Competitive pricing. Smaller market share.';
    case 'azure':
      return 'Strong enterprise integration. Microsoft ecosystem advantages. Complex portal.';
    case 'cloudflare':
      return 'Edge-first architecture. Workers for compute. Growing but newer platform services.';
    case 'render':
      return 'Simple Heroku-like experience. Good for small-medium projects. Fewer advanced features.';
    case 'fly-io':
      return 'Global edge deployment. Firecracker VMs. Great for latency-sensitive apps.';
    default:
      return '';
  }
}

function frameworkConsequences(fw: string): string {
  switch (fw) {
    case 'nextjs':
      return 'Full-stack React with SSR/SSG/ISR. File-based routing. Optimized for Vercel deployment.';
    case 'react':
      return 'Largest frontend ecosystem. Requires separate routing and state management choices.';
    case 'vue':
      return 'Gentle learning curve. Batteries-included with Vue Router and Vuex/Pinia.';
    case 'angular':
      return 'Opinionated framework with built-in tooling. Steeper learning curve but consistent patterns.';
    case 'svelte':
      return 'Compiled framework with minimal runtime. Excellent performance. Smaller ecosystem.';
    case 'solid':
      return 'Fine-grained reactivity. Excellent performance. Smaller ecosystem than React.';
    default:
      return '';
  }
}

function backendConsequences(fw: string): string {
  switch (fw) {
    case 'nodejs':
      return 'JavaScript/TypeScript fullstack. Large ecosystem. Single-threaded event loop.';
    case 'python-fastapi':
      return 'Async Python with automatic API documentation. Type hints for validation. Great for ML integration.';
    case 'go':
      return 'Compiled language with excellent concurrency. Fast builds. Verbose but explicit.';
    case 'dotnet-8':
      return 'High performance, strong typing, excellent tooling. Microsoft ecosystem.';
    case 'java-spring':
      return 'Enterprise-grade framework. Massive ecosystem. Higher memory footprint.';
    case 'ruby-rails':
      return 'Convention over configuration. Fast prototyping. Slower performance at scale.';
    case 'php-laravel':
      return 'Elegant syntax. Large community. Good for web applications.';
    default:
      return '';
  }
}

const DB_ALTERNATIVES: Record<string, { option: string; pros: string; cons: string }[]> = {
  postgres: [
    { option: 'PostgreSQL', pros: 'ACID, rich query language, extensions (PostGIS, pgvector)', cons: 'Vertical scaling, complex for simple use cases' },
    { option: 'MySQL', pros: 'Widely supported, simple replication', cons: 'Fewer advanced features than PostgreSQL' },
    { option: 'MongoDB', pros: 'Flexible schema, horizontal scaling', cons: 'No ACID across documents by default' },
  ],
  mysql: [
    { option: 'MySQL', pros: 'Widely supported, simple replication, proven at scale', cons: 'Fewer advanced features than PostgreSQL' },
    { option: 'PostgreSQL', pros: 'ACID, rich extensions, advanced types', cons: 'More complex administration' },
    { option: 'PlanetScale', pros: 'Serverless MySQL, branching, non-blocking migrations', cons: 'Vendor lock-in, no foreign keys' },
  ],
  mongodb: [
    { option: 'MongoDB', pros: 'Flexible schema, horizontal scaling, Atlas managed', cons: 'No joins, eventual consistency by default' },
    { option: 'PostgreSQL + JSONB', pros: 'ACID + flexible JSON storage', cons: 'Schema management needed' },
    { option: 'DynamoDB', pros: 'Serverless, auto-scaling', cons: 'Complex query patterns, vendor lock-in' },
  ],
  dynamodb: [
    { option: 'DynamoDB', pros: 'Serverless, auto-scaling, single-digit ms latency', cons: 'Vendor lock-in, complex access patterns' },
    { option: 'MongoDB Atlas', pros: 'Flexible queries, multi-cloud', cons: 'Not serverless by default' },
    { option: 'CockroachDB', pros: 'Distributed SQL, multi-region', cons: 'Higher complexity' },
  ],
  sqlserver: [
    { option: 'SQL Server', pros: 'Enterprise features, .NET integration, SSMS tooling', cons: 'Licensing costs, Microsoft dependency' },
    { option: 'PostgreSQL', pros: 'Open source, rich extensions, lower cost', cons: 'Less .NET integration' },
    { option: 'Azure SQL', pros: 'Managed SQL Server, elastic pools', cons: 'Azure lock-in' },
  ],
  cockroachdb: [
    { option: 'CockroachDB', pros: 'Distributed SQL, multi-region, strong consistency', cons: 'Higher complexity, newer platform' },
    { option: 'PostgreSQL + read replicas', pros: 'Proven, simpler, large ecosystem', cons: 'Manual failover, no multi-region writes' },
    { option: 'Spanner', pros: 'Google-managed, globally distributed', cons: 'GCP lock-in, cost' },
  ],
  planetscale: [
    { option: 'PlanetScale', pros: 'Serverless MySQL, branching, non-blocking migrations', cons: 'No foreign keys, vendor lock-in' },
    { option: 'MySQL (self-hosted)', pros: 'Full control, no vendor dependency', cons: 'Operational burden' },
    { option: 'PostgreSQL', pros: 'More features, open source', cons: 'Different SQL dialect' },
  ],
};
