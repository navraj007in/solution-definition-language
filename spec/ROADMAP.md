# SDL Language Roadmap

This document describes the planned evolution of the Solution Design Language (SDL) specification. It is the authoritative source for what the language will support, in what order, and why.

Audience: teams implementing SDL tooling, authors writing SDL documents, and contributors proposing spec changes.

For delivery phases of the discovery tooling built on top of SDL, see [`ROADMAP.md`](../ROADMAP.md). (There is no separate reference-package roadmap; package work is tracked in [`CHANGELOG.md`](../CHANGELOG.md).)

---

## Current State — v1.1

SDL v1.1 is the active specification. It defines 23 root sections across four maturity levels. See [`reference/section-support.md`](../reference/section-support.md) for the full matrix.

| Maturity | Sections |
|---|---|
| **stable** | `solution`, `product`, `architecture`, `auth`, `data`, `integrations`, `nonFunctional`, `deployment`, `artifacts` |
| **partial** | `testing`, `observability`, `constraints`, `techDebt`, `evolution`, `contracts`, `domain`, `slos`, `compliance`, `resilience` |
| **minimal** | `features` |
| **placeholder** | `costs`, `backupDr`, `design` |

The stable and partial groups are normatively defined, validated, and consumed by at least one generator (`contracts` → `openapi`, `domain` → `data-model`, `slos` → `monitoring`, `compliance` → `compliance-checklist`, `resilience` → `coding-rules`). The minimal group has enforced schema shapes but no generator consumer yet. The placeholder group accepts any content and has no enforcement or outputs. This table matches [`reference/section-support.md`](../reference/section-support.md), which is the row-by-row source of truth.

---

## Planned — v1.2

### 1. Close the leverage loop on `contracts` and `domain`

**Status: partially delivered in v1.1.** The `openapi` generator consumes `contracts.apis[]` (tags and API type annotation) and the `data-model` generator consumes `domain.entities[]` as its authoritative entity source. Both sections are `partial` maturity today. What remains for v1.2 is the promotion to `stable`: richer server stubs, security schemes, and path groupings from `contracts.apis[]`, and fully entity-driven ORM schemas and ERDs from `domain.entities[]` without fallback inference.

**`contracts` specification:**

SDL is intentionally **not** an API description language — that role belongs to OpenAPI, GraphQL SDL, gRPC `.proto`, and AsyncAPI. SDL's job is to record the *inventory* of API surfaces, not their per-operation contracts.

- `contracts.apis[]` is the authoritative inventory of a solution's API surfaces (one entry per surface, not per operation)
- Each entry: `name` (required), `type` (rest | graphql | grpc | webhook | asyncapi), `owner`
- Extension fields (`x-`) accepted for richer detail and pointers to external spec files (e.g. `x-spec-path: ./openapi/api-server.yaml`, `x-version`, `x-base-path`)
- Tooling that generates API-related artifacts (catalogs, ownership reports, gateway registration) must consume `contracts.apis[]`; tooling that needs per-operation detail must consume the externally referenced OpenAPI/GraphQL/gRPC/AsyncAPI file, **not** SDL
- Cross-cutting wire-shape decisions that apply solution-wide (e.g. error envelope, auth scheme conventions) belong under `architecture` — see `architecture.errorConventions`. Per-operation detail does not

**`domain` specification:**
- `domain.entities[]` becomes the authoritative declaration of the solution's data model
- Normative outputs must reference `domain.entities[]` when producing schema or data-related artifacts
- Each entity: `name` (required), `fields[]` (name + type required), `description`, `table`, `indexes`, `constraints`, `relationships`
- Field attributes: `nullable`, `primaryKey`, `foreignKey`, `unique`, `generated`, `default`, `enum`, `maxLength`, `precision`, `scale`, `onUpdate`, `description`
- Tooling that generates ORM schemas must consume `domain.entities[]` in preference to inferring from personas or flows

**Promotion:** ~~Both sections move from `minimal` to `partial` in the section support matrix.~~ Done in v1.1. The v1.2 target is `partial` → `stable`.

---

### 2. Formalize or retire placeholder sections

Each placeholder section must pass a test before being promoted to `minimal`:

> Can a useful, deterministic or inferred output be produced from this section? If yes, define the normative shape. If no, document the section as out of scope for this version.

**`slos` — promoted to `partial` in v1.1**
The `services[]` shape (`name`, `availability`, `latencyP95`) drives alert threshold configuration in the `monitoring` generator today.

Normative shape (already enforced):
```yaml
slos:
  services:
    - name: string          # required
      availability: string  # e.g. "99.9%"
      latencyP95: string    # e.g. "200ms"
      x-*: ...              # extension fields for richer SLO detail
```

**`resilience` — promoted to `partial` in v1.1**
The `coding-rules` generator emits resilience pattern rules from circuit breaker, retry, timeout, and rate limit config today.

Normative shape (already enforced):
```yaml
resilience:
  circuitBreaker:
    enabled: boolean
    threshold: integer        # failure % before opening
    timeout: string           # e.g. "30s"
  retryPolicy:
    maxAttempts: integer
    backoff: exponential | linear | fixed
    initialInterval: string
  timeout:
    default: string
  rateLimit:
    requestsPerMinute: integer
  x-*: ...
```

**`compliance` — promoted to `partial` in v1.1**
The `compliance-checklist` generator consumes `compliance.frameworks[]` today, and the normalizer lifts the shorthand declarations (`nonFunctional.compliance.frameworks`, `constraints.compliance`) into this canonical section.

Normative shape (already enforced):
```yaml
compliance:
  frameworks:
    - name: string     # required — GDPR | HIPAA | SOC2 | PCI-DSS | ISO27001 | SOX
      applicable: boolean
      requirements:
        - requirement: string
          implementation: string
      x-*: ...
  x-*: ...
```

**`costs` — mark as experimental, no normative shape in v1.2**
Cost structures are too provider- and team-specific to formalize without a concrete normative output. Remain permissive. Authors may use `x-` extensions freely.

**`backupDr` — mark as experimental, no normative shape in v1.2**
Backup and DR procedures vary significantly across hosting providers and team capabilities. Remain permissive until a concrete use case justifies formalization.

**`design` — mark as intentionally open**
Design system content is intentionally heterogeneous. The section will remain permissive by design. No promotion planned.

---

### 3. Migration and versioning policy

**Problem:** Authors using stale vocabulary or old section shapes have no automated path to upgrade. The v0.1 spec was deleted but no migration tooling was provided.

**SDL version semantics:**
- `sdlVersion` is a language contract version, not a package version
- A change is a **minor version** (1.1 → 1.2) if it adds new optional sections or tightens optional field validation in a way that does not break existing valid documents
- A change is a **major version** (1.x → 2.0) if it removes or renames required sections, changes required field shapes, or removes valid enum values
- Tooling must declare which `sdlVersion` values it supports

**Migration specification:**
- A normative migration map must exist for every breaking change
- The migration map is machine-readable: `{ from, to, transform }` per field
- SDL tooling that supports a target version must be able to detect and report documents authored for older versions
- Automated migration is opt-in — tooling may offer it but must not silently rewrite documents

**v1.1 → v1.2 migration map (non-breaking):**
No breaking changes are planned for v1.2. All additions are new optional sections or new optional fields on existing sections.

---

### 4. `features` section specification

**Problem:** `features` has an enforced array shape but no normative semantics. A feature is currently just `name` + `priority` + optional `description`.

**Proposed normative shape (v1.2):**
```yaml
features:
  - name: string                                    # required
    description: string
    priority: critical | high | medium | low
    stage: MVP | Growth | Enterprise                # which stage this ships in
    status: planned | in-progress | done | deferred
    x-*: ...                                        # phase, flags, dependencies via extension
```

`stage` aligns features to the solution lifecycle. `status` enables progress tracking against the spec. Both are optional — the section remains usable without them.

---

## Not Planned for v1.2

The following are explicitly out of scope for v1.2 to keep the specification focused:

- **Dependency graph between sections** — e.g. `contracts.apis[].owner` referencing a `team` definition. Cross-section references add validation complexity that outweighs the benefit at this stage.
- **Executable constraints** — e.g. asserting that `nonFunctional.availability.target` is achievable given `deployment.cloud`. This is tooling-level analysis, not spec-level definition.
- **SDL composition beyond imports** — e.g. inheritance, mixins, or overlays. The current `imports` mechanism covers the primary use case.

---

## Versioning History

| Version | Status | Key additions |
|---|---|---|
| v0.1 | Retired | Initial prototype. Removed — see CHANGELOG.md. |
| v1.1 | Active | Full section set, modular imports, AI authoring guidance, generator tiers |
| v1.2 | Planned | `contracts` and `domain` leverage, `slos`/`resilience`/`compliance` formalization, `features` enrichment, migration policy |
