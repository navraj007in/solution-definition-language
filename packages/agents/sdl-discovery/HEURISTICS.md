# SDL Discovery Agent — Component Detection Heuristics

This document details the observable patterns and signals the SDL Discovery Agent uses to detect and classify software components.

## Service Detection

A directory or repository is **likely a deployable service** if it exhibits several of these signals:

### Strong Signals (High Confidence)
- **Startup entrypoint file:**
  - `src/main.go`, `src/main.rs`
  - `src/Program.cs`, `Program.cs`
  - `src/index.ts`, `src/index.js`, `app.js`, `server.js`
  - `app.py`, `main.py`, `wsgi.py`
  - `bin/` or `src/bin/` entry
  - `Procfile` or `procfile` with web/api target

- **Dockerfile:**
  - Service container image definition
  - Deployment artifact

- **Deployment manifest:**
  - `kubernetes.yaml`, `k8s.yaml`
  - `docker-compose.yml` with service entry
  - `terraform/*.tf` with compute resource

### Medium Signals (Medium Confidence)
- **Route/controller definitions:**
  - Express routes (`app.get()`, `app.post()`)
  - Spring controllers (`@RestController`, `@Controller`)
  - FastAPI decorators (`@app.get()`, `@app.post()`)
  - ASP.NET controllers (`[ApiController]`)
  - Next.js pages in `pages/api/` or `app/` (App Router)
  - Rails routes in `config/routes.rb`

- **CI/CD deployment step:**
  - GitHub Actions workflow step pushing to Docker registry or deploying
  - Azure DevOps pipeline with deployment stage
  - GitLab CI `deploy` job targeting production/staging

- **Environment configuration:**
  - `.env.example` with service-specific vars (PORT, DATABASE_URL, API_KEY)
  - `appsettings.json`, `appsettings.Production.json`
  - `application.yaml`, `application.yml`
  - `.env` file (if not ignored)

- **Manifest with framework:**
  - `package.json` with `express`, `fastify`, `http` or web server dependency
  - `go.mod` with `gorilla/mux`, `gin`, `echo`
  - `.csproj` with `Microsoft.AspNetCore`

### Weak Signals (Lower Confidence)
- **Naming convention:**
  - Repo or directory named `*-service`, `*-api`, `*-server`
  - Folder path contains `services/` or `apis/`

- **README mentions:**
  - "service", "API", "application", "starts with", "runs on port"

**Scoring Rule:** Service likelihood = (entrypoint × 0.4) + (dockerfile × 0.3) + (routes × 0.2) + (env_config × 0.1)

---

## Library Detection

A directory or package is **likely a shared library** if:

### Strong Signals
- **Referenced as dependency:**
  - Listed in `package.json` → `dependencies` or `devDependencies` by other packages
  - Listed in `go.mod` → `require` by other modules
  - Listed in `Cargo.toml` → `dependencies` by other crates
  - Maven/Gradle dependency in `pom.xml` or `build.gradle`

- **No standalone entrypoint:**
  - No `main.go`, `Program.cs`, `index.js` in root or `src/`
  - No Dockerfile
  - No deployment manifest

### Medium Signals
- **Reusable abstractions:**
  - `src/utils/`, `lib/`, `src/lib/` folder structure
  - SDK or client library naming (`sdk-*`, `*-client`, `*-lib`)
  - Exports utility functions, types, components, models

- **Workspace member:**
  - Listed in `pnpm-workspace.yaml` → `packages`
  - Listed in `yarn-workspaces`
  - Gradle subproject without deployment target

**Scoring Rule:** Library likelihood = (has_dependents × 0.5) + (no_entrypoint × 0.3) + (utilities_structure × 0.2)

---

## Frontend Detection

A directory is **likely a frontend** if:

### Strong Signals
- **Framework dependency:**
  - `package.json` contains: `react`, `next`, `angular`, `vue`, `svelte`, `gatsby`, `nuxt`, `remix`, `astro`
  - `angular.json` present (Angular CLI)
  - `nuxt.config.ts` or `nuxt.config.js` present

- **Asset structure:**
  - `pages/` or `src/pages/` directory (Next.js, Nuxt, SvelteKit)
  - `public/` directory with static assets
  - `src/components/` directory (React pattern)
  - `src/views/` or `app/views/` (Vue pattern)
  - `assets/` directory with images, styles

- **Build tooling:**
  - `vite.config.ts`, `vite.config.js`
  - `webpack.config.js`
  - `angular.json`
  - `gatsby-config.js`
  - `next.config.js`

- **Deployment:**
  - Deployed to CDN (Vercel, Netlify, Cloudflare Pages)
  - Dockerfile with node build + lightweight server (nginx, caddy)
  - GitHub Actions workflow pushing to static host

### Medium Signals
- **CSS/styling:**
  - `tailwind.config.js`, `postcss.config.js`
  - `styles/` or `src/styles/` directory
  - `.scss`, `.less` files

- **Browser-oriented:**
  - `index.html` with script tag in root
  - Manifest file (`public/manifest.json`)
  - Service worker (`public/sw.js`, `src/service-worker.ts`)

---

## Worker / Background Job Detection

A directory is **likely a worker or job consumer** if:

### Strong Signals
- **Queue/event consumer library:**
  - `package.json` contains: `kafka`, `rabbitmq`, `bull`, `bee-queue`, `sqs`, `celery`
  - `go.mod` contains: `segmentio/kafka-go`, `streadway/amqp`
  - Python `celery`, `rq`, `dramatiq`
  - .NET `MassTransit`, `NServiceBus`

- **Consumer registration code:**
  - `consumer.listen()`, `queue.process()`, `@Consumer` decorator
  - Topic/queue name references in code

- **Cron/scheduler:**
  - `node-cron`, `node-schedule`, `cron` (Node.js)
  - `APScheduler`, `schedule` (Python)
  - Quartz, Spring Scheduler (Java)
  - Timer, BackgroundService (C#)

- **Dockerfile without HTTP listener:**
  - No `EXPOSE 80`, `EXPOSE 3000`, `EXPOSE 8080`
  - Starts with `node script.js`, `python worker.py`, `go run worker.go`

### Medium Signals
- **Naming:**
  - Repo/directory named `*-worker`, `*-consumer`, `*-job`, `*-scheduler`
  - `jobs/`, `workers/`, `consumers/` folder structure

- **Scheduled deployment:**
  - CI/CD job scheduled with cron expression
  - CloudWatch Events, EventBridge, k8s CronJob target in manifest

---

## Data Store Detection

A directory contains **data store infrastructure** if:

### Strong Signals
- **Database client package:**
  - **SQL:** `pg`, `mysql2`, `sqlite3`, `sql-server`, `oracledb`
  - **ORM:** `typeorm`, `sequelize`, `prisma`, `knex`, `sqlalchemy`, `django-orm`
  - **NoSQL:** `mongodb`, `mongoose`, `dynamodb`, `firestore`, `redis`

- **Connection string in config:**
  - `DATABASE_URL=postgres://...` in `.env.example`
  - `ConnectionString` in `appsettings.json`
  - `db:` section in `docker-compose.yml`
  - `RDS` resource in Terraform

- **Migration files:**
  - `migrations/` folder with SQL or migration definitions
  - `db/migrate/` (Rails pattern)
  - `src/migrations/` (TypeORM pattern)
  - Schema definition files

- **Repository pattern:**
  - `src/repositories/`, `src/data/`, `src/models/` folders
  - Repository/DAO classes or interfaces

### Medium Signals
- **ORM configuration:**
  - `ormconfig.json`, `ormconfig.yaml`
  - Sequelize config in `.sequelizerc`
  - Prisma `schema.prisma`
  - Django `models.py`, `settings.py`

- **Infrastructure declaration:**
  - Terraform `resource "aws_db_instance"`, `resource "aws_rds_cluster"`
  - Kubernetes StatefulSet with persistent volume
  - Docker Compose `services:` entry for `postgres`, `mysql`, `mongo`, `redis`

---

## Messaging System Detection

A directory uses **messaging/queue infrastructure** if:

### Strong Signals
- **Message queue SDK:**
  - `kafka`, `rabbitmq`, `amqp`, `aws-sdk` (SQS/SNS), `google-cloud-pubsub`
  - `go.mod` with `confluent-kafka`, `streadway/amqp`, `aws-sdk-go`
  - Python `pika` (RabbitMQ), `confluent-kafka`, `aiokafka`

- **Consumer/publisher registration:**
  - `queue.on()`, `queue.process()`, `subscribe()`, `publish()`
  - `@Consumer`, `@Producer`, `@KafkaListener` decorators
  - Topic/queue name definitions in code

- **Event contract files:**
  - `events/`, `messages/` folder with type definitions
  - AsyncAPI schema file (`asyncapi.yaml`)
  - Event class definitions

### Medium Signals
- **Infrastructure declaration:**
  - `docker-compose.yml` with `kafka`, `rabbitmq`, `redis` service
  - Kubernetes `Service` and `StatefulSet` for messaging
  - Terraform resource for SQS, SNS, Event Bridge, Pub/Sub

- **Naming convention:**
  - Folder/file named `*-consumer`, `*-producer`, `*-event`, `*-message`
  - `pubsub/`, `events/`, `messaging/` directories

---

## Authentication & Authorization Detection

A service **uses specific auth strategy** if:

### JWT / Token-Based
- **Strong signals:**
  - `jsonwebtoken`, `jwt-decode`, `pyjwt` package
  - JWT validation middleware: `verify()`, `decode()`, `validateToken()`
  - Token storage references: `localStorage`, `sessionStorage`, `.http-only cookie`
  - `Authorization: Bearer` header usage

- **Medium signals:**
  - Environment vars like `JWT_SECRET`, `JWT_PRIVATE_KEY`, `JWT_EXPIRY`
  - Config key: `auth: { tokenType: jwt }`

### OAuth 2.0 / OpenID Connect
- **Strong signals:**
  - `oauth2`, `openid-client`, `oidc-client-js` package
  - `/oauth/authorize`, `/oauth/callback` routes
  - `redirect_uri`, `client_id`, `client_secret` config

- **Medium signals:**
  - Service named `auth-service`, `oauth-provider`
  - `OAuth2` in code comments or class names

### Managed Auth Providers
- **Auth0:** `@auth0/auth0-react`, `@auth0/nextjs-auth0`, `auth0` SDK
- **Okta:** `@okta/okta-auth-js`, `okta-sdk`
- **Cognito:** `amazon-cognito-identity-js`, `@aws-amplify/auth`
- **Entra/AAD:** `@azure/msal-browser`, `@azure/identity`
- **Firebase:** `firebase`, `firebase-admin`

### Session-Based
- **Strong signals:**
  - `express-session`, `flask-session`, `django.contrib.sessions`
  - Session store: Redis, database, memory
  - Cookie-based session middleware

---

## External Integration Detection

A service **integrates with external APIs** if:

### Strong Signals
- **Third-party SDK:**
  - `stripe`, `twilio`, `sendgrid`, `slack`, `github`, `datadog`, `sentry`
  - `@aws-sdk`, `@google-cloud`, `azure-sdk`
  - Service-specific SDK import

- **Webhook endpoint:**
  - Route: `/webhooks/*`, `/api/webhooks/*`
  - Request handler: `handleWebhook()`, `processWebhook()`

- **Configuration:**
  - Environment vars: `STRIPE_API_KEY`, `TWILIO_AUTH_TOKEN`, `SLACK_BOT_TOKEN`
  - Config section for external service

### Medium Signals
- **HTTP client to external URL:**
  - API call to `api.stripe.com`, `api.slack.com`, `*.googleapis.com`
  - Documented in code comments or README

- **API key/credential storage:**
  - `.env.example` mentioning provider name
  - Secrets manager integration: AWS Secrets Manager, Azure Key Vault

---

## Technology Stack Inference

### Runtime Detection
- **Node.js:** `package.json` present, no other runtime marker
- **Python:** `requirements.txt`, `pyproject.toml`, `app.py`
- **Go:** `go.mod`, `main.go`
- **.NET:** `.csproj`, `.sln`, `Program.cs`
- **Java/Kotlin:** `pom.xml`, `build.gradle`, `settings.gradle`
- **Rust:** `Cargo.toml`, `src/main.rs`
- **Ruby:** `Gemfile`, `Rakefile`, `config/environment.rb`

### Framework Detection
Scan `package.json` → `dependencies` or language-equivalent:
- **Web:** express, fastify, nest, hapi, koa, django, flask, spring, actix, axum
- **Frontend:** react, vue, angular, svelte, next, nuxt, gatsby
- **ORM:** prisma, typeorm, sequelize, sqlalchemy, hibernate, entity-framework
- **Database:** pg, mysql2, mongodb, redis, dynamodb
- **Testing:** jest, mocha, pytest, unittest, vitest
- **API:** graphql, apollo, grpc, rest

---

## Deployment Target Detection

### Cloud Provider
- **AWS:** ECR, S3, Lambda, RDS, DynamoDB references; `@aws-sdk`
- **Azure:** Azure Container Registry, App Service; `@azure/` packages
- **Google Cloud:** Artifact Registry, Cloud Run, Cloud SQL; `@google-cloud/` packages
- **Heroku:** `Procfile`, `heroku.yml`
- **Netlify:** `netlify.toml`
- **Vercel:** `vercel.json`

### Orchestration
- **Kubernetes:** YAML manifests, `kubernetes/`, `k8s/`, Helm charts
- **Docker Compose:** `docker-compose.yml`, `docker-compose.yaml`
- **Serverless:** `serverless.yml`, AWS SAM, Azure Functions config

### CI/CD Platform
- **GitHub Actions:** `.github/workflows/*.yaml`
- **GitLab CI:** `.gitlab-ci.yml`
- **Azure DevOps:** `azure-pipelines.yaml`, `azure-pipelines.yml`
- **Jenkins:** `Jenkinsfile`
- **CircleCI:** `.circleci/config.yml`

---

## Confidence Adjustment Rules

When combining multiple signals, adjust confidence:

- **Multiple signals from same category:** +0.1 confidence
- **Signals from different categories:** +0.15 confidence (they corroborate)
- **Contradicting signals:** Lower confidence of both, flag for review
- **Signal from high-trust source (manifest):** Confidence = high
- **Signal from code pattern only:** Confidence = medium or low

**Example:**
- Dockerfile (high-trust) + routes (medium) + env config (medium) = HIGH confidence service
- Naming hint ("service") + weak SDK reference = LOW confidence

---

## Review Flags

The agent flags for human review when:

- **Ambiguity:** Evidence could support multiple interpretations
- **Conflict:** Deployment manifest says one thing, code suggests another
- **Low confidence:** Primary signals are weak or pattern-based
- **Dead code:** Repo appears stale or abandoned
- **Unclear boundaries:** Multiple possible component divisions
- **Missing evidence:** Expected files are absent or unreadable

---

## Customization

Users can provide hints to adjust detection:

```bash
--domain_hints "auth-service=authentication,web-app=presentation"
--environment_hints "dev=localhost,staging=staging.example.com,prod=api.example.com"
--ignore_patterns "node_modules/**,*.test.js,docs/**"
```

These hints are applied **after** evidence-based detection to refine inferred relationships.
