import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSemantics } from '../semantic-validator';
import type { SDLDocument } from '../types';

/**
 * Minimal valid SDL document for use as a base in tests
 */
function minimalValid(): SDLDocument {
  return {
    sdlVersion: '1.1',
    solution: {
      name: 'Test App',
      description: 'A test application',
      stage: 'MVP',
    },
    product: {
      personas: [{ name: 'user', goals: ['do something'] }],
    },
    architecture: {
      style: 'modular-monolith',
      projects: {
        backend: [{ name: 'api', framework: 'nodejs' }],
      },
    },
    data: {
      primaryDatabase: { type: 'postgres', hosting: 'managed' },
    },
    nonFunctional: {
      availability: { target: '99.9%' },
      scaling: { expectedUsersMonth1: 100, expectedUsersYear1: 1000 },
    },
    deployment: {
      cloud: 'aws',
    },
  };
}

describe('Semantic Validator', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // SEM-001: Domain relationships must reference existing entities
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-001: Domain relationship entity existence', () => {
    it('passes when domain relationships target known entities', () => {
      const doc = minimalValid();
      doc.domain = {
        entities: [
          { name: 'User', fields: [{ name: 'id', type: 'uuid' }] },
          { name: 'Post', fields: [{ name: 'id', type: 'uuid' }] },
        ],
        relationships: [
          { from: 'User', to: 'Post', type: 'one-to-many' },
        ],
      };

      const errors = validateSemantics(doc);
      assert.equal(errors.length, 0);
    });

    it('rejects when relationship targets unknown entity', () => {
      const doc = minimalValid();
      doc.domain = {
        entities: [{ name: 'User', fields: [{ name: 'id', type: 'uuid' }] }],
        relationships: [{ from: 'User', to: 'UnknownEntity' }],
      };

      const errors = validateSemantics(doc);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, 'DOMAIN_RELATIONSHIP_ENTITY_UNKNOWN');
      assert.ok(errors[0].path.includes('to'));
    });

    it('rejects when relationship source is unknown entity', () => {
      const doc = minimalValid();
      doc.domain = {
        entities: [{ name: 'User', fields: [{ name: 'id', type: 'uuid' }] }],
        relationships: [{ from: 'UnknownEntity', to: 'User' }],
      };

      const errors = validateSemantics(doc);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, 'DOMAIN_RELATIONSHIP_ENTITY_UNKNOWN');
      assert.ok(errors[0].path.includes('from'));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-002, SEM-003, SEM-004: Service dependency checks
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-002: Service dependency existence', () => {
    it('passes when services depend on known services', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.projects.backend = []; // Clear existing projects to avoid name conflicts
      doc.architecture.services = [
        { name: 'auth', kind: 'backend' },
        { name: 'api', kind: 'backend', dependencies: ['auth'] },
      ];

      const errors = validateSemantics(doc);
      assert.equal(errors.length, 0);
    });

    it('rejects when service depends on unknown service', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.services = [
        { name: 'api', kind: 'backend', dependencies: ['unknown-service'] },
      ];

      const errors = validateSemantics(doc);
      const depError = errors.find(e => e.code === 'SERVICE_DEPENDENCY_UNKNOWN');
      assert.ok(depError);
    });
  });

  describe('SEM-003: Service self-dependency', () => {
    it('rejects when service depends on itself', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.services = [
        { name: 'api', kind: 'backend', dependencies: ['api'] },
      ];

      const errors = validateSemantics(doc);
      const selfDepError = errors.find(e => e.code === 'SERVICE_SELF_DEPENDENCY');
      assert.ok(selfDepError);
    });
  });

  describe('SEM-004: Service dependency cycles', () => {
    it('passes with a linear dependency chain', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.services = [
        { name: 'db', kind: 'backend' },
        { name: 'api', kind: 'backend', dependencies: ['db'] },
        { name: 'web', kind: 'backend', dependencies: ['api'] },
      ];

      const errors = validateSemantics(doc);
      const cycleError = errors.find(e => e.code === 'SERVICE_DEPENDENCY_CYCLE');
      assert.equal(cycleError, undefined);
    });

    it('rejects when dependencies form a cycle', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.services = [
        { name: 'a', kind: 'backend', dependencies: ['b'] },
        { name: 'b', kind: 'backend', dependencies: ['c'] },
        { name: 'c', kind: 'backend', dependencies: ['a'] },
      ];

      const errors = validateSemantics(doc);
      const cycleError = errors.find(e => e.code === 'SERVICE_DEPENDENCY_CYCLE');
      assert.ok(cycleError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-005: SLO service references
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-005: SLO service reference existence', () => {
    it('passes when SLO references known project', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'api', availability: '99.9%' }],
      };

      const errors = validateSemantics(doc);
      const sloError = errors.find(e => e.code === 'SLO_SERVICE_UNKNOWN');
      assert.equal(sloError, undefined);
    });

    it('passes when SLO references known service', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.services = [{ name: 'auth', kind: 'backend' }];
      doc.slos = {
        services: [{ name: 'auth', availability: '99.9%' }],
      };

      const errors = validateSemantics(doc);
      const sloError = errors.find(e => e.code === 'SLO_SERVICE_UNKNOWN');
      assert.equal(sloError, undefined);
    });

    it('rejects when SLO references unknown service', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'unknown', availability: '99.9%' }],
      };

      const errors = validateSemantics(doc);
      const sloError = errors.find(e => e.code === 'SLO_SERVICE_UNKNOWN');
      assert.ok(sloError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-007, SEM-008: Uniqueness checks
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-007: Project name uniqueness', () => {
    it('passes when all project names are unique', () => {
      const doc = minimalValid();

      const errors = validateSemantics(doc);
      const dupError = errors.find(e => e.code === 'PROJECT_NAME_DUPLICATE');
      assert.equal(dupError, undefined);
    });

    it('rejects when project names are duplicated across types', () => {
      const doc = minimalValid();
      doc.architecture.projects.backend = [{ name: 'app', framework: 'nodejs' }];
      doc.architecture.projects.frontend = [{ name: 'app', framework: 'nextjs' }];

      const errors = validateSemantics(doc);
      const dupError = errors.find(e => e.code === 'PROJECT_NAME_DUPLICATE');
      assert.ok(dupError);
    });

    it('rejects when service name duplicates a project name', () => {
      const doc = minimalValid();
      doc.architecture.services = [{ name: 'api', kind: 'backend' }];

      const errors = validateSemantics(doc);
      const dupError = errors.find(e => e.code === 'PROJECT_NAME_DUPLICATE');
      assert.ok(dupError);
    });
  });

  describe('SEM-008: Domain entity name uniqueness', () => {
    it('passes when entity names are unique', () => {
      const doc = minimalValid();
      doc.domain = {
        entities: [
          { name: 'User', fields: [{ name: 'id', type: 'uuid' }] },
          { name: 'Post', fields: [{ name: 'id', type: 'uuid' }] },
        ],
      };

      const errors = validateSemantics(doc);
      const dupError = errors.find(e => e.code === 'DOMAIN_ENTITY_NAME_DUPLICATE');
      assert.equal(dupError, undefined);
    });

    it('rejects when entity names are duplicated', () => {
      const doc = minimalValid();
      doc.domain = {
        entities: [
          { name: 'User', fields: [{ name: 'id', type: 'uuid' }] },
          { name: 'User', fields: [{ name: 'email', type: 'string' }] },
        ],
      };

      const errors = validateSemantics(doc);
      const dupError = errors.find(e => e.code === 'DOMAIN_ENTITY_NAME_DUPLICATE');
      assert.ok(dupError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-009: Compliance framework names
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-009: Compliance framework validity', () => {
    it('passes with recognized compliance frameworks', () => {
      const doc = minimalValid();
      doc.compliance = {
        frameworks: [
          { name: 'GDPR', applicable: true },
          { name: 'SOC2', applicable: true },
        ],
      };

      const errors = validateSemantics(doc);
      const fwError = errors.find(e => e.code === 'COMPLIANCE_FRAMEWORK_UNKNOWN');
      assert.equal(fwError, undefined);
    });

    it('rejects unknown compliance framework names', () => {
      const doc = minimalValid();
      doc.compliance = {
        frameworks: [{ name: 'UnknownFramework' }],
      };

      const errors = validateSemantics(doc);
      const fwError = errors.find(e => e.code === 'COMPLIANCE_FRAMEWORK_UNKNOWN');
      assert.ok(fwError);
    });

    it('accepts lowercase framework names', () => {
      const doc = minimalValid();
      doc.compliance = {
        frameworks: [{ name: 'gdpr' }, { name: 'hipaa' }],
      };

      const errors = validateSemantics(doc);
      const fwError = errors.find(e => e.code === 'COMPLIANCE_FRAMEWORK_UNKNOWN');
      assert.equal(fwError, undefined);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-010: Auth provider requirement
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-010: Auth provider for passwordless/magic-link', () => {
    it('passes when passwordless has a provider', () => {
      const doc = minimalValid();
      doc.auth = { strategy: 'passwordless', provider: 'auth0' };

      const errors = validateSemantics(doc);
      const provError = errors.find(e => e.code === 'AUTH_PROVIDER_MISSING');
      assert.equal(provError, undefined);
    });

    it('rejects passwordless without provider', () => {
      const doc = minimalValid();
      doc.auth = { strategy: 'passwordless' };

      const errors = validateSemantics(doc);
      const provError = errors.find(e => e.code === 'AUTH_PROVIDER_MISSING');
      assert.ok(provError);
    });

    it('rejects magic-link without provider', () => {
      const doc = minimalValid();
      doc.auth = { strategy: 'magic-link' };

      const errors = validateSemantics(doc);
      const provError = errors.find(e => e.code === 'AUTH_PROVIDER_MISSING');
      assert.ok(provError);
    });

    it('passes magic-link with provider', () => {
      const doc = minimalValid();
      doc.auth = { strategy: 'magic-link', provider: 'clerk' };

      const errors = validateSemantics(doc);
      const provError = errors.find(e => e.code === 'AUTH_PROVIDER_MISSING');
      assert.equal(provError, undefined);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-011, SEM-012, SEM-013: Resilience & SLO checks
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-011: Resilience circuit breaker threshold', () => {
    it('passes with valid threshold', () => {
      const doc = minimalValid();
      doc.resilience = {
        circuitBreaker: { threshold: 50 },
      };

      const errors = validateSemantics(doc);
      const threshError = errors.find(e => e.code === 'RESILIENCE_THRESHOLD_INVALID');
      assert.equal(threshError, undefined);
    });

    it('rejects threshold below 1', () => {
      const doc = minimalValid();
      doc.resilience = {
        circuitBreaker: { threshold: 0 },
      };

      const errors = validateSemantics(doc);
      const threshError = errors.find(e => e.code === 'RESILIENCE_THRESHOLD_INVALID');
      assert.ok(threshError);
    });

    it('rejects threshold above 99', () => {
      const doc = minimalValid();
      doc.resilience = {
        circuitBreaker: { threshold: 100 },
      };

      const errors = validateSemantics(doc);
      const threshError = errors.find(e => e.code === 'RESILIENCE_THRESHOLD_INVALID');
      assert.ok(threshError);
    });
  });

  describe('SEM-012: Resilience retry max attempts', () => {
    it('passes with valid max attempts', () => {
      const doc = minimalValid();
      doc.resilience = {
        retryPolicy: { maxAttempts: 3 },
      };

      const errors = validateSemantics(doc);
      const attemptsError = errors.find(e => e.code === 'RESILIENCE_RETRY_ATTEMPTS_INVALID');
      assert.equal(attemptsError, undefined);
    });

    it('rejects max attempts below 1', () => {
      const doc = minimalValid();
      doc.resilience = {
        retryPolicy: { maxAttempts: 0 },
      };

      const errors = validateSemantics(doc);
      const attemptsError = errors.find(e => e.code === 'RESILIENCE_RETRY_ATTEMPTS_INVALID');
      assert.ok(attemptsError);
    });
  });

  describe('SEM-013: SLO availability range', () => {
    it('passes with valid availability percentage', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'api', availability: '99.9%' }],
      };

      const errors = validateSemantics(doc);
      const availError = errors.find(e => e.code === 'SLO_AVAILABILITY_OUT_OF_RANGE');
      assert.equal(availError, undefined);
    });

    it('passes with availability at lower bound', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'api', availability: '90.0%' }],
      };

      const errors = validateSemantics(doc);
      const availError = errors.find(e => e.code === 'SLO_AVAILABILITY_OUT_OF_RANGE');
      assert.equal(availError, undefined);
    });

    it('rejects availability below 90%', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'api', availability: '89.9%' }],
      };

      const errors = validateSemantics(doc);
      const availError = errors.find(e => e.code === 'SLO_AVAILABILITY_OUT_OF_RANGE');
      assert.ok(availError);
    });

    it('rejects availability above 99.999%', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'api', availability: '99.9999%' }],
      };

      const errors = validateSemantics(doc);
      const availError = errors.find(e => e.code === 'SLO_AVAILABILITY_OUT_OF_RANGE');
      assert.ok(availError);
    });

    it('rejects invalid availability format', () => {
      const doc = minimalValid();
      doc.slos = {
        services: [{ name: 'api', availability: 'not-a-percentage' }],
      };

      const errors = validateSemantics(doc);
      const availError = errors.find(e => e.code === 'SLO_AVAILABILITY_OUT_OF_RANGE');
      assert.ok(availError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEM-014: Deployment environment name uniqueness
  // ─────────────────────────────────────────────────────────────────────────

  describe('SEM-014: Deployment environment name uniqueness', () => {
    it('passes with unique environment names', () => {
      const doc = minimalValid();
      doc.deployment.ciCd = {
        provider: 'github-actions',
        environments: [
          { name: 'dev' },
          { name: 'staging' },
          { name: 'prod' },
        ],
      };

      const errors = validateSemantics(doc);
      const envError = errors.find(e => e.code === 'DEPLOYMENT_ENV_NAME_DUPLICATE');
      assert.equal(envError, undefined);
    });

    it('rejects duplicate environment names', () => {
      const doc = minimalValid();
      doc.deployment.ciCd = {
        provider: 'github-actions',
        environments: [
          { name: 'prod' },
          { name: 'prod' },
        ],
      };

      const errors = validateSemantics(doc);
      const envError = errors.find(e => e.code === 'DEPLOYMENT_ENV_NAME_DUPLICATE');
      assert.ok(envError);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Integration tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Integration: Multiple errors at once', () => {
    it('reports all errors found', () => {
      const doc = minimalValid();
      // Duplicate projects
      doc.architecture.projects.backend = [{ name: 'app', framework: 'nodejs' }];
      doc.architecture.projects.frontend = [{ name: 'app', framework: 'nextjs' }];
      // Bad availability
      doc.slos = {
        services: [{ name: 'missing', availability: '50%' }],
      };

      const errors = validateSemantics(doc);
      assert.ok(errors.length >= 2);
      const codes = errors.map(e => e.code);
      assert.ok(codes.includes('PROJECT_NAME_DUPLICATE'));
      assert.ok(codes.includes('SLO_SERVICE_UNKNOWN') || codes.includes('SLO_AVAILABILITY_OUT_OF_RANGE'));
    });
  });

  describe('Integration: Valid complex document', () => {
    it('accepts a fully valid microservices architecture', () => {
      const doc = minimalValid();
      doc.architecture.style = 'microservices';
      doc.architecture.projects.backend = [
        { name: 'auth-service', framework: 'nodejs' },
        { name: 'api-gateway', framework: 'nodejs' },
      ];
      doc.architecture.services = [
        { name: 'auth', kind: 'backend', dependencies: [] },
        { name: 'api', kind: 'backend', dependencies: ['auth'] },
      ];
      doc.domain = {
        entities: [
          { name: 'User', fields: [{ name: 'id', type: 'uuid' }] },
          { name: 'Token', fields: [{ name: 'id', type: 'uuid' }] },
        ],
        relationships: [
          { from: 'User', to: 'Token', type: 'one-to-many' },
        ],
      };
      doc.slos = {
        services: [
          { name: 'auth', availability: '99.95%' },
          { name: 'api', availability: '99.9%' },
        ],
      };
      doc.resilience = {
        circuitBreaker: { threshold: 50 },
        retryPolicy: { maxAttempts: 3 },
      };
      doc.compliance = {
        frameworks: [{ name: 'SOC2' }],
      };
      doc.deployment.ciCd = {
        provider: 'github-actions',
        environments: [{ name: 'prod' }, { name: 'staging' }],
      };

      const errors = validateSemantics(doc);
      assert.equal(errors.length, 0, `Expected no errors, got: ${JSON.stringify(errors)}`);
    });
  });
});
