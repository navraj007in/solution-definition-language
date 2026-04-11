# SDL AI Authoring Reference

This document is the compact machine-first reference for authoring valid SDL `v1.1`.

Load this when generating SDL. Do not use README examples, old `.d.ts` files, or `spec/SDL-v0.1.md` as guides — they are stale or removed.

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
| `architecture` | `style`, `projects` (at least one project) |
| `architecture.projects.frontend[]` | `name`, `framework` |
| `architecture.projects.backend[]` | `name`, `framework` |
| `architecture.projects.mobile[]` | `name`, `platform`, `framework` |
| `data` | `primaryDatabase.type`, `primaryDatabase.hosting` |
| `auth` | `strategy` |
| `deployment` | `cloud` |
| `nonFunctional` | `availability.target`, `scaling` |
| `techDebt[]` | `id`, `decision`, `reason`, `impact` |
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

backend.framework:            dotnet-8 | nodejs | python-fastapi | go | java-spring | ruby-rails | php-laravel
backend.type:                 backend | worker | function
backend.apiStyle:             rest | graphql | grpc | mixed
backend.orm:                  ef-core | prisma | typeorm | sqlalchemy | gorm | sequelize | mongoose
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
deployment.runtime.frontend:  static-web-apps | vercel | cloudflare-pages | s3+cloudfront | app-service | netlify
deployment.runtime.backend:   container-apps | ecs | cloud-run | kubernetes | app-service | lambda | cloud-functions

constraints.budget:           startup | scaleup | enterprise | custom
nonFunctional.security.auditLogging: none | basic | detailed | compliance
nonFunctional.backup.frequency: hourly | daily | weekly

testing.unit.framework:       jest | vitest | pytest | xunit | go-test | junit | rspec | phpunit
testing.e2e.framework:        playwright | cypress | selenium | none

observability.logging.provider:  pino | winston | serilog | zerolog | log4j | structured
observability.logging.level:     debug | info | warn | error
observability.tracing.provider:  opentelemetry | jaeger | zipkin | xray | none
observability.metrics.provider:  prometheus | datadog | cloudwatch | grafana | none

techDebt[].priority:          low | medium | high | critical
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

Do not set these fields if you have no concrete value. The normalizer fills them on compile and will not overwrite explicit values.

| Field | Filled when absent | Filled with |
|---|---|---|
| `solution.regions.primary` | always | `us-east-1` |
| `data.primaryDatabase.name` | always | `{solution.name}_db` (slugified) |
| `architecture.projects.frontend[].type` | per item | `web` |
| `architecture.projects.backend[].type` | per item | `backend` |
| `backend[].orm` | when framework+DB combo is known | see normalization-defaults.md |
| `deployment.cloud` | when `deployment` absent | `railway` (has backend) or `vercel` (frontend only) |
| `deployment.runtime.frontend` | when cloud is known | cloud-mapped value |
| `deployment.runtime.backend` | when cloud is known | cloud-mapped value |
| `deployment.networking.publicApi` | always | `true` |
| `deployment.ciCd.provider` | when `ciCd` absent | `github-actions` |
| `nonFunctional.availability.target` | when absent | stage-based: MVP=`99.5%`, Growth=`99.9%`, Enterprise=`99.99%` |
| `nonFunctional.scaling.expectedUsersMonth1` | when scaling absent | stage-based |
| `nonFunctional.scaling.expectedUsersYear1` | when scaling absent | stage-based |
| `nonFunctional.security.encryptionAtRest` | when `pii: true` | `true` |
| `nonFunctional.security.encryptionInTransit` | always (if security present) | `true` |
| `testing.unit.framework` | when testing present, framework absent | inferred from backend framework |
| `observability.logging.structured` | when logging present | `true` |
| `observability.logging.provider` | when logging present | inferred from backend framework |
| `observability.tracing.samplingRate` | when tracing present | `0.1` |
| `product.personas` | when product absent | `[]` |
| `product.coreFlows` | when product absent | `[]` |
| `artifacts.generate` | when artifacts absent | `[]` |

---

## Valid Artifact Types (for `artifacts.generate[]`)

Only these 12 values are valid in `artifacts.generate`. Unknown values are skipped at generation time (not validation errors, but produce no output).

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
  description: desc
  stage: MVP
  x-internalRef: PROJ-123
```

The validator accepts any `x-*` key at any level. Do not invent new non-`x-` top-level sections or new non-`x-` fields inside stable sections.

---

## Section Support Quick Reference

Use this to decide whether to author a section:

| Section | Maturity | Validated | Normalized | Generators use it |
|---|---|---|---|---|
| `solution` | stable | yes | yes | all |
| `product` | stable | yes | yes | 5 generators |
| `architecture` | stable | yes | yes | all |
| `auth` | stable | yes | no | 9 generators |
| `data` | stable | yes | yes | 10 generators |
| `integrations` | stable | yes | no | 5 generators |
| `nonFunctional` | stable | yes | yes | 4 generators |
| `deployment` | stable | yes | yes | 4 generators |
| `artifacts` | stable | yes | yes | controls generation |
| `testing` | partial | yes | yes (if present) | `coding-rules` |
| `observability` | partial | yes | yes (if present) | `coding-rules`, `monitoring` |
| `constraints` | partial | yes | no | `adr` (budget only) |
| `techDebt` | partial | yes | no | `adr` |
| `evolution` | partial | yes | no | `coding-rules` |
| `contracts` | minimal | defined shape | no | none yet |
| `domain` | minimal | defined shape | no | none yet |
| `features` | minimal | partial | no | none yet |
| `compliance` | minimal | defined — `frameworks[]` objects with `name` required | no | none |
| `slos` | placeholder | permissive | no | none |
| `resilience` | minimal | defined — `circuitBreaker`, `retryPolicy`, `timeout`, `rateLimit` typed | no | none |
| `costs` | placeholder | permissive | no | none |
| `backupDr` | placeholder | permissive | no | none |
| `design` | placeholder | permissive | no | none |

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
- Do not copy old README snippets. They contained stale vocabulary. Use this file and [`canonical-contract.md`](canonical-contract.md).
