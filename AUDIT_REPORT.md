# SDL Audit Report

Date: 2026-04-11
Repository: `solution-definition-language`
Scope: specification coherence, schema and type design, generator surface, and AI reliability

## Executive Summary

SDL is a credible concept with a materially useful reference implementation. This repository is not a speculative DSL prototype: it parses, validates, normalizes, resolves modular imports, and generates multiple downstream artifacts from a shared SDL document. The core implementation is disciplined enough to be useful.

The main problem is not absence of capability. It is contract drift.

Several parts of the repo currently present different answers to basic questions such as:

- what the canonical vocabulary is
- which sections and shapes are normative
- which artifact names are part of the public contract
- which generated outputs are deterministic versus advisory

That drift weakens the central promise of SDL as a single source of truth. The implementation is ahead of the documentation and, in some places, ahead of the published schema narrative. If the project is meant to be adopted by other teams or used reliably by AI tools, coherence must become the top priority.

## Overall Assessment

Rating: strong concept, solid implementation base, moderate governance and contract risk

What is working:

- The core compile pipeline is clean and practical.
- Multi-file composition is implemented, which is necessary for serious use.
- The repo has meaningful automated test coverage.
- The schema is opinionated enough to drive real outputs.
- The generator set demonstrates real leverage from structured architecture data.

What is not yet working well enough:

- Public docs, examples, schema, and types do not consistently describe the same language.
- Some v1.1 sections are richly documented in prose but remain shallow in schema and type shape.
- Artifact naming is inconsistent across docs and implementation.
- The project markets generators of very different confidence levels as if they were equally authoritative.
- AI-facing authoring guidance is not yet strict enough for reliable generation.

## Methodology

This audit reviewed:

- top-level docs and spec: `README.md`, `spec/SDL-v1.1.md`, `reference/*`
- public implementation surface: `packages/sdl/src/index.ts`
- validator, normalizer, resolver, and generator registry
- SDL type definitions and JSON schema
- examples, templates, and tests

Validation run:

- `npm test` in `packages/sdl` passed with 432 tests and 0 failures on 2026-04-11

## Strengths

### 1. The core architecture is correct

The implementation follows the right sequence for a language toolchain:

- parse
- validate
- normalize
- resolve imports
- generate outputs

Relevant files:

- `packages/sdl/src/index.ts`
- `packages/sdl/src/validator.ts`
- `packages/sdl/src/normalizer.ts`
- `packages/sdl/src/resolver.ts`

This is the right foundation for a serious intermediate representation.

### 2. Modular SDL is a strong design choice

Support for `imports` and module merging is one of the best decisions in the repo. Large solution definitions become unusable when forced into a single file. The multi-file examples show the format scaling past toy documents.

Relevant files:

- `packages/sdl/src/resolver.ts`
- `examples/multi-file/medchat/solution.sdl.yaml`
- `examples/multi-file/nexper-crm/solution.sdl.yaml`

### 3. Tests are a real asset

The repo has broad test coverage over parsing, validation, normalization, diffing, templates, and generators. This materially increases trust in the implementation.

Relevant files:

- `packages/sdl/src/__tests__/compile.test.ts`
- `packages/sdl/src/__tests__/validator.test.ts`
- `packages/sdl/src/__tests__/generators.test.ts`
- `packages/sdl/src/__tests__/generators-coverage.test.ts`

### 4. The schema is usefully opinionated

SDL is not trying to be a vague metadata bag. It captures architecture style, projects, auth, data, deployment, testing, observability, and other delivery concerns in a way that can support validation and generation.

This is the right direction. A language like this only becomes valuable when it is restrictive enough to support meaningful automation.

## Findings

### Finding 1. Canonical vocabulary drift across README, spec, types, and examples

Severity: High

The repository does not consistently expose one canonical vocabulary for SDL values.

Examples:

- `README.md` uses `stage: mvp`, while implemented examples and types use `MVP`.
- `README.md` uses `framework: next` and `framework: express`, while the implemented types use values like `nextjs` and `nodejs`.
- `README.md` uses `strategy: jwt`, while implemented auth strategy values in types are `oidc`, `passwordless`, `magic-link`, `api-key`, and `none`.

Relevant files:

- `README.md`
- `examples/single-file/taskflow.yaml`
- `packages/sdl/src/types.ts`

Impact:

- A user can follow the README and produce invalid SDL.
- AI tools trained on repository examples can learn the wrong vocabulary.
- The single-source-of-truth claim is weakened because the public contract is ambiguous.

Recommendation:

- Treat the schema and exported types as canonical.
- Update README, examples, and templates to match exactly.
- Add a doc-validation test that parses all README snippets and examples.

### Finding 2. v1.1 prose specification is richer than the implemented schema and types

Severity: High

The v1.1 spec describes significantly richer structures than the schema and TypeScript model currently enforce for several newer sections.

Examples:

- `spec/SDL-v1.1.md` documents detailed `contracts`, `domain`, `features`, and `slos` structures.
- `packages/sdl/src/schema/sdl-v1.1.schema.json` defines many of these sections with broad `additionalProperties: true` or simplified shapes.
- `packages/sdl/src/types.ts` models several of these sections in much simpler forms than the prose spec suggests.

Concrete mismatches:

- `contracts` is presented in the spec as a list of formal API contract definitions, but the schema models it as an object with `apis`.
- `features` is presented in the spec as phased planning with flags and dependencies, but the schema models it as an array of lightweight items and the types export `FeatureSection[]`.
- `slos` is shown in the schema reference as an array, the spec overview shows it as an object, and the types expose a simple object with `services`.

Relevant files:

- `spec/SDL-v1.1.md`
- `reference/schema-reference.md`
- `packages/sdl/src/schema/sdl-v1.1.schema.json`
- `packages/sdl/src/types.ts`

Impact:

- The normative contract is unclear.
- External tooling authors cannot tell which model to implement.
- Richly documented sections may appear supported while remaining weakly enforced.

Recommendation:

- Pick one authoritative representation for each section.
- Either reduce the prose spec to match implemented reality or deepen the schema and types to match the prose.
- Publish a section-by-section support matrix: specified, validated, normalized, generated.

### Finding 3. Artifact naming is inconsistent across docs and implementation

Severity: High

The generator documentation and public implementation do not describe the same artifact taxonomy.

Examples:

- `reference/generators.md` refers to artifact types such as `docker-compose`, `kubernetes`, `terraform`, `nginx`, and `ci-cd`.
- `packages/sdl/src/types.ts` exports `ArtifactType` values such as `architecture-diagram`, `repo-scaffold`, `iac-skeleton`, `coding-rules`, and `coding-rules-enforcement`.
- `packages/sdl/src/generators/index.ts` exposes some generators directly by function, but the registry behind `generate()` and `generateAll()` covers only a subset of outputs.

Impact:

- It is not clear which artifact names are valid in `artifacts.generate`.
- The public generator API surface is harder to learn than necessary.
- Users may expect outputs that are not actually registry-backed.

Recommendation:

- Define one canonical artifact namespace.
- Separate "registry-backed artifact types" from "direct utility generators" if both are needed.
- Align docs, types, and examples around that one naming system.

### Finding 4. The project has blurred boundaries between architecture spec, delivery spec, and planning spec

Severity: Medium

SDL now spans:

- architecture and topology
- product context
- compliance and resilience
- cost modeling
- feature planning
- design system concerns
- AI coding conventions

This is not inherently wrong, but the repo does not clearly define where SDL ends and derivative planning/advisory layers begin.

Relevant files:

- `spec/SDL-v1.1.md`
- `packages/sdl/src/types.ts`
- `reference/generators.md`

Impact:

- The language can feel broader than its name implies.
- It becomes harder to know which fields are foundational versus optional overlays.
- Extensibility gets riskier because unrelated concerns accumulate at the same abstraction layer.

Recommendation:

- Do not cut scope immediately. The current breadth is not inherently a flaw.
- The immediate problem is that scope breadth is not classified clearly enough for the current level of contract maturity.
- Explicitly define SDL layers:
  - intent and product context
  - architecture and system structure
  - delivery and operations
  - derived and advisory outputs
- Mark sections as core, optional-structural, and optional-advisory.

Assessment:

- The current scope is best described as underclassified rather than definitively overbroad.
- Only cut or demote sections after classification makes clear that they have no stable contract or implementation leverage.

### Finding 5. Normalization adds value but obscures explicit versus inferred intent

Severity: Medium

Normalization is pragmatic and useful, but it currently happens in a way that can hide which values were authored versus inferred.

Examples from `packages/sdl/src/normalizer.ts`:

- default region
- derived database name
- default project type
- default runtime from cloud
- default CI/CD provider
- ORM inference

Impact:

- Users and AI tools may overread normalized output as if it were original intent.
- Review workflows become weaker because inferred assumptions are not surfaced distinctly.

Recommendation:

- Add an inference report or normalized diff to the compile result.
- Mark fields as explicit or inferred when returning normalized documents.
- Document which defaults are stable policy versus convenience heuristics.

### Finding 6. The schema is stricter in some core areas and too permissive in newer areas

Severity: Medium

The core SDL sections are reasonably structured, but several v1.1 additions are effectively placeholder-shaped in the schema.

Examples:

- `contracts`, `domain`, `compliance`, `resilience`, `costs`, `backupDr`, and `design` rely heavily on permissive object shapes.
- This undermines the value of having those sections in a formal language at all.

Relevant file:

- `packages/sdl/src/schema/sdl-v1.1.schema.json`

Impact:

- Validation confidence is uneven across the document.
- Consumers may assume guarantees that do not actually exist.

Recommendation:

- Tighten schema coverage incrementally for new sections.
- Publish maturity levels per section.
- Avoid marketing sections as "complete" if they are only lightly validated.

### Finding 7. Generator scope is useful but conceptually overextended

Severity: Medium

The repository includes generators that vary widely in determinism and authority.

Stronger generator categories:

- OpenAPI
- data model
- scaffolding
- CI/CD and infrastructure-adjacent outputs

Weaker or more advisory categories:

- backlog
- ADR draft generation
- cost estimate
- coding rules
- deployment guides

Impact:

- Users may over-trust soft generators.
- The product story becomes harder to explain.
- Maintenance cost grows because every new section can imply another generator.

Recommendation:

- Classify generators into tiers:
  - deterministic
  - inferred
  - advisory
- Reflect that classification in docs and public APIs.

### Finding 8. AI reliability support exists, but the contract is not yet optimized for machine authoring

Severity: Medium

The repo includes AI-oriented material such as `reference/sdl-knowledge.md` and coding-rules generation, but machine authoring reliability is still limited by vocabulary drift and incomplete section formalization.

Impact:

- AI tools can produce invalid SDL from public examples.
- Agents do not have a compact machine-first canonical reference for allowed values, aliases, and deprecations.
- Inferred defaults are not explicit enough for agent reasoning.

Recommendation:

- Add an AI authoring reference with:
  - valid enums
  - deprecated aliases
  - required sections
  - support levels per section
- Include explicit normalization output in compile results.
- Add test fixtures specifically for AI-authored edge cases.

Priority note:

- AI reliability should not be treated as a late-stage enhancement.
- If AI tools are a primary authoring path, canonical naming, alias policy, and normalization transparency belong alongside contract cleanup in the first remediation phase.

### Finding 9. Documentation governance is behind implementation governance

Severity: Medium

The test suite is disciplined, but the docs do not appear to be subject to comparable contract checks.

Evidence:

- README contains stale or invalid value examples relative to the implementation.
- Reference docs disagree with schema and types in section shape and artifact naming.

Impact:

- Public trust erodes even when code quality is good.
- Adoption friction rises because users discover contradictions early.

Recommendation:

- Add CI checks that validate:
  - README snippets
  - templates
  - examples
  - reference tables derived from code or schema

### Finding 10. Package-level metadata needs cleanup

Severity: Low

The repository root license and package metadata do not align.

Evidence:

- Root `LICENSE` is Apache-2.0.
- `packages/sdl/package.json` declares `UNLICENSED`.

Impact:

- Packaging and external reuse posture are unclear.

Recommendation:

- Align package metadata with repository licensing intent.

## Design Assessment

## What SDL Is Becoming

In practice, SDL is becoming a structured operating specification for software delivery, not just an architecture description language.

That can be a strength if it is made explicit.

It should be described as:

- a canonical solution model
- with validation and normalization
- capable of driving deterministic and advisory outputs

It should not be described as if every documented section is already equally formalized or equally authoritative.

## Key Design Tension

There is a healthy tension in the project:

- broader scope increases leverage
- broader scope also increases inconsistency risk

The right move now is not to add more sections. It is to increase coherence and declare section maturity clearly.

## Prioritized Remediation Plan

### Phase 1. Restore one canonical contract

1. Align README examples with actual schema and type vocabulary.
2. Align templates and reference docs with the same vocabulary.
3. Resolve root section shape mismatches for `contracts`, `features`, `slos`, and debt naming.
4. Standardize artifact names and registry exposure.
5. Publish a compact AI authoring reference covering canonical values, deprecated aliases, and required sections.
6. Define an alias and deprecation policy: either normalize accepted aliases explicitly or reject them uniformly.

Exit criteria:

- A user can learn SDL from docs without producing invalid YAML.
- Types, schema, and examples all describe the same contract.
- AI tools can generate baseline-valid SDL without depending on stale examples or implicit vocabulary guesses.

### Phase 2. Make support levels explicit

1. Publish a support matrix per section:
   - documented
   - schema-validated
   - normalized
   - generator-consumed
2. Tighten schema coverage for v1.1 sections with the highest leverage.
3. Mark lightly enforced sections as experimental if needed.

Exit criteria:

- Consumers can tell which sections are stable and which are still evolving.

### Phase 3. Separate generator confidence tiers

1. Classify generators as deterministic, inferred, or advisory.
2. Update docs and APIs to reflect those tiers.
3. Prevent advisory outputs from being presented as hard guarantees.

Exit criteria:

- The generator story becomes easier to trust and easier to maintain.

### Phase 4. Optimize for AI reliability

1. Publish a compact AI authoring guide.
2. Formalize aliases and deprecations or reject them uniformly.
3. Return inference metadata from normalization and compile operations.
4. Add fixtures that simulate imperfect but realistic AI-authored SDL.

Exit criteria:

- AI tools can author SDL with materially lower error rates.

Note:

- The first two items in this phase should begin during Phase 1, not after it.
- The remaining work in Phase 4 is deeper operational support, especially inference metadata and AI-specific robustness testing.

## Recommended Deliverables

The following concrete outputs would materially improve the project:

- canonical naming table for enums and artifacts
- schema-to-doc generated reference pages
- support maturity matrix per SDL section
- normalization/inference report in compile output
- doc-validation test suite
- AI authoring quick reference

## Final Judgement

SDL in this repository is conceptually strong and unusually concrete. The implementation demonstrates that the idea has real leverage. The current risk is not that the language is empty. The risk is that it is growing faster than its contract discipline.

If the next phase focuses on coherence, section maturity, and explicit confidence levels, SDL can become a credible solution model for both humans and AI systems. If the next phase focuses mainly on adding more sections and generators, the project will accumulate ambiguity faster than value.

## Directional Recommendation on Spec Depth

Where the prose spec is richer than the implemented schema and types, the recommended sequence is:

1. reduce prose and reference docs to match implemented reality
2. mark richer structures as planned or aspirational rather than current
3. deepen schema and types later, section by section, where there is clear implementation demand

This is preferable to immediately expanding the formal contract to match ambitious prose. It restores trust faster, lowers adoption risk, and gives the project room to harden each section deliberately.
