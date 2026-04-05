# SDL v1.1 Schema Reference

Solution Design Language (SDL) is a YAML-based specification for capturing complete software architecture decisions. This reference summarizes the active `v1.1` document structure and points back to the full normative specification.

## Status

- `v1.1` is the active SDL version.
- `v0.1` is deprecated and should only be used to interpret legacy documents.
- The normative source for `v1.1` is [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md).

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
| `environments` | array | Runtime environment definitions |
| `nonFunctional` | object | Availability, scaling, security, performance |
| `observability` | object | Logging, tracing, metrics |
| `integrations` | array/object | Third-party providers |
| `constraints` | object | Budget, team, timeline, existing infrastructure |
| `testing` | object | Test framework and coverage strategy |
| `techDebt` | array | Known debt and remediation planning |
| `contracts` | object/array | REST, GraphQL, and gRPC contract definitions |
| `domain` | object | Entity definitions, fields, relationships, constraints |
| `features` | object | MVP phases, feature flags, dependencies |
| `compliance` | object | Regulatory and residency requirements |
| `slos` | array | Service-level objectives and indicators |
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
environments: []
nonFunctional: {}
observability: {}
integrations: []
constraints: {}
testing: {}
techDebt: []

contracts: {}
domain: {}
features: {}
compliance: {}
slos: []
resilience: {}
costs: {}
backupDr: {}
design: {}
```

## Validation

The authoritative v1.1 validation rules are defined in [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md), including:

- reference integrity checks
- type and compatibility checks
- deployment integrity checks
- data model integrity checks
- configuration completeness checks
- resilience and performance checks
- security and PII checks

## Deprecation Note

If you are documenting or validating a legacy `v0.1` file, use [`spec/SDL-v0.1.md`](../spec/SDL-v0.1.md) only as a migration reference. New SDL documents should be authored as `v1.1`.
