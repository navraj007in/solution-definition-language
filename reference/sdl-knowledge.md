---
name: sdl-knowledge
description: Solution Design Language (SDL) specification — schema, validation, normalization, and generation rules
---

# SDL Knowledge

## Identity

Solution Design Language (SDL) is a YAML-based architecture specification format. It captures architecture decisions in a structured document that tooling can validate, normalize, and use to generate artifacts. This guide is subordinate to the normative specification.

## Version Policy

- `v1.1` is the active SDL version.
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
- API inventories and external specification pointers
- domain models
- feature planning
- compliance requirements
- component availability and latency objectives
- resilience patterns
- open cost metadata
- open recovery metadata, alongside defined backup-posture fields
- intentionally open design metadata

## Canonical Sources

Normative authority follows the same hierarchy as the specification:

1. [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md) — normative language requirements and explicitly identified definition gaps.
2. [`reference/canonical-contract.md`](canonical-contract.md) — subordinate summary of names, shapes, and aliases.
3. Runtime JSON Schema and exported types — machine-readable derivations; implementation differences do not override the specification.

For efficient reading, start with [AI Authoring](ai-authoring.md), then consult the [section overview](schema-reference.md), [normalization reference](normalization-defaults.md), and [error-code reference](error-codes.md). Reading order is not authority order. [Completion Decisions](../spec/completion-decisions.md) records the preserved v1.1 gaps and their selected, separately versioned v2 definitions; those definitions are not v1.1 requirements.

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
- `nonFunctional`
- `observability`
- `integrations`
- `constraints`
- `testing`
- `technicalDebt` (alias `techDebt`)
- `evolution`
- `artifacts`
- `contracts`
- `domain`
- `features`
- `compliance`
- `slos`
- `resilience`
- `costs`
- `backupDr`
- `design`

There is no root-level `environments` section in v1.1. CI/CD environment declarations use `deployment.ciCd.environments[]`; D01 defines richer deployment scope for v2 only. `costs`, `backupDr`, and `design` are open v1.1 metadata, not mandatory detailed models.

## Generation Rules

When generating SDL:

1. Always write `sdlVersion: "1.1"`.
2. Use the canonical names and shapes in [`reference/canonical-contract.md`](canonical-contract.md).
3. Use `solution`, `architecture`, and `data` as the required base.
4. Add only the additional sections supported by known architecture facts.
5. Follow the v1.1 validation rules in [`spec/SDL-v1.1.md`](../spec/SDL-v1.1.md).
6. Prefer `solution.sdl.yaml` as the canonical root filename.
7. Put richer unsupported metadata under `x-` fields rather than inventing new top-level shapes.

## Validation Guidance

When validating v1.1 SDL, check:

- component references resolve correctly
- domain relationships target known entities
- service dependencies and SLO component references resolve
- applicable, fully defined compatibility rules hold
- feature values use the documented priority, stage, and status vocabulary
- unknown fields respect the closed/open object boundary

Do not invent first-class feature dependencies, per-service resilience fields, or API-owner reference semantics from earlier examples. Their definition gaps are tracked in the spec's decision record. Package support is separate from normative requirements.

## Output Expectation

The root containers are shown below as an outline; empty objects are not a valid complete document:

```yaml
sdlVersion: "1.1"
solution: {}
architecture: {}
data: {}
```

Use the [minimum valid document](ai-authoring.md#minimum-valid-document) to fill required values, then extend with relevant v1.1 sections.
