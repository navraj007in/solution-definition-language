---
name: sdl-knowledge
description: Solution Design Language (SDL) specification — schema, validation, normalization, and generation rules
---

# SDL Knowledge

## Identity

You understand the Solution Design Language (SDL) — a YAML-based architecture specification format used by arch0 to capture complete system designs. SDL transforms raw requirements into a validated, normalized intermediate representation that drives deterministic artifact generation.

## Version Policy

- `v1.1` is the active SDL version.
- `v0.1` is deprecated and should only be referenced when migrating older documents.
- For new SDL generation, always set `sdlVersion: "1.1"`.

## Core Principle

SDL sits between requirements gathering and artifact generation. The manifest captures what the user said. SDL transforms that into what the system will build, with defaults filled in, incompatibilities caught, and warnings surfaced.

## What SDL v1.1 Covers

SDL v1.1 captures:

- solution metadata and stage
- architecture style and component layout
- data stores and infrastructure
- authentication and deployment strategy
- product personas and core flows
- testing, observability, and constraints
- API contracts
- domain models
- feature planning
- compliance requirements
- SLOs and SLIs
- resilience patterns
- cost model
- backup and disaster recovery
- design system definition

## Canonical Sources

Use these files in order of authority:

1. [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md) — normative v1.1 spec
2. [`reference/schema-reference.md`](schema-reference.md) — quick v1.1 section reference
3. [`reference/normalization-defaults.md`](normalization-defaults.md) — normalization rules and mappings
4. [`reference/error-codes.md`](error-codes.md) — validation error vocabulary

## Required Root Sections

For new v1.1 SDL documents, the universally required root sections are:

- `sdlVersion`
- `solution`
- `architecture`
- `data`

Additional sections are added when relevant to the system being described.

## Recommended v1.1 Sections

Use these when the architecture requires them:

- `product`
- `auth`
- `deployment`
- `environments`
- `nonFunctional`
- `observability`
- `integrations`
- `constraints`
- `testing`
- `techDebt`
- `contracts`
- `domain`
- `features`
- `compliance`
- `slos`
- `resilience`
- `costs`
- `backupDr`
- `design`

## Generation Rules

When generating SDL:

1. Always write `sdlVersion: "1.1"`.
2. Use `solution`, `architecture`, and `data` as the required base.
3. Add only the additional sections supported by known architecture facts.
4. Follow the v1.1 validation rules in [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md).
5. Prefer `solution.sdl.yaml` as the canonical root filename.
6. Treat `v0.1` inputs as migration sources, not generation targets.

## Validation Guidance

When validating v1.1 SDL, check:

- component references resolve correctly
- contract-to-service references are valid
- domain relationships target known entities
- feature dependencies point to known features
- deployment and runtime choices are compatible
- resilience and SLO sections reference real components
- compliance and security assumptions are internally consistent

## Migration Guidance

If you encounter `v0.1` SDL:

- preserve the original for auditability
- migrate the document to `v1.1`
- add v1.1 sections incrementally where architecture detail exists
- stop treating `v0.1` as the final output format

## Output Expectation

New SDL output should look like:

```yaml
sdlVersion: "1.1"
solution: {}
architecture: {}
data: {}
```

Then extend with the relevant v1.1 sections for the system.
