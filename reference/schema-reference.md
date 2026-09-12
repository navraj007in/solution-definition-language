# SDL v1.1 Schema Reference

Solution Design Language (SDL) is a YAML-based specification for capturing complete software architecture decisions. This reference summarizes the active `v1.1` document structure and points back to the full normative specification.

## Status

- `v1.1` is the active SDL version. This page is a section overview, not a complete normative field catalogue. Its historical definition gaps and separately versioned v2 resolutions are tracked in [Specification Completion Decisions](../spec/completion-decisions.md).

## Authority Hierarchy

When sources conflict, resolve in this order:

1. **[`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md)** — normative specification and authority for language requirements. Incomplete definitions are explicitly tracked; the hierarchy does not imply that every field's semantics have already been completed.
2. **[`canonical-contract.md`](canonical-contract.md)** — quick-reference summary of enum values, field shapes, and alias policy derived from the spec. Use this for lookup; if it disagrees with the spec, the spec wins and `canonical-contract.md` should be updated.
3. **Runtime schema and types** (`packages/sdl/src/schema/sdl-v1.1.schema.json`, `packages/sdl/src/types.ts`) — machine-executable derivations of the spec. These lag the spec during active development. When they disagree with the spec, file a bug against the package, not the spec.

> **Rule:** Do not add authority sources outside this hierarchy. If a new document needs to describe SDL, it must subordinate itself to `spec/SDL-v1.1.md` explicitly.

## Required Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `sdlVersion` | `"1.1"` | Always `"1.1"` for new SDL documents |
| `solution` | object | Project metadata |
| `architecture` | object | System structure |
| `data` | object | Data layer |

## Additional Root Fields in v1.1

| Field | Type | Description |
|-------|------|-------------|
| `product` | object | Personas, flows, value proposition |
| `auth` | object | Authentication strategy |
| `deployment` | object | Cloud, runtime, CI/CD, infrastructure |
| `nonFunctional` | object | Availability, scaling, security, performance |
| `observability` | object | Logging, tracing, metrics |
| `integrations` | object | Third-party providers |
| `constraints` | object | Budget, team, timeline, existing infrastructure |
| `testing` | object | Test framework and coverage strategy |
| `technicalDebt` / `techDebt` | array | Canonical debt spelling and accepted alias; reconciliation is described in the canonical contract |
| `evolution` | object | Evolution triggers and roadmap metadata |
| `artifacts` | object | Requested artifact types and formats |
| `contracts` | object | API surface inventory with external specification pointers |
| `domain` | object | Entity definitions, fields, relationships, constraints |
| `features` | array | Feature names, descriptions, priorities, lifecycle stages, and delivery status |
| `compliance` | object | Regulatory and residency requirements |
| `slos` | object | Per-component availability and latency objectives |
| `resilience` | object | Circuit breaker, retry, timeout, and rate-limit defaults |
| `costs` | open object | Illustrative cost metadata; no normative inner field catalogue |
| `backupDr` | open object | Illustrative recovery metadata; distinct from `nonFunctional.backup` |
| `design` | open object | Intentionally open design metadata |

## Section Guide

### `solution`
Project identity, description, stage, and optional repository/region metadata.

### `architecture`
Architecture style plus project/component layout across frontend, backend, mobile, and related services. v1.1 also defines one nested cross-cutting contract under `architecture`:

- `architecture.errorConventions` — solution-wide error envelope, status↔code mapping, and default retry policy. This expresses a v1.1 language contract; package support is tracked separately. See [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md) → *Error Conventions*. The v2 baseline resolves the historical D05 gaps without changing v1.1.

Per-operation API contracts are intentionally **not** part of SDL. Use `contracts.apis[]` for the inventory and point to external OpenAPI / GraphQL SDL / gRPC files via `x-` extension fields.

### `data`
Primary database plus secondary stores, storage, cache, queues, and search providers.

### `contracts`
An inventory of REST, GraphQL, gRPC, webhook, and AsyncAPI surfaces. Per-operation definitions belong in external specifications. API ownership and portable pointer semantics remain historical v1.1 gaps; D01/D05 define them for v2 only.

### `domain`
Entity inventory with fields and relationships. Index and constraint metadata are accepted, but complete identity, type, key, ownership, and relationship semantics remain historical v1.1 gaps; [D02](../spec/completion-decisions.md#d02--domain-types-identity-and-relationships) defines them for v2 only.

### `features`
Flat items with required `name` and optional `description`, `priority`, `stage`, and `status`. Dependencies, flags, and rollout policies use extensions; they are not first-class v1.1 fields.

### `compliance`
Framework applicability, data residency, certifications, and retention policy.

### `slos`
`services[]` entries with required component `name` and optional `availability` and `latencyP95`. Richer SLIs, windows, error budgets, and alert definitions are future language work.

### `resilience`
One solution-wide default object per pattern: `circuitBreaker`, `retryPolicy`, `timeout`, and `rateLimit`. Per-target bulkheads and fallbacks use extensions or external configuration.

### `costs`
Open metadata that may describe infrastructure, third-party, total, and scaling-cost projections. The spec's example does not standardize those inner fields.

### `backupDr`
Open recovery metadata that may describe RTO/RPO, replication, failover, and procedures. `nonFunctional.backup` is the separate defined location for backup frequency, retention, and point-in-time recovery.

### `design`
Intentionally open metadata for design tokens, themes, libraries, and layout. The illustrated design-token structure is not mandatory.

## Document Structure Example

This is a container outline, not a valid complete document. Use the [AI authoring guide](ai-authoring.md#minimum-valid-document) for a minimum document with required fields filled. `imports[]` may appear at the top level of root files or modules and is removed from the resolved document.

```yaml
sdlVersion: "1.1"

solution: {}
architecture: {}
data: {}

product: {}
auth: {}
deployment: {}
nonFunctional: {}
observability: {}
integrations: {}
constraints: {}
testing: {}
technicalDebt: []
evolution: {}
artifacts: {}

contracts:
  apis: []
domain: {}
features: []
compliance: {}
slos: {}
resilience: {}
costs: {}
backupDr: {}
design: {}
```

## Shape Notes

Container shapes are language definitions, independent of package implementation:

- `contracts` is an object with an optional `apis` array
- `features` is a flat array with optional lifecycle stage and delivery status
- `slos` is an object with an optional `services` array
- The [canonical contract](canonical-contract.md#open-metadata-and-extension-boundaries) lists the exceptions to the general closed-object policy

When in doubt, follow the authority hierarchy above: spec first, then `canonical-contract.md` for quick lookup, then runtime types. The spec always wins.

## Validation

The authoritative v1.1 validation rules are defined in [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md), including:

- reference integrity checks
- type and compatibility checks
- deployment integrity checks
- data model integrity checks
- configuration completeness checks
- resilience and performance checks
- security and PII checks
