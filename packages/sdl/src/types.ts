// ─── Extension fields (x- prefix) ───

type ExtensionFields = { [key: `x-${string}`]: unknown };

// ─── Root SDL Document ───

export interface SDLDocument extends ExtensionFields {
  sdlVersion: '1.1';
  solution: SolutionMetadata;
  product: ProductContext;
  architecture: Architecture;
  auth?: Authentication;
  data: DataLayer;
  integrations?: Integrations;
  nonFunctional: NFRs;
  deployment: Deployment;
  constraints?: Constraints;
  techDebt?: TechDebt[];
  technicalDebt?: TechDebt[];
  evolution?: Evolution;
  testing?: Testing;
  observability?: Observability;
  artifacts?: ArtifactConfig;
  contracts?: ContractsSection;
  domain?: DomainSection;
  features?: FeatureSection[];
  compliance?: ComplianceSection;
  slos?: SloSection;
  resilience?: ResilienceSection;
  costs?: CostSection;
  backupDr?: BackupDrSection;
  design?: DesignSection;
}

// ─── $defs types ───

export interface SolutionMetadata extends ExtensionFields {
  name: string;
  description: string;
  stage: 'MVP' | 'Growth' | 'Enterprise';
  domain?: string;
  regions?: Regions;
  repository?: Repository;
}

export interface Regions extends ExtensionFields {
  primary: string;
  secondary?: string[];
}

export interface Repository extends ExtensionFields {
  org?: string;
  naming?: string;
}

export interface ProductContext extends ExtensionFields {
  personas: Persona[];
  coreFlows?: CoreFlow[];
  valueProposition?: string;
}

export interface Persona extends ExtensionFields {
  name: string;
  goals: string[];
  accessLevel?: 'public' | 'authenticated' | 'admin';
}

export interface CoreFlow extends ExtensionFields {
  name: string;
  steps?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface Architecture extends ExtensionFields {
  style: 'modular-monolith' | 'microservices' | 'serverless';
  projects: Projects;
  services?: Service[];
  sharedLibraries?: SharedLibrary[];
}

export interface Projects extends ExtensionFields {
  frontend?: FrontendProject[];
  backend?: BackendProject[];
  mobile?: MobileProject[];
}

export interface FrontendProject extends ExtensionFields {
  name: string;
  type?: 'web' | 'mobile-web' | 'admin';
  framework: 'nextjs' | 'react' | 'vue' | 'angular' | 'svelte' | 'solid';
  rendering?: 'ssr' | 'ssg' | 'spa';
  stateManagement?: 'context' | 'redux' | 'zustand' | 'mobx' | 'none';
  styling?: 'tailwind' | 'css-modules' | 'styled-components' | 'sass' | 'emotion';
}

export interface BackendProject extends ExtensionFields {
  name: string;
  type?: 'backend' | 'worker' | 'function';
  framework: 'dotnet-8' | 'nodejs' | 'python-fastapi' | 'go' | 'java-spring' | 'ruby-rails' | 'php-laravel';
  apiStyle?: 'rest' | 'graphql' | 'grpc' | 'mixed';
  orm?: 'ef-core' | 'prisma' | 'typeorm' | 'sqlalchemy' | 'gorm' | 'sequelize' | 'mongoose';
  apiVersioning?: 'url-prefix' | 'header' | 'query-param' | 'none';
}

export interface MobileProject extends ExtensionFields {
  name: string;
  platform: 'ios' | 'android' | 'cross-platform';
  framework: 'react-native' | 'flutter' | 'swift' | 'kotlin' | 'ionic';
}

export interface Service extends ExtensionFields {
  name: string;
  kind: 'backend' | 'worker' | 'function' | 'api-gateway';
  responsibilities?: string[];
  exposes?: ServiceExposes;
  dependencies?: string[];
}

export interface ServiceExposes extends ExtensionFields {
  http?: ServiceHttp;
  grpc?: boolean;
  graphql?: boolean;
}

export interface ServiceHttp extends ExtensionFields {
  basePath?: string;
  openapi?: boolean;
}

export interface SharedLibrary extends ExtensionFields {
  name?: string;
  language?: string;
}

export interface Authentication extends ExtensionFields {
  strategy: 'oidc' | 'passwordless' | 'magic-link' | 'api-key' | 'none';
  provider?: 'cognito' | 'auth0' | 'entra-id' | 'entra-id-b2c' | 'firebase' | 'supabase' | 'clerk' | 'custom';
  roles?: string[];
  sessions?: Sessions;
  mfa?: boolean;
  socialProviders?: Array<'google' | 'github' | 'microsoft' | 'apple' | 'facebook' | 'twitter'>;
}

export interface Sessions extends ExtensionFields {
  accessToken?: 'jwt' | 'opaque';
  refreshToken?: boolean;
  ttl?: SessionTTL;
}

export interface SessionTTL extends ExtensionFields {
  access?: string;
  refresh?: string;
}

export interface DataLayer extends ExtensionFields {
  primaryDatabase: Database;
  secondaryDatabases?: Database[];
  storage?: DataStorage;
  cache?: DataCache;
  queues?: DataQueues;
  search?: DataSearch;
}

export interface Database extends ExtensionFields {
  type: 'postgres' | 'mysql' | 'sqlserver' | 'mongodb' | 'dynamodb' | 'cockroachdb' | 'planetscale';
  hosting: 'managed' | 'self-hosted' | 'serverless';
  name?: string;
  size?: 'small' | 'medium' | 'large';
  role?: 'primary' | 'read-replica' | 'analytics';
}

export interface DataStorage extends ExtensionFields {
  blobs?: BlobStorage;
  files?: FileStorage;
}

export interface BlobStorage extends ExtensionFields {
  provider?: 'azure-blob' | 's3' | 'gcs' | 'cloudflare-r2';
  public?: boolean;
}

export interface FileStorage extends ExtensionFields {
  provider?: 'azure-blob' | 's3' | 'gcs' | 'cloudflare-r2';
}

export interface DataCache extends ExtensionFields {
  type?: 'redis' | 'memcached' | 'none';
  required?: boolean;
  useCase?: Array<'session' | 'api' | 'query'>;
}

export interface DataQueues extends ExtensionFields {
  provider?: 'rabbitmq' | 'azure-service-bus' | 'sqs' | 'kafka' | 'redis';
  useCase?: Array<'async-jobs' | 'event-streaming' | 'notifications'>;
}

export interface DataSearch extends ExtensionFields {
  provider?: 'elasticsearch' | 'algolia' | 'typesense' | 'azure-search' | 'meilisearch' | 'pinecone' | 'qdrant' | 'weaviate';
}

export interface Integrations extends ExtensionFields {
  payments?: PaymentIntegration;
  email?: EmailIntegration;
  sms?: SmsIntegration;
  analytics?: AnalyticsIntegration;
  monitoring?: MonitoringIntegration;
  cdn?: CdnIntegration;
  custom?: CustomIntegration[];
}

export interface PaymentIntegration extends ExtensionFields {
  provider?: 'stripe' | 'paypal' | 'square' | 'adyen' | 'braintree';
  mode?: 'subscriptions' | 'one-time' | 'marketplace';
  currency?: string;
}

export interface EmailIntegration extends ExtensionFields {
  provider?: 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend' | 'smtp';
  useCase?: Array<'transactional' | 'marketing' | 'notifications'>;
}

export interface SmsIntegration extends ExtensionFields {
  provider?: 'twilio' | 'vonage' | 'aws-sns' | 'messagebird';
}

export interface AnalyticsIntegration extends ExtensionFields {
  provider?: 'posthog' | 'mixpanel' | 'amplitude' | 'google-analytics' | 'plausible';
}

export interface MonitoringIntegration extends ExtensionFields {
  provider?: 'datadog' | 'newrelic' | 'azure-monitor' | 'sentry' | 'cloudwatch';
}

export interface CdnIntegration extends ExtensionFields {
  provider?: 'cloudflare' | 'fastly' | 'azure-cdn' | 'cloudfront';
}

export interface CustomIntegration extends ExtensionFields {
  name: string;
  apiType: 'rest' | 'graphql' | 'soap' | 'grpc';
  authMethod?: 'api-key' | 'oauth2' | 'basic' | 'none';
  rateLimit?: string;
}

export interface NFRs extends ExtensionFields {
  availability: Availability;
  scaling: Scaling;
  performance?: Performance;
  security?: Security;
  compliance?: Compliance;
  backup?: Backup;
}

export interface Availability extends ExtensionFields {
  target: string;
  maintenanceWindow?: string;
}

export interface Scaling extends ExtensionFields {
  expectedUsersMonth1?: number;
  expectedUsersYear1?: number;
  peakConcurrentUsers?: number;
  dataGrowthPerMonth?: string;
}

export interface Performance extends ExtensionFields {
  apiResponseTime?: string;
  pageLoadTime?: string;
}

export interface Security extends ExtensionFields {
  pii: boolean;
  phi?: boolean;
  pci?: boolean;
  encryptionAtRest?: boolean;
  encryptionInTransit?: boolean;
  auditLogging?: 'none' | 'basic' | 'detailed' | 'compliance';
  penetrationTesting?: boolean;
}

export interface Compliance extends ExtensionFields {
  frameworks?: Array<'gdpr' | 'hipaa' | 'sox' | 'pci-dss' | 'iso27001' | 'soc2'>;
}

export interface Backup extends ExtensionFields {
  frequency?: 'hourly' | 'daily' | 'weekly';
  retention?: string;
  pointInTimeRecovery?: boolean;
}

export interface Deployment extends ExtensionFields {
  cloud: 'azure' | 'aws' | 'gcp' | 'cloudflare' | 'vercel' | 'railway' | 'render' | 'fly-io';
  runtime?: DeploymentRuntime;
  networking?: DeploymentNetworking;
  ciCd?: DeploymentCiCd;
  infrastructure?: DeploymentInfrastructure;
}

export interface DeploymentRuntime extends ExtensionFields {
  frontend?: string;
  backend?: string;
  worker?: string;
}

export interface DeploymentNetworking extends ExtensionFields {
  publicApi?: boolean;
  waf?: boolean;
  ddos?: boolean;
  privateEndpoints?: boolean;
  customDomain?: boolean;
}

export interface DeploymentCiCd extends ExtensionFields {
  provider: 'github-actions' | 'gitlab-ci' | 'azure-devops' | 'circleci' | 'jenkins';
  environments?: Environment[];
}

export interface Environment extends ExtensionFields {
  name: string;
  autoApproval?: boolean;
  requiresTests?: boolean;
  secrets?: string[];
}

export interface DeploymentInfrastructure extends ExtensionFields {
  iac?: 'terraform' | 'bicep' | 'pulumi' | 'cdk' | 'cloudformation';
  stateBacking?: string;
}

export interface Constraints extends ExtensionFields {
  budget?: 'startup' | 'scaleup' | 'enterprise' | 'custom';
  budgetAmount?: string;
  team?: Team;
  timeline?: string;
  compliance?: Array<'gdpr' | 'hipaa' | 'sox' | 'pci-dss' | 'iso27001' | 'soc2'>;
  existingInfra?: ExistingInfra;
  skills?: Skills;
}

export interface Team extends ExtensionFields {
  backend?: number;
  frontend?: number;
  fullstack?: number;
  devops?: number;
  designer?: number;
  developers?: number;
}

export interface ExistingInfra extends ExtensionFields {
  description?: string;
  mustReuse?: boolean;
}

export interface Skills extends ExtensionFields {
  languages?: string[];
  cloudExperience?: Array<'azure' | 'aws' | 'gcp'>;
}

export interface TechDebt extends ExtensionFields {
  id: string;
  decision: string;
  reason: string;
  impact: string;
  effort?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  triggerCondition?: string;
  mitigationPlan?: string;
}

export interface Evolution extends ExtensionFields {
  triggers?: EvolutionTrigger[];
  roadmap?: RoadmapEntry[];
  costProjection?: CostProjection;
}

export interface EvolutionTrigger extends ExtensionFields {
  condition: string;
  action: string;
  estimatedEffort?: string;
  blockers?: string[];
}

export interface RoadmapEntry extends ExtensionFields {
  stage?: 'MVP' | 'Growth' | 'Enterprise';
  targetDate?: string;
  architectureChanges?: string[];
  newCapabilities?: string[];
}

export interface CostProjection extends ExtensionFields {
  currentMonthly?: string;
  atMVP?: string;
  atGrowth?: string;
  atEnterprise?: string;
}

export interface ArtifactConfig extends ExtensionFields {
  generate: ArtifactType[];
  formats?: ArtifactFormats;
}

export type ArtifactType =
  | 'architecture-diagram'
  | 'sequence-diagrams'
  | 'openapi'
  | 'data-model'
  | 'repo-scaffold'
  | 'iac-skeleton'
  | 'backlog'
  | 'adr'
  | 'deployment-guide'
  | 'cost-estimate'
  | 'coding-rules'
  | 'coding-rules-enforcement';

export interface ArtifactFormats extends ExtensionFields {
  diagrams?: 'mermaid' | 'plantuml' | 'structurizr';
  adr?: 'markdown' | 'asciidoc';
}

// ─── Testing ───

export interface Testing extends ExtensionFields {
  unit?: TestUnitConfig;
  e2e?: TestE2EConfig;
  coverage?: TestCoverageConfig;
}

export interface TestUnitConfig extends ExtensionFields {
  framework?: 'jest' | 'vitest' | 'pytest' | 'xunit' | 'go-test' | 'junit' | 'rspec' | 'phpunit';
}

export interface TestE2EConfig extends ExtensionFields {
  framework?: 'playwright' | 'cypress' | 'selenium' | 'none';
}

export interface TestCoverageConfig extends ExtensionFields {
  target?: number;
  enforce?: boolean;
}

// ─── Observability ───

export interface Observability extends ExtensionFields {
  logging?: ObservabilityLogging;
  tracing?: ObservabilityTracing;
  metrics?: ObservabilityMetrics;
}

export interface ObservabilityLogging extends ExtensionFields {
  provider?: 'pino' | 'winston' | 'serilog' | 'zerolog' | 'log4j' | 'structured';
  structured?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ObservabilityTracing extends ExtensionFields {
  provider?: 'opentelemetry' | 'jaeger' | 'zipkin' | 'xray' | 'none';
  samplingRate?: number;
}

export interface ObservabilityMetrics extends ExtensionFields {
  provider?: 'prometheus' | 'datadog' | 'cloudwatch' | 'grafana' | 'none';
}

// ─── Validation Output Types ───

export interface ValidationError {
  type: 'error';
  code: string;
  path: string;
  message: string;
  fix?: string;
}

export interface ValidationWarning {
  type: 'warning';
  code: string;
  path: string;
  message: string;
  recommendation?: string;
}

export interface ValidationSummary {
  architecture: string;
  projects: number;
  estimatedCost: string;
  artifactsToGenerate: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary?: ValidationSummary;
}

/**
 * A single field that was filled by the normalizer rather than explicitly
 * authored in the SDL document.
 */
export interface Inference {
  /** Dot-notation path to the inferred field (e.g. "deployment.ciCd.provider") */
  path: string;
  /** The value that was applied */
  value: unknown;
  /** Human-readable reason for the inference */
  reason: string;
}

export interface CompileResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  document: SDLDocument | null;
  summary: ValidationSummary | null;
  /** Fields filled by the normalizer that were not explicitly authored */
  inferences: Inference[];
}

export interface ContractsSection extends ExtensionFields {
  apis?: ContractDefinition[];
}

export interface ContractDefinition extends ExtensionFields {
  name: string;
  type?: 'rest' | 'graphql' | 'grpc' | 'webhook' | 'asyncapi';
  owner?: string;
}

export interface DomainSection extends ExtensionFields {
  entities?: DomainEntity[];
  relationships?: DomainRelationship[];
}

export interface DomainEntity extends ExtensionFields {
  name: string;
  fields?: DomainField[];
}

export interface DomainField extends ExtensionFields {
  name: string;
  type: string;
  required?: boolean;
}

export interface DomainRelationship extends ExtensionFields {
  from: string;
  to: string;
  type?: string;
}

export interface FeatureSection extends ExtensionFields {
  name: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceSection extends ExtensionFields {
  frameworks?: Array<'gdpr' | 'hipaa' | 'sox' | 'pci-dss' | 'iso27001' | 'soc2'>;
}

export interface SloSection extends ExtensionFields {
  services?: Array<{ name: string; availability?: string; latencyP95?: string }>;
}

export interface ResilienceSection extends ExtensionFields {
  strategy?: string;
  rto?: string;
  rpo?: string;
}

export interface CostSection extends ExtensionFields {
  monthly?: string;
  notes?: string[];
}

export interface BackupDrSection extends ExtensionFields {
  backups?: Array<{ target: string; frequency?: string; retention?: string }>;
}

export interface DesignSection extends ExtensionFields {
  personality?: string;
  colors?: Record<string, string>;
  typography?: Record<string, string>;
}
