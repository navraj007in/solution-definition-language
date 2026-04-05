export type ExtensionFields = { [key: `x-${string}`]: unknown };

export interface SDLDocumentV11 extends ExtensionFields {
  sdlVersion: '1.1';
  imports?: string[];
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
  services?: Record<string, unknown>[];
  sharedLibraries?: Record<string, unknown>[];
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
