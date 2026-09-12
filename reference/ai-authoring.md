# SDL AI Authoring Reference

This document is the compact machine-first reference for authoring valid SDL `v1.1`.

Load this first for authoring convenience. Normative authority remains with [SDL v1.1](../spec/SDL-v1.1.md), followed by the [canonical contract](canonical-contract.md); reading order does not change authority. Do not use retired specifications or stale generated declarations to override those sources.

Full detail lives in [`canonical-contract.md`](canonical-contract.md). This document is the minimal fast path.

---

## Minimum Valid Document

```yaml
sdlVersion: "1.1"

solution:
  name: My App
  description: One-sentence description.
  stage: MVP   # MVP | Growth | Enterprise

architecture:
  style: modular-monolith   # modular-monolith | microservices | serverless
  projects:
    backend:
      - name: api
        framework: nodejs   # see enum below
    frontend:
      - name: web
        framework: nextjs   # see enum below

data:
  primaryDatabase:
    type: postgres   # see enum below
    hosting: managed   # managed | self-hosted | serverless
```

These four sections — `sdlVersion`, `solution`, `architecture`, `data` — are the only schema-required fields. Everything else is optional. Add sections only when you have real facts to fill them with.

---

## Required Fields Per Section

| Section | Required fields |
|---|---|
| `solution` | `name`, `description`, `stage` |
| `architecture` | `style`, `projects` — at least one project in any category, or at least one entry in `architecture.services` (enforced by SEM-015 / `ARCHITECTURE_EMPTY`) |
| `architecture.projects.frontend[]` | `name`, `framework` |
| `architecture.projects.backend[]` | `name`, `framework` |
| `architecture.projects.mobile[]` | `name`, `platform`, `framework` |
| `data` | `primaryDatabase.type`, `primaryDatabase.hosting` |
| `auth` | `strategy` |
| `deployment` | `cloud` |
| `nonFunctional` | `availability.target`, `scaling` |
| `technicalDebt[]` (alias `techDebt[]`) | `id`, `decision`, `reason`, `impact` |
| `contracts.apis[]` | `name` |
| `domain.entities[]` | `name` |
| `domain.entities[].fields[]` | `name`, `type` |
| `features[]` | `name` |

---

## All Canonical Enum Values

Use exactly these strings. Unknown values fail validation.

```
solution.stage:               MVP | Growth | Enterprise
architecture.style:           modular-monolith | microservices | serverless

frontend.framework:           nextjs | react | vue | angular | svelte | solid
frontend.type:                web | mobile-web | admin
frontend.rendering:           ssr | ssg | spa
frontend.stateManagement:     context | redux | zustand | mobx | none
frontend.styling:             tailwind | css-modules | styled-components | sass | emotion

backend.framework:            dotnet | nodejs | python-fastapi | go | java-spring | ruby-rails | php-laravel
backend.runtimeVersion:       free-form string, e.g. "10.0" (.NET), "22" (Node), "3.13" (Python) — optional
backend.type:                 backend | worker | function
backend.apiStyle:             rest | graphql | grpc | mixed
backend.orm:                  ef-core | prisma | typeorm | sqlalchemy | gorm | sequelize | mongoose | hibernate
backend.apiVersioning:        url-prefix | header | query-param | none

mobile.platform:              ios | android | cross-platform
mobile.framework:             react-native | flutter | swift | kotlin | ionic

services[].kind:              backend | worker | function | api-gateway

auth.strategy:                oidc | passwordless | magic-link | api-key | none
auth.provider:                cognito | auth0 | entra-id | entra-id-b2c | firebase | supabase | clerk | custom
auth.sessions.accessToken:    jwt | opaque
auth.socialProviders[]:       google | github | microsoft | apple | facebook | twitter

data.primaryDatabase.type:    postgres | mysql | sqlserver | mongodb | dynamodb | cockroachdb | planetscale
data.primaryDatabase.hosting: managed | self-hosted | serverless
data.primaryDatabase.size:    small | medium | large
data.cache.type:              redis | memcached | none
data.queues.provider:         rabbitmq | azure-service-bus | sqs | kafka | redis
data.search.provider:         elasticsearch | algolia | typesense | azure-search | meilisearch | pinecone | qdrant | weaviate
data.storage.blobs.provider:  azure-blob | s3 | gcs | cloudflare-r2

integrations.payments.provider:  stripe | paypal | square | adyen | braintree
integrations.payments.mode:      subscriptions | one-time | marketplace
integrations.email.provider:     sendgrid | mailgun | ses | postmark | resend | smtp
integrations.sms.provider:       twilio | vonage | aws-sns | messagebird
integrations.analytics.provider: posthog | mixpanel | amplitude | google-analytics | plausible
integrations.monitoring.provider: datadog | newrelic | azure-monitor | sentry | cloudwatch
integrations.cdn.provider:       cloudflare | fastly | azure-cdn | cloudfront
integrations.custom[].apiType:   rest | graphql | soap | grpc
integrations.custom[].authMethod: api-key | oauth2 | basic | none

deployment.cloud:             azure | aws | gcp | cloudflare | vercel | railway | render | fly-io
deployment.ciCd.provider:     github-actions | gitlab-ci | azure-devops | circleci | jenkins
deployment.infrastructure.iac: terraform | bicep | pulumi | cdk | cloudformation
deployment.runtime.frontend:  static-web-apps | vercel | cloudflare-pages | s3+cloudfront | app-service | netlify | railway
deployment.runtime.backend:   container-apps | ecs | cloud-run | kubernetes | app-service | lambda | cloud-functions | railway | vercel

constraints.budget:           startup | scaleup | enterprise | custom
nonFunctional.security.auditLogging: none | basic | detailed | compliance
nonFunctional.backup.frequency: hourly | daily | weekly

testing.unit.framework:       jest | vitest | pytest | xunit | go-test | junit | rspec | phpunit
testing.e2e.framework:        playwright | cypress | selenium | none

observability.logging.provider:  pino | winston | serilog | zerolog | log4j | structured
observability.logging.level:     debug | info | warn | error
observability.tracing.provider:  opentelemetry | jaeger | zipkin | xray | none
observability.metrics.provider:  prometheus | datadog | cloudwatch | grafana | none

technicalDebt[].priority:     low | medium | high | critical
features[].priority:          critical | high | medium | low
features[].stage:             MVP | Growth | Enterprise
features[].status:            planned | in-progress | done | deferred
contracts.apis[].type:        rest | graphql | grpc | webhook | asyncapi
resilience.retryPolicy.backoff: exponential | linear | fixed
evolution.roadmap[].stage:    MVP | Growth | Enterprise
product.personas[].accessLevel: public | authenticated | admin
product.coreFlows[].priority: critical | high | medium | low
nonFunctional.compliance.frameworks[]: gdpr | hipaa | sox | pci-dss | iso27001 | soc2
```

---

## What the Normalizer Will Fill Automatically

The maintained table of defaults and their applicability lives in [Normalization Defaults](normalization-defaults.md). Use that table instead of a duplicate here. Defaults are not evidence of an authored architecture decision: omit unsupported assumptions and review the inference report.

If an optional section is authored, its required fields still need to be supplied. Normalization does not make an incomplete authored section valid. The distinction between language defaults and tool suggestions, including empty-value precedence, is tracked in [D04](../spec/completion-decisions.md#d04--scalars-and-normalization).

---

## Valid Artifact Types (for `artifacts.generate[]`)

Only these 13 values are valid in `artifacts.generate`. The list below is the schema enum: any other value is an `INVALID_ENUM` validation error and the document will not compile.

```
architecture-diagram
sequence-diagrams
openapi
data-model
repo-scaffold
iac-skeleton
backlog
adr
deployment-guide
cost-estimate
coding-rules
coding-rules-enforcement
compliance-checklist
```

---

## Rejected Legacy Values

These were common in older examples and generated code. Do not use them.

| Wrong | Correct |
|---|---|
| `stage: mvp` | `stage: MVP` |
| `stage: growth` | `stage: Growth` |
| `stage: enterprise` | `stage: Enterprise` |
| `framework: next` | `framework: nextjs` |
| `framework: express` | `framework: nodejs` |
| `framework: fastapi` | `framework: python-fastapi` |
| `auth.strategy: jwt` | `auth.strategy: oidc` (then `auth.sessions.accessToken: jwt` if needed) |
| `auth.strategy: session-based` | choose a canonical strategy |
| `contracts: []` | `contracts: { apis: [] }` |
| `features: { phase1: [...], phase2: [...] }` | `features: [{ name: ..., priority: ... }]` |
| `slos: [...]` | `slos: { services: [...] }` |
| custom root keys like `navigationPatterns`, `interServiceCommunication` | `x-navigationPatterns`, `x-interServiceCommunication` |

---

## Modular SDL — `imports[]`

Split a large solution across files using an `imports[]` array at the top level of any SDL file, including imported modules. Three forms may be mixed:

```yaml
imports:
  - sdl/auth.sdl.yaml          # Form A — explicit extension
  - sdl/services               # Form B — extension inferred (.sdl.yaml then .sdl.yml)
  - name: deployment           # Form C — explicit name + path
    path: sdl/deployment
```

- Paths are relative to the file declaring `imports[]`.
- Names in Form C should match `^[a-zA-Z][a-zA-Z0-9_-]*$` (kebab-case is allowed because module filenames often are). Names must be unique within one `imports[]` list.
- Imported modules merge in declaration order; later modules override earlier ones (last-writer-wins on scalars). The `imports[]` key itself is stripped before validation.
- The documented portability minimum is three levels (root → depth 1 → depth 2 → depth 3). Behavior beyond a supported depth and containing-file precedence remain open in [D03](../spec/completion-decisions.md#d03--import-completeness-and-precedence); the specification's depth discussion must not be reduced to a fixed language-wide maximum.

Full normative rules: [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md) § "Modular SDL and Import Semantics".

---

## Extension Fields

Put metadata that does not fit the stable contract under `x-` prefixed keys at any nesting level:

```yaml
architecture:
  projects:
    backend:
      - name: api
        framework: nodejs
        x-port: 3000
        x-healthcheck: /health

solution:
  name: My App
  description: Example application with extension metadata.
  stage: MVP
  x-internalRef: PROJ-123
```

`x-*` keys are the general extension mechanism. The [canonical contract](canonical-contract.md#open-metadata-and-extension-boundaries) also lists intentionally open metadata locations. Unknown non-`x-*` root keys remain invalid; open metadata does not introduce new portable field semantics.

---

## Section Support Quick Reference

Use the [Section Support Matrix](section-support.md) for package validation, normalization, and generator coverage. This guide does not duplicate that table. Package coverage is independent of whether a language requirement is normative.

For authoring, `features` includes optional `stage` and `status` in v1.1; `contracts` is an API inventory; `slos` declares component availability and latency objectives; and `resilience` declares solution-wide defaults. `costs`, `backupDr`, and `design` carry open v1.1 metadata. The [specification decisions](../spec/completion-decisions.md) preserve those v1.1 boundaries and define incompatible completions in the v2 baseline only.

---

## Common Generation Mistakes

**Mistake: setting fields the normalizer will infer**
```yaml
# Unnecessary — normalizer fills these from cloud and framework
deployment:
  cloud: aws
  runtime:
    frontend: s3+cloudfront    # will be inferred from cloud: aws
    backend: ecs               # will be inferred from cloud: aws
  ciCd:
    provider: github-actions   # will be inferred as default
```
Omit inferred fields unless you need to override the default.

**Mistake: inventing non-canonical values**
```yaml
architecture:
  style: event-driven   # INVALID — not in enum
  projects:
    backend:
      - name: api
        framework: express   # INVALID — use nodejs
```

**Mistake: wrong shape for features or contracts**
```yaml
# INVALID
features:
  phase1:
    - name: Login

contracts:
  - name: User API

# CORRECT
features:
  - name: Login
    priority: critical

contracts:
  apis:
    - name: User API
      type: rest
```

**Mistake: unknown root section**
```yaml
# INVALID — custom root key without x- prefix
navigationPatterns:
  primary: sidebar

# CORRECT
x-navigationPatterns:
  primary: sidebar
```

**Mistake: omitting required fields inside optional sections**
```yaml
# INVALID — if auth is present, strategy is required
auth:
  provider: auth0

# CORRECT
auth:
  strategy: oidc
  provider: auth0
```

---

## When in Doubt

- Prefer **omit** over **guess**. Unknown values fail. Missing optional sections do not.
- Prefer **`x-` extension** over inventing new schema fields.
- Prefer **canonical strings exactly** — casing and hyphens are significant (`MVP` not `mvp`, `modular-monolith` not `modularMonolith`).
- Use current examples and follow the specification's authority order when sources disagree.
