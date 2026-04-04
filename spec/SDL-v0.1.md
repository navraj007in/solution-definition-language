# SDL Specification v0.1

## Overview

Solution Design Language (SDL) is a YAML-based specification for capturing complete software architecture decisions in a machine-readable format. It is designed to be:

- **Declarative** — describes what the system is, not how to build it
- **Deterministic** — same SDL always produces identical artifacts
- **Validatable** — JSON Schema + conditional rules catch errors before generation
- **Normalizable** — sensible defaults inferred from minimal input
- **Composable** — multi-file imports for modular architecture

## Document Structure

An SDL document is a YAML file with the following top-level sections:

```yaml
sdlVersion: "0.1"          # Required — schema version

solution: {}                # Required — project identity
product: {}                 # Optional — personas, features, MVP scope
architecture: {}            # Required — style, projects, shared types
data: {}                    # Required — databases, cache, queues, search, storage
auth: {}                    # Optional — authentication and authorization
integrations: []            # Optional — third-party services
nonFunctional: {}           # Optional — performance, security, availability
deployment: {}              # Optional — cloud, CI/CD, containerization
constraints: {}             # Optional — budget, timeline, team
testing: {}                 # Optional — strategy, coverage, frameworks
observability: {}           # Optional — logging, monitoring, alerting
techDebt: []                # Optional — known debt items
evolution: []               # Optional — future phases
artifacts: {}               # Optional — generation control
```

## Required Sections

### `solution`

Project identity and metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Project name |
| `description` | string | Yes | One-paragraph description |
| `stage` | enum | No | `mvp`, `growth`, `production`, `enterprise` (default: `mvp`) |
| `teamSize` | number | No | Current team size |
| `owner` | string | No | Project owner name/email |

### `architecture`

System structure and component definitions.

| Field | Type | Required | Description |
|---|---|---|---|
| `style` | enum | No | `monolith`, `modular-monolith`, `microservices`, `serverless`, `hybrid` |
| `projects` | object | Yes | `{ backend: [], frontend: [], mobile: [] }` |
| `services` | array | No | Alternative flat service list |
| `shared` | object | No | Shared types, libraries, contracts |

#### Backend Project

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Service name |
| `type` | enum | Yes | `api`, `worker`, `agent`, `gateway` |
| `path` | string | Yes | Filesystem path relative to root |
| `runtime` | enum | No | `node`, `python`, `go`, `java`, `dotnet`, `rust` |
| `language` | string | No | `typescript`, `python`, `go`, etc. |
| `framework` | string | No | `express`, `fastapi`, `gin`, `spring`, etc. |
| `orm` | string | No | `prisma`, `drizzle`, `sqlalchemy`, `mongoose`, etc. |
| `port` | number | No | Default port |
| `deployable` | boolean | No | Whether this component is deployable (default: `true`). Set to `false` for shared libraries, type packages, etc. |
| `endpoints` | array | No | API endpoint definitions |

#### Frontend Project

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | App name |
| `type` | enum | Yes | `web`, `mobile`, `desktop` |
| `path` | string | Yes | Filesystem path relative to root |
| `framework` | string | No | `next`, `react`, `vue`, `angular`, `svelte`, `expo` |
| `rendering` | enum | No | `ssr`, `spa`, `ssg`, `isr` |
| `styling` | string | No | `tailwind`, `scss`, `styled-components`, `css-modules` |
| `stateManagement` | string | No | `zustand`, `pinia`, `ngrx`, `redux` |
| `deployable` | boolean | No | Whether this component is deployable (default: `true`) |

### `data`

Data infrastructure declarations.

| Field | Type | Required | Description |
|---|---|---|---|
| `primaryDatabase` | object | Yes | `{ type, hosting, name }` |
| `secondaryDatabases` | array | No | Additional databases |
| `cache` | object | No | `{ type, hosting }` (redis, memcached) |
| `queues` | object | No | Message queue configuration |
| `search` | object | No | Search engine configuration |
| `storage` | object | No | File/object storage |

#### Database Types

`postgres`, `mysql`, `mongodb`, `dynamodb`, `sqlite`, `cockroachdb`, `planetscale`, `supabase`, `mssql`, `cassandra`, `neo4j`, `couchdb`, `firebase`

#### Hosting

`managed`, `self-hosted`, `serverless`

## Optional Sections

### `auth`

| Field | Type | Description |
|---|---|---|
| `strategy` | enum | `jwt`, `session`, `oauth2`, `api-key` |
| `provider` | string | `cognito`, `auth0`, `clerk`, `firebase`, `custom`, etc. |
| `providers` | object | `{ primary: { type }, fallback: { type } }` |
| `mfa` | object | Multi-factor auth config |
| `rbac` | object | Role-based access control |

### `integrations`

Array of third-party service integrations:

```yaml
integrations:
  - name: stripe
    purpose: payments
    tier: production
  - name: sendgrid
    purpose: email
    tier: mvp
```

### `nonFunctional`

| Section | Fields |
|---|---|
| `performance` | `responseTime`, `throughput`, `concurrentUsers` |
| `security` | `encryption`, `compliance`, `audit` |
| `availability` | `uptime`, `rpo`, `rto` |

### `deployment`

| Field | Type | Description |
|---|---|---|
| `cloud` | enum | `aws`, `gcp`, `azure`, `vercel`, `railway`, `fly` |
| `ciCd` | object | `{ provider, pipeline, triggers }` |
| `containerization` | object | `{ runtime, registry }` |
| `regions` | array | Deployment regions |

### `constraints`

| Field | Type | Description |
|---|---|---|
| `budget` | object | `{ monthly, initial }` |
| `timeline` | object | `{ mvp, launch }` |
| `team` | object | `{ size, skills }` |

### `testing`

| Field | Type | Description |
|---|---|---|
| `strategy` | enum | `unit`, `integration`, `e2e` |
| `coverage` | object | `{ target, minimum }` |
| `frameworks` | object | `{ unit, e2e, api }` |

### `observability`

| Field | Type | Description |
|---|---|---|
| `logging` | object | `{ provider, level, format }` |
| `monitoring` | object | `{ provider, metrics, dashboards }` |
| `tracing` | object | `{ provider, sampling }` |
| `alerting` | object | `{ provider, channels, rules }` |

### `environments`

Environment-specific configuration and deployment overrides. Defines URLs, ports, scaling, and deployment status per environment.

```yaml
environments:
  - name: dev
    description: "Local development"
    components:
      api-server:
        url: "http://localhost:3000"
        port: 3000
        instances: 1
        deployed: true
  - name: staging
    description: "Pre-production testing"
    components:
      api-server:
        url: "https://api-staging.example.com"
        instances: 2
        deployed: true
  - name: production
    description: "Production"
    components:
      api-server:
        url: "https://api.example.com"
        instances: 3
        scaling:
          minReplicas: 3
          maxReplicas: 10
        deployed: true
```

**Per-environment component overrides:**
- `url` — deployment URL for this component in this environment
- `port` — listening port (dev only)
- `instances` — number of instances/replicas
- `deployed` — whether component is deployed in this environment
- `scaling` — auto-scaling config (`minReplicas`, `maxReplicas`, `metrics`)
- `replicas` — synonym for `instances`

**Rules:**
- Only include environments that exist in your deployment strategy
- Component entries in an environment override global component config
- If a component has `deployable: false`, it should have `deployed: false` in all environments
- If a component is not listed in an environment, it's assumed not deployed there

### `artifacts`

Controls which artifacts to generate:

```yaml
artifacts:
  generate:
    - docker-compose
    - kubernetes
    - coding-rules
    - ci-cd
```

## Multi-File SDL

SDL supports modular composition via `imports`:

```yaml
# solution.sdl.yaml (root)
sdlVersion: "1.1"
imports:
  - sdl/services.sdl.yaml
  - sdl/data.sdl.yaml
  - sdl/auth.sdl.yaml
```

### Merge Rules

1. Each imported file's top-level keys are merged into the root document
2. `sdlVersion` and `imports` keys in imported files are ignored
3. Object keys: deep merge (imported values extend/override root)
4. Array keys: concatenation (imported items appended to root)
5. Scalar keys: imported value wins if root has no value

### Circular Dependencies

The resolver detects circular imports and throws an error.

## Extension Fields

Fields prefixed with `x-` are pass-through metadata:

```yaml
architecture:
  projects:
    backend:
      - name: api
        x-confidence: high
        x-evidence: "Based on team expertise with Express"
```

Extension fields are preserved in the document but not validated.

## Validation Pipeline

```
YAML string → parse() → validate() → normalize() → detectWarnings() → SDL document
```

1. **Parse** — YAML to JavaScript object
2. **Validate** — JSON Schema validation + 6 conditional rules
3. **Normalize** — 15 auto-inference rules fill missing fields
4. **Warnings** — 4 rules detect potential issues (non-blocking)

### Conditional Rules (Errors)

These rules catch logical inconsistencies and must pass for valid SDL:

1. **Microservices** → `architecture.style: "microservices"` requires 2+ services in `architecture.projects`
2. **OIDC** → `auth.provider: "oidc"` requires `auth.provider` value to be set
3. **PII** → if any entity has PII fields, `data.primaryDatabase` must have `encryption: { atRest: true }`
4. **CloudFormation** → `deployment.ciCd.provider: "cloudformation"` only valid with `deployment.cloud: "aws"`
5. **MongoDB** → `data.primaryDatabase.type: "mongodb"` is incompatible with `.orm: "entity-framework"`
6. **Environment Components** → every component name in `environments[].components` must exist in `architecture.projects` (all categories combined)

### Warning Rules

These are non-blocking but flag potential issues:

1. **Microservices with small team** — `architecture.style: "microservices"` with `constraints.team.size < 3`
2. **Aggressive timeline vs scope** — complex architecture with very tight `constraints.timeline`
3. **Multi-persona without auth** — `product.personas[]` with 3+ personas but no `auth` section defined
4. **Budget vs infrastructure mismatch** — estimated `costs` exceed `constraints.budget`

See [error-codes.md](../reference/error-codes.md) for the complete error reference.
See [normalization-defaults.md](../reference/normalization-defaults.md) for all inference rules.
