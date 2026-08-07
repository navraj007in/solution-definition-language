# SDL Canonical Contract

This document is the canonical naming reference for the active SDL `v1.1` contract.

Use it for:

- valid enum values
- valid registry-backed artifact types
- alias and deprecation policy
- stable root section shapes

For the support level of each section (schema strictness, normalization, generator consumption, maturity), see [`reference/section-support.md`](section-support.md).

For the compact machine-first authoring guide (minimum valid document, normalization behaviour, rejected legacy values, common mistakes), see [`reference/ai-authoring.md`](ai-authoring.md).

If any other prose example conflicts with this file, follow `spec/SDL-v1.1.md` first, then this file, then the active JSON schema and exported runtime types in `packages/sdl/src/types.ts`.

## Authority Order

For the active `v1.1` contract, use these sources in order:

1. `spec/SDL-v1.1.md` — normative specification; if anything below conflicts, the spec wins
2. `reference/canonical-contract.md` — this document; quick-reference summary derived from the spec
3. `packages/sdl/src/schema/sdl-v1.1.schema.json` and `packages/sdl/src/types.ts` — machine-executable derivations of the spec; may lag during active development

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
| `evolution` | object |
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

### `imports` (root files only)

`imports` is an array and is the one root key that is **not** a document section. It is consumed by the resolver and stripped from the merged document before validation, so it never appears in a compiled SDL document. Full semantics in [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md) → *Modular SDL and Import Semantics*.

## Constrained Scalar Fields

Fields whose value is restricted beyond its type:

| Field | Constraint |
|---|---|
| `sdlVersion` | must be exactly `"1.1"` |
| `solution.name` | 3–50 characters, matching `^[a-zA-Z0-9\s\-_.]+$` — letters, digits, whitespace, hyphen, underscore, dot. Slashes, commas, and other punctuation are rejected |
| `architecture.errorConventions.status_mapping[].status` | integer in the range 100–599 |
| `resilience.circuitBreaker.threshold` | 1–99 (percent failure rate) |
| `resilience.retryPolicy.maxAttempts` | ≥ 1 |
| `slos.services[].availability` | percentage string between `90.0%` and `99.999%` |

## Stable Architecture Sub-Shapes

These nested shapes inside `architecture` are part of the stable `v1.1` contract:

| Sub-shape | Canonical Form |
|---|---|
| `architecture.projects` | object with `frontend[]`, `backend[]`, `mobile[]` arrays |
| `architecture.services` | array of service objects |
| `architecture.errorConventions` | optional `ErrorConventions` object (see [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md) → *Error Conventions*) |
| `architecture.sharedLibraries` | array |

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

All canonical values are **unversioned**. The runtime version belongs in `runtimeVersion`, never in the framework identifier.

- `dotnet`
- `nodejs`
- `python-fastapi`
- `go`
- `java-spring`
- `ruby-rails`
- `php-laravel`

Plus one deprecated alias, `dotnet-8` — see *Alias And Deprecation Policy* below.

### `architecture.projects.backend[].runtimeVersion`

Free-form string, e.g. `"10.0"` (.NET 10), `"22"` (Node 22), `"3.13"` (Python 3.13). Not enum-constrained: each ecosystem versions differently and SDL does not gate on toolchain currency.

It is **advisory** — no document is rejected for targeting an unusual version. It selects the container base images and CI toolchain versions the generators emit. When omitted, the generator default for that framework applies:

| Framework | Default `runtimeVersion` |
|---|---|
| `nodejs` | `22` |
| `python-fastapi` | `3.13` |
| `go` | `1.24` |
| `dotnet` | `10.0` |
| `java-spring` | `21` |
| `ruby-rails` | `3.4` |
| `php-laravel` | `8.4` |

Defaults live in `DEFAULT_RUNTIME_VERSION` in `packages/sdl/src/constants.ts`, which is the single source of truth for every version string the generators emit.

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

### `architecture.errorConventions.envelope.kind`

- `object`  (only valid value in v1.1; reserved for future shape extensions)

### `architecture.errorConventions.retry_policy.backoff`

- `exponential`
- `linear`
- `constant`

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
- `compliance-checklist`

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
- legacy forms are rejected outright unless they appear in the *normalized aliases* table below

SDL prefers rejection over implicit alias handling. Exactly **one** alias is normalized rather than rejected, and it exists only because the original value was a modeling mistake that would otherwise force a schema change on every vendor release.

### Normalized Aliases

These are accepted on input and rewritten by the normalizer. Each rewrite is reported as an `Inference` on the compile result, so nothing happens silently.

| Alias | Normalizes To | Removal Target |
|---|---|---|
| backend `framework: dotnet-8` | `framework: dotnet` + `runtimeVersion: "8.0"` | SDL v2.0 |

**Why this one is an alias rather than a rejection.** `dotnet-8` was the only framework value that encoded its runtime version in the identifier. Every .NET release would have required a new enum member (`dotnet-9`, `dotnet-10`, …) and a matching branch in every generator. Rejecting it outright would have broken existing documents for a problem those documents did not cause, so it normalizes instead. Every other framework was already unversioned, so no other alias is needed.

Compliance with the Forward Policy below: documented here (1), covered by `packages/sdl/src/__tests__/framework-version.test.ts` (2), normalizes to the single stored form `dotnet` + `runtimeVersion` (3), and is removed in SDL v2.0 (4).

### Deprecated Or Rejected Legacy Forms

These forms are not part of the stable `v1.1` contract and are **rejected**, not normalized:

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

Any alias — the existing one and any future addition — must satisfy all four rules:

1. It must be explicitly documented in *Normalized Aliases* above.
2. It must be tested.
3. It must normalize to one canonical stored form.
4. It must include a deprecation window and removal target.

New aliases should not be added casually. Prefer rejecting a bad value over accepting two spellings for it; the `dotnet-8` alias exists only because the value it replaces would have forced recurring schema churn.

## Practical Authoring Rules

When authoring new SDL:

1. Start from `sdlVersion: "1.1"`.
2. Use only the canonical names listed here.
3. Prefer the stable root section shapes listed here.
4. Put richer unsupported detail under `x-` fields instead of inventing new root shapes.
5. Treat older examples or generated `.d.ts` files as non-authoritative if they conflict with this file.
