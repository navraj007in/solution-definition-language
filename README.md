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

Every generator result carries a `tier` field: `deterministic` (correct by construction, safe to use directly), `inferred` (heuristic-based, worth reviewing), or `advisory` (starting point — always review before use).

| Output | Artifact Type | Tier |
|---|---|---|
| Architecture diagram | `architecture-diagram` | `deterministic` |
| Repo scaffold | `repo-scaffold` | `deterministic` |
| IaC skeleton | `iac-skeleton` | `deterministic` |
| OpenAPI spec | `openapi` | `deterministic` |
| Data model | `data-model` | `deterministic` |
| Sequence diagrams | `sequence-diagrams` | `deterministic` |
| Coding rules (CLAUDE.md, .cursorrules, etc.) | `coding-rules` | `inferred` |
| Coding rules enforcement (ESLint, arch tests, CI gates) | `coding-rules-enforcement` | `inferred` |
| Architecture decision records | `adr` | `advisory` |
| Backlog and user stories | `backlog` | `advisory` |
| Deployment guide | `deployment-guide` | `advisory` |
| Cost estimate | `cost-estimate` | `advisory` |
| Docker Compose, Kubernetes, Monitoring, Nginx | Direct API (`generateDockerCompose()`, etc.) | `deterministic` |

## Versions

- **v1.1** — Active specification
  - Core sections (stable, validated, normalized, generator-consumed): `solution`, `product`, `architecture`, `auth`, `data`, `integrations`, `nonFunctional`, `deployment`, `artifacts`
  - Partial sections (validated, some normalization or generator use): `testing`, `observability`, `constraints`, `techDebt`, `evolution`
  - Minimal sections (schema-enforced shape, no generator consumption yet): `contracts`, `domain`, `features`, `slos`
  - Placeholder sections (permissive, metadata only): `compliance`, `resilience`, `costs`, `backupDr`, `design`
  - See [Section Support Matrix](reference/section-support.md) for detail on each section's maturity
  - Spec: [SDL-v1.1.md](spec/SDL-v1.1.md)

## Documentation

| Document | Description |
|---|---|
| [AI Authoring Guide](reference/ai-authoring.md) | Compact machine-first reference: minimum valid document, all enums, normalization auto-fill, rejected legacy values, common mistakes |
| [Canonical Contract](reference/canonical-contract.md) | Canonical enums, artifact types, root section shapes, and alias policy for active `v1.1` |
| [Section Support Matrix](reference/section-support.md) | Per-section maturity, schema strictness, normalization, and generator consumption |
| [Generators](reference/generators.md) | Generator tiers, what each produces, what SDL sections it consumes |
| [Specification v1.1](spec/SDL-v1.1.md) | Active complete specification |
| [Schema Reference](reference/schema-reference.md) | v1.1-oriented field and section reference |
| [Normalization](reference/normalization-defaults.md) | Auto-inference rules and mapping tables |
| [Error Codes](reference/error-codes.md) | Parse, schema, and conditional validation errors |
| [SDL Knowledge](reference/sdl-knowledge.md) | SDL generation and validation guidance for AI tools |

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
- [MedChat](examples/multi-file/medchat/) — HIPAA-compliant healthcare messaging platform, modular multi-file SDL
- [Nexper CRM](examples/multi-file/nexper-crm/) — B2B SaaS CRM with full v1.1 coverage across contracts, domain, features, SLOs, compliance, and design

## Schema

- [JSON Schema (v1.1)](schema/sdl-v1.1.schema.json) — active machine-readable validation schema for SDL v1.1
- [TypeScript Types (v1.1)](schema/sdl-v1.1.d.ts) — active TypeScript declaration file for SDL v1.1

## Reference Implementation

The `@arch0/sdl` npm package in [packages/sdl/](packages/sdl/) provides:

- **Parser** — YAML to typed SDL document
- **Validator** — JSON schema + 20+ semantic rules with structured error codes
- **Normalizer** — Auto-inference of defaults; returns `{ document, inferences }` so every filled field is visible with its reason
- **Resolver** — Multi-file import resolution with circular import detection
- **Diff** — Structural comparison of SDL versions
- **Generators** — 12 registry-backed artifact types + 5 direct API generators, each carrying a confidence tier (`deterministic`, `inferred`, or `advisory`)
- **Progress Tracker** — Verification spec derivation for build progress

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose SDL schema changes.

## License

Apache-2.0
