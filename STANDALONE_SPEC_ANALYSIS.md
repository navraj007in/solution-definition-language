# SDL Standalone Spec Completion Analysis

Date: 2026-04-11
Repository: `solution-definition-language`
Scope: SDL as a standalone specification, independent of implementation convenience claims

## Executive Summary

SDL v1.1 is a credible architecture specification with a strong implementation base, but it is not yet a fully complete standalone language specification.

The core of the language is in good shape:

- there is a clear core document model
- there is a working schema
- the compiler pipeline is real
- examples compile
- generators prove the model has practical leverage

The main issue is not that SDL is vague. The issue is that the standalone spec surface is broader than the stable contract.

In practical terms:

- the core architecture-and-delivery spec is usable now
- the extended sections are only partially formalized
- several docs still describe shapes or semantics that are not the active contract
- some claimed validation rules are not actually implemented
- some “future-facing” sections are present more as placeholders than as finished spec modules

Assessment:

- Core standalone spec maturity: strong
- Whole-language standalone spec maturity: medium
- Fully complete normative spec status: not complete

Estimated completion as a standalone spec:

- core SDL: 80-85%
- full v1.1 language as documented: 60-70%

## What “Standalone Spec Complete” Should Mean

For SDL to count as complete as a standalone specification, all of the following need to be true:

1. The spec must define one authoritative contract for every section and enum.
2. The schema, exported types, and prose spec must describe the same shapes.
3. Semantic validation claims in the spec must exist in the executable validator or be clearly marked aspirational.
4. Every documented section must have an explicit maturity level: stable, partial, experimental, or placeholder.
5. Every example in docs must compile against the active contract.
6. Generated declaration files must match the runtime contract closely enough for downstream consumers to rely on them.

SDL does not fully meet that bar today.

## Current Completion Status

### 1. Core Structural Spec

Status: mostly complete

The following areas are in reasonably good standalone-spec condition:

- `solution`
- `architecture`
- `data`
- `auth`
- `deployment`
- `nonFunctional`
- `integrations`
- `artifacts`

Why:

- canonical enums are defined
- shapes are enforced enough to reject stale vocabulary
- normalizer behavior is documented
- generators consume these sections heavily
- examples and tests exercise them thoroughly

Relevant files:

- [reference/canonical-contract.md](/Users/nexper/Documents/GitHub/solution-definition-language/reference/canonical-contract.md:1)
- [packages/sdl/src/schema/sdl-v1.1.schema.json](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/schema/sdl-v1.1.schema.json:1)
- [packages/sdl/src/types.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/types.ts:7)
- [reference/section-support.md](/Users/nexper/Documents/GitHub/solution-definition-language/reference/section-support.md:20)

Conclusion:

The core SDL architecture spec is sufficiently formalized to stand on its own.

### 2. Extended Structural Sections

Status: partially complete

The following sections exist in the active contract, but remain narrower in reality than some docs imply:

- `contracts`
- `domain`
- `features`
- `compliance`
- `slos`
- `resilience`
- `testing`
- `observability`
- `constraints`
- `techDebt`
- `evolution`

These sections are not uniformly incomplete. Their issue is uneven maturity.

Some are already useful:

- `contracts`
- `domain`
- `testing`
- `observability`
- `constraints`

Some are defined but underpowered:

- `features`
- `slos`
- `compliance`
- `resilience`

Conclusion:

These sections should not all be spoken about as if they are equally mature parts of the standalone spec.

### 3. Placeholder / Advisory Sections

Status: intentionally incomplete

These sections are present in the language but should not be treated as fully realized standalone spec modules:

- `costs`
- `backupDr`
- `design`

They are currently best interpreted as extension-friendly containers for future standardization.

Conclusion:

These should remain clearly labeled experimental or placeholder until their contract is narrowed and their semantics are formalized.

## Major Gaps

### Gap 1. Contract drift across authoritative surfaces

Severity: critical

The repository still contains conflicting answers about the active SDL contract.

Examples:

- [reference/schema-reference.md](/Users/nexper/Documents/GitHub/solution-definition-language/reference/schema-reference.md:24) still lists root `environments`, `contracts` as `object/array`, `features` as `object`, and `slos` as `array`.
- [packages/sdl/src/types.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/types.ts:7) models no root `environments`, `contracts` as an object, `features` as an array, and `slos` as an object.
- [schema/sdl-v1.1.d.ts](/Users/nexper/Documents/GitHub/solution-definition-language/schema/sdl-v1.1.d.ts:3) still exposes stale or mixed contract shapes.

Impact:

- external consumers cannot trust a single contract surface
- AI tools can learn invalid shapes from repo docs
- “standalone spec” credibility is weakened because the spec is not self-consistent

What is missing:

- one generated canonical contract surface
- automated coherence checks across docs, schema, and types

What needs to be done:

1. Declare one artifact as normative and machine-sourceable.
2. Generate schema reference and `.d.ts` outputs from the same source of truth.
3. Add CI checks that fail when contract surfaces drift.

### Gap 2. Stale generated declaration file

Severity: critical

The root declaration file is materially stale.

Relevant file:

- [schema/sdl-v1.1.d.ts](/Users/nexper/Documents/GitHub/solution-definition-language/schema/sdl-v1.1.d.ts:3)

Problems:

- still models root `environments`
- still models `features` incorrectly
- still models `slos` incorrectly
- includes mixed old and new stage enums

Impact:

- downstream TypeScript users get the wrong contract
- standalone spec consumers may treat stale declarations as official

What is missing:

- reproducible generation for the published `.d.ts`
- a release check that ensures published declarations match runtime types

What needs to be done:

1. Regenerate `schema/sdl-v1.1.d.ts` from the active source.
2. Decide whether the root `schema/` outputs or `packages/sdl/src/schema/` outputs are canonical.
3. Add a test comparing critical section shapes between runtime types and published declarations.

### Gap 3. Spec overclaims semantic validation completeness

Severity: critical

The prose spec describes many semantic rules that the validator does not currently implement.

Relevant files:

- [spec/SDL-v1.1.md](/Users/nexper/Documents/GitHub/solution-definition-language/spec/SDL-v1.1.md:548)
- [packages/sdl/src/validator.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/validator.ts:24)

Examples of claimed rules:

- environment component reference integrity
- feature dependency integrity
- resilience service references
- circular dependency checks
- richer contracts path/service checks

Observed runtime behavior:

- validation is AJV schema validation plus contextual warnings
- there is no visible semantic validation engine implementing the claimed 26-rule set

Impact:

- the standalone spec makes stronger guarantees than the implementation supports
- users may assume impossible-to-enforce guarantees are already part of v1.1

What is missing:

- a semantic validator phase after schema validation
- a mapping between every claimed rule and executable implementation

What needs to be done:

1. Audit every prose validation rule.
2. Mark each as one of:
   - implemented
   - planned
   - removed
3. Implement missing semantic rules or remove them from the normative spec.
4. Publish a validation matrix with rule IDs and implementation status.

### Gap 4. “Environments” exists conceptually but not as a finished contract section

Severity: high

The spec and reference docs still talk about environments as if they are part of the standard contract.

Relevant files:

- [reference/schema-reference.md](/Users/nexper/Documents/GitHub/solution-definition-language/reference/schema-reference.md:27)
- [spec/SDL-v1.1.md](/Users/nexper/Documents/GitHub/solution-definition-language/spec/SDL-v1.1.md:553)
- [examples/multi-file/nexper-crm/sdl/environments.sdl.yaml](/Users/nexper/Documents/GitHub/solution-definition-language/examples/multi-file/nexper-crm/sdl/environments.sdl.yaml:1)

Current reality:

- examples store the data under `x-environments`
- runtime types place environments under `deployment.ciCd.environments`
- spec prose still references root `environments[].components`

This is a strong sign that the concept is important but undecided.

Impact:

- standalone spec readers cannot tell where environment topology belongs
- environment-specific deployment topology is not formally modelable in a stable way

What is missing:

- a final modeling decision for runtime environments

What needs to be done:

Choose one:

1. Promote a first-class `environments` section with a real schema and semantics.
2. Officially move all supported environment concerns under `deployment`.
3. Officially mark detailed environment topology as extension-only via `x-environments`.

Until that decision is made, the standalone spec is incomplete in this area.

### Gap 5. Section maturity documentation is itself inconsistent

Severity: high

The section support matrix no longer matches the implementation in some places.

Relevant files:

- [reference/section-support.md](/Users/nexper/Documents/GitHub/solution-definition-language/reference/section-support.md:37)
- [packages/sdl/src/generators/monitoring.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/generators/monitoring.ts:121)
- [packages/sdl/src/generators/coding-rules.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/generators/coding-rules.ts:1312)
- [packages/sdl/src/generators/compliance-checklist.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/generators/compliance-checklist.ts:10)

Examples:

- support matrix says `slos` is not generator-consumed, but monitoring reads it
- support matrix says `resilience` is not generator-consumed, but coding rules read it
- support matrix says `compliance` is not generator-consumed, but compliance checklist reads it

Impact:

- users underestimate the actual maturity of some sections
- other sections may be described as stronger than they are

What is missing:

- a maintained maturity inventory tied to code

What needs to be done:

1. Update the support matrix from actual generator consumption.
2. Add tests that assert documented section-consumption claims against generator code.
3. Split maturity into separate axes:
   - schema maturity
   - semantic maturity
   - generator maturity
   - documentation maturity

### Gap 6. Artifact taxonomy is not fully consolidated

Severity: medium-high

The artifact registry is mostly coherent, but AI-facing and supporting docs still lag.

Relevant files:

- [packages/sdl/src/types.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/types.ts:410)
- [packages/sdl/src/generators/index.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/generators/index.ts:21)
- [reference/ai-authoring.md](/Users/nexper/Documents/GitHub/solution-definition-language/reference/ai-authoring.md:173)

Example:

- runtime includes `compliance-checklist`
- AI authoring reference omits it from “valid artifact types”

Impact:

- standalone spec users do not know the full supported artifact namespace
- automation and AI generation can silently miss supported outputs

What is missing:

- one artifact namespace table generated from code

What needs to be done:

1. Make `ArtifactType` the canonical machine source.
2. Generate docs tables from that type.
3. Clearly distinguish registry-backed artifacts from direct generator APIs.

### Gap 7. Some sections are still half-spec, half-hint

Severity: medium-high

SDL is strongest when the document itself is authoritative. It is weaker where generators still infer too much from adjacent context.

Relevant file:

- [packages/sdl/src/generators/openapi.ts](/Users/nexper/Documents/GitHub/solution-definition-language/packages/sdl/src/generators/openapi.ts:8)

Example:

- `domain` and `contracts` are considered authoritative when present
- but generators still fall back to inferring entities from personas and core flows

This is sensible operationally, but it reveals incomplete standalone-spec closure.

Impact:

- SDL still depends partly on heuristic reconstruction
- absence of explicit sections does not always produce a hard contract boundary

What is missing:

- a clear distinction between authoritative authored inputs and inferred fallbacks

What needs to be done:

1. Define which sections are authoritative when present.
2. Define which outputs are allowed to infer missing information.
3. Mark inferred outputs clearly in documentation and metadata.
4. Consider stricter modes where some generators refuse inference.

### Gap 8. Planning and design concerns are underformalized relative to their positioning

Severity: medium

SDL claims to cover:

- feature planning
- compliance
- resilience
- cost modeling
- backup/DR
- design system definition

But these areas are not equally formalized.

The issue is not necessarily scope creep. The issue is underclassification.

Impact:

- readers may assume these are first-class stable spec modules
- the standalone spec feels broader than its actual formal depth

What is missing:

- explicit layering of the language

What needs to be done:

Classify sections into layers:

1. Core structural specification
2. Delivery and operations specification
3. Planning and advisory specification
4. Experimental extension areas

That would make SDL much easier to understand as a standalone language.

## Section-by-Section Completion Assessment

| Section | Standalone Spec Status | Main Missing Pieces |
|---|---|---|
| `solution` | strong | none significant |
| `product` | good | clearer normative role versus advisory role |
| `architecture` | strong | richer dependency semantics if desired |
| `auth` | good | semantic validation of provider/strategy combinations could deepen |
| `data` | strong | richer cross-entity semantics |
| `integrations` | good | ownership and contract linkage could be formalized more |
| `nonFunctional` | good | tighter metric/unit semantics |
| `deployment` | good | environment topology unresolved |
| `testing` | partial | stronger semantics beyond framework names |
| `observability` | partial-good | formal alert/SLI model still shallow |
| `constraints` | partial | only lightly consumed and validated |
| `techDebt` | partial | mostly descriptive |
| `evolution` | partial | mostly advisory |
| `contracts` | partial | richer contract linkage and references |
| `domain` | partial-good | stronger relationships and constraints semantics |
| `features` | partial | dependencies/phases not fully standardized |
| `compliance` | partial | stronger normalized shapes and semantics |
| `slos` | partial | formal metric/window/error-budget semantics |
| `resilience` | partial | per-service targeting and stronger semantics |
| `costs` | incomplete | no finished formal model |
| `backupDr` | incomplete | no finished formal model |
| `design` | incomplete | no finished formal model |

## What Is Missing Before SDL Can Be Called a Complete Standalone Spec

The following items are the real completion checklist.

### A. Contract Consolidation

Missing:

- one authoritative source for shapes and enums
- generated secondary docs and declarations

Needs to be done:

1. Choose the authority order and enforce it in CI.
2. Remove stale hand-maintained contract mirrors.
3. Regenerate and verify all downstream contract artifacts.

### B. Semantic Validation Completion

Missing:

- executable implementation of claimed semantic rules

Needs to be done:

1. Build a semantic validation layer after schema validation.
2. Add rule IDs and tests for every normative rule.
3. Separate blocking errors from advisory warnings.

### C. Environment Modeling Decision

Missing:

- canonical model for environment topology and deployment stages

Needs to be done:

1. Decide whether environments are root-level, deployment-level, or extension-only.
2. Update spec, schema, types, examples, and docs together.

### D. Extended Section Formalization

Missing:

- deeper and more consistent contracts for `features`, `slos`, `compliance`, `resilience`, `backupDr`, `design`, and `costs`

Needs to be done:

1. Pick which sections are promoted in v1.2 versus kept experimental.
2. Narrow their shapes.
3. Define their semantics precisely.
4. Add generator or validator consumers where appropriate.

### E. Documentation Reliability

Missing:

- guaranteed consistency across reference docs

Needs to be done:

1. Add tests that compile README and spec snippets.
2. Add doc linting for section shape examples.
3. Generate support tables from code when possible.

### F. Published Consumer Contract Reliability

Missing:

- trustworthy published `.d.ts`
- trustworthy schema-reference tables

Needs to be done:

1. Regenerate consumer artifacts on release.
2. Add release-time diff checks.
3. Version and publish only verified outputs.

## Recommended Work Plan

### Phase 1. Fix Contract Coherence

Priority: highest

Tasks:

1. Regenerate `schema/sdl-v1.1.d.ts`.
2. Remove stale root `environments` references unless formally supported.
3. Align `reference/schema-reference.md` with the active runtime contract.
4. Align artifact-type documentation with `ArtifactType`.
5. Update support matrix to reflect current generator consumption.

Success criteria:

- no contract surface disagrees on core shapes
- all docs reflect the same v1.1 model

### Phase 2. Split Normative vs Aspirational Spec

Priority: highest

Tasks:

1. Mark implemented rules versus planned rules in `spec/SDL-v1.1.md`.
2. Move future ideas into a roadmap or “planned extensions” appendix.
3. Keep the normative spec tightly matched to runtime reality.

Success criteria:

- readers can tell what v1.1 guarantees today
- no prose requirement exists without clear status

### Phase 3. Implement Missing Semantic Validation

Priority: high

Tasks:

1. Add a semantic validation pass.
2. Implement reference-integrity rules incrementally.
3. Add rule-level tests and error codes.

Success criteria:

- major cross-reference invariants are actually enforced
- validation section of the spec becomes trustworthy as a standalone guarantee

### Phase 4. Formalize Environment Modeling

Priority: high

Tasks:

1. Decide final placement and shape for environment topology.
2. Migrate examples from `x-environments` if promotion is chosen.
3. Add generator and validation consumption as needed.

Success criteria:

- environment topology has one official home
- docs and examples no longer conflict

### Phase 5. Promote or Demote Extended Sections

Priority: medium-high

Tasks:

1. Decide which of `features`, `slos`, `compliance`, `resilience`, `costs`, `backupDr`, and `design` are real near-term spec surfaces.
2. Promote only the ones with clear shape, semantics, and consumers.
3. Explicitly demote the others to extension or experimental status.

Success criteria:

- the language breadth matches the actual maturity story

## Recommended Acceptance Criteria For “Standalone Spec Complete”

SDL should not be described as complete as a standalone spec until all of these are true:

1. No stale contract mirrors remain in published docs or declaration files.
2. Every normative field shape is identical across canonical contract, schema, and types.
3. Every normative validation rule is implemented or removed from the spec.
4. Every documented section is classified accurately by maturity.
5. Environment modeling is formally resolved.
6. Examples and docs are CI-validated against the active contract.
7. Published consumer artifacts are generated from the same source as runtime types.

## Final Assessment

SDL is already a strong architecture DSL and a useful implementation platform.

What it is not yet:

- a fully closed standalone language specification
- a fully trustworthy public contract across every published surface
- a uniformly complete model for all areas it claims to cover

The path to completion is straightforward:

- reduce contract drift
- separate normative from aspirational content
- implement the missing semantic rules
- formalize unresolved sections, especially environments and the future-facing modules

If those steps are completed, SDL can credibly move from “strong implementation with partial spec overreach” to “fully self-consistent standalone specification.”
