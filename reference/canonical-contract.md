# SDL Canonical Contract

This document is the canonical naming reference for the active SDL `v1.1` contract.

Use it for:

- valid enum values
- valid registry-backed artifact types
- alias and deprecation policy
- stable root section shapes

For the support level of each section (schema strictness, normalization, generator consumption, maturity), see [`reference/section-support.md`](section-support.md).

If any other prose example conflicts with this file, follow this file, the active JSON schema, and the exported runtime types in `packages/sdl/src/types.ts`.

## Authority Order

For the active `v1.1` contract, use these sources in order:

1. `reference/canonical-contract.md`
2. `packages/sdl/src/schema/sdl-v1.1.schema.json`
3. `packages/sdl/src/types.ts`
4. `spec/SDL-v1.1.md`

## Required Root Fields

These root fields are always required:

- `sdlVersion`
- `solution`
- `architecture`
- `data`

## Stable Root Section Shapes

These are the currently stable root section shapes:

| Section | Canonical Shape |
|---|---|
| `solution` | object |
| `product` | object |
| `architecture` | object |
| `auth` | object |
| `data` | object |
| `integrations` | object |
| `nonFunctional` | object |
| `deployment` | object |
| `constraints` | object |
| `testing` | object |
| `observability` | object |
| `artifacts` | object |
| `techDebt` | array |
| `technicalDebt` | array |
| `contracts` | object with `apis` array |
| `domain` | object |
| `features` | array |
| `compliance` | object |
| `slos` | object |
| `resilience` | object |
| `costs` | object |
| `backupDr` | object |
| `design` | object |

Use `x-` extension fields for richer metadata that is not part of the stable contract.

## Canonical Enums

### `solution.stage`

- `MVP`
- `Growth`
- `Enterprise`

### `architecture.style`

- `modular-monolith`
- `microservices`
- `serverless`

### `architecture.projects.frontend[].type`

- `web`
- `mobile-web`
- `admin`

### `architecture.projects.frontend[].framework`

- `nextjs`
- `react`
- `vue`
- `angular`
- `svelte`
- `solid`

### `architecture.projects.frontend[].rendering`

- `ssr`
- `ssg`
- `spa`

### `architecture.projects.frontend[].stateManagement`

- `context`
- `redux`
- `zustand`
- `mobx`
- `none`

### `architecture.projects.frontend[].styling`

- `tailwind`
- `css-modules`
- `styled-components`
- `sass`
- `emotion`

### `architecture.projects.backend[].type`

- `backend`
- `worker`
- `function`

### `architecture.projects.backend[].framework`

- `dotnet-8`
- `nodejs`
- `python-fastapi`
- `go`
- `java-spring`
- `ruby-rails`
- `php-laravel`

### `architecture.projects.backend[].apiStyle`

- `rest`
- `graphql`
- `grpc`
- `mixed`

### `architecture.projects.backend[].orm`

- `ef-core`
- `prisma`
- `typeorm`
- `sqlalchemy`
- `gorm`
- `sequelize`
- `mongoose`

### `architecture.projects.backend[].apiVersioning`

- `url-prefix`
- `header`
- `query-param`
- `none`

### `architecture.projects.mobile[].platform`

- `ios`
- `android`
- `cross-platform`

### `architecture.projects.mobile[].framework`

- `react-native`
- `flutter`
- `swift`
- `kotlin`
- `ionic`

### `architecture.services[].kind`

- `backend`
- `worker`
- `function`
- `api-gateway`

### `auth.strategy`

- `oidc`
- `passwordless`
- `magic-link`
- `api-key`
- `none`

### `auth.provider`

- `cognito`
- `auth0`
- `entra-id`
- `entra-id-b2c`
- `firebase`
- `supabase`
- `clerk`
- `custom`

### `auth.sessions.accessToken`

- `jwt`
- `opaque`

### `data.primaryDatabase.type`

- `postgres`
- `mysql`
- `sqlserver`
- `mongodb`
- `dynamodb`
- `cockroachdb`
- `planetscale`

### `data.primaryDatabase.hosting`

- `managed`
- `self-hosted`
- `serverless`

### `data.cache.type`

- `redis`
- `memcached`
- `none`

### `data.queues.provider`

- `rabbitmq`
- `azure-service-bus`
- `sqs`
- `kafka`
- `redis`

### `data.search.provider`

- `elasticsearch`
- `algolia`
- `typesense`
- `azure-search`
- `meilisearch`
- `pinecone`
- `qdrant`
- `weaviate`

### `deployment.cloud`

- `azure`
- `aws`
- `gcp`
- `cloudflare`
- `vercel`
- `railway`
- `render`
- `fly-io`

### `deployment.runtime.frontend`

- `static-web-apps`
- `vercel`
- `cloudflare-pages`
- `s3+cloudfront`
- `app-service`
- `netlify`

### `deployment.runtime.backend`

- `container-apps`
- `ecs`
- `cloud-run`
- `kubernetes`
- `app-service`
- `lambda`
- `cloud-functions`

### `deployment.ciCd.provider`

- `github-actions`
- `gitlab-ci`
- `azure-devops`
- `circleci`
- `jenkins`

### `deployment.infrastructure.iac`

- `terraform`
- `bicep`
- `pulumi`
- `cdk`
- `cloudformation`

### `constraints.budget`

- `startup`
- `scaleup`
- `enterprise`
- `custom`

### `testing.unit.framework`

- `jest`
- `vitest`
- `pytest`
- `xunit`
- `go-test`
- `junit`
- `rspec`
- `phpunit`

### `testing.e2e.framework`

- `playwright`
- `cypress`
- `selenium`
- `none`

### `observability.logging.provider`

- `pino`
- `winston`
- `serilog`
- `zerolog`
- `log4j`
- `structured`

### `observability.tracing.provider`

- `opentelemetry`
- `jaeger`
- `zipkin`
- `xray`
- `none`

### `observability.metrics.provider`

- `prometheus`
- `datadog`
- `cloudwatch`
- `grafana`
- `none`

## Registry-Backed Artifact Types

These are the valid values for `artifacts.generate[]` and for `generate()` / `generateAll()`:

- `architecture-diagram`
- `sequence-diagrams`
- `openapi`
- `data-model`
- `repo-scaffold`
- `iac-skeleton`
- `backlog`
- `adr`
- `deployment-guide`
- `cost-estimate`
- `coding-rules`
- `coding-rules-enforcement`

## Direct Generator APIs

These outputs are supported by direct generator exports, but are not currently valid `ArtifactType` registry values:

- Docker Compose
- Kubernetes
- Monitoring
- Nginx
- Deploy Diagram

## Alias And Deprecation Policy

### Stable Policy

The active `v1.1` validator is strict:

- canonical values are accepted
- unknown fields are rejected unless prefixed with `x-`
- deprecated aliases are not silently normalized

In other words, SDL currently prefers rejection over implicit alias handling.

### Deprecated Or Rejected Legacy Forms

These forms are not part of the stable `v1.1` contract:

| Legacy Form | Status | Use Instead |
|---|---|---|
| `stage: mvp` | rejected | `stage: MVP` |
| `stage: growth` | rejected | `stage: Growth` |
| `stage: enterprise` | rejected | `stage: Enterprise` |
| frontend `framework: next` | rejected | `framework: nextjs` |
| backend `framework: express` | rejected | `framework: nodejs` |
| backend `framework: fastapi` | rejected | `framework: python-fastapi` |
| `auth.strategy: jwt` | rejected | `auth.strategy: oidc` or another canonical strategy; use `auth.sessions.accessToken: jwt` when describing token format |
| `auth.strategy: session-based` | rejected | choose a canonical strategy and place extra auth metadata in `x-` fields |
| `contracts` as an array | rejected | `contracts.apis: []` |
| `features` as a phase-keyed object | rejected | `features: []` and preserve richer planning data in `x-` extensions |
| `slos` as an array | rejected | `slos.services: []` |
| custom root sections like `navigationPatterns` or `interServiceCommunication` | rejected | prefix with `x-` |

### Forward Policy

If aliases are introduced in the future, they must follow all of these rules:

1. They must be explicitly documented here.
2. They must be tested.
3. They must normalize to one canonical stored form.
4. They must include a deprecation window and removal target.

Until then, new aliases should not be added casually.

## Practical Authoring Rules

When authoring new SDL:

1. Start from `sdlVersion: "1.1"`.
2. Use only the canonical names listed here.
3. Prefer the stable root section shapes listed here.
4. Put richer unsupported detail under `x-` fields instead of inventing new root shapes.
5. Treat older examples or generated `.d.ts` files as non-authoritative if they conflict with this file.
