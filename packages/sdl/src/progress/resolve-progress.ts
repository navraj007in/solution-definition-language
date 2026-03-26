import type { SDLDocument } from '../types';
import type {
  ProgressSnapshot,
  ProgressEvidence,
  CategorySummary,
  ComponentProgress,
  ComponentStatus,
  ProgressCategory,
  ManualOverride,
} from './progress.types';

// ─── Detection rule: what evidence proves a component exists ───

interface EvidenceRule {
  packages?: string[];    // any of these in dependencies = partial evidence
  files?: string[];       // any of these detected = partial evidence
  deliverableTypes?: string[];  // any of these deliverable types exist = partial evidence
  phases?: string[];      // any of these phases completed = partial evidence
}

// ─── Known detection rules for common tech ───

const PROVIDER_PACKAGES: Record<string, string[]> = {
  // Auth providers
  cognito: ['amazon-cognito-identity-js', '@aws-sdk/client-cognito-identity-provider'],
  auth0: ['auth0', '@auth0/nextjs-auth0', '@auth0/auth0-react'],
  'entra-id': ['@azure/msal-node', '@azure/msal-browser', '@azure/msal-react'],
  'entra-id-b2c': ['@azure/msal-node', '@azure/msal-browser'],
  firebase: ['firebase', 'firebase-admin'],
  supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-nextjs'],
  clerk: ['@clerk/nextjs', '@clerk/express', '@clerk/clerk-sdk-node'],

  // Databases
  postgres: ['pg', 'prisma', '@prisma/client', 'drizzle-orm', 'typeorm', 'knex', 'sequelize'],
  mysql: ['mysql2', 'prisma', '@prisma/client', 'drizzle-orm', 'typeorm', 'knex', 'sequelize'],
  sqlserver: ['mssql', 'tedious', 'prisma', '@prisma/client'],
  mongodb: ['mongodb', 'mongoose', 'prisma', '@prisma/client'],
  dynamodb: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', 'dynamoose'],
  cockroachdb: ['pg', 'prisma', '@prisma/client'],
  planetscale: ['@planetscale/database', 'prisma', '@prisma/client'],

  // Cache
  redis: ['redis', 'ioredis', '@upstash/redis'],
  memcached: ['memcached', 'memjs'],

  // Queues
  rabbitmq: ['amqplib'],
  'azure-service-bus': ['@azure/service-bus'],
  sqs: ['@aws-sdk/client-sqs'],
  kafka: ['kafkajs', 'node-rdkafka'],

  // Search
  elasticsearch: ['@elastic/elasticsearch'],
  algolia: ['algoliasearch'],
  typesense: ['typesense'],
  'azure-search': ['@azure/search-documents'],
  meilisearch: ['meilisearch'],
  pinecone: ['@pinecone-database/pinecone'],
  qdrant: ['@qdrant/js-client-rest'],
  weaviate: ['weaviate-ts-client'],

  // Payments
  stripe: ['stripe', '@stripe/stripe-js'],
  paypal: ['@paypal/checkout-server-sdk', 'paypal-rest-sdk'],
  square: ['square'],
  adyen: ['@adyen/api-library'],
  braintree: ['braintree'],

  // Email
  sendgrid: ['@sendgrid/mail'],
  mailgun: ['mailgun.js', 'mailgun-js'],
  ses: ['@aws-sdk/client-ses'],
  postmark: ['postmark'],
  resend: ['resend'],

  // SMS
  twilio: ['twilio'],
  vonage: ['@vonage/server-sdk'],
  'aws-sns': ['@aws-sdk/client-sns'],
  messagebird: ['messagebird'],

  // Analytics
  posthog: ['posthog-js', 'posthog-node'],
  mixpanel: ['mixpanel', 'mixpanel-browser'],
  amplitude: ['@amplitude/analytics-browser', '@amplitude/analytics-node'],

  // Monitoring
  datadog: ['dd-trace', 'datadog-metrics'],
  newrelic: ['newrelic'],
  'azure-monitor': ['applicationinsights'],
  sentry: ['@sentry/node', '@sentry/nextjs', '@sentry/react'],
  cloudwatch: ['@aws-sdk/client-cloudwatch'],

  // CDN
  cloudflare: ['cloudflare'],

  // Observability
  opentelemetry: ['@opentelemetry/api', '@opentelemetry/sdk-node'],
  jaeger: ['jaeger-client'],
  prometheus: ['prom-client'],
};

const INFRA_FILES: Record<string, string[]> = {
  docker: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
  terraform: ['main.tf', 'terraform.tfvars'],
  pulumi: ['Pulumi.yaml'],
  cdk: ['cdk.json'],
  cloudformation: ['template.yaml', 'template.json'],
  bicep: ['main.bicep'],
  'github-actions': ['.github/workflows'],
  'gitlab-ci': ['.gitlab-ci.yml'],
  'azure-devops': ['azure-pipelines.yml'],
  circleci: ['.circleci/config.yml'],
  railway: ['railway.toml', 'railway.json'],
  vercel: ['vercel.json'],
  netlify: ['netlify.toml'],
  flyio: ['fly.toml'],
};

const DB_SCHEMA_FILES: Record<string, string[]> = {
  prisma: ['prisma/schema.prisma', 'schema.prisma'],
  drizzle: ['drizzle.config.ts', 'drizzle.config.js'],
  mongoose: [], // detected via package
  typeorm: ['ormconfig.json', 'ormconfig.ts'],
  sequelize: ['.sequelizerc'],
};

// ─── Resolver ───

function hasAnyPackage(deps: Record<string, string>, packages: string[]): boolean {
  return packages.some((pkg) => pkg in deps);
}

function hasAnyFile(files: string[], patterns: string[]): boolean {
  return patterns.some((pattern) =>
    files.some((f) => f === pattern || f.endsWith(`/${pattern}`) || f.includes(pattern)),
  );
}

function hasDeliverable(deliverables: { type: string }[], types: string[]): boolean {
  return types.some((t) => deliverables.some((d) => d.type === t));
}

function hasPhase(completedPhases: string[], phases: string[]): boolean {
  return phases.some((p) => completedPhases.includes(p));
}

function resolveStatus(checks: boolean[]): ComponentStatus {
  const passing = checks.filter(Boolean).length;
  if (passing === 0) return 'not_started';
  if (passing === checks.length) return 'done';
  return 'in_progress';
}

function buildEvidence(checks: Array<[boolean, string]>): string[] {
  return checks.filter(([pass]) => pass).map(([, label]) => label);
}

// ─── Category Resolvers ───

function resolveAuth(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  if (!doc.auth || doc.auth.strategy === 'none') return [];

  const deps = ev.codebaseSignals?.detectedDependencies ?? {};
  const files = ev.codebaseSignals?.detectedFiles ?? [];
  const provider = doc.auth.provider;

  const providerPkgs = provider ? PROVIDER_PACKAGES[provider] ?? [] : [];
  const hasPkg = providerPkgs.length > 0 && hasAnyPackage(deps, providerPkgs);
  const hasRoutes = hasAnyFile(files, ['auth', 'middleware', 'login', 'signup', 'register']);
  const hasPhaseComplete = hasPhase(ev.completedPhases, ['blueprint']);

  const checks: Array<[boolean, string]> = [
    [hasPhaseComplete, 'Blueprint phase completed'],
    [hasPkg, `${provider} SDK detected`],
    [hasRoutes, 'Auth routes/middleware detected'],
  ];

  return [{
    id: 'auth:primary',
    category: 'auth',
    label: `${doc.auth.strategy} via ${provider || 'custom'}`,
    status: resolveStatus(checks.map(([c]) => c)),
    evidence: buildEvidence(checks),
  }];
}

function resolveBackendServices(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  const services = doc.architecture.services ?? [];
  if (services.length === 0 && (doc.architecture.projects.backend ?? []).length === 0) return [];

  const files = ev.codebaseSignals?.detectedFiles ?? [];
  const hasScaffold = hasDeliverable(ev.deliverables, ['sdl_artifact', 'scaffold']);

  // One component per service
  const components: ComponentProgress[] = [];

  for (const svc of services) {
    const pathPatterns = [svc.name, svc.name.replace(/[- ]/g, '_')];
    const svcPath = (svc as any).path as string | undefined;
    if (svcPath && svcPath !== '.') pathPatterns.push(svcPath);
    const isRootComponent = svcPath === '.' || svcPath === './';
    const hasDir = isRootComponent || hasAnyFile(files, pathPatterns);
    const checks: Array<[boolean, string]> = [
      [hasScaffold, 'Scaffold deliverable exists'],
      [hasDir, isRootComponent ? 'Root-level component (path: ".")' : `Directory "${svc.name}" detected`],
    ];
    components.push({
      id: `service:${svc.name}`,
      category: 'backend_services',
      label: svc.name,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  // Also check backend projects if no services defined
  if (components.length === 0) {
    for (const proj of doc.architecture.projects.backend ?? []) {
      const pathPatterns = [proj.name, proj.name.replace(/[- ]/g, '_')];
      const projPath = (proj as any).path as string | undefined;
      if (projPath && projPath !== '.') pathPatterns.push(projPath);
      const isRootComponent = projPath === '.' || projPath === './';
      const hasDir = isRootComponent || hasAnyFile(files, pathPatterns);
      const checks: Array<[boolean, string]> = [
        [hasScaffold, 'Scaffold deliverable exists'],
        [hasDir, isRootComponent ? 'Root-level component (path: ".")' : `Directory "${proj.name}" detected`],
      ];
      components.push({
        id: `service:${proj.name}`,
        category: 'backend_services',
        label: proj.name,
        status: resolveStatus(checks.map(([c]) => c)),
        evidence: buildEvidence(checks),
      });
    }
  }

  return components;
}

function resolveFrontends(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  const frontends = doc.architecture.projects.frontend ?? [];
  if (frontends.length === 0) return [];

  const files = ev.codebaseSignals?.detectedFiles ?? [];
  const hasScaffold = hasDeliverable(ev.deliverables, ['sdl_artifact', 'scaffold']);

  return frontends.map((fe) => {
    const pathPatterns = [fe.name, fe.name.replace(/[- ]/g, '_')];
    const fePath = (fe as any).path as string | undefined;
    if (fePath && fePath !== '.') pathPatterns.push(fePath);
    const isRootComponent = fePath === '.' || fePath === './';
    const hasDir = isRootComponent || hasAnyFile(files, pathPatterns);
    const checks: Array<[boolean, string]> = [
      [hasScaffold, 'Scaffold deliverable exists'],
      [hasDir, isRootComponent ? 'Root-level component (path: ".")' : `Directory "${fe.name}" detected`],
    ];
    return {
      id: `frontend:${fe.name}`,
      category: 'frontends' as ProgressCategory,
      label: `${fe.name} (${fe.framework})`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    };
  });
}

function resolveDatabases(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  const dbs: ComponentProgress[] = [];
  const deps = ev.codebaseSignals?.detectedDependencies ?? {};
  const files = ev.codebaseSignals?.detectedFiles ?? [];
  const hasDataModel = hasDeliverable(ev.deliverables, ['data_model', 'sdl_artifact']);
  const hasDataModelPhase = hasPhase(ev.completedPhases, ['data-model']);

  const allDbs = [doc.data.primaryDatabase, ...(doc.data.secondaryDatabases ?? [])];

  for (const db of allDbs) {
    const dbPkgs = PROVIDER_PACKAGES[db.type] ?? [];
    const hasPkg = dbPkgs.length > 0 && hasAnyPackage(deps, dbPkgs);

    // Check for ORM schema files
    const backend = doc.architecture.projects.backend?.[0];
    const orm = backend?.orm;
    const ormFiles = orm ? DB_SCHEMA_FILES[orm.replace(/-/g, '')] ?? [] : [];
    const hasSchema = ormFiles.length > 0 && hasAnyFile(files, ormFiles);

    const checks: Array<[boolean, string]> = [
      [hasDataModel || hasDataModelPhase, 'Data model generated'],
      [hasPkg, `${db.type} driver detected`],
      [hasSchema, 'Schema file detected'],
    ];

    dbs.push({
      id: `database:${db.name || db.type}`,
      category: 'databases',
      label: `${db.name || db.type} (${db.hosting})`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  // Cache
  if (doc.data.cache && doc.data.cache.type && doc.data.cache.type !== 'none') {
    const cachePkgs = PROVIDER_PACKAGES[doc.data.cache.type] ?? [];
    const hasPkg = cachePkgs.length > 0 && hasAnyPackage(deps, cachePkgs);
    const checks: Array<[boolean, string]> = [
      [hasPkg, `${doc.data.cache.type} client detected`],
    ];
    dbs.push({
      id: `cache:${doc.data.cache.type}`,
      category: 'databases',
      label: `${doc.data.cache.type} cache`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  // Queues
  if (doc.data.queues?.provider) {
    const qPkgs = PROVIDER_PACKAGES[doc.data.queues.provider] ?? [];
    const hasPkg = qPkgs.length > 0 && hasAnyPackage(deps, qPkgs);
    const checks: Array<[boolean, string]> = [
      [hasPkg, `${doc.data.queues.provider} client detected`],
    ];
    dbs.push({
      id: `queue:${doc.data.queues.provider}`,
      category: 'databases',
      label: `${doc.data.queues.provider} queue`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  // Search
  if (doc.data.search?.provider) {
    const sPkgs = PROVIDER_PACKAGES[doc.data.search.provider] ?? [];
    const hasPkg = sPkgs.length > 0 && hasAnyPackage(deps, sPkgs);
    const checks: Array<[boolean, string]> = [
      [hasPkg, `${doc.data.search.provider} client detected`],
    ];
    dbs.push({
      id: `search:${doc.data.search.provider}`,
      category: 'databases',
      label: `${doc.data.search.provider} search`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  return dbs;
}

function resolveIntegrations(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  if (!doc.integrations) return [];
  const deps = ev.codebaseSignals?.detectedDependencies ?? {};
  const files = ev.codebaseSignals?.detectedFiles ?? [];
  const components: ComponentProgress[] = [];

  const integrationEntries: Array<{ key: string; provider?: string; label: string }> = [];

  if (doc.integrations.payments?.provider) {
    integrationEntries.push({ key: 'payments', provider: doc.integrations.payments.provider, label: `${doc.integrations.payments.provider} payments` });
  }
  if (doc.integrations.email?.provider) {
    integrationEntries.push({ key: 'email', provider: doc.integrations.email.provider, label: `${doc.integrations.email.provider} email` });
  }
  if (doc.integrations.sms?.provider) {
    integrationEntries.push({ key: 'sms', provider: doc.integrations.sms.provider, label: `${doc.integrations.sms.provider} SMS` });
  }
  if (doc.integrations.analytics?.provider) {
    integrationEntries.push({ key: 'analytics', provider: doc.integrations.analytics.provider, label: `${doc.integrations.analytics.provider} analytics` });
  }
  if (doc.integrations.monitoring?.provider) {
    integrationEntries.push({ key: 'monitoring', provider: doc.integrations.monitoring.provider, label: `${doc.integrations.monitoring.provider} monitoring` });
  }
  if (doc.integrations.cdn?.provider) {
    integrationEntries.push({ key: 'cdn', provider: doc.integrations.cdn.provider, label: `${doc.integrations.cdn.provider} CDN` });
  }
  for (const custom of doc.integrations.custom ?? []) {
    integrationEntries.push({ key: `custom-${custom.name}`, provider: undefined, label: custom.name });
  }

  for (const entry of integrationEntries) {
    const providerPkgs = entry.provider ? PROVIDER_PACKAGES[entry.provider] ?? [] : [];
    const hasPkg = providerPkgs.length > 0 && hasAnyPackage(deps, providerPkgs);
    const hasFile = hasAnyFile(files, [entry.key, entry.provider ?? entry.key]);

    const checks: Array<[boolean, string]> = [
      [hasPkg, `${entry.provider || entry.key} SDK detected`],
      [hasFile, `${entry.key} files detected`],
    ];

    components.push({
      id: `integration:${entry.key}`,
      category: 'integrations',
      label: entry.label,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  return components;
}

function resolveInfrastructure(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  const files = ev.codebaseSignals?.detectedFiles ?? [];
  const configs = ev.codebaseSignals?.detectedConfigs ?? [];
  const allFiles = [...files, ...configs];
  const components: ComponentProgress[] = [];

  // Containerization
  const dockerFiles = INFRA_FILES['docker'];
  const hasDocker = hasAnyFile(allFiles, dockerFiles);
  components.push({
    id: 'infra:containerization',
    category: 'infrastructure',
    label: 'Containerization (Docker)',
    status: hasDocker ? 'done' : 'not_started',
    evidence: hasDocker ? ['Dockerfile/docker-compose detected'] : [],
  });

  // CI/CD
  if (doc.deployment.ciCd) {
    const ciFiles = INFRA_FILES[doc.deployment.ciCd.provider] ?? [];
    const hasCi = ciFiles.length > 0 && hasAnyFile(allFiles, ciFiles);
    const hasCiPhase = hasPhase(ev.completedPhases, ['setup-cicd']);
    const checks: Array<[boolean, string]> = [
      [hasCi, `${doc.deployment.ciCd.provider} config detected`],
      [hasCiPhase, 'CI/CD phase completed'],
    ];
    components.push({
      id: 'infra:cicd',
      category: 'infrastructure',
      label: `CI/CD (${doc.deployment.ciCd.provider})`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  // IaC
  if (doc.deployment.infrastructure?.iac) {
    const iacFiles = INFRA_FILES[doc.deployment.infrastructure.iac] ?? [];
    const hasIac = iacFiles.length > 0 && hasAnyFile(allFiles, iacFiles);
    const hasInfraDeliverable = hasDeliverable(ev.deliverables, ['infrastructure_code', 'sdl_artifact']);
    const checks: Array<[boolean, string]> = [
      [hasIac, `${doc.deployment.infrastructure.iac} files detected`],
      [hasInfraDeliverable, 'Infrastructure code generated'],
    ];
    components.push({
      id: 'infra:iac',
      category: 'infrastructure',
      label: `IaC (${doc.deployment.infrastructure.iac})`,
      status: resolveStatus(checks.map(([c]) => c)),
      evidence: buildEvidence(checks),
    });
  }

  // Cloud deployment
  const cloudFiles = INFRA_FILES[doc.deployment.cloud] ?? [];
  if (cloudFiles.length > 0) {
    const hasCloud = hasAnyFile(allFiles, cloudFiles);
    components.push({
      id: `infra:cloud-${doc.deployment.cloud}`,
      category: 'infrastructure',
      label: `${doc.deployment.cloud} deployment`,
      status: hasCloud ? 'done' : 'not_started',
      evidence: hasCloud ? [`${doc.deployment.cloud} config detected`] : [],
    });
  }

  return components;
}

function resolveArchitectureDecisions(_doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  const hasAdr = hasDeliverable(ev.deliverables, ['adr', 'sdl_artifact']);
  const hasBlueprintPhase = hasPhase(ev.completedPhases, ['blueprint']);

  const checks: Array<[boolean, string]> = [
    [hasBlueprintPhase, 'Blueprint phase completed'],
    [hasAdr, 'ADRs generated'],
  ];

  return [{
    id: 'decisions:adrs',
    category: 'architecture_decisions',
    label: 'Architecture Decision Records',
    status: resolveStatus(checks.map(([c]) => c)),
    evidence: buildEvidence(checks),
  }];
}

function resolveObservability(doc: SDLDocument, ev: ProgressEvidence): ComponentProgress[] {
  if (!doc.observability) return [];

  const deps = ev.codebaseSignals?.detectedDependencies ?? {};
  const components: ComponentProgress[] = [];

  if (doc.observability.logging?.provider) {
    const pkgs = PROVIDER_PACKAGES[doc.observability.logging.provider] ?? [doc.observability.logging.provider];
    const hasPkg = hasAnyPackage(deps, pkgs);
    components.push({
      id: 'observability:logging',
      category: 'observability',
      label: `Logging (${doc.observability.logging.provider})`,
      status: hasPkg ? 'done' : 'not_started',
      evidence: hasPkg ? [`${doc.observability.logging.provider} detected`] : [],
    });
  }

  if (doc.observability.tracing?.provider && doc.observability.tracing.provider !== 'none') {
    const pkgs = PROVIDER_PACKAGES[doc.observability.tracing.provider] ?? [];
    const hasPkg = pkgs.length > 0 && hasAnyPackage(deps, pkgs);
    components.push({
      id: 'observability:tracing',
      category: 'observability',
      label: `Tracing (${doc.observability.tracing.provider})`,
      status: hasPkg ? 'done' : 'not_started',
      evidence: hasPkg ? [`${doc.observability.tracing.provider} detected`] : [],
    });
  }

  if (doc.observability.metrics?.provider && doc.observability.metrics.provider !== 'none') {
    const pkgs = PROVIDER_PACKAGES[doc.observability.metrics.provider] ?? [];
    const hasPkg = pkgs.length > 0 && hasAnyPackage(deps, pkgs);
    components.push({
      id: 'observability:metrics',
      category: 'observability',
      label: `Metrics (${doc.observability.metrics.provider})`,
      status: hasPkg ? 'done' : 'not_started',
      evidence: hasPkg ? [`${doc.observability.metrics.provider} detected`] : [],
    });
  }

  return components;
}

// ─── Category Labels ───

const CATEGORY_LABELS: Record<ProgressCategory, string> = {
  architecture_decisions: 'Architecture Decisions',
  backend_services: 'Backend Services',
  databases: 'Data Layer',
  frontends: 'Frontend',
  auth: 'Auth & Security',
  integrations: 'Integrations',
  infrastructure: 'Infrastructure',
  observability: 'Observability',
};

// ─── Main Resolver ───

function buildCategorySummary(category: ProgressCategory, components: ComponentProgress[]): CategorySummary {
  if (components.length === 0) {
    return {
      category,
      label: CATEGORY_LABELS[category],
      completed: 0,
      total: 0,
      percent: 100, // empty = nothing to do = complete
      components: [],
    };
  }

  const completed = components.filter((c) => c.status === 'done').length;
  return {
    category,
    label: CATEGORY_LABELS[category],
    completed,
    total: components.length,
    percent: Math.round((completed / components.length) * 100),
    components,
  };
}

function applyOverrides(components: ComponentProgress[], overrides: ManualOverride[]): void {
  for (const override of overrides) {
    const component = components.find((c) => c.id === override.componentId);
    if (component) {
      component.status = override.status;
      component.evidence.push(`Manually set${override.note ? `: ${override.note}` : ''}`);
    }
  }
}

export function resolveProgress(
  doc: SDLDocument,
  evidence: ProgressEvidence,
  overrides: ManualOverride[] = [],
  projectId: string = '',
): ProgressSnapshot {
  // Resolve all categories
  const decisions = resolveArchitectureDecisions(doc, evidence);
  const services = resolveBackendServices(doc, evidence);
  const databases = resolveDatabases(doc, evidence);
  const frontends = resolveFrontends(doc, evidence);
  const auth = resolveAuth(doc, evidence);
  const integrations = resolveIntegrations(doc, evidence);
  const infrastructure = resolveInfrastructure(doc, evidence);
  const observability = resolveObservability(doc, evidence);

  // Apply manual overrides
  const allComponents = [
    ...decisions, ...services, ...databases, ...frontends,
    ...auth, ...integrations, ...infrastructure, ...observability,
  ];
  applyOverrides(allComponents, overrides);

  // Build category summaries (only include non-empty categories)
  const allCategories: CategorySummary[] = [
    buildCategorySummary('architecture_decisions', decisions),
    buildCategorySummary('backend_services', services),
    buildCategorySummary('databases', databases),
    buildCategorySummary('frontends', frontends),
    buildCategorySummary('auth', auth),
    buildCategorySummary('integrations', integrations),
    buildCategorySummary('infrastructure', infrastructure),
    buildCategorySummary('observability', observability),
  ].filter((c) => c.total > 0);

  // Overall percent: weighted average across non-empty categories
  const totalComponents = allCategories.reduce((sum, c) => sum + c.total, 0);
  const totalCompleted = allCategories.reduce((sum, c) => sum + c.completed, 0);
  const overallPercent = totalComponents > 0
    ? Math.round((totalCompleted / totalComponents) * 100)
    : 0;

  return {
    projectId,
    overallPercent,
    categories: allCategories,
    generatedAt: new Date().toISOString(),
  };
}
