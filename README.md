# Solution Design Language (SDL)

SDL is a structured YAML specification for capturing complete software architecture decisions. It serves as the single source of truth for a project's architecture — from tech stack and service boundaries to auth strategy, data model, deployment targets, and design system.

## Status

**SDL v2.0 is the active specification for the 2.x line**, published as baseline `sdl-v2.0`. It provides a self-contained field/schema contract, full-document cases, diagnostics, and a classified v1.1 migration plan.

**SDL v1.1 remains active for the 1.x line**, frozen as baseline `sdl-v1.1-2026-09-13`. `@sdl/core` (`packages/sdl/`) implements v1.1 only, so documents built with it should still target `sdlVersion: "1.1"`. Early v2 package work has started in `packages/core-v2/` (see below) but does not yet accept `sdlVersion: "2.0"` end to end.

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
          primaryKey: true
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

Every generator result carries a `tier` field: `deterministic` (a mechanical, repeatable mapping from SDL facts — the same SDL always produces the same output; this is about generation, not operational correctness, since generated CI/IaC still depends on external assumptions like provider capabilities, credentials, and mutable base images), `inferred` (heuristic-based, worth reviewing), or `advisory` (starting point — always review before use).

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

- **v1.1** — Active specification. Includes import Forms A/B/C, API inventories, domain modeling, feature `stage` and `status`, error conventions, compliance, SLOs, and resilience. Cost, recovery, and design sections carry open metadata.
- **Specification completion** — [Completion Decisions](spec/completion-decisions.md) records the selected D01–D08 designs; the [v2 specification](spec/v2/README.md) contains the consolidated contract and migration baseline while the [language roadmap](spec/ROADMAP.md) separates specification maturity from package work.
- **Package coverage** — The [Section Support Matrix](reference/section-support.md) reports validation, normalization, and generator support. Its labels do not determine whether a language requirement is normative or complete.

## Documentation

| Document | Description |
|---|---|
| **[Complexity Scoring Guide](reference/COMPLEXITY_GUIDE.md)** | **User-friendly guide to understanding system complexity scores, reduction plans, and improvement strategies** |
| [AI Authoring Guide](reference/ai-authoring.md) | Compact machine-first reference: minimum valid document, all enums, normalization auto-fill, rejected legacy values, common mistakes |
| [Canonical Contract](reference/canonical-contract.md) | Canonical enums, artifact types, root section shapes, and alias policy for active `v1.1` |
| [Section Support Matrix](reference/section-support.md) | Package support, schema strictness, normalization, and generator consumption |
| [Generators](reference/generators.md) | Generator tiers, what each produces, what SDL sections it consumes |
| [Specification v1.1](spec/SDL-v1.1.md) | Active normative specification; exact baseline `sdl-v1.1-2026-09-13` |
| [Completion Decisions](spec/completion-decisions.md) | Selected D01–D08 language designs and boundaries |
| [SDL v2 specification](spec/v2/README.md) | Active 2.x baseline `sdl-v2.0`; package implementation is [early-stage](packages/core-v2/README.md) |
| [Complexity Scoring Spec](reference/complexity-scoring.md) | Technical specification: formulas, thresholds, confidence model |
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

- [JSON Schema (v1.1)](packages/sdl/src/schema/sdl-v1.1.schema.json) — machine-readable validation schema for SDL v1.1. This is the copy `@sdl/core` compiles and the one to validate against; [`schema/sdl-v1.1.schema.json`](schema/sdl-v1.1.schema.json) is a byte-identical published mirror kept in sync by `npm run sync:schema`
- [TypeScript Types (v1.1)](packages/sdl/src/types.ts) — the type contract of record; [`schema/sdl-v1.1.d.ts`](schema/sdl-v1.1.d.ts) is the standalone declaration mirror for consumers who want types without the package

## SDL Discovery Agent

The **SDL Discovery Agent** reverse-engineers software architecture from code repositories and generates draft SDL specifications automatically.

Instead of writing SDL from scratch, run the agent on your codebase:

```bash
claude-code --agent sdl-discovery-agent --repos ./repo --output ./sdl-output
```

The agent produces:
- **Draft SDL** — modular YAML files (services, data, auth, integrations, deployment, contracts, etc.)
- **Complexity Assessment** — Architecture Complexity Index + Delivery Burden Index across 6 dimensions
- **Complexity Report** — prioritized reduction plan, risk assessment, confidence scores
- **Review Checklist** — human decision items (ambiguities, conflicts, unknowns)

**Features:**
- Evidence-based inference from code, config, and infrastructure
- Confidence scoring (HIGH/MEDIUM/LOW per component)
- Automatic complexity scoring (no configuration needed)
- Support for monorepos and polyrepos
- 6+ programming language support

**Implementation Status:**
- Phase 1 ✅ Complexity types and heuristics
- Phase 2 ✅ Complexity calculation (all 6 dimensions + report generation)
- Phase 3 (Planned) Full discovery orchestration

See [ROADMAP.md](ROADMAP.md) and [packages/agents/sdl-discovery/README.md](packages/agents/sdl-discovery/README.md) for details.

## Reference Implementation

The `@sdl/core` npm package in [packages/sdl/](packages/sdl/) provides:

- **Parser** — YAML to typed SDL document
- **Validator** — JSON Schema (AJV) + 14 semantic cross-section rules (reference integrity, uniqueness, cycle detection, config completeness, resilience thresholds, SLO ranges) + 5 structural allOf rules, all returning structured error codes. `validateDocument()` (and its alias `validate()`) run both passes; `validateSchema()` runs schema-only when you need the two reported separately
- **Normalizer** — Auto-inference of defaults; returns `{ document, inferences }` so every filled field is visible with its reason
- **Resolver** — Multi-file import resolution with merge semantics (array concatenation, object recursion, last-writer-wins scalars), circular import detection, and depth limit enforcement
- **Diff** — Structural comparison of SDL versions
- **Generators** — 13 registry-backed artifact types + 5 direct API generators, each carrying a confidence tier (`deterministic`, `inferred`, or `advisory`)
- **Progress Tracker** — Verification spec derivation for build progress

The `@sdl/core-v2` package in [packages/core-v2/](packages/core-v2/) is the early-stage v2 implementation, built directly from [spec/v2/](spec/v2/) rather than extended from `@sdl/core`. The input profile (IN-001–IN-005), part of identity/references (ID-001–ID-004), and full-document structural validation against `sdl-v2.schema.json` are implemented so far; see its [README](packages/core-v2/README.md) for the full status table and why it's a separate package.

## Roadmap

- **[SDL Discovery & Complexity Roadmap](ROADMAP.md)** — SDL Discovery Agent (Steps 1-6), complexity scoring implementation, validation, and user experience
  - **Phase 1** ✅ Foundation — types, heuristics, v1.0 spec
  - **Phase 2** ✅ Complexity Calculation — all 6 dimensions, report generation
  - **Phase 3** (Next) — Discovery orchestration and orchestration
  - **Phase 4+** — Validation, UI integration, API service, advanced features

- [SDL Language Roadmap](spec/ROADMAP.md) — planned spec evolution: section formalization, v1.2 additions, migration policy

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose SDL schema changes.

## License

Apache-2.0
