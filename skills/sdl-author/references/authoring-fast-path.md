# SDL v1.1 Authoring Fast Path

Use this when the `solution-definition-language/reference/ai-authoring.md` repo file is unavailable.

## Minimum Valid Document

```yaml
sdlVersion: "1.1"

solution:
  name: My App
  description: One-sentence description.
  stage: MVP

architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
    frontend:
      - name: web
        framework: nextjs

data:
  primaryDatabase:
    type: postgres
    hosting: managed
```

Only `sdlVersion`, `solution`, `architecture`, and `data` are schema-required. Add optional sections only when the input contains facts for them.

## Required Fields

| Section | Required fields |
|---|---|
| `solution` | `name`, `description`, `stage` |
| `architecture` | `style`, `projects` with at least one project |
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

## Canonical Enum Values

Use exact casing and hyphenation.

```text
solution.stage: MVP | Growth | Enterprise
architecture.style: modular-monolith | microservices | serverless

frontend.framework: nextjs | react | vue | angular | svelte | solid
frontend.type: web | mobile-web | admin
frontend.rendering: ssr | ssg | spa
frontend.stateManagement: context | redux | zustand | mobx | none
frontend.styling: tailwind | css-modules | styled-components | sass | emotion

backend.framework: dotnet-8 | nodejs | python-fastapi | go | java-spring | ruby-rails | php-laravel
backend.type: backend | worker | function
backend.apiStyle: rest | graphql | grpc | mixed
backend.orm: ef-core | prisma | typeorm | sqlalchemy | gorm | sequelize | mongoose
backend.apiVersioning: url-prefix | header | query-param | none

mobile.platform: ios | android | cross-platform
mobile.framework: react-native | flutter | swift | kotlin | ionic

services[].kind: backend | worker | function | api-gateway

auth.strategy: oidc | passwordless | magic-link | api-key | none
auth.provider: cognito | auth0 | entra-id | entra-id-b2c | firebase | supabase | clerk | custom
auth.sessions.accessToken: jwt | opaque
auth.socialProviders[]: google | github | microsoft | apple | facebook | twitter

data.primaryDatabase.type: postgres | mysql | sqlserver | mongodb | dynamodb | cockroachdb | planetscale
data.primaryDatabase.hosting: managed | self-hosted | serverless
data.primaryDatabase.size: small | medium | large
data.cache.type: redis | memcached | none
data.queues.provider: rabbitmq | azure-service-bus | sqs | kafka | redis
data.search.provider: elasticsearch | algolia | typesense | azure-search | meilisearch | pinecone | qdrant | weaviate
data.storage.blobs.provider: azure-blob | s3 | gcs | cloudflare-r2

integrations.payments.provider: stripe | paypal | square | adyen | braintree
integrations.payments.mode: subscriptions | one-time | marketplace
integrations.email.provider: sendgrid | mailgun | ses | postmark | resend | smtp
integrations.sms.provider: twilio | vonage | aws-sns | messagebird
integrations.analytics.provider: posthog | mixpanel | amplitude | google-analytics | plausible
integrations.monitoring.provider: datadog | newrelic | azure-monitor | sentry | cloudwatch
integrations.cdn.provider: cloudflare | fastly | azure-cdn | cloudfront
integrations.custom[].apiType: rest | graphql | soap | grpc
integrations.custom[].authMethod: api-key | oauth2 | basic | none

deployment.cloud: azure | aws | gcp | cloudflare | vercel | railway | render | fly-io
deployment.ciCd.provider: github-actions | gitlab-ci | azure-devops | circleci | jenkins
deployment.infrastructure.iac: terraform | bicep | pulumi | cdk | cloudformation
deployment.runtime.frontend: static-web-apps | vercel | cloudflare-pages | s3+cloudfront | app-service | netlify
deployment.runtime.backend: container-apps | ecs | cloud-run | kubernetes | app-service | lambda | cloud-functions

constraints.budget: startup | scaleup | enterprise | custom
nonFunctional.security.auditLogging: none | basic | detailed | compliance
nonFunctional.backup.frequency: hourly | daily | weekly

testing.unit.framework: jest | vitest | pytest | xunit | go-test | junit | rspec | phpunit
testing.e2e.framework: playwright | cypress | selenium | none

observability.logging.provider: pino | winston | serilog | zerolog | log4j | structured
observability.logging.level: debug | info | warn | error
observability.tracing.provider: opentelemetry | jaeger | zipkin | xray | none
observability.metrics.provider: prometheus | datadog | cloudwatch | grafana | none

techDebt[].priority: low | medium | high | critical
features[].priority: critical | high | medium | low
features[].stage: MVP | Growth | Enterprise
features[].status: planned | in-progress | done | deferred
contracts.apis[].type: rest | graphql | grpc | webhook | asyncapi
resilience.retryPolicy.backoff: exponential | linear | fixed
evolution.roadmap[].stage: MVP | Growth | Enterprise
product.personas[].accessLevel: public | authenticated | admin
product.coreFlows[].priority: critical | high | medium | low
nonFunctional.compliance.frameworks[]: gdpr | hipaa | sox | pci-dss | iso27001 | soc2
```

## Rejected Legacy Values

| Wrong | Correct |
|---|---|
| `stage: mvp` | `stage: MVP` |
| `stage: growth` | `stage: Growth` |
| `stage: enterprise` | `stage: Enterprise` |
| `framework: next` | `framework: nextjs` |
| `framework: express` | `framework: nodejs` |
| `framework: fastapi` | `framework: python-fastapi` |
| `auth.strategy: jwt` | `auth.strategy: oidc` plus `auth.sessions.accessToken: jwt` if needed |
| `contracts: []` | `contracts: { apis: [] }` |
| `features: { phase1: [...] }` | `features: [{ name: ..., priority: ... }]` |
| `slos: []` | `slos: { services: [] }` |
| custom root keys like `navigationPatterns` | `x-navigationPatterns` |

## Normalizer-Inferred Fields

Do not set these unless the input explicitly needs an override:

- `solution.regions.primary`
- `data.primaryDatabase.name`
- `architecture.projects.frontend[].type`
- `architecture.projects.backend[].type`
- backend ORM when framework and database imply it
- default deployment cloud, runtime, networking, and CI/CD provider
- stage-based availability and scaling defaults
- encryption defaults when PII or security fields are present
- testing and observability defaults
- empty `product.personas`, `product.coreFlows`, and `artifacts.generate`

## Artifact Types

Valid `artifacts.generate[]` values:

```text
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

## When Unsure

- Prefer omit over guess.
- Prefer `x-*` extension fields over new schema fields.
- Keep assumptions outside stable SDL fields unless the user explicitly approves them.
