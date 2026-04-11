import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { compile } from '../index';
import { generateArchitectureDiagram } from '../generators/architecture';
import { generateRepoScaffold } from '../generators/scaffold';
import { generateCiCdPipeline } from '../generators/cicd';
import { generateADRs } from '../generators/adr';
import { generateOpenApiSpec } from '../generators/openapi';
import { generateDataModel } from '../generators/data-model';
import { generateSequenceDiagrams } from '../generators/sequence-diagrams';
import { generateBacklog } from '../generators/backlog';
import { generateDeploymentGuide } from '../generators/deployment-guide';
import { generateCostEstimate } from '../generators/cost-estimate';
import { generate, generateAll } from '../generators';
import type { SDLDocument } from '../types';

const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const fixture = (name: string) => readFileSync(join(FIXTURES_DIR, name), 'utf-8');

function getDoc(fixtureName: string): SDLDocument {
  const result = compile(fixture(fixtureName));
  assert.equal(result.success, true, `Fixture ${fixtureName} should compile`);
  return result.document!;
}

describe('generators', () => {
  describe('architecture diagram', () => {
    it('generates Mermaid C4 container diagram', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateArchitectureDiagram(doc);

      assert.equal(result.artifactType, 'architecture-diagram');
      assert.equal(result.files.length, 1);
      assert.equal(result.files[0].path, 'artifacts/architecture/c4-container.mmd');

      const content = result.files[0].content;
      assert.ok(content.includes('flowchart TB'));
      assert.ok(content.includes('Client Tier'));
      assert.ok(content.includes('Application Backend'));
      assert.ok(content.includes('Data Storage'));
    });

    it('includes frontend and backend projects', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateArchitectureDiagram(doc);
      const content = result.files[0].content;

      // Frontend project "web" with Next.js
      assert.ok(content.includes('Next.js'));
      // Backend project "api" with Node.js
      assert.ok(content.includes('Node.js'));
    });

    it('includes auth provider when present', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateArchitectureDiagram(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Authentication'));
      assert.ok(content.includes('Auth0'));
    });

    it('includes database', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateArchitectureDiagram(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Postgres'));
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateArchitectureDiagram(doc);
      const r2 = generateArchitectureDiagram(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('repo scaffold', () => {
    it('generates files for each project', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);

      assert.equal(result.artifactType, 'repo-scaffold');
      const paths = result.files.map((f) => f.path);
      assert.ok(paths.some((p) => p.startsWith('artifacts/repos/frontend-web/')));
      assert.ok(paths.some((p) => p.startsWith('artifacts/repos/backend-api/')));
    });

    it('includes package.json for each project', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);
      const paths = result.files.map((f) => f.path);

      assert.ok(paths.some((p) => p.includes('frontend-web/package.json')));
      assert.ok(paths.some((p) => p.includes('backend-api/package.json')));
    });

    it('includes correct framework dependencies', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);

      // Backend should have express (Node.js framework)
      const backendPkg = result.files.find((f) => f.path.includes('backend-api/package.json'));
      assert.ok(backendPkg);
      const parsed = JSON.parse(backendPkg!.content);
      assert.ok(parsed.dependencies['express']);
    });

    it('includes ORM dependency when set', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);

      const backendPkg = result.files.find((f) => f.path.includes('backend-api/package.json'));
      assert.ok(backendPkg);
      const parsed = JSON.parse(backendPkg!.content);
      // Normalizer sets orm to "prisma" for nodejs + postgresql
      assert.ok(parsed.dependencies['@prisma/client']);
    });

    it('generates .env.example files', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);
      const paths = result.files.map((f) => f.path);

      assert.ok(paths.some((p) => p.includes('frontend-web/.env.example')));
      assert.ok(paths.some((p) => p.includes('backend-api/.env.example')));
    });

    it('generates README files', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);
      const paths = result.files.map((f) => f.path);

      assert.ok(paths.some((p) => p.includes('frontend-web/README.md')));
      assert.ok(paths.some((p) => p.includes('backend-api/README.md')));
    });

    it('includes Prisma schema when ORM is prisma', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateRepoScaffold(doc);
      const prismaFile = result.files.find((f) => f.path.includes('prisma/schema.prisma'));
      assert.ok(prismaFile);
      assert.ok(prismaFile!.content.includes('provider = "postgresql"'));
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateRepoScaffold(doc);
      const r2 = generateRepoScaffold(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('CI/CD pipeline', () => {
    it('generates GitHub Actions YAML', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCiCdPipeline(doc);

      assert.equal(result.artifactType, 'iac-skeleton');
      const ciFile = result.files.find((f) => f.path === 'artifacts/cicd/ci.yml');
      assert.ok(ciFile, 'should include ci.yml');

      const content = ciFile!.content;
      assert.ok(content.includes('name:'));
      assert.ok(content.includes('jobs:'));
    });

    it('includes backend and frontend jobs', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCiCdPipeline(doc);
      const content = result.files.find((f) => f.path === 'artifacts/cicd/ci.yml')!.content;

      assert.ok(content.includes('Backend'));
      assert.ok(content.includes('Frontend'));
    });

    it('includes database service for tests', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCiCdPipeline(doc);
      const content = result.files[0].content;

      // TaskFlow uses PostgreSQL
      assert.ok(content.includes('postgres:'));
    });

    it('includes deploy job', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCiCdPipeline(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('deploy:'));
      assert.ok(content.includes('Vercel'));
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateCiCdPipeline(doc);
      const r2 = generateCiCdPipeline(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('ADR generator', () => {
    it('generates ADR files', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);

      assert.equal(result.artifactType, 'adr');
      assert.ok(result.files.length >= 4); // architecture, cloud, auth, database + framework ADRs
      assert.ok(result.files.every((f) => f.path.startsWith('artifacts/decisions/')));
      assert.ok(result.files.every((f) => f.path.endsWith('.md')));
    });

    it('generates architecture pattern ADR', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const archAdr = result.files.find((f) => f.path.includes('architecture-pattern'));

      assert.ok(archAdr);
      assert.ok(archAdr!.content.includes('ADR-001'));
      assert.ok(archAdr!.content.includes('Architecture Pattern'));
      assert.ok(archAdr!.content.includes('Modular Monolith'));
      assert.ok(archAdr!.content.includes('## Status'));
      assert.ok(archAdr!.content.includes('Accepted'));
    });

    it('generates cloud hosting ADR', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const cloudAdr = result.files.find((f) => f.path.includes('cloud-hosting'));

      assert.ok(cloudAdr);
      assert.ok(cloudAdr!.content.includes('Vercel'));
    });

    it('generates authentication ADR when auth is present', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const authAdr = result.files.find((f) => f.path.includes('authentication'));

      assert.ok(authAdr);
      assert.ok(authAdr!.content.includes('Auth0'));
      assert.ok(authAdr!.content.includes('OIDC'));
    });

    it('generates database ADR', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const dbAdr = result.files.find((f) => f.path.includes('primary-database'));

      assert.ok(dbAdr);
      assert.ok(dbAdr!.content.includes('PostgreSQL'));
    });

    it('generates frontend framework ADR', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const feAdr = result.files.find((f) => f.path.includes('frontend-web'));

      assert.ok(feAdr);
      assert.ok(feAdr!.content.includes('Next.js'));
    });

    it('generates backend framework ADR', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const beAdr = result.files.find((f) => f.path.includes('backend-api'));

      assert.ok(beAdr);
      assert.ok(beAdr!.content.includes('Node.js'));
    });

    it('includes MADR sections in each ADR', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);

      for (const file of result.files) {
        assert.ok(file.content.includes('## Status'), `${file.path} missing Status`);
        assert.ok(file.content.includes('## Context'), `${file.path} missing Context`);
        assert.ok(file.content.includes('## Decision'), `${file.path} missing Decision`);
        assert.ok(file.content.includes('## Consequences'), `${file.path} missing Consequences`);
      }
    });

    it('includes alternatives table', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);
      const archAdr = result.files.find((f) => f.path.includes('architecture-pattern'));

      assert.ok(archAdr);
      assert.ok(archAdr!.content.includes('## Alternatives Considered'));
      assert.ok(archAdr!.content.includes('| Option | Pros | Cons |'));
    });

    it('generates sequential ADR numbers', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);

      for (let i = 0; i < result.files.length; i++) {
        const expectedNum = `ADR-${String(i + 1).padStart(3, '0')}`;
        assert.ok(
          result.files[i].content.includes(expectedNum),
          `File ${result.files[i].path} should contain ${expectedNum}`,
        );
      }
    });

    it('includes metadata with ADR list', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateADRs(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.equal(result.metadata.totalADRs, result.files.length);
      assert.ok(Array.isArray(result.metadata.adrs));
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateADRs(doc);
      const r2 = generateADRs(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('OpenAPI generator', () => {
    it('generates OpenAPI 3.1 YAML', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);

      assert.equal(result.artifactType, 'openapi');
      assert.equal(result.files.length, 1);
      assert.equal(result.files[0].path, 'artifacts/api/openapi.yaml');

      const content = result.files[0].content;
      assert.ok(content.includes("openapi: '3.1.0'"));
      assert.ok(content.includes('TaskFlow API'));
    });

    it('includes security scheme for auth', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);
      const content = result.files[0].content;

      // Auth0 with OIDC → bearerAuth
      assert.ok(content.includes('bearerAuth'));
      assert.ok(content.includes('bearer'));
    });

    it('includes auth endpoints', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('/auth/login'));
      assert.ok(content.includes('/auth/register'));
      assert.ok(content.includes('/auth/me'));
    });

    it('includes health endpoint', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('/health'));
    });

    it('infers entities from persona goals', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);
      const content = result.files[0].content;

      // "Create tasks" → Task entity → /tasks CRUD endpoints
      assert.ok(content.includes('/tasks'));
      assert.ok(content.includes('Task'));
    });

    it('generates CRUD endpoints for inferred entities', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);
      const content = result.files[0].content;

      // Should have list, create, get, update, delete for Task
      assert.ok(content.includes('listTasks'));
      assert.ok(content.includes('createTask'));
      assert.ok(content.includes('getTask'));
      assert.ok(content.includes('updateTask'));
      assert.ok(content.includes('deleteTask'));
    });

    it('includes User and entity schemas', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('User'));
      assert.ok(content.includes('TaskInput'));
    });

    it('includes metadata with counts', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateOpenApiSpec(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.ok((result.metadata.endpointCount as number) >= 5); // auth + health + CRUD
      assert.ok((result.metadata.schemaCount as number) >= 2); // User + Task + TaskInput + Error
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateOpenApiSpec(doc);
      const r2 = generateOpenApiSpec(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('data-model generator', () => {
    it('generates ERD file', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDataModel(doc);

      assert.equal(result.artifactType, 'data-model');
      const erdFile = result.files.find((f) => f.path === 'artifacts/data/erd.mmd');
      assert.ok(erdFile);
      assert.ok(erdFile!.content.includes('erDiagram'));
    });

    it('includes User entity when auth exists', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDataModel(doc);
      const erd = result.files[0].content;

      assert.ok(erd.includes('User'));
      assert.ok(erd.includes('uuid id PK'));
      assert.ok(erd.includes('varchar email UK'));
    });

    it('infers domain entities from persona goals', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDataModel(doc);
      const erd = result.files[0].content;

      // "Create tasks" → Task entity
      assert.ok(erd.includes('Task'));
    });

    it('includes relationships between entities', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDataModel(doc);
      const erd = result.files[0].content;

      // User has many Tasks
      assert.ok(erd.includes('User ||--o{ Task'));
    });

    it('generates Prisma schema when ORM is prisma', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDataModel(doc);

      // Normalizer sets ORM to prisma for nodejs + postgres
      const prismaFile = result.files.find((f) => f.path === 'artifacts/data/schema.prisma');
      assert.ok(prismaFile);
      assert.ok(prismaFile!.content.includes('provider = "postgresql"'));
      assert.ok(prismaFile!.content.includes('model User'));
      assert.ok(prismaFile!.content.includes('model Task'));
    });

    it('includes metadata with entity info', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDataModel(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.ok((result.metadata.entityCount as number) >= 2); // User + Task
      assert.equal(result.metadata.primaryDatabase, 'postgres');
      assert.ok(Array.isArray(result.metadata.entities));
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateDataModel(doc);
      const r2 = generateDataModel(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('sequence-diagrams generator', () => {
    it('generates Mermaid sequence diagrams', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateSequenceDiagrams(doc);

      assert.equal(result.artifactType, 'sequence-diagrams');
      assert.ok(result.files.length >= 1);
      assert.ok(result.files.every((f) => f.path.startsWith('artifacts/sequences/')));
      assert.ok(result.files.every((f) => f.path.endsWith('.mmd')));
    });

    it('generates auth flow when auth is configured', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateSequenceDiagrams(doc);
      const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));

      assert.ok(authDiagram);
      assert.ok(authDiagram!.content.includes('sequenceDiagram'));
      assert.ok(authDiagram!.content.includes('Auth0'));
      assert.ok(authDiagram!.content.includes('JWT access token'));
    });

    it('generates goal-based flows from personas', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateSequenceDiagrams(doc);

      // "Create tasks" should produce a flow
      const createFlow = result.files.find((f) => f.path.includes('create-task'));
      assert.ok(createFlow);
      assert.ok(createFlow!.content.includes('sequenceDiagram'));
      assert.ok(createFlow!.content.includes('POST'));
    });

    it('includes frontend and backend participants', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateSequenceDiagrams(doc);
      const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));

      assert.ok(authDiagram);
      assert.ok(authDiagram!.content.includes('web'));
      assert.ok(authDiagram!.content.includes('api'));
    });

    it('includes metadata with diagram names', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateSequenceDiagrams(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.ok((result.metadata.diagramCount as number) >= 2); // auth + at least 1 goal
      assert.ok(Array.isArray(result.metadata.diagrams));
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateSequenceDiagrams(doc);
      const r2 = generateSequenceDiagrams(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('backlog generator', () => {
    it('generates product backlog markdown', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);

      assert.equal(result.artifactType, 'backlog');
      assert.equal(result.files.length, 1);
      assert.equal(result.files[0].path, 'artifacts/backlog/backlog.md');
    });

    it('includes project setup epic', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Project Setup'));
    });

    it('includes authentication epic when auth exists', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Authentication'));
      assert.ok(content.includes('Auth0'));
    });

    it('generates user stories from persona goals', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);
      const content = result.files[0].content;

      // "Create tasks" → user story
      assert.ok(content.includes('Task'));
      assert.ok(content.includes('**As a**'));
      assert.ok(content.includes('**I want**'));
    });

    it('includes story IDs and priorities', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('US-'));
      assert.ok(content.includes('Must') || content.includes('Should'));
    });

    it('includes infrastructure epic', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Infrastructure') || content.includes('DevOps'));
    });

    it('includes summary section', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Summary'));
    });

    it('includes metadata with counts', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateBacklog(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.ok((result.metadata.epicCount as number) >= 3);
      assert.ok((result.metadata.totalStories as number) >= 5);
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateBacklog(doc);
      const r2 = generateBacklog(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('deployment-guide generator', () => {
    it('generates deployment guide markdown', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);

      assert.equal(result.artifactType, 'deployment-guide');
      assert.equal(result.files.length, 1);
      assert.equal(result.files[0].path, 'artifacts/deployment/deployment-guide.md');
    });

    it('includes prerequisites section', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Prerequisites'));
      assert.ok(content.includes('Node.js'));
    });

    it('includes environment variables section', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Environment Variables'));
      assert.ok(content.includes('DATABASE_URL'));
    });

    it('includes database setup section', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Database'));
      assert.ok(content.includes('PostgreSQL') || content.includes('postgres'));
    });

    it('includes cloud-specific deploy instructions', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);
      const content = result.files[0].content;

      // TaskFlow uses Vercel
      assert.ok(content.includes('Vercel'));
    });

    it('includes rollback section', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Rollback'));
    });

    it('includes metadata', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateDeploymentGuide(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.equal(result.metadata.cloud, 'vercel');
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateDeploymentGuide(doc);
      const r2 = generateDeploymentGuide(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('cost-estimate generator', () => {
    it('generates cost estimate markdown', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCostEstimate(doc);

      assert.equal(result.artifactType, 'cost-estimate');
      assert.equal(result.files.length, 1);
      assert.equal(result.files[0].path, 'artifacts/cost/cost-estimate.md');
    });

    it('includes compute/hosting costs', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCostEstimate(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Compute') || content.includes('Hosting'));
      assert.ok(content.includes('$'));
    });

    it('includes database costs', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCostEstimate(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Database'));
    });

    it('includes auth provider costs', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCostEstimate(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Auth0') || content.includes('Authentication'));
    });

    it('includes summary with totals', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCostEstimate(doc);
      const content = result.files[0].content;

      assert.ok(content.includes('Summary') || content.includes('Total'));
      assert.ok(content.includes('month') || content.includes('Monthly'));
    });

    it('includes metadata with cost info', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generateCostEstimate(doc);

      assert.equal(result.metadata.solutionName, 'TaskFlow');
      assert.ok(result.metadata.totalMonthly !== undefined);
    });

    it('is deterministic', () => {
      const doc = getDoc('taskflow.yaml');
      const r1 = generateCostEstimate(doc);
      const r2 = generateCostEstimate(doc);
      assert.deepEqual(r1, r2);
    });
  });

  describe('registry', () => {
    it('generate() returns result for implemented type', () => {
      const doc = getDoc('taskflow.yaml');
      const result = generate(doc, 'architecture-diagram');
      assert.ok(result);
      assert.equal(result!.artifactType, 'architecture-diagram');
    });

    it('generate() returns result for all 10 artifact types', () => {
      const doc = getDoc('taskflow.yaml');
      const types: string[] = [
        'architecture-diagram', 'sequence-diagrams', 'openapi', 'data-model',
        'repo-scaffold', 'iac-skeleton', 'backlog', 'adr',
        'deployment-guide', 'cost-estimate',
      ];
      for (const t of types) {
        const result = generate(doc, t as any);
        assert.ok(result, `generate() should return result for ${t}`);
        assert.equal(result!.artifactType, t);
      }
    });

    it('generateAll() produces results and skipped', () => {
      const doc = getDoc('taskflow.yaml');
      const { results, skipped } = generateAll(doc);

      // taskflow.yaml requests: architecture-diagram, adr, openapi, data-model, repo-scaffold
      assert.equal(results.length, 5); // all 5 now implemented
      assert.equal(skipped.length, 0);
    });

    it('generateAll() only generates requested artifacts', () => {
      const doc = getDoc('taskflow.yaml');
      const { results } = generateAll(doc);

      const types = results.map((r) => r.artifactType);
      assert.ok(types.includes('architecture-diagram'));
      assert.ok(types.includes('repo-scaffold'));
      assert.ok(types.includes('adr'));
      assert.ok(types.includes('openapi'));
      assert.ok(types.includes('data-model'));
      // iac-skeleton is not in taskflow.yaml's artifacts.generate
      assert.ok(!types.includes('iac-skeleton'));
    });
  });
});
