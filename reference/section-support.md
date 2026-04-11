# SDL Section Support Matrix

This document declares the support level of every root SDL section in the active `v1.1` contract.

Use it to understand which sections are stable and which are still evolving, and to know exactly which toolchain stages each section participates in.

## Maturity Levels

| Level | Meaning |
|---|---|
| **stable** | Required or frequently used, strictly enough validated, normalized where applicable, consumed by multiple generators |
| **partial** | Optional but has meaningful schema structure, may be normalized or generator-consumed in narrow cases |
| **minimal** | Schema shape defined, not yet permissive, but not normalized and not generator-consumed in current release |
| **placeholder** | Present in schema with `additionalProperties: true`; documents intent but enforces nothing and drives no outputs |

## Support Matrix

| Section | Required | Documented | Schema | Normalized | Generator-consumed | Maturity |
|---|---|---|---|---|---|---|
| `solution` | yes | yes | strict | yes — `regions.primary` default | all generators | stable |
| `product` | yes (types) | yes | partial | yes — `personas`, `coreFlows` defaults | `openapi`, `data-model`, `backlog`, `sequence-diagrams`, `repo-scaffold` | stable |
| `architecture` | yes | yes | partial | yes — `projects.frontend[].type`, `projects.backend[].type` | all generators | stable |
| `auth` | no | yes | partial | no | `openapi`, `data-model`, `backlog`, `adr`, `sequence-diagrams`, `repo-scaffold`, `architecture-diagram`, `coding-rules`, `docker-compose` | stable |
| `data` | yes | yes | partial | yes — `primaryDatabase.name`, backend ORM inference | `data-model`, `backlog`, `cost-estimate`, `adr`, `sequence-diagrams`, `repo-scaffold`, `architecture-diagram`, `coding-rules`, `docker-compose`, `monitoring` | stable |
| `integrations` | no | yes | partial | no | `repo-scaffold`, `backlog`, `cost-estimate`, `deployment-guide`, `coding-rules` | stable |
| `nonFunctional` | yes (types) | yes | partial | yes — `availability.target` (stage-based), `scaling` defaults, `security.encryptionAtRest`, `security.encryptionInTransit` | `cost-estimate`, `adr`, `monitoring`, `coding-rules` | stable |
| `deployment` | yes (types) | yes | partial | yes — `cloud` (inferred), `runtime` (cloud-mapped), `networking.publicApi`, `ciCd.provider` | `backlog`, `adr`, `deployment-guide`, `coding-rules` | stable |
| `artifacts` | no | yes | partial | yes — `generate` defaults to `[]` | controls all registry-backed generation | stable |
| `testing` | no | yes | partial | yes — `unit.framework` (inferred from backend framework, if section present) | `coding-rules` | partial |
| `observability` | no | yes | partial | yes — `logging.structured`, `logging.provider` (if section present), `tracing.samplingRate` | `coding-rules`, `monitoring` | partial |
| `constraints` | no | yes | partial | no | `adr` (budget field only) | partial |
| `techDebt` / `technicalDebt` | no | yes | partial | no | `adr` | partial |
| `evolution` | no | yes | partial | no | `coding-rules` | partial |
| `contracts` | no | yes | defined — `apis[]` items have `additionalProperties: false`, `type` enum enforced | no | `openapi` reads `contracts.apis[]` for tags and API type annotation when present | partial |
| `domain` | no | yes | defined — entity items have `additionalProperties: false`; entity-level fields (`description`, `table`, `indexes`, `constraints`) enumerated; `fields[]` items have known DB attributes typed (`nullable`, `primaryKey`, `foreignKey`, `unique`, `generated`, `default`, `enum`, `maxLength`, `precision`, `scale`, `description`, `onUpdate`) with `additionalProperties: true` | no | `data-model` reads `domain.entities[]` as authoritative entity source when present | partial |
| `features` | no | yes | defined — items have `additionalProperties: false`; `priority` enum enforced; `stage` (MVP\|Growth\|Enterprise) and `status` (planned\|in-progress\|done\|deferred) added | no | none | minimal |
| `slos` | no | yes | defined — `services[]` items have `additionalProperties: false`, `name` required | no | none | minimal |
| `compliance` | no | yes | defined — `frameworks[]` items have `additionalProperties: false` with `name` required; `requirements[]` typed; `certifications`, `dataResidency`, `dataRetention` accepted as open arrays | no | none | minimal |
| `resilience` | no | yes | defined — `circuitBreaker`, `retryPolicy`, `timeout`, `rateLimit` each have typed shapes with `additionalProperties: false`; per-service detail goes in `x-` extensions | no | none | minimal |
| `costs` | no | yes | permissive — cost breakdown structures vary (per-service, third-party, scaling tiers, total) | no | none | placeholder |
| `backupDr` | no | yes | permissive — backup/DR structures vary significantly (database-level, storage, site failover, recovery procedures) | no | none | placeholder |
| `design` | no | yes | permissive — design system content is intentionally heterogeneous (tokens, themes, motion, iconography, component libraries) | no | none | placeholder |

## Column Definitions

**Required**
- `yes` — field is in `required[]` in the JSON schema root, or typed as non-optional in `SDLDocument`
- `yes (types)` — non-optional in `packages/sdl/src/types.ts` but not in schema root `required[]`; normalizer fills a default if absent
- `no` — optional

**Documented**
- All sections are currently documented in `spec/SDL-v1.1.md` and `reference/schema-reference.md`

**Schema**
- `strict` — `$defs` shape has `required` fields, `additionalProperties: false` enforced
- `partial` — `$defs` shape exists with some required fields; extension fields allowed via `x-` prefix
- `defined` — explicit shape with `additionalProperties: false` on the section root, but inner fields are not strictly required
- `permissive` — `additionalProperties: true`; schema accepts any content in this section

**Normalized**
- `yes` — normalizer applies one or more defaults to this section
- `no` — passed through as-is; no inference applied

**Generator-consumed**
- Lists the registry-backed or direct API generators that read this section
- `none` means no current generator reads this section directly

## Notes on Placeholder Sections

`compliance`, `slos`, `resilience`, `costs`, `backupDr`, and `design` are present in the schema and types as intentional future-facing stubs. They:

- accept arbitrary content today (no validation failures)
- are not read by any generator in the current release
- are not normalized
- should be treated as advisory metadata only

Do not assume these sections will be backfilled by normalization or consumed by generators without checking this document.

## Roadmap

- `contracts` → `stable` once `openapi` generates richer server stubs, security schemes, and path groupings from `contracts.apis[]`
- `domain` → `stable` once `data-model` produces fully entity-driven ORM schemas and ERDs without fallback inference
- `compliance` → `partial` once a compliance checklist generator reads `frameworks[]`
- `resilience` → `partial` once `coding-rules` emits resilience pattern rules from circuit breaker and retry config
- `slos` → `partial` once `monitoring` reads `slos.services[]` for alert threshold configuration
- `features` → `partial` once a planning-tier generator reads it
- `costs`, `backupDr` → promote only when a concrete generator use case emerges; currently experimental
- `design` → intentionally open; promote only if a design-token or component-scaffold generator is added
