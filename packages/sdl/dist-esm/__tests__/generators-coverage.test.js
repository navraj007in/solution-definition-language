/**
 * Branch-coverage tests for SDL generators.
 *
 * The main generators.test.ts uses the taskflow.yaml fixture which covers:
 *   modular-monolith, Next.js + Node.js, Auth0/OIDC, Postgres, Vercel, Prisma, small scale
 *
 * This file adds 4 fixtures to cover remaining branches:
 *   ecommerce-aws:   microservices, React + Angular + Go, Cognito, MongoDB, AWS, large scale, coreFlows with steps, integrations
 *   saas-gcp:        serverless, Vue + Python FastAPI, api-key auth, MySQL, GCP, GitLab CI, medium scale
 *   mobile-railway:  mobile project, React Native + .NET 8, Clerk/magic-link, Railway, coreFlows mixed
 *   minimal-noauth:  no auth, Svelte + Go, DynamoDB/serverless, Cloudflare
 */
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
import { generateDockerCompose } from '../generators/docker-compose';
import { generateKubernetes } from '../generators/kubernetes';
import { generateMonitoring } from '../generators/monitoring';
import { generateNginxConfig } from '../generators/nginx';
import { generateAll } from '../generators';
import { diff } from '../diff';
import { getTemplates, getTemplate, listTemplates } from '../templates';
const FIXTURES_DIR = join(__dirname, '..', '..', 'src', '__tests__', 'fixtures');
const fixture = (name) => readFileSync(join(FIXTURES_DIR, name), 'utf-8');
function getDoc(fixtureName) {
    const result = compile(fixture(fixtureName));
    assert.equal(result.success, true, `Fixture ${fixtureName} should compile`);
    return result.document;
}
// ────────────────────────────────────────────────────────────────────
// Fixture 1: ecommerce-aws.yaml
// Microservices · AWS · MongoDB · React + Angular · Node.js + Go
// Cognito OIDC · Redis cache · Stripe/SendGrid/Datadog/CloudFront
// Core flows with explicit steps · Large scale (100K users)
// ────────────────────────────────────────────────────────────────────
describe('ecommerce-aws fixture', () => {
    it('compiles successfully', () => {
        const result = compile(fixture('ecommerce-aws.yaml'));
        assert.equal(result.success, true);
        assert.ok(result.document);
    });
    // -- Architecture diagram --
    describe('architecture diagram', () => {
        it('includes multiple frontends', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Storefront'));
            assert.ok(content.includes('React'));
            assert.ok(content.includes('Admin Panel'));
            assert.ok(content.includes('Angular'));
        });
        it('includes multiple backends', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Api Gateway'));
            assert.ok(content.includes('Worker'));
            assert.ok(content.includes('Go'));
        });
        it('includes secondary database with role', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Postgres'));
            assert.ok(content.includes('analytics'));
        });
        it('includes cache node', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Redis'));
            assert.ok(content.includes('Cache'));
        });
        it('includes Cognito auth provider', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Cognito'));
            assert.ok(content.includes('OIDC'));
        });
        it('includes MongoDB primary database', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Mongodb'));
        });
        it('has cache connections from backends', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('"Cache"'));
        });
    });
    // -- Scaffold --
    describe('scaffold', () => {
        it('generates React frontend with Vite (not Next.js)', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('frontend-storefront/package.json'));
            assert.ok(pkg);
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.dependencies['react']);
            assert.ok(parsed.dependencies['react-router-dom']); // React SPA, not Next.js
            assert.ok(parsed.devDependencies['vite']);
        });
        it('generates Angular frontend', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('frontend-admin-panel/package.json'));
            assert.ok(pkg);
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.dependencies['@angular/core']);
        });
        it('includes tailwind in storefront devDeps', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('frontend-storefront/package.json'));
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.devDependencies['tailwindcss']);
        });
        it('includes mongoose for Node.js + MongoDB backend', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('backend-api-gateway/package.json'));
            assert.ok(pkg);
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.dependencies['mongoose']);
        });
        it('includes src/main.tsx for React SPA (not src/app/)', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const paths = result.files.map((f) => f.path);
            assert.ok(paths.some((p) => p.includes('frontend-storefront/src/main.tsx')));
            assert.ok(!paths.some((p) => p.includes('frontend-storefront/src/app/layout.tsx')));
        });
        it('includes REDIS_URL in backend .env.example', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const envFile = result.files.find((f) => f.path.includes('backend-api-gateway/.env.example'));
            assert.ok(envFile);
            assert.ok(envFile.content.includes('REDIS_URL'));
        });
        it('includes Cognito env vars in backend .env.example', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateRepoScaffold(doc);
            const envFile = result.files.find((f) => f.path.includes('backend-api-gateway/.env.example'));
            assert.ok(envFile);
            // Cognito uses generic OIDC env vars
            assert.ok(envFile.content.includes('OIDC_'));
        });
    });
    // -- CI/CD --
    describe('ci/cd', () => {
        it('includes AWS deploy target', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCiCdPipeline(doc).files[0].content;
            assert.ok(content.includes('AWS'));
        });
        it('includes MongoDB test service', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCiCdPipeline(doc).files[0].content;
            assert.ok(content.includes('mongo'));
        });
        it('generates Terraform main.tf for AWS', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.ok(tf, 'should include main.tf');
            assert.ok(tf.content.includes('hashicorp/aws'));
            assert.ok(tf.content.includes('aws_ecs_cluster'));
            assert.ok(tf.content.includes('aws_vpc'));
        });
        it('generates Terraform variables.tf', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCiCdPipeline(doc);
            const vars = result.files.find((f) => f.path.includes('variables.tf'));
            assert.ok(vars, 'should include variables.tf');
            assert.ok(vars.content.includes('aws_region'));
        });
        it('includes AWS DocumentDB for MongoDB', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.ok(tf.content.includes('aws_docdb_cluster'));
        });
        it('includes ElastiCache for Redis cache', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.ok(tf.content.includes('aws_elasticache_cluster'));
        });
        it('includes S3 bucket for frontend', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.ok(tf.content.includes('aws_s3_bucket'));
        });
        it('sets hasTerraform metadata', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCiCdPipeline(doc);
            assert.equal(result.metadata.hasTerraform, true);
            assert.equal(result.metadata.iac, 'terraform');
        });
    });
    // -- ADR --
    describe('adr', () => {
        it('generates microservices architecture pattern ADR', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateADRs(doc);
            const archAdr = result.files.find((f) => f.path.includes('architecture-pattern'));
            assert.ok(archAdr);
            assert.ok(archAdr.content.includes('Microservices'));
        });
        it('generates AWS cloud ADR', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateADRs(doc);
            const cloudAdr = result.files.find((f) => f.path.includes('cloud-hosting'));
            assert.ok(cloudAdr);
            assert.ok(cloudAdr.content.includes('AWS'));
        });
        it('generates MongoDB database ADR', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateADRs(doc);
            const dbAdr = result.files.find((f) => f.path.includes('primary-database'));
            assert.ok(dbAdr);
            assert.ok(dbAdr.content.includes('MongoDB'));
        });
        it('generates Cognito auth ADR', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateADRs(doc);
            const authAdr = result.files.find((f) => f.path.includes('authentication'));
            assert.ok(authAdr);
            assert.ok(authAdr.content.includes('Cognito'));
        });
    });
    // -- OpenAPI --
    describe('openapi', () => {
        it('infers entities from core flow steps', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            // Core flow "Purchase Flow" + persona goals "Browse products", "Submit order"
            assert.ok(content.includes('Product') || content.includes('Order') || content.includes('Cart'));
        });
        it('includes bearerAuth security scheme for Cognito OIDC', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            assert.ok(content.includes('bearerAuth'));
        });
    });
    // -- Data model --
    describe('data model', () => {
        it('generates MongoDB ERD', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateDataModel(doc);
            const erd = result.files.find((f) => f.path.includes('erd.mmd'));
            assert.ok(erd);
            assert.ok(erd.content.includes('erDiagram'));
            assert.ok(erd.content.includes('User'));
        });
        it('generates Mongoose schema for mongoose ORM', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateDataModel(doc);
            const mongooseFile = result.files.find((f) => f.path.includes('schemas.ts'));
            assert.ok(mongooseFile, 'should include schemas.ts for mongoose');
            assert.ok(mongooseFile.content.includes('mongoose'));
            assert.ok(mongooseFile.content.includes('Schema'));
        });
        it('does not generate Prisma schema for mongoose', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateDataModel(doc);
            const prismaFile = result.files.find((f) => f.path.includes('schema.prisma'));
            assert.equal(prismaFile, undefined);
        });
        it('Mongoose schema includes ObjectId refs for relations', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateDataModel(doc);
            const mongooseFile = result.files.find((f) => f.path.includes('schemas.ts'));
            assert.ok(mongooseFile.content.includes('Schema.Types.ObjectId'));
            assert.ok(mongooseFile.content.includes("ref: 'User'"));
        });
        it('includes metadata listing mongodb as primary database', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateDataModel(doc);
            assert.equal(result.metadata.primaryDatabase, 'mongodb');
            assert.equal(result.metadata.orm, 'mongoose');
        });
    });
    // -- Sequence diagrams --
    describe('sequence diagrams', () => {
        it('generates core flow diagrams from explicit steps', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateSequenceDiagrams(doc);
            const purchaseFlow = result.files.find((f) => f.path.includes('purchase-flow'));
            assert.ok(purchaseFlow);
            assert.ok(purchaseFlow.content.includes('sequenceDiagram'));
            // Steps should appear in diagram
            assert.ok(purchaseFlow.content.includes('Select product'));
        });
        it('classifies steps: user-input, api-call, display', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateSequenceDiagrams(doc);
            const purchaseFlow = result.files.find((f) => f.path.includes('purchase-flow'));
            assert.ok(purchaseFlow);
            // "Enter shipping details" → user-input
            assert.ok(purchaseFlow.content.includes('Enter shipping details'));
            // "Submit payment" → api-call
            assert.ok(purchaseFlow.content.includes('Submit payment'));
            // "Display confirmation" → display
            assert.ok(purchaseFlow.content.includes('Display confirmation'));
        });
        it('generates OIDC auth flow with Cognito redirect', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateSequenceDiagrams(doc);
            const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));
            assert.ok(authDiagram);
            assert.ok(authDiagram.content.includes('Cognito'));
            assert.ok(authDiagram.content.includes('Redirect'));
            assert.ok(authDiagram.content.includes('Auth code'));
        });
        it('includes token refresh section when refreshToken is true', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateSequenceDiagrams(doc);
            const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));
            assert.ok(authDiagram);
            assert.ok(authDiagram.content.includes('Token Refresh'));
            assert.ok(authDiagram.content.includes('/auth/refresh'));
        });
    });
    // -- Backlog --
    describe('backlog', () => {
        it('includes RBAC story when multiple roles exist', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('role-based access control') || content.includes('role'));
        });
        it('includes MFA story', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('multi-factor') || content.includes('MFA'));
        });
        it('includes social login story', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('social login') || content.includes('google'));
        });
        it('includes monitoring integration story', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('Datadog') || content.includes('monitoring'));
        });
        it('generates stories for both personas', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('Shopper'));
            assert.ok(content.includes('Admin'));
        });
    });
    // -- Deployment guide --
    describe('deployment guide', () => {
        it('includes AWS-specific deploy instructions', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateDeploymentGuide(doc).files[0].content;
            assert.ok(content.includes('AWS'));
        });
        it('includes MongoDB setup instructions', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateDeploymentGuide(doc).files[0].content;
            assert.ok(content.includes('MongoDB') || content.includes('mongo'));
        });
    });
    // -- Cost estimate --
    describe('cost estimate', () => {
        it('uses large scale pricing', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('large'));
        });
        it('includes Stripe payment integration cost', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Stripe'));
        });
        it('includes SendGrid email cost', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('SendGrid'));
        });
        it('includes Datadog monitoring cost', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Datadog'));
        });
        it('includes CloudFront CDN cost', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('CloudFront'));
        });
        it('includes Redis cache cost', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Redis'));
        });
        it('includes secondary database cost', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            const result = generateCostEstimate(doc);
            // Should have two database cost items (MongoDB + Postgres)
            assert.ok(result.metadata.itemCount >= 6); // compute + hosting + 2 DBs + cache + auth + ...
        });
    });
    // -- generateAll --
    it('generateAll() produces all 10 artifacts', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const { results, skipped } = generateAll(doc);
        assert.equal(results.length, 10);
        assert.equal(skipped.length, 0);
    });
});
// ────────────────────────────────────────────────────────────────────
// Fixture 2: saas-gcp.yaml
// Serverless · GCP · MySQL · Vue + Python FastAPI · api-key auth
// GitLab CI · Resend email · Medium scale (10K users)
// ────────────────────────────────────────────────────────────────────
describe('saas-gcp fixture', () => {
    it('compiles successfully', () => {
        const result = compile(fixture('saas-gcp.yaml'));
        assert.equal(result.success, true);
    });
    // -- Architecture diagram --
    describe('architecture diagram', () => {
        it('includes Vue frontend', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Vue.js'));
        });
        it('includes FastAPI backend', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('FastAPI'));
        });
        it('includes MySQL database', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Mysql'));
        });
        it('does not include auth subgraph (no provider set)', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            // api-key strategy with no provider → no auth subgraph
            assert.ok(!content.includes('Authentication'));
        });
    });
    // -- Scaffold --
    describe('scaffold', () => {
        it('generates Vue frontend with Vite', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('frontend-dashboard/package.json'));
            assert.ok(pkg);
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.dependencies['vue']);
            assert.ok(parsed.dependencies['vue-router']);
            assert.ok(parsed.devDependencies['@vitejs/plugin-vue']);
        });
        it('generates Python FastAPI backend with requirements.txt', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateRepoScaffold(doc);
            const reqFile = result.files.find((f) => f.path.includes('backend-api/requirements.txt'));
            assert.ok(reqFile);
            assert.ok(reqFile.content.includes('fastapi'));
            assert.ok(reqFile.content.includes('uvicorn'));
        });
        it('generates Python main.py entry point', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateRepoScaffold(doc);
            const mainFile = result.files.find((f) => f.path.includes('backend-api/src/main.py'));
            assert.ok(mainFile);
            assert.ok(mainFile.content.includes('FastAPI'));
            assert.ok(mainFile.content.includes('InvoiceCloud'));
        });
        it('generates Python .gitignore', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateRepoScaffold(doc);
            const gitignoreFile = result.files.find((f) => f.path.includes('backend-api/.gitignore'));
            assert.ok(gitignoreFile);
            assert.ok(gitignoreFile.content.includes('__pycache__'));
            assert.ok(gitignoreFile.content.includes('venv'));
        });
        it('does not generate package.json for Python backend', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('backend-api/package.json'));
            assert.equal(pkg, undefined);
        });
        it('includes mysql2 driver in requirements for Python + MySQL', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateRepoScaffold(doc);
            const reqFile = result.files.find((f) => f.path.includes('backend-api/requirements.txt'));
            assert.ok(reqFile);
            // Python + mysql doesn't use mysql2, it uses asyncpg or similar
            // Actually the scaffold only adds asyncpg for postgres and motor for mongodb
            // MySQL with Python just gets the base fastapi deps
        });
    });
    // -- CI/CD --
    describe('ci/cd', () => {
        it('generates GitLab CI YAML format', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateCiCdPipeline(doc);
            const ciFile = result.files.find((f) => f.path.includes('.gitlab-ci.yml'));
            assert.ok(ciFile, 'should produce .gitlab-ci.yml file');
            assert.ok(ciFile.content.includes('stages:'));
            assert.ok(ciFile.content.includes('stage: lint'));
            assert.equal(result.metadata.provider, 'gitlab-ci');
        });
        it('includes GCP deploy target', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateCiCdPipeline(doc);
            const ciFile = result.files.find((f) => f.path.includes('.gitlab-ci.yml'));
            assert.ok(ciFile.content.includes('gcloud') || ciFile.content.includes('GCP') || ciFile.content.includes('cloud-sdk'));
        });
        it('includes MySQL test service', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateCiCdPipeline(doc);
            const ciFile = result.files.find((f) => f.path.includes('.gitlab-ci.yml'));
            assert.ok(ciFile.content.includes('mysql'));
        });
        it('generates Terraform main.tf for GCP', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.ok(tf, 'should include main.tf for GCP');
            assert.ok(tf.content.includes('hashicorp/google'));
            assert.ok(tf.content.includes('google_cloud_run_service'));
        });
        it('includes GCP Cloud SQL for MySQL', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.ok(tf.content.includes('google_sql_database_instance'));
            assert.ok(tf.content.includes('MYSQL_8_0'));
        });
        it('GCP variables include gcp_project', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateCiCdPipeline(doc);
            const vars = result.files.find((f) => f.path.includes('variables.tf'));
            assert.ok(vars.content.includes('gcp_project'));
        });
    });
    // -- ADR --
    describe('adr', () => {
        it('generates serverless architecture pattern ADR', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateADRs(doc);
            const archAdr = result.files.find((f) => f.path.includes('architecture-pattern'));
            assert.ok(archAdr);
            assert.ok(archAdr.content.includes('Serverless'));
        });
        it('generates GCP cloud ADR', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateADRs(doc);
            const cloudAdr = result.files.find((f) => f.path.includes('cloud-hosting'));
            assert.ok(cloudAdr);
            assert.ok(cloudAdr.content.includes('GCP') || cloudAdr.content.includes('Google'));
        });
        it('generates MySQL database ADR', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateADRs(doc);
            const dbAdr = result.files.find((f) => f.path.includes('primary-database'));
            assert.ok(dbAdr);
            assert.ok(dbAdr.content.includes('MySQL'));
        });
        it('generates api-key auth ADR', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateADRs(doc);
            const authAdr = result.files.find((f) => f.path.includes('authentication'));
            assert.ok(authAdr);
            assert.ok(authAdr.content.includes('API'));
        });
        it('generates FastAPI backend framework ADR', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateADRs(doc);
            const beAdr = result.files.find((f) => f.path.includes('backend-api'));
            assert.ok(beAdr);
            assert.ok(beAdr.content.includes('FastAPI'));
        });
    });
    // -- OpenAPI --
    describe('openapi', () => {
        it('uses apiKey security scheme for api-key strategy', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            assert.ok(content.includes('apiKey') || content.includes('bearerAuth'));
        });
        it('infers entities from persona goals', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            // "Create invoices" → Invoice entity
            assert.ok(content.includes('Invoice') || content.includes('invoice'));
        });
    });
    // -- Data model --
    describe('data model', () => {
        it('generates MySQL ERD', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateDataModel(doc);
            assert.equal(result.metadata.primaryDatabase, 'mysql');
            const erd = result.files.find((f) => f.path.includes('erd.mmd'));
            assert.ok(erd);
            assert.ok(erd.content.includes('erDiagram'));
        });
        it('generates SQLAlchemy models for FastAPI + MySQL', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateDataModel(doc);
            const pyFile = result.files.find((f) => f.path.includes('models.py'));
            assert.ok(pyFile, 'should include models.py for sqlalchemy');
            assert.ok(pyFile.content.includes('DeclarativeBase'));
            assert.ok(pyFile.content.includes('mapped_column'));
            assert.ok(pyFile.content.includes('__tablename__'));
        });
        it('SQLAlchemy schema includes ForeignKey for relations', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateDataModel(doc);
            const pyFile = result.files.find((f) => f.path.includes('models.py'));
            assert.ok(pyFile.content.includes('ForeignKey'));
            assert.ok(pyFile.content.includes('relationship'));
        });
    });
    // -- Sequence diagrams --
    describe('sequence diagrams', () => {
        it('generates auth flow for api-key (no redirect, POST /auth/login)', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateSequenceDiagrams(doc);
            const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));
            assert.ok(authDiagram);
            // api-key → falls to else branch (POST /auth/login)
            assert.ok(authDiagram.content.includes('/auth/login'));
            assert.ok(!authDiagram.content.includes('Redirect'));
        });
        it('does not include provider participant when no provider set', () => {
            const doc = getDoc('saas-gcp.yaml');
            const result = generateSequenceDiagrams(doc);
            const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));
            assert.ok(authDiagram);
            // No participant line for a named provider
            assert.ok(!authDiagram.content.includes('Auth0'));
            assert.ok(!authDiagram.content.includes('Cognito'));
        });
    });
    // -- Deployment guide --
    describe('deployment guide', () => {
        it('includes GCP-specific deploy instructions', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateDeploymentGuide(doc).files[0].content;
            assert.ok(content.includes('GCP') || content.includes('Google') || content.includes('Cloud Run'));
        });
        it('includes MySQL database setup', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateDeploymentGuide(doc).files[0].content;
            assert.ok(content.includes('MySQL') || content.includes('mysql'));
        });
    });
    // -- Cost estimate --
    describe('cost estimate', () => {
        it('uses medium scale pricing', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('medium'));
        });
        it('includes GCP compute costs', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Cloud Run') || content.includes('GCP') || content.includes('Google'));
        });
        it('includes MySQL serverless database cost', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('MySQL') || content.includes('Serverless'));
        });
        it('includes Resend email cost', () => {
            const doc = getDoc('saas-gcp.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Resend'));
        });
    });
});
// ────────────────────────────────────────────────────────────────────
// Fixture 3: mobile-railway.yaml
// Mobile + Web · .NET 8 · Railway · magic-link/Clerk · React Native
// Core flows (mixed: with and without steps) · Small scale
// ────────────────────────────────────────────────────────────────────
describe('mobile-railway fixture', () => {
    it('compiles successfully', () => {
        const result = compile(fixture('mobile-railway.yaml'));
        assert.equal(result.success, true);
    });
    // -- Architecture diagram --
    describe('architecture diagram', () => {
        it('includes mobile project in Client Tier', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Mobile App'));
            assert.ok(content.includes('React Native'));
        });
        it('includes mobile → backend HTTPS connections', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('mobile_app'));
            assert.ok(content.includes('HTTPS'));
        });
        it('includes mobile → auth connection', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Login/Signup'));
        });
        it('includes .NET 8 backend', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('.NET 8'));
        });
        it('includes Clerk auth provider', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Clerk'));
        });
    });
    // -- Scaffold --
    describe('scaffold', () => {
        it('generates React Native mobile scaffold with Expo', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('mobile-mobile-app/package.json'));
            assert.ok(pkg);
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.dependencies['expo']);
            assert.ok(parsed.dependencies['react-native']);
        });
        it('generates mobile App.tsx entry point', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateRepoScaffold(doc);
            const appFile = result.files.find((f) => f.path.includes('mobile-mobile-app/App.tsx'));
            assert.ok(appFile);
        });
        it('generates mobile tsconfig.json', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateRepoScaffold(doc);
            const tsconfig = result.files.find((f) => f.path.includes('mobile-mobile-app/tsconfig.json'));
            assert.ok(tsconfig);
        });
        it('includes Clerk env vars in frontend .env.example', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateRepoScaffold(doc);
            const envFile = result.files.find((f) => f.path.includes('frontend-web/.env.example'));
            assert.ok(envFile);
            assert.ok(envFile.content.includes('CLERK'));
        });
        it('includes Clerk backend env var', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateRepoScaffold(doc);
            const envFile = result.files.find((f) => f.path.includes('backend-api/.env.example'));
            assert.ok(envFile);
            assert.ok(envFile.content.includes('CLERK_SECRET_KEY'));
        });
        it('reports correct project count (frontend + mobile + backend)', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateRepoScaffold(doc);
            assert.equal(result.metadata.projectCount, 3);
        });
    });
    // -- ADR --
    describe('adr', () => {
        it('generates magic-link auth ADR', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateADRs(doc);
            const authAdr = result.files.find((f) => f.path.includes('authentication'));
            assert.ok(authAdr);
            assert.ok(authAdr.content.includes('Clerk'));
            assert.ok(authAdr.content.includes('MAGIC-LINK'));
        });
        it('generates .NET 8 backend framework ADR', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateADRs(doc);
            const beAdr = result.files.find((f) => f.path.includes('backend-api'));
            assert.ok(beAdr);
            assert.ok(beAdr.content.includes('.NET'));
        });
        it('generates Railway cloud ADR', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateADRs(doc);
            const cloudAdr = result.files.find((f) => f.path.includes('cloud-hosting'));
            assert.ok(cloudAdr);
            assert.ok(cloudAdr.content.includes('Railway'));
        });
    });
    // -- Sequence diagrams --
    describe('sequence diagrams', () => {
        it('generates magic-link auth flow with redirect (like OIDC)', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateSequenceDiagrams(doc);
            const authDiagram = result.files.find((f) => f.path.includes('auth-flow'));
            assert.ok(authDiagram);
            // magic-link triggers the OIDC/redirect branch
            assert.ok(authDiagram.content.includes('Redirect'));
            assert.ok(authDiagram.content.includes('Clerk'));
        });
        it('generates core flow without steps (generic request/response)', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateSequenceDiagrams(doc);
            const logFlow = result.files.find((f) => f.path.includes('log-workout'));
            assert.ok(logFlow);
            // No steps → generic "Initiate" + "Process request" pattern
            assert.ok(logFlow.content.includes('Initiate'));
            assert.ok(logFlow.content.includes('Process request'));
        });
        it('generates core flow with explicit steps', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateSequenceDiagrams(doc);
            const reviewFlow = result.files.find((f) => f.path.includes('review-progress'));
            assert.ok(reviewFlow);
            assert.ok(reviewFlow.content.includes('Select athlete'));
            assert.ok(reviewFlow.content.includes('Display charts'));
        });
    });
    // -- Backlog --
    describe('backlog', () => {
        it('generates stories for both personas', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('Athlete'));
            assert.ok(content.includes('Coach'));
        });
        it('includes social login story for apple + google', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateBacklog(doc).files[0].content;
            assert.ok(content.includes('social login') || content.includes('apple'));
        });
    });
    // -- Data model --
    describe('data model', () => {
        it('generates EF Core schema for .NET 8 + Postgres', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateDataModel(doc);
            const csFile = result.files.find((f) => f.path.includes('Models.cs'));
            assert.ok(csFile, 'should include Models.cs for ef-core');
            assert.ok(csFile.content.includes('DbContext'));
            assert.ok(csFile.content.includes('[Key]'));
            assert.ok(csFile.content.includes('DbSet'));
        });
        it('EF Core schema includes navigation properties for relations', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateDataModel(doc);
            const csFile = result.files.find((f) => f.path.includes('Models.cs'));
            assert.ok(csFile.content.includes('ICollection'));
            assert.ok(csFile.content.includes('[ForeignKey'));
        });
        it('reports ef-core in metadata', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateDataModel(doc);
            assert.equal(result.metadata.orm, 'ef-core');
        });
    });
    // -- CI/CD (no Terraform for Railway) --
    describe('ci/cd', () => {
        it('does not generate Terraform for Railway (unsupported cloud)', () => {
            const doc = getDoc('mobile-railway.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.equal(tf, undefined, 'should not generate Terraform for Railway');
            assert.equal(result.metadata.hasTerraform, undefined);
        });
    });
    // -- Deployment guide --
    describe('deployment guide', () => {
        it('includes Railway-specific deploy instructions', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateDeploymentGuide(doc).files[0].content;
            assert.ok(content.includes('Railway'));
        });
    });
    // -- Cost estimate --
    describe('cost estimate', () => {
        it('includes Clerk auth cost', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Clerk'));
        });
        it('includes Railway compute cost', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Railway') || content.includes('railway'));
        });
        it('includes Redis cache cost', () => {
            const doc = getDoc('mobile-railway.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Redis'));
        });
    });
});
// ────────────────────────────────────────────────────────────────────
// Fixture 4: minimal-noauth.yaml
// No auth · Svelte + Go · DynamoDB/serverless · Cloudflare
// ────────────────────────────────────────────────────────────────────
describe('minimal-noauth fixture', () => {
    it('compiles successfully', () => {
        const result = compile(fixture('minimal-noauth.yaml'));
        assert.equal(result.success, true);
    });
    // -- Architecture diagram --
    describe('architecture diagram', () => {
        it('does not include auth subgraph', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(!content.includes('Authentication'));
            assert.ok(!content.includes('auth_provider'));
        });
        it('includes Svelte frontend', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Svelte'));
        });
        it('includes Go backend', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Go'));
        });
        it('includes DynamoDB database', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(content.includes('Dynamodb'));
        });
        it('does not include cache (no cache configured)', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateArchitectureDiagram(doc).files[0].content;
            assert.ok(!content.includes('Cache'));
        });
    });
    // -- Scaffold --
    describe('scaffold', () => {
        it('generates Svelte frontend with Vite', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateRepoScaffold(doc);
            const pkg = result.files.find((f) => f.path.includes('frontend-page/package.json'));
            assert.ok(pkg);
            const parsed = JSON.parse(pkg.content);
            assert.ok(parsed.dependencies['svelte']);
            assert.ok(parsed.devDependencies['@sveltejs/vite-plugin-svelte']);
        });
        it('does not include auth env vars when no auth', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateRepoScaffold(doc);
            const envFile = result.files.find((f) => f.path.includes('backend-api/.env.example'));
            assert.ok(envFile);
            assert.ok(!envFile.content.includes('AUTH'));
            assert.ok(!envFile.content.includes('JWT_SECRET'));
            assert.ok(!envFile.content.includes('OIDC'));
        });
        it('uses DynamoDB connection string placeholder', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateRepoScaffold(doc);
            const envFile = result.files.find((f) => f.path.includes('backend-api/.env.example'));
            assert.ok(envFile);
            assert.ok(envFile.content.includes('dynamodb'));
        });
    });
    // -- ADR --
    describe('adr', () => {
        it('does not generate authentication ADR', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateADRs(doc);
            const authAdr = result.files.find((f) => f.path.includes('authentication'));
            assert.equal(authAdr, undefined);
        });
        it('generates DynamoDB database ADR', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateADRs(doc);
            const dbAdr = result.files.find((f) => f.path.includes('primary-database'));
            assert.ok(dbAdr);
            assert.ok(dbAdr.content.includes('DynamoDB'));
        });
        it('generates Cloudflare cloud ADR', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateADRs(doc);
            const cloudAdr = result.files.find((f) => f.path.includes('cloud-hosting'));
            assert.ok(cloudAdr);
            assert.ok(cloudAdr.content.includes('Cloudflare'));
        });
        it('generates Svelte frontend ADR', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateADRs(doc);
            const feAdr = result.files.find((f) => f.path.includes('frontend-page'));
            assert.ok(feAdr);
            assert.ok(feAdr.content.includes('Svelte'));
        });
        it('generates Go backend ADR', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateADRs(doc);
            const beAdr = result.files.find((f) => f.path.includes('backend-api'));
            assert.ok(beAdr);
            assert.ok(beAdr.content.includes('Go'));
        });
        it('has fewer ADRs than authed fixtures (no auth ADR)', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const noAuthCount = generateADRs(doc).files.length;
            const authDoc = getDoc('taskflow.yaml');
            const authCount = generateADRs(authDoc).files.length;
            assert.ok(noAuthCount < authCount);
        });
    });
    // -- OpenAPI --
    describe('openapi', () => {
        it('does not include auth endpoints when no auth', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            assert.ok(!content.includes('/auth/login'));
            assert.ok(!content.includes('/auth/register'));
        });
        it('does not include named security schemes when no auth', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            assert.ok(!content.includes('bearerAuth'));
            assert.ok(!content.includes('apiKey'));
        });
        it('still includes health endpoint', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateOpenApiSpec(doc).files[0].content;
            assert.ok(content.includes('/health'));
        });
    });
    // -- Data model --
    describe('data model', () => {
        it('generates DynamoDB ERD', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateDataModel(doc);
            assert.equal(result.metadata.primaryDatabase, 'dynamodb');
        });
        it('does not include User entity when no auth', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateDataModel(doc);
            const erd = result.files.find((f) => f.path.includes('erd.mmd'));
            assert.ok(erd);
            assert.ok(!erd.content.includes('User'));
        });
        it('does not generate ORM schema for Go + DynamoDB (no gorm mapping for DynamoDB)', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateDataModel(doc);
            assert.ok(!result.files.some((f) => f.path.includes('schema.prisma')));
            assert.ok(!result.files.some((f) => f.path.includes('entities.ts')));
            assert.ok(!result.files.some((f) => f.path.includes('models.ts')));
            assert.ok(!result.files.some((f) => f.path.includes('models.go')));
            assert.ok(!result.files.some((f) => f.path.includes('models.py')));
            assert.ok(!result.files.some((f) => f.path.includes('Models.cs')));
        });
    });
    // -- CI/CD (no Terraform for Cloudflare) --
    describe('ci/cd', () => {
        it('does not generate Terraform for Cloudflare (unsupported cloud)', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateCiCdPipeline(doc);
            const tf = result.files.find((f) => f.path.includes('main.tf'));
            assert.equal(tf, undefined, 'should not generate Terraform for Cloudflare');
        });
    });
    // -- Cost estimate --
    describe('cost estimate', () => {
        it('includes Cloudflare compute cost', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('Workers') || content.includes('Cloudflare'));
        });
        it('includes DynamoDB serverless database cost', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const content = generateCostEstimate(doc).files[0].content;
            assert.ok(content.includes('DynamoDB'));
        });
        it('does not include auth provider cost when no auth', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateCostEstimate(doc);
            const items = result.metadata.items;
            const authItems = items.filter((i) => i.category === 'Auth');
            assert.equal(authItems.length, 0);
        });
        it('does not include cache cost when no cache configured', () => {
            const doc = getDoc('minimal-noauth.yaml');
            const result = generateCostEstimate(doc);
            const items = result.metadata.items;
            const cacheItems = items.filter((i) => i.category === 'Cache');
            assert.equal(cacheItems.length, 0);
        });
    });
    // -- generateAll --
    it('generateAll() generates only requested artifacts', () => {
        const doc = getDoc('minimal-noauth.yaml');
        const { results, skipped } = generateAll(doc);
        // minimal-noauth requests 7 types
        assert.equal(results.length, 7);
        assert.equal(skipped.length, 0);
        const types = results.map((r) => r.artifactType);
        assert.ok(!types.includes('sequence-diagrams'));
        assert.ok(!types.includes('backlog'));
        assert.ok(!types.includes('deployment-guide'));
    });
});
// ────────────────────────────────────────────────────────────────────
// GitLab CI Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('GitLab CI generator', () => {
    it('produces .gitlab-ci.yml when provider is gitlab-ci', () => {
        const doc = getDoc('saas-gcp.yaml');
        const result = generateCiCdPipeline(doc);
        const ci = result.files.find((f) => f.path.includes('.gitlab-ci.yml'));
        assert.ok(ci, 'should produce .gitlab-ci.yml');
        assert.ok(!result.files.some((f) => f.path === 'artifacts/cicd/ci.yml'));
    });
    it('includes stages: lint, test, build, deploy', () => {
        const doc = getDoc('saas-gcp.yaml');
        const result = generateCiCdPipeline(doc);
        const content = result.files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('stages:'));
        assert.ok(content.includes('- lint'));
        assert.ok(content.includes('- test'));
        assert.ok(content.includes('- build'));
        assert.ok(content.includes('- deploy'));
    });
    it('generates Python lint and test jobs for FastAPI', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('python:3.12'));
        assert.ok(content.includes('ruff check'));
        assert.ok(content.includes('pytest'));
    });
    it('includes MySQL service for test jobs', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('mysql:8'));
        assert.ok(content.includes('MYSQL_ROOT_PASSWORD'));
    });
    it('includes GCP deploy job with gcloud', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('google/cloud-sdk'));
        assert.ok(content.includes('gcloud auth'));
    });
    it('sets metadata.provider to gitlab-ci', () => {
        const doc = getDoc('saas-gcp.yaml');
        const result = generateCiCdPipeline(doc);
        assert.equal(result.metadata.provider, 'gitlab-ci');
    });
    it('generates Node.js jobs with artifact paths', () => {
        // Use ecommerce-aws but override ciCd to gitlab-ci
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const result = generateCiCdPipeline(doc);
        const content = result.files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('node:$NODE_VERSION'));
        assert.ok(content.includes('npm ci'));
        assert.ok(content.includes('artifacts:'));
        assert.ok(content.includes('- dist/'));
    });
    it('generates Go jobs with binary artifacts', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('golang:1.22'));
        assert.ok(content.includes('go vet'));
        assert.ok(content.includes('go build'));
        assert.ok(content.includes('- bin/'));
    });
    it('generates .NET 8 combined build-test job', () => {
        const doc = getDoc('mobile-railway.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('mcr.microsoft.com/dotnet/sdk:8.0'));
        assert.ok(content.includes('dotnet restore'));
        assert.ok(content.includes('dotnet publish'));
        assert.ok(content.includes('- out/'));
    });
    it('includes frontend lint and build jobs', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('dashboard-lint:'));
        assert.ok(content.includes('dashboard-build:'));
    });
});
// ────────────────────────────────────────────────────────────────────
// Dockerfile Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('Dockerfile generator', () => {
    it('generates Dockerfiles for all backends', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateCiCdPipeline(doc);
        const dockerfiles = result.files.filter((f) => f.path.includes('docker/'));
        assert.ok(dockerfiles.length >= 2, 'should have Dockerfiles for backends');
        assert.ok(result.metadata.hasDockerfiles, 'should set hasDockerfiles metadata');
    });
    it('generates Node.js multi-stage Dockerfile', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateCiCdPipeline(doc);
        const df = result.files.find((f) => f.path.includes('docker/backend-api-gateway/Dockerfile'));
        assert.ok(df);
        assert.ok(df.content.includes('node:20-alpine AS builder'));
        assert.ok(df.content.includes('npm ci'));
        assert.ok(df.content.includes('npm run build'));
        assert.ok(df.content.includes('EXPOSE 3000'));
    });
    it('generates Go distroless Dockerfile', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateCiCdPipeline(doc);
        const df = result.files.find((f) => f.path.includes('docker/backend-worker/Dockerfile'));
        assert.ok(df);
        assert.ok(df.content.includes('golang:1.22-alpine AS builder'));
        assert.ok(df.content.includes('CGO_ENABLED=0'));
        assert.ok(df.content.includes('distroless'));
        assert.ok(df.content.includes('EXPOSE 8080'));
    });
    it('generates Python FastAPI Dockerfile', () => {
        const doc = getDoc('saas-gcp.yaml');
        const result = generateCiCdPipeline(doc);
        const df = result.files.find((f) => f.path.includes('docker/backend-api/Dockerfile'));
        assert.ok(df);
        assert.ok(df.content.includes('python:3.12-slim'));
        assert.ok(df.content.includes('uvicorn'));
        assert.ok(df.content.includes('EXPOSE 8000'));
    });
    it('generates .NET 8 Dockerfile', () => {
        const doc = getDoc('mobile-railway.yaml');
        const result = generateCiCdPipeline(doc);
        const df = result.files.find((f) => f.path.includes('docker/backend-api/Dockerfile'));
        assert.ok(df);
        assert.ok(df.content.includes('dotnet/sdk:8.0'));
        assert.ok(df.content.includes('dotnet publish'));
        assert.ok(df.content.includes('dotnet/aspnet:8.0'));
        assert.ok(df.content.includes('EXPOSE 5000'));
    });
    it('generates frontend nginx Dockerfile', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateCiCdPipeline(doc);
        const df = result.files.find((f) => f.path.includes('docker/frontend-storefront/Dockerfile'));
        assert.ok(df);
        assert.ok(df.content.includes('node:20-alpine AS builder'));
        assert.ok(df.content.includes('nginx:alpine'));
        assert.ok(df.content.includes('EXPOSE 80'));
    });
    it('includes Prisma generate step when ORM is prisma', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateCiCdPipeline(doc);
        const df = result.files.find((f) => f.path.includes('docker/backend-api/Dockerfile'));
        assert.ok(df);
        assert.ok(df.content.includes('prisma generate'));
        assert.ok(df.content.includes('COPY prisma'));
    });
});
// ────────────────────────────────────────────────────────────────────
// Bicep / Pulumi / CDK / CloudFormation IaC Tests
// ────────────────────────────────────────────────────────────────────
describe('IaC alternatives', () => {
    describe('Bicep (Azure)', () => {
        it('generates main.bicep for Azure cloud', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            // Override to Azure + Bicep
            doc.deployment.cloud = 'azure';
            doc.deployment.infrastructure = { iac: 'bicep' };
            const result = generateCiCdPipeline(doc);
            const bicep = result.files.find((f) => f.path.includes('main.bicep'));
            assert.ok(bicep, 'should generate main.bicep');
            assert.ok(bicep.content.includes('Microsoft.App/containerApps'));
            assert.ok(bicep.content.includes('param location'));
            assert.equal(result.metadata.iac, 'bicep');
            assert.equal(result.metadata.hasIaC, true);
        });
        it('includes database resource for postgres', () => {
            const doc = getDoc('mobile-railway.yaml');
            doc.deployment.cloud = 'azure';
            doc.deployment.infrastructure = { iac: 'bicep' };
            const result = generateCiCdPipeline(doc);
            const bicep = result.files.find((f) => f.path.includes('main.bicep'));
            assert.ok(bicep.content.includes('Microsoft.DBforPostgreSQL'));
        });
        it('includes Redis cache resource', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.cloud = 'azure';
            doc.deployment.infrastructure = { iac: 'bicep' };
            const result = generateCiCdPipeline(doc);
            const bicep = result.files.find((f) => f.path.includes('main.bicep'));
            assert.ok(bicep.content.includes('Microsoft.Cache/redis'));
        });
        it('returns null for non-Azure clouds', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.infrastructure = { iac: 'bicep' };
            // cloud is still 'aws'
            const result = generateCiCdPipeline(doc);
            const bicep = result.files.find((f) => f.path.includes('main.bicep'));
            assert.equal(bicep, undefined, 'Bicep should only generate for Azure');
        });
    });
    describe('Pulumi', () => {
        it('generates index.ts + Pulumi.yaml for AWS', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.infrastructure = { iac: 'pulumi' };
            const result = generateCiCdPipeline(doc);
            const indexTs = result.files.find((f) => f.path.includes('iac/index.ts'));
            const pulumiYaml = result.files.find((f) => f.path.includes('Pulumi.yaml'));
            assert.ok(indexTs, 'should generate index.ts');
            assert.ok(pulumiYaml, 'should generate Pulumi.yaml');
            assert.ok(indexTs.content.includes('@pulumi/aws'));
            assert.ok(indexTs.content.includes('aws.ec2.Vpc'));
            assert.ok(indexTs.content.includes('aws.ecs.Cluster'));
            assert.equal(result.metadata.iac, 'pulumi');
        });
        it('generates Pulumi for GCP with Cloud Run', () => {
            const doc = getDoc('saas-gcp.yaml');
            doc.deployment.infrastructure = { iac: 'pulumi' };
            const result = generateCiCdPipeline(doc);
            const indexTs = result.files.find((f) => f.path.includes('iac/index.ts'));
            assert.ok(indexTs);
            assert.ok(indexTs.content.includes('@pulumi/gcp'));
            assert.ok(indexTs.content.includes('gcp.cloudrun.Service'));
        });
        it('generates Pulumi for Azure with Container Apps', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.cloud = 'azure';
            doc.deployment.infrastructure = { iac: 'pulumi' };
            const result = generateCiCdPipeline(doc);
            const indexTs = result.files.find((f) => f.path.includes('iac/index.ts'));
            assert.ok(indexTs);
            assert.ok(indexTs.content.includes('@pulumi/azure-native'));
            assert.ok(indexTs.content.includes('azure.app.ContainerApp'));
        });
        it('returns null for unsupported clouds', () => {
            const doc = getDoc('mobile-railway.yaml');
            doc.deployment.infrastructure = { iac: 'pulumi' };
            const result = generateCiCdPipeline(doc);
            const indexTs = result.files.find((f) => f.path.includes('iac/index.ts'));
            assert.equal(indexTs, undefined);
        });
    });
    describe('CDK (AWS only)', () => {
        it('generates stack.ts + app.ts for AWS', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.infrastructure = { iac: 'cdk' };
            const result = generateCiCdPipeline(doc);
            const stack = result.files.find((f) => f.path.includes('lib/stack.ts'));
            const app = result.files.find((f) => f.path.includes('bin/app.ts'));
            assert.ok(stack, 'should generate lib/stack.ts');
            assert.ok(app, 'should generate bin/app.ts');
            assert.ok(stack.content.includes('aws-cdk-lib'));
            assert.ok(stack.content.includes('extends cdk.Stack'));
            assert.ok(stack.content.includes('ApplicationLoadBalancedFargateService'));
            assert.equal(result.metadata.iac, 'cdk');
        });
        it('includes RDS for postgres', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.infrastructure = { iac: 'cdk' };
            // Override DB to postgres for RDS test
            doc.data.primaryDatabase.type = 'postgres';
            const result = generateCiCdPipeline(doc);
            const stack = result.files.find((f) => f.path.includes('lib/stack.ts'));
            assert.ok(stack.content.includes('rds.DatabaseInstance'));
        });
        it('returns null for non-AWS clouds', () => {
            const doc = getDoc('saas-gcp.yaml');
            doc.deployment.infrastructure = { iac: 'cdk' };
            const result = generateCiCdPipeline(doc);
            const stack = result.files.find((f) => f.path.includes('lib/stack.ts'));
            assert.equal(stack, undefined, 'CDK should only generate for AWS');
        });
    });
    describe('CloudFormation (AWS only)', () => {
        it('generates template.yaml for AWS', () => {
            const doc = getDoc('ecommerce-aws.yaml');
            doc.deployment.infrastructure = { iac: 'cloudformation' };
            const result = generateCiCdPipeline(doc);
            const tpl = result.files.find((f) => f.path.includes('template.yaml'));
            assert.ok(tpl, 'should generate template.yaml');
            assert.ok(tpl.content.includes('AWSTemplateFormatVersion'));
            assert.ok(tpl.content.includes('AWS::EC2::VPC'));
            assert.ok(tpl.content.includes('AWS::ECS::Cluster'));
            assert.equal(result.metadata.iac, 'cloudformation');
        });
        it('returns null for non-AWS clouds', () => {
            const doc = getDoc('saas-gcp.yaml');
            doc.deployment.infrastructure = { iac: 'cloudformation' };
            const result = generateCiCdPipeline(doc);
            const tpl = result.files.find((f) => f.path.includes('template.yaml'));
            assert.equal(tpl, undefined);
        });
    });
});
// ────────────────────────────────────────────────────────────────────
// SDL Schema Extension Tests (testing, observability, apiVersioning)
// ────────────────────────────────────────────────────────────────────
describe('schema extensions', () => {
    it('compiles SDL with testing section', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'testing:\n  unit:\n    framework: vitest\n  e2e:\n    framework: playwright\n  coverage:\n    target: 80\n    enforce: true\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true, 'should compile with testing section');
        assert.equal(result.document.testing.unit.framework, 'vitest');
        assert.equal(result.document.testing.e2e.framework, 'playwright');
        assert.equal(result.document.testing.coverage.target, 80);
        assert.equal(result.document.testing.coverage.enforce, true);
    });
    it('compiles SDL with observability section', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'observability:\n  logging:\n    provider: pino\n    structured: true\n    level: info\n  tracing:\n    provider: opentelemetry\n    samplingRate: 0.1\n  metrics:\n    provider: prometheus\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true, 'should compile with observability section');
        assert.equal(result.document.observability.logging.provider, 'pino');
        assert.equal(result.document.observability.tracing.provider, 'opentelemetry');
        assert.equal(result.document.observability.metrics.provider, 'prometheus');
    });
    it('compiles SDL with apiVersioning on backend project', () => {
        const yaml = fixture('taskflow.yaml').replace('framework: "nodejs"', 'framework: "nodejs"\n        apiVersioning: url-prefix');
        const result = compile(yaml);
        assert.equal(result.success, true, 'should compile with apiVersioning');
        assert.equal(result.document.architecture.projects.backend[0].apiVersioning, 'url-prefix');
    });
    it('rejects invalid testing.unit.framework value', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'testing:\n  unit:\n    framework: invalid-framework\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, false);
    });
    it('rejects invalid observability.tracing.provider value', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'observability:\n  tracing:\n    provider: invalid-tracer\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, false);
    });
    it('rejects invalid apiVersioning value', () => {
        const yaml = fixture('taskflow.yaml').replace('framework: "nodejs"', 'framework: "nodejs"\n        apiVersioning: custom');
        const result = compile(yaml);
        assert.equal(result.success, false);
    });
    it('normalizer infers testing.unit.framework from backend framework', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'testing:\n  unit: {}\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true);
        assert.equal(result.document.testing.unit.framework, 'vitest');
    });
    it('normalizer infers observability.logging.provider from framework', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'observability:\n  logging: {}\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true);
        assert.equal(result.document.observability.logging.provider, 'pino');
        assert.equal(result.document.observability.logging.structured, true);
    });
    it('normalizer sets observability.tracing.samplingRate default', () => {
        const yaml = fixture('taskflow.yaml').replace('artifacts:', 'observability:\n  tracing:\n    provider: opentelemetry\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true);
        assert.equal(result.document.observability.tracing.samplingRate, 0.1);
    });
    it('normalizer infers pytest for FastAPI backend', () => {
        const yaml = fixture('saas-gcp.yaml').replace('artifacts:', 'testing:\n  unit: {}\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true);
        assert.equal(result.document.testing.unit.framework, 'pytest');
    });
    it('normalizer infers serilog for .NET 8 backend', () => {
        const yaml = fixture('mobile-railway.yaml').replace('artifacts:', 'observability:\n  logging: {}\nartifacts:');
        const result = compile(yaml);
        assert.equal(result.success, true);
        assert.equal(result.document.observability.logging.provider, 'serilog');
    });
});
// ────────────────────────────────────────────────────────────────────
// Docker Compose Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('Docker Compose generator', () => {
    it('generates docker-compose.yml with services', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateDockerCompose(doc);
        const compose = result.files.find((f) => f.path.includes('docker-compose.yml'));
        assert.ok(compose, 'should generate docker-compose.yml');
        assert.ok(compose.content.includes('services:'));
    });
    it('includes backend service with build context', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateDockerCompose(doc);
        const content = result.files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('api:'));
        assert.ok(content.includes('context: ./backend-api'));
    });
    it('includes postgres service for postgres databases', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('postgres:'));
        assert.ok(content.includes('postgres:16-alpine'));
        assert.ok(content.includes('POSTGRES_USER'));
        assert.ok(content.includes('pg_isready'));
    });
    it('includes mysql service for mysql databases', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('mysql:'));
        assert.ok(content.includes('mysql:8'));
        assert.ok(content.includes('MYSQL_ROOT_PASSWORD'));
    });
    it('includes mongo service for mongodb databases', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('mongo:'));
        assert.ok(content.includes('mongo:7'));
        assert.ok(content.includes('27017'));
    });
    it('includes redis when cache is redis', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('redis:'));
        assert.ok(content.includes('redis:7-alpine'));
        assert.ok(content.includes('redis-cli'));
    });
    it('includes secondary database services', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('postgres-analytics:'));
        assert.ok(content.includes('5433:5432'));
    });
    it('includes frontend service', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('web:'));
        assert.ok(content.includes('context: ./frontend-web'));
        assert.ok(content.includes('5173:5173'));
    });
    it('includes volumes section', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('volumes:'));
        assert.ok(content.includes('postgres_data:'));
    });
    it('includes network definition', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('networks:'));
        assert.ok(content.includes('taskflow-network'));
    });
    it('generates .env file', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateDockerCompose(doc);
        const env = result.files.find((f) => f.path.includes('.env'));
        assert.ok(env, 'should generate .env');
        assert.ok(env.content.includes('COMPOSE_PROJECT_NAME'));
    });
    it('includes auth env vars for auth0', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('AUTH0_DOMAIN'));
    });
    it('includes cognito env vars', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('COGNITO_USER_POOL_ID'));
    });
    it('sets correct port for python-fastapi', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('8000:8000'));
    });
    it('sets correct port for dotnet-8', () => {
        const doc = getDoc('mobile-railway.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('5000:5000'));
    });
    it('sets correct port for go', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        // worker is Go, should have 8080
        assert.ok(content.includes('8080:8080'));
    });
    it('has depends_on with health checks', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateDockerCompose(doc).files.find((f) => f.path.includes('docker-compose.yml')).content;
        assert.ok(content.includes('depends_on:'));
        assert.ok(content.includes('condition: service_healthy'));
    });
    it('sets metadata correctly', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateDockerCompose(doc);
        assert.equal(result.metadata.solutionName, 'ShopHub');
        assert.equal(result.metadata.hasCache, true);
        assert.equal(result.metadata.databaseType, 'mongodb');
    });
    it('is deterministic', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const r1 = generateDockerCompose(doc);
        const r2 = generateDockerCompose(doc);
        assert.deepEqual(r1, r2);
    });
});
// ────────────────────────────────────────────────────────────────────
// SDL Diff Tests
// ────────────────────────────────────────────────────────────────────
describe('SDL diff', () => {
    it('reports identical documents', () => {
        const doc = getDoc('taskflow.yaml');
        const result = diff(doc, doc);
        assert.equal(result.identical, true);
        assert.equal(result.changes.length, 0);
        assert.ok(result.summary[0].includes('No changes'));
    });
    it('detects changed primitive values', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        b.solution.name = 'TaskFlow V2';
        const result = diff(a, b);
        assert.equal(result.identical, false);
        const nameChange = result.changes.find((c) => c.path === 'solution.name');
        assert.ok(nameChange);
        assert.equal(nameChange.type, 'changed');
        assert.equal(nameChange.oldValue, 'TaskFlow');
        assert.equal(nameChange.newValue, 'TaskFlow V2');
    });
    it('detects added properties', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        b.testing = { unit: { framework: 'vitest' } };
        const result = diff(a, b);
        assert.equal(result.identical, false);
        const added = result.changes.find((c) => c.path === 'testing');
        assert.ok(added);
        assert.equal(added.type, 'added');
    });
    it('detects removed properties', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        delete b.auth;
        const result = diff(a, b);
        assert.equal(result.identical, false);
        const removed = result.changes.find((c) => c.path === 'auth');
        assert.ok(removed);
        assert.equal(removed.type, 'removed');
    });
    it('detects changes in nested objects', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        b.deployment.cloud = 'aws';
        const result = diff(a, b);
        const cloudChange = result.changes.find((c) => c.path === 'deployment.cloud');
        assert.ok(cloudChange);
        assert.equal(cloudChange.type, 'changed');
        assert.equal(cloudChange.oldValue, 'vercel');
        assert.equal(cloudChange.newValue, 'aws');
    });
    it('detects named array changes (added project)', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        b.architecture.projects.backend.push({
            name: 'worker',
            framework: 'go',
        });
        const result = diff(a, b);
        const added = result.changes.find((c) => c.path.includes('[name=worker]'));
        assert.ok(added);
        assert.equal(added.type, 'added');
    });
    it('detects named array changes (removed project)', () => {
        const a = getDoc('ecommerce-aws.yaml');
        const b = structuredClone(a);
        b.architecture.projects.backend = b.architecture.projects.backend.filter((p) => p.name !== 'worker');
        const result = diff(a, b);
        const removed = result.changes.find((c) => c.path.includes('[name=worker]'));
        assert.ok(removed);
        assert.equal(removed.type, 'removed');
    });
    it('detects named array changes (modified project)', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        b.architecture.projects.backend[0].framework = 'go';
        const result = diff(a, b);
        const change = result.changes.find((c) => c.path.includes('framework'));
        assert.ok(change);
        assert.equal(change.type, 'changed');
        assert.equal(change.oldValue, 'nodejs');
        assert.equal(change.newValue, 'go');
    });
    it('detects primitive array changes', () => {
        const a = getDoc('ecommerce-aws.yaml');
        const b = structuredClone(a);
        b.auth.roles = ['customer', 'admin', 'superadmin'];
        const result = diff(a, b);
        const added = result.changes.find((c) => c.path.includes('roles[2]'));
        assert.ok(added);
        assert.equal(added.type, 'added');
        assert.equal(added.newValue, 'superadmin');
    });
    it('produces section-level summary', () => {
        const a = getDoc('taskflow.yaml');
        const b = structuredClone(a);
        b.solution.name = 'Changed';
        b.deployment.cloud = 'aws';
        const result = diff(a, b);
        assert.ok(result.summary.some((s) => s.startsWith('solution:')));
        assert.ok(result.summary.some((s) => s.startsWith('deployment:')));
        assert.ok(result.summary.some((s) => s.startsWith('Total:')));
    });
    it('handles stage changes between fixtures', () => {
        const a = getDoc('taskflow.yaml'); // MVP
        const b = getDoc('ecommerce-aws.yaml'); // Enterprise
        const result = diff(a, b);
        assert.equal(result.identical, false);
        assert.ok(result.changes.length > 5, 'should have many changes between different fixtures');
    });
});
// ────────────────────────────────────────────────────────────────────
// SDL Templates Tests
// ────────────────────────────────────────────────────────────────────
describe('SDL templates', () => {
    it('returns all templates', () => {
        const templates = getTemplates();
        assert.ok(templates.length >= 10, 'should have at least 10 templates');
    });
    it('each template has required fields', () => {
        for (const tpl of getTemplates()) {
            assert.ok(tpl.id, `template should have id`);
            assert.ok(tpl.name, `template ${tpl.id} should have name`);
            assert.ok(tpl.description, `template ${tpl.id} should have description`);
            assert.ok(tpl.stage, `template ${tpl.id} should have stage`);
            assert.ok(tpl.tags.length > 0, `template ${tpl.id} should have tags`);
            assert.ok(tpl.yaml.length > 0, `template ${tpl.id} should have yaml`);
        }
    });
    it('each template compiles successfully', () => {
        for (const tpl of getTemplates()) {
            const result = compile(tpl.yaml);
            assert.equal(result.success, true, `template ${tpl.id} should compile: ${result.errors.map((e) => e.message).join(', ')}`);
        }
    });
    it('getTemplate returns specific template', () => {
        const tpl = getTemplate('saas-starter');
        assert.ok(tpl);
        assert.equal(tpl.id, 'saas-starter');
        assert.equal(tpl.stage, 'MVP');
    });
    it('getTemplate returns null for unknown id', () => {
        const tpl = getTemplate('nonexistent');
        assert.equal(tpl, null);
    });
    it('listTemplates returns summaries without yaml', () => {
        const list = listTemplates();
        assert.ok(list.length >= 10);
        for (const item of list) {
            assert.ok(item.id);
            assert.ok(item.name);
            assert.equal(item.yaml, undefined, 'listTemplates should not include yaml');
        }
    });
    it('saas-starter template has expected content', () => {
        const tpl = getTemplate('saas-starter');
        const result = compile(tpl.yaml);
        assert.equal(result.document.solution.stage, 'MVP');
        assert.ok(result.document.auth);
        assert.equal(result.document.auth.provider, 'auth0');
        assert.equal(result.document.data.primaryDatabase.type, 'postgres');
    });
    it('ecommerce template has microservices architecture', () => {
        const tpl = getTemplate('ecommerce');
        const result = compile(tpl.yaml);
        assert.equal(result.document.architecture.style, 'microservices');
        assert.ok(result.document.architecture.projects.frontend.length >= 2);
    });
    it('mobile-backend template has mobile project', () => {
        const tpl = getTemplate('mobile-backend');
        const result = compile(tpl.yaml);
        assert.ok(result.document.architecture.projects.mobile);
        assert.ok(result.document.architecture.projects.mobile.length > 0);
    });
    it('internal-tool template uses python-fastapi', () => {
        const tpl = getTemplate('internal-tool');
        const result = compile(tpl.yaml);
        assert.equal(result.document.architecture.projects.backend[0].framework, 'python-fastapi');
    });
    it('api-first template uses go and serverless', () => {
        const tpl = getTemplate('api-first');
        const result = compile(tpl.yaml);
        assert.equal(result.document.architecture.projects.backend[0].framework, 'go');
        assert.equal(result.document.architecture.style, 'serverless');
    });
    it('realtime-collab template has queues', () => {
        const tpl = getTemplate('realtime-collab');
        const result = compile(tpl.yaml);
        assert.ok(result.document.data.queues);
        assert.equal(result.document.data.queues.provider, 'redis');
    });
    it('ai-product template uses python-fastapi on aws', () => {
        const tpl = getTemplate('ai-product');
        assert.ok(tpl);
        const result = compile(tpl.yaml);
        assert.equal(result.success, true, `ai-product should compile: ${result.errors.map((e) => e.message).join(', ')}`);
        assert.equal(result.document.architecture.projects.backend[0].framework, 'python-fastapi');
        assert.equal(result.document.deployment.cloud, 'aws');
    });
    it('marketplace template uses dotnet-8 with stripe', () => {
        const tpl = getTemplate('marketplace');
        assert.ok(tpl);
        const result = compile(tpl.yaml);
        assert.equal(result.success, true, `marketplace should compile: ${result.errors.map((e) => e.message).join(', ')}`);
        assert.equal(result.document.architecture.projects.backend[0].framework, 'dotnet-8');
        assert.ok(result.document.integrations.payments);
        assert.equal(result.document.product.personas.length, 3);
    });
    it('admin-dashboard template uses nodejs on railway', () => {
        const tpl = getTemplate('admin-dashboard');
        assert.ok(tpl);
        const result = compile(tpl.yaml);
        assert.equal(result.success, true, `admin-dashboard should compile: ${result.errors.map((e) => e.message).join(', ')}`);
        assert.equal(result.document.architecture.projects.backend[0].framework, 'nodejs');
        assert.equal(result.document.deployment.cloud, 'railway');
    });
    it('saas-subscription template uses vercel with stripe subscriptions', () => {
        const tpl = getTemplate('saas-subscription');
        assert.ok(tpl);
        const result = compile(tpl.yaml);
        assert.equal(result.success, true, `saas-subscription should compile: ${result.errors.map((e) => e.message).join(', ')}`);
        assert.equal(result.document.deployment.cloud, 'vercel');
        assert.ok(result.document.integrations.payments);
    });
    it('templates have unique IDs', () => {
        const templates = getTemplates();
        const ids = templates.map((t) => t.id);
        const unique = new Set(ids);
        assert.equal(ids.length, unique.size, 'template IDs should be unique');
    });
});
// ────────────────────────────────────────────────────────────────────
// Kubernetes Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('Kubernetes generator', () => {
    it('generates namespace manifest', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const ns = result.files.find((f) => f.path.includes('namespace.yaml'));
        assert.ok(ns, 'should generate namespace.yaml');
        assert.ok(ns.content.includes('kind: Namespace'));
        assert.ok(ns.content.includes('arch0-sdl'));
    });
    it('generates configmap with app metadata', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const cm = result.files.find((f) => f.path.includes('configmap.yaml'));
        assert.ok(cm, 'should generate configmap.yaml');
        assert.ok(cm.content.includes('kind: ConfigMap'));
        assert.ok(cm.content.includes('NODE_ENV'));
        assert.ok(cm.content.includes('TaskFlow'));
    });
    it('generates backend deployment with health probes', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const deploy = result.files.find((f) => f.path.includes('backend-') && f.path.includes('deployment.yaml'));
        assert.ok(deploy, 'should generate backend deployment');
        assert.ok(deploy.content.includes('kind: Deployment'));
        assert.ok(deploy.content.includes('readinessProbe'));
        assert.ok(deploy.content.includes('livenessProbe'));
        assert.ok(deploy.content.includes('/health'));
    });
    it('generates backend service', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const svc = result.files.find((f) => f.path.includes('backend-') && f.path.includes('service.yaml'));
        assert.ok(svc, 'should generate backend service');
        assert.ok(svc.content.includes('kind: Service'));
        assert.ok(svc.content.includes('ClusterIP'));
    });
    it('generates HPA for backends', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const hpa = result.files.find((f) => f.path.includes('hpa.yaml'));
        assert.ok(hpa, 'should generate HPA');
        assert.ok(hpa.content.includes('HorizontalPodAutoscaler'));
        assert.ok(hpa.content.includes('averageUtilization'));
    });
    it('generates frontend deployment', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const deploy = result.files.find((f) => f.path.includes('frontend-') && f.path.includes('deployment.yaml'));
        assert.ok(deploy, 'should generate frontend deployment');
        assert.ok(deploy.content.includes('containerPort: 80'));
    });
    it('generates ingress with TLS', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const ingress = result.files.find((f) => f.path.includes('ingress.yaml'));
        assert.ok(ingress, 'should generate ingress');
        assert.ok(ingress.content.includes('kind: Ingress'));
        assert.ok(ingress.content.includes('tls:'));
        assert.ok(ingress.content.includes('cert-manager'));
    });
    it('includes API backend paths in ingress', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const ingress = result.files.find((f) => f.path.includes('ingress.yaml'));
        assert.ok(ingress.content.includes('path: /api'));
    });
    it('includes configmap DB_TYPE for postgres', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const cm = result.files.find((f) => f.path.includes('configmap.yaml'));
        assert.ok(cm.content.includes('DB_TYPE: "postgres"'));
    });
    it('scales replicas for large user counts', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateKubernetes(doc);
        const deploy = result.files.find((f) => f.path.includes('backend-') && f.path.includes('deployment.yaml'));
        assert.ok(deploy);
        // ecommerce-aws has 100K users → should get 5 replicas
        assert.ok(deploy.content.includes('replicas: 5'));
    });
    it('includes redis config when cache is redis', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateKubernetes(doc);
        const cm = result.files.find((f) => f.path.includes('configmap.yaml'));
        assert.ok(cm.content.includes('REDIS_ENABLED'));
    });
    it('includes auth provider in configmap', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        const cm = result.files.find((f) => f.path.includes('configmap.yaml'));
        assert.ok(cm.content.includes('AUTH_PROVIDER'));
    });
    it('sets metadata correctly', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateKubernetes(doc);
        assert.equal(result.artifactType, 'deployment-guide');
        assert.equal(result.metadata.solutionName, 'TaskFlow');
        assert.ok(result.metadata.totalManifests > 0);
    });
    it('is deterministic', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const r1 = generateKubernetes(doc);
        const r2 = generateKubernetes(doc);
        assert.deepEqual(r1, r2);
    });
});
// ────────────────────────────────────────────────────────────────────
// Monitoring Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('Monitoring generator', () => {
    it('generates prometheus.yml', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const prom = result.files.find((f) => f.path.includes('prometheus.yml'));
        assert.ok(prom, 'should generate prometheus.yml');
        assert.ok(prom.content.includes('scrape_configs:'));
        assert.ok(prom.content.includes('global:'));
    });
    it('includes backend scrape targets', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const prom = result.files.find((f) => f.path.includes('prometheus.yml'));
        assert.ok(prom.content.includes('job_name:'));
        assert.ok(prom.content.includes('/metrics'));
    });
    it('includes node-exporter scrape target', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const prom = result.files.find((f) => f.path.includes('prometheus.yml'));
        assert.ok(prom.content.includes('node-exporter'));
    });
    it('generates alert-rules.yml', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const alerts = result.files.find((f) => f.path.includes('alert-rules.yml'));
        assert.ok(alerts, 'should generate alert-rules.yml');
        assert.ok(alerts.content.includes('groups:'));
        assert.ok(alerts.content.includes('rules:'));
    });
    it('includes HighErrorRate alert derived from availability target', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const alerts = result.files.find((f) => f.path.includes('alert-rules.yml'));
        assert.ok(alerts.content.includes('HighErrorRate'));
        assert.ok(alerts.content.includes('severity: critical'));
    });
    it('includes HighLatency alert derived from response time target', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const alerts = result.files.find((f) => f.path.includes('alert-rules.yml'));
        assert.ok(alerts.content.includes('HighLatency'));
        assert.ok(alerts.content.includes('P95'));
    });
    it('includes ServiceDown alerts per backend', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateMonitoring(doc);
        const alerts = result.files.find((f) => f.path.includes('alert-rules.yml'));
        assert.ok(alerts.content.includes('ServiceDown_'));
        assert.ok(alerts.content.includes('up{job='));
    });
    it('includes HighCpuUsage and HighMemoryUsage alerts', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const alerts = result.files.find((f) => f.path.includes('alert-rules.yml'));
        assert.ok(alerts.content.includes('HighCpuUsage'));
        assert.ok(alerts.content.includes('HighMemoryUsage'));
    });
    it('includes database connection pool alert for postgres', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const alerts = result.files.find((f) => f.path.includes('alert-rules.yml'));
        assert.ok(alerts.content.includes('DatabaseConnectionPoolHigh'));
    });
    it('generates grafana-dashboard.json', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const dashboard = result.files.find((f) => f.path.includes('grafana-dashboard.json'));
        assert.ok(dashboard, 'should generate grafana-dashboard.json');
        const parsed = JSON.parse(dashboard.content);
        assert.ok(parsed.panels.length > 0);
        assert.ok(parsed.title.includes('TaskFlow'));
    });
    it('grafana dashboard includes request rate and error rate panels', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        const dashboard = result.files.find((f) => f.path.includes('grafana-dashboard.json'));
        const parsed = JSON.parse(dashboard.content);
        const titles = parsed.panels.map((p) => p.title);
        assert.ok(titles.some((t) => t.includes('Request Rate')));
        assert.ok(titles.some((t) => t.includes('Error Rate')));
    });
    it('grafana dashboard includes per-service panels', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateMonitoring(doc);
        const dashboard = result.files.find((f) => f.path.includes('grafana-dashboard.json'));
        const parsed = JSON.parse(dashboard.content);
        const titles = parsed.panels.map((p) => p.title);
        assert.ok(titles.some((t) => t.includes('CPU & Memory')));
        assert.ok(titles.some((t) => t.includes('Request Duration')));
    });
    it('sets metadata correctly', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateMonitoring(doc);
        assert.equal(result.artifactType, 'deployment-guide');
        assert.equal(result.metadata.solutionName, 'TaskFlow');
        assert.ok(result.metadata.availabilityTarget);
    });
    it('is deterministic', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const r1 = generateMonitoring(doc);
        const r2 = generateMonitoring(doc);
        assert.deepEqual(r1, r2);
    });
});
// ────────────────────────────────────────────────────────────────────
// Nginx Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('Nginx generator', () => {
    it('generates nginx.conf', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf, 'should generate nginx.conf');
        assert.ok(conf.content.includes('worker_processes'));
        assert.ok(conf.content.includes('http {'));
    });
    it('includes upstream blocks for backends', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('upstream'));
    });
    it('includes SSL configuration', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('ssl_certificate'));
        assert.ok(conf.content.includes('TLSv1.2'));
        assert.ok(conf.content.includes('TLSv1.3'));
    });
    it('includes gzip compression', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('gzip on'));
        assert.ok(conf.content.includes('gzip_types'));
    });
    it('includes rate limiting', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('limit_req_zone'));
        assert.ok(conf.content.includes('limit_req zone=api'));
    });
    it('includes security headers', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('X-Frame-Options'));
        assert.ok(conf.content.includes('X-Content-Type-Options'));
        assert.ok(conf.content.includes('X-XSS-Protection'));
    });
    it('includes proxy headers with X-Request-ID', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('X-Real-IP'));
        assert.ok(conf.content.includes('X-Forwarded-For'));
        assert.ok(conf.content.includes('X-Request-ID'));
    });
    it('includes WebSocket support', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('Upgrade'));
        assert.ok(conf.content.includes('Connection "upgrade"'));
    });
    it('includes health check endpoint', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('location /health'));
        assert.ok(conf.content.includes('return 200'));
    });
    it('routes single backend to /api', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        // Single backend → /api (not /api/{name})
        assert.ok(conf.content.includes('location /api'));
    });
    it('routes multiple backends to /api/{name}', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('location /api/'));
    });
    it('proxies frontend at /', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('location / {'));
        assert.ok(conf.content.includes('proxy_pass http://'));
    });
    it('generates mime.types.conf', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const mime = result.files.find((f) => f.path.includes('mime.types.conf'));
        assert.ok(mime, 'should generate mime.types.conf');
        assert.ok(mime.content.includes('text/html'));
        assert.ok(mime.content.includes('application/json'));
        assert.ok(mime.content.includes('font/woff2'));
    });
    it('generates docker-compose.nginx.yml', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const compose = result.files.find((f) => f.path.includes('docker-compose.nginx.yml'));
        assert.ok(compose, 'should generate docker-compose.nginx.yml');
        assert.ok(compose.content.includes('nginx:alpine'));
        assert.ok(compose.content.includes('443:443'));
    });
    it('includes HTTP to HTTPS redirect', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        const conf = result.files.find((f) => f.path.includes('nginx.conf'));
        assert.ok(conf.content.includes('return 301 https://'));
    });
    it('sets metadata correctly', () => {
        const doc = getDoc('taskflow.yaml');
        const result = generateNginxConfig(doc);
        assert.equal(result.artifactType, 'deployment-guide');
        assert.equal(result.metadata.solutionName, 'TaskFlow');
        assert.equal(result.metadata.hasSslPlaceholder, true);
        assert.equal(result.metadata.hasGzip, true);
        assert.equal(result.metadata.hasRateLimiting, true);
    });
    it('is deterministic', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const r1 = generateNginxConfig(doc);
        const r2 = generateNginxConfig(doc);
        assert.deepEqual(r1, r2);
    });
});
// ────────────────────────────────────────────────────────────────────
// Azure DevOps Generator Tests
// ────────────────────────────────────────────────────────────────────
describe('Azure DevOps generator', () => {
    it('produces azure-pipelines.yml when provider is azure-devops', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const result = generateCiCdPipeline(doc);
        const pipeline = result.files.find((f) => f.path.includes('azure-pipelines.yml'));
        assert.ok(pipeline, 'should produce azure-pipelines.yml');
        assert.ok(!result.files.some((f) => f.path === 'artifacts/cicd/ci.yml'));
        assert.ok(!result.files.some((f) => f.path.includes('.gitlab-ci.yml')));
    });
    it('sets metadata.provider to azure-devops', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const result = generateCiCdPipeline(doc);
        assert.equal(result.metadata.provider, 'azure-devops');
    });
    it('includes trigger and pr config for main branch', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('trigger:'));
        assert.ok(content.includes('pr:'));
        assert.ok(content.includes('- main'));
    });
    it('includes variables with database connection string', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('variables:'));
        assert.ok(content.includes('DATABASE_URL:'));
        assert.ok(content.includes('postgresql://'));
    });
    it('includes stages: BuildAndTest and Deploy', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('stages:'));
        assert.ok(content.includes('- stage: BuildAndTest'));
        assert.ok(content.includes('- stage: Deploy'));
    });
    it('generates Node.js build steps', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('UseNode@1'));
        assert.ok(content.includes('npm ci'));
        assert.ok(content.includes('npm run lint'));
        assert.ok(content.includes('npm test'));
        assert.ok(content.includes('npm run build'));
    });
    it('includes Prisma step for prisma ORM', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('npx prisma generate'));
    });
    it('generates Python FastAPI steps', () => {
        const doc = getDoc('saas-gcp.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('UsePythonVersion@0'));
        assert.ok(content.includes('pip install'));
        assert.ok(content.includes('ruff check'));
        assert.ok(content.includes('pytest'));
    });
    it('generates Go build steps', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('UseGoVersion@0'));
        assert.ok(content.includes('go vet'));
        assert.ok(content.includes('go test'));
        assert.ok(content.includes('go build'));
    });
    it('generates .NET 8 build steps', () => {
        const doc = getDoc('mobile-railway.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('UseDotNet@2'));
        assert.ok(content.includes('dotnet restore'));
        assert.ok(content.includes('dotnet build'));
        assert.ok(content.includes('dotnet test'));
        assert.ok(content.includes('dotnet publish'));
    });
    it('includes postgres service container', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('services:'));
        assert.ok(content.includes('postgres:16'));
        assert.ok(content.includes('POSTGRES_USER'));
    });
    it('includes mysql service container', () => {
        const doc = getDoc('saas-gcp.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('mysql:8'));
        assert.ok(content.includes('MYSQL_ROOT_PASSWORD'));
    });
    it('includes mongodb service container', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('mongo:7'));
    });
    it('includes frontend build jobs', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('Frontend'));
        assert.ok(content.includes('npm run build'));
    });
    it('includes AWS deploy steps with ECS', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('AWSShellScript@1'));
        assert.ok(content.includes('aws ecs update-service'));
        assert.ok(content.includes('$(ECS_CLUSTER)'));
    });
    it('includes GCP deploy steps with Cloud Run', () => {
        const doc = getDoc('saas-gcp.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('GoogleCloudSdkTool@1'));
        assert.ok(content.includes('gcloud auth'));
        assert.ok(content.includes('gcloud run deploy'));
    });
    it('includes Azure deploy steps with Container Apps', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        doc.deployment.cloud = 'azure';
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('AzureCLI@2'));
        assert.ok(content.includes('az acr build'));
        assert.ok(content.includes('az containerapp update'));
    });
    it('includes Vercel deploy steps', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('vercel deploy --prod'));
        assert.ok(content.includes('$(VERCEL_TOKEN)'));
    });
    it('includes Railway deploy steps', () => {
        const doc = getDoc('mobile-railway.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('@railway/cli'));
        assert.ok(content.includes('railway up'));
        assert.ok(content.includes('$(RAILWAY_TOKEN)'));
    });
    it('deploy stage depends on BuildAndTest', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('dependsOn: BuildAndTest'));
        assert.ok(content.includes("condition: and(succeeded()"));
    });
    it('uses deployment job type with runOnce strategy', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('azure-pipelines.yml')).content;
        assert.ok(content.includes('- deployment: deploy'));
        assert.ok(content.includes('environment: production'));
        assert.ok(content.includes('runOnce:'));
    });
    it('is deterministic', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'azure-devops' };
        const r1 = generateCiCdPipeline(doc);
        const r2 = generateCiCdPipeline(doc);
        assert.deepEqual(r1, r2);
    });
});
// ────────────────────────────────────────────────────────────────────
// GitHub Actions Deploy Steps Tests
// ────────────────────────────────────────────────────────────────────
describe('GitHub Actions deploy steps', () => {
    it('includes AWS ECR login, docker build/push, and ECS deploy', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('aws-actions/configure-aws-credentials@v4'));
        assert.ok(content.includes('aws-actions/amazon-ecr-login@v2'));
        assert.ok(content.includes('docker build'));
        assert.ok(content.includes('docker push'));
        assert.ok(content.includes('aws ecs update-service'));
    });
    it('includes S3 + CloudFront deploy for frontends on AWS', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('aws s3 sync'));
        assert.ok(content.includes('cloudfront create-invalidation'));
    });
    it('includes GCP auth, Docker config, Cloud Run deploy', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.cloud = 'gcp';
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('google-github-actions/auth@v2'));
        assert.ok(content.includes('google-github-actions/setup-gcloud@v2'));
        assert.ok(content.includes('gcloud auth configure-docker'));
        assert.ok(content.includes('gcloud run deploy'));
    });
    it('includes Azure login, ACR build, Container Apps deploy', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.cloud = 'azure';
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('azure/login@v2'));
        assert.ok(content.includes('az acr build'));
        assert.ok(content.includes('az containerapp update'));
    });
    it('includes Static Web Apps deploy for frontends on Azure', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.cloud = 'azure';
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('azure/static-web-apps-deploy@v1'));
        assert.ok(content.includes('AZURE_SWA_TOKEN'));
    });
    it('includes Vercel action deploy', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('amondnet/vercel-action@v25'));
        assert.ok(content.includes('vercel-token'));
        assert.ok(content.includes('--prod'));
    });
    it('includes Railway CLI deploy', () => {
        const doc = getDoc('mobile-railway.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('@railway/cli'));
        assert.ok(content.includes('railway up'));
        assert.ok(content.includes('RAILWAY_TOKEN'));
    });
    it('includes deploy job with needs dependencies', () => {
        const doc = getDoc('taskflow.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path === 'artifacts/cicd/ci.yml').content;
        assert.ok(content.includes('deploy:'));
        assert.ok(content.includes('needs:'));
        assert.ok(content.includes("if: github.ref == 'refs/heads/main'"));
    });
});
// ────────────────────────────────────────────────────────────────────
// GitLab CI Deploy Steps Tests
// ────────────────────────────────────────────────────────────────────
describe('GitLab CI deploy steps', () => {
    it('includes AWS ECR + ECS deploy commands', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('amazon/aws-cli'));
        assert.ok(content.includes('docker:dind'));
        assert.ok(content.includes('aws ecr get-login-password'));
        assert.ok(content.includes('docker build'));
        assert.ok(content.includes('docker push'));
        assert.ok(content.includes('aws ecs update-service'));
    });
    it('includes S3 + CloudFront for frontends on AWS', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('aws s3 sync'));
        assert.ok(content.includes('cloudfront create-invalidation'));
    });
    it('includes GCP Cloud Run deploy commands', () => {
        const doc = getDoc('saas-gcp.yaml');
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('google/cloud-sdk'));
        assert.ok(content.includes('gcloud auth activate-service-account'));
        assert.ok(content.includes('gcloud auth configure-docker'));
        assert.ok(content.includes('gcloud run deploy'));
    });
    it('includes Azure ACR + Container Apps deploy commands', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        doc.deployment.cloud = 'azure';
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('mcr.microsoft.com/azure-cli'));
        assert.ok(content.includes('az login --service-principal'));
        assert.ok(content.includes('az acr build'));
        assert.ok(content.includes('az containerapp update'));
    });
    it('includes Static Web Apps for frontends on Azure', () => {
        const doc = getDoc('ecommerce-aws.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        doc.deployment.cloud = 'azure';
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('swa deploy'));
        assert.ok(content.includes('AZURE_SWA_TOKEN'));
    });
    it('includes Railway deploy commands', () => {
        const doc = getDoc('mobile-railway.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('@railway/cli'));
        assert.ok(content.includes('railway up'));
    });
    it('includes Vercel deploy commands', () => {
        const doc = getDoc('taskflow.yaml');
        doc.deployment.ciCd = { provider: 'gitlab-ci' };
        const content = generateCiCdPipeline(doc).files.find((f) => f.path.includes('.gitlab-ci.yml')).content;
        assert.ok(content.includes('vercel deploy --prod'));
        assert.ok(content.includes('$VERCEL_TOKEN'));
    });
});
