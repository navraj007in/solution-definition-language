# Solution Design Language (SDL)

SDL is a structured YAML specification for capturing complete software architecture decisions. It serves as the single source of truth for a project's architecture — from tech stack and service boundaries to auth strategy, data model, deployment targets, and design system.

## Status

**SDL v1.1 is the active standard.**
New SDL documents, examples, generators, and integrations should target `sdlVersion: "1.1"`.

## Why SDL?

Architecture decisions are typically scattered across documents, Slack threads, and people's heads. SDL consolidates them into one machine-readable file that:

- **Generates artifacts** — Docker Compose, Kubernetes manifests, Terraform, CI/CD pipelines, API specs, coding rules
- **Validates consistency** — catches conflicts (e.g., serverless runtime with WebSocket requirements)
- **Drives scaffolding** — produces framework-appropriate starter code for every component
- **Syncs AI tools** — generates CLAUDE.md, .cursorrules, copilot-instructions.md so AI coding tools follow your architecture
- **Tracks progress** — verifies what's been built against what's been planned
- **Enables collaboration** — supports ADRs, change requests, and approval workflows for architecture changes

## Quick Example

```yaml
sdlVersion: "1.1"

solution:
  name: TaskFlow
  description: A task management SaaS for small teams
  stage: MVP

architecture:
  style: modular-monolith
  projects:
    backend:
      - name: api
        framework: nodejs
        orm: prisma
    frontend:
      - name: web
        framework: nextjs
        rendering: ssr

data:
  primaryDatabase:
    type: postgres
    hosting: managed
  cache:
    type: redis

auth:
  strategy: oidc
  provider: custom
  sessions:
    accessToken: jwt

deployment:
  cloud: aws
  ciCd:
    provider: github-actions

contracts:
  apis:
    - name: api
      type: rest
      owner: api

domain:
  entities:
    - name: Task
      fields:
        - name: id
          type: uuid
        - name: title
          type: string
          required: true
```

## Multi-File SDL

For larger projects, SDL supports modular imports:

```yaml
# solution.sdl.yaml (root)
sdlVersion: "1.1"
imports:
  - sdl/services.sdl.yaml
  - sdl/data.sdl.yaml
  - sdl/auth.sdl.yaml
  - sdl/deployment.sdl.yaml
  - sdl/contracts.sdl.yaml
  - sdl/domain.sdl.yaml
  - sdl/design.sdl.yaml

solution:
  name: MedChat
  description: HIPAA-compliant messaging platform
```

Each imported file contains one or more SDL sections. The system resolves and merges them automatically.

## What SDL Generates

| Output | Access |
|---|---|
| `architecture-diagram` | Registry-backed artifact type |
| `repo-scaffold` | Registry-backed artifact type |
| `iac-skeleton` | Registry-backed artifact type |
| `adr` | Registry-backed artifact type |
| `openapi` | Registry-backed artifact type |
| `data-model` | Registry-backed artifact type |
| `sequence-diagrams` | Registry-backed artifact type |
| `backlog` | Registry-backed artifact type |
| `deployment-guide` | Registry-backed artifact type |
| `cost-estimate` | Registry-backed artifact type |
| Docker Compose, Kubernetes, Monitoring, Nginx, Coding Rules | Available as direct generator APIs |

## Versions

- **v1.1** — Active specification (production-grade)
  - API contracts (OpenAPI, GraphQL, gRPC)
  - Data model (entity definitions with fields, relationships, constraints)
  - Feature planning (MVP phases, feature flags, dependencies)
  - Compliance (GDPR, HIPAA, SOC2, PCI-DSS, CCPA)
  - SLO/SLI (service level objectives, KPIs, alert thresholds)
  - Resilience (circuit breakers, retries, timeouts, fallbacks)
  - Cost model (pricing, usage-based costs, per-component breakdown)
  - Backup & DR (RTO/RPO, failover, replication)
  - Design system (tokens, theming, component library)
  - Spec: [SDL-v1.1.md](spec/SDL-v1.1.md)

## Documentation

| Document | Description |
|---|---|
| [Canonical Contract](reference/canonical-contract.md) | Canonical enums, artifact types, root section shapes, and alias policy for active `v1.1` |
| [Specification v1.1](spec/SDL-v1.1.md) | Active complete specification |
| [Schema Reference](reference/schema-reference.md) | v1.1-oriented field and section reference |
| [Generators](reference/generators.md) | What each generator produces and what SDL sections it consumes |
| [Error Codes](reference/error-codes.md) | Parse, schema, and conditional validation errors |
| [Normalization](reference/normalization-defaults.md) | Auto-inference rules and mapping tables |
| [SDL Knowledge](reference/sdl-knowledge.md) | SDL generation and validation guidance |

## Templates

12 starter templates to bootstrap any project type:

| Template | Stack |
|---|---|
| [SaaS Starter](templates/saas-starter.sdl.yaml) | Next.js + Node.js + PostgreSQL + Stripe |
| [E-Commerce](templates/e-commerce.sdl.yaml) | Next.js + Node.js + PostgreSQL + Stripe |
| [Marketplace](templates/marketplace.sdl.yaml) | React + Node.js + PostgreSQL + Stripe Connect |
| [Mobile App API](templates/mobile-app-api.sdl.yaml) | Express + PostgreSQL + Firebase Auth |
| [AI Chat App](templates/ai-chat-app.sdl.yaml) | Next.js + Python + pgvector + Claude |
| [Internal Tool](templates/internal-tool.sdl.yaml) | React Admin + Node.js + PostgreSQL |
| [API Only](templates/api-only.sdl.yaml) | Express/FastAPI headless API |
| [Event-Driven](templates/event-driven-microservices.sdl.yaml) | Microservices + RabbitMQ/Kafka |
| [Real-Time Collab](templates/realtime-collab.sdl.yaml) | WebSocket + Redis + CRDT |
| [Admin Dashboard](templates/admin-dashboard.sdl.yaml) | React + Chart.js + Node.js |
| [Landing Page](templates/landing-page.sdl.yaml) | Next.js static + analytics |
| [Portfolio Blog](templates/portfolio-blog.sdl.yaml) | Astro/Next.js + MDX |

## Examples

- [Single-file SDL examples](examples/single-file/) — simple projects in one YAML file
- [Multi-file SDL example](examples/multi-file/medchat/) — real-world HIPAA healthcare messaging platform with modular imports

## Schema

- [JSON Schema (v1.1)](schema/sdl-v1.1.schema.json) — active machine-readable validation schema for SDL v1.1
- [TypeScript Types (v1.1)](schema/sdl-v1.1.d.ts) — active TypeScript declaration file for SDL v1.1

## Reference Implementation

The `@arch0/sdl` npm package in [packages/sdl/](packages/sdl/) provides:

- **Parser** — YAML to JavaScript object
- **Validator** — Schema validation (Ajv)
- **Normalizer** — Auto-inference of defaults
- **Resolver** — Multi-file import resolution
- **Diff** — Structural comparison of SDL versions
- **Generators** — Docker Compose, Kubernetes, Terraform, CI/CD, coding rules, and related outputs
- **Progress Tracker** — Verification spec derivation for build progress

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose SDL schema changes.

## License

Apache-2.0
