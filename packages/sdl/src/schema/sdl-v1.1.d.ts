export type ExtensionFields = { [key: `x-${string}`]: unknown };

export interface SDLDocumentV11 extends ExtensionFields {
  sdlVersion: '1.1';
  /**
   * Module imports. Each entry is either:
   *  - a path string ending in `.sdl.yaml` / `.sdl.yml` (Form A)
   *  - a path string with the extension omitted; resolver appends `.sdl.yaml` then `.sdl.yml` (Form B)
   *  - an explicit `{ name, path }` object (Form C); `path` may be Form A or B
   */
  imports?: Array<string | { name: string; path: string }>;
  solution: SolutionMetadata;
  architecture: Architecture;
  data: DataLayer;
  product?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
  environments?: Record<string, unknown>[];
  nonFunctional?: Record<string, unknown>;
  observability?: Record<string, unknown>;
  integrations?: Record<string, unknown> | Record<string, unknown>[];
  constraints?: Record<string, unknown>;
  testing?: Record<string, unknown>;
  techDebt?: Array<Record<string, unknown> | string>;
  contracts?: ContractDefinition[] | Record<string, unknown>;
  domain?: DomainModel;
  features?: Record<string, unknown>;
  compliance?: Record<string, unknown>;
  slos?: Record<string, unknown>[];
  resilience?: Record<string, unknown>;
  costs?: Record<string, unknown>;
  backupDr?: Record<string, unknown>;
  design?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
}

export interface SolutionMetadata extends ExtensionFields {
  name: string;
  description: string;
  stage?: 'concept' | 'mvp' | 'growth' | 'enterprise' | 'MVP' | 'Growth' | 'Enterprise';
  [key: string]: unknown;
}

export interface Architecture extends ExtensionFields {
  style: 'modular-monolith' | 'microservices' | 'serverless' | 'hybrid';
  projects: {
    frontend?: Record<string, unknown>[];
    backend?: Record<string, unknown>[];
    mobile?: Record<string, unknown>[];
    [key: string]: unknown;
  };
  services?: Service[];
  sharedLibraries?: Record<string, unknown>[];
  /** Project-wide error envelope + status mapping. Drives error middleware emission, typed SDK error classes, and OpenAPI ErrorEnvelope schemas. */
  errorConventions?: ErrorConventions;
  [key: string]: unknown;
}

export interface ErrorEnvelopeField extends ExtensionFields {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface ErrorEnvelope extends ExtensionFields {
  /** Always 'object' for v1; reserved for future shape extensions. */
  kind: 'object';
  fields: ErrorEnvelopeField[];
}

export interface ErrorStatusMappingEntry extends ExtensionFields {
  status: number;
  code: string;
  retryable?: boolean;
  /** When true, the response should set Retry-After. */
  retry_after_header?: boolean;
}

export interface ErrorRetryPolicy extends ExtensionFields {
  max_attempts: number;
  backoff: 'exponential' | 'linear' | 'constant';
  base_ms: number;
  cap_ms: number;
}

export interface ErrorConventions extends ExtensionFields {
  envelope?: ErrorEnvelope;
  status_mapping?: ErrorStatusMappingEntry[];
  retry_policy?: ErrorRetryPolicy;
}

export interface Service extends ExtensionFields {
  name: string;
  kind?: 'backend' | 'worker' | 'function' | 'api-gateway';
  responsibilities?: string[];
  exposes?: Record<string, unknown>;
  dependencies?: string[];
  [key: string]: unknown;
}

export interface DataLayer extends ExtensionFields {
  primaryDatabase: {
    type: string;
    hosting: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ContractDefinition extends ExtensionFields {
  name: string;
  type: 'openapi' | 'graphql' | 'grpc';
  path: string;
  version?: string;
  [key: string]: unknown;
}

export interface DomainModel extends ExtensionFields {
  entities?: DomainEntity[];
  [key: string]: unknown;
}

export interface DomainEntity extends ExtensionFields {
  name: string;
  fields?: DomainField[];
  relationships?: DomainRelationship[];
  indexes?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface DomainField extends ExtensionFields {
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface DomainRelationship extends ExtensionFields {
  target: string;
  [key: string]: unknown;
}
