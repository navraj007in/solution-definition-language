# SDL v1.1 Schema Reference

Solution Design Language (SDL) is a YAML-based specification for capturing complete software architecture decisions. This reference summarizes the active `v1.1` document structure and points back to the full normative specification.

## Status

- `v1.1` is the active SDL version.

## Authority Hierarchy

When sources conflict, resolve in this order:

1. **[`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md)** — normative specification. All validation rules, allowed fields, and semantic constraints are defined here. This document is the single source of truth.
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
| `techDebt` | array | Known debt and remediation planning |
| `contracts` | object | REST, GraphQL, and gRPC contract definitions |
| `domain` | object | Entity definitions, fields, relationships, constraints |
| `features` | array | Product delivery phases with feature definitions |
| `compliance` | object | Regulatory and residency requirements |
| `slos` | object | Service-level objectives and indicators |
| `resilience` | object | Circuit breakers, retries, timeouts, fallbacks |
| `costs` | object | Infrastructure and third-party cost model |
| `backupDr` | object | Recovery objectives, replication, failover |
| `design` | object | Design tokens, theming, component library |

## Section Guide

### `solution`
Project identity, description, stage, and optional repository/region metadata.

### `architecture`
Architecture style plus project/component layout across frontend, backend, mobile, and related services.

### `data`
Primary database plus secondary stores, storage, cache, queues, and search providers.

### `contracts`
Formal API contract references for REST, GraphQL, and gRPC.

### `domain`
Detailed entity inventory with fields, relationships, indexes, and constraints.

### `features`
Product delivery planning across phases, with explicit feature dependencies and flags.

### `compliance`
Framework applicability, data residency, certifications, and retention policy.

### `slos`
Availability, latency, throughput, error-rate targets, SLIs, and alert definitions.

### `resilience`
Retries, circuit breakers, bulkheads, timeouts, rate limits, and fallbacks.

### `costs`
Infrastructure, third-party, total, and scaling-cost projections.

### `backupDr`
Backup frequency, RTO/RPO, replication, site failover, and recovery procedures.

### `design`
Design tokens, themes, libraries, typography, spacing, shadows, and layout modes.

## Document Structure Example

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
techDebt: []

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

The current implementation surface is narrower than some narrative examples in the full spec. In particular:

- `contracts` is currently modeled as an object containing `apis`
- `features` is currently modeled as an array in the active schema and exported types
- `slos` is currently modeled as an object in the active schema and exported types

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
