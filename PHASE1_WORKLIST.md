# Phase 1 Worklist

Purpose: restore one canonical SDL contract across docs, examples, schema references, and public APIs before adding new features.

## In Progress

- Separate truly canonical generated surfaces from stale generated type declarations.

## Remaining

None. Phase 1 complete.

---

## Phase 3 — Separate Generator Confidence Tiers

### Completed

- Added `GeneratorTier = 'deterministic' | 'inferred' | 'advisory'` to `packages/sdl/src/generators/types.ts`.
- Added `tier: GeneratorTier` to `GeneratorResult` — always set by the registry, never by individual generator functions.
- Added `RawGeneratorResult = Omit<GeneratorResult, 'tier'>` as the internal return type for generator functions; updated all 16 generator files to use it.
- Added `REGISTRY_TIER_MAP` and `DIRECT_TIER_MAP` in `generators/index.ts` classifying all generators.
- Updated `generate()`, `generateAll()`, and all direct API wrappers to inject `tier` via `withTier()`.
- Exported `getGeneratorTier()` for callers that need tier without generating.
- Updated `reference/generators.md` with tier table, per-tier guidance, and advisory output section explaining what each advisory generator produces and what it does not.

---

## Phase 4 — Optimize for AI Reliability

### Completed

- Published `reference/ai-authoring.md` — compact machine-first authoring reference (Phase 1).
- Formalized alias and deprecation policy in `reference/canonical-contract.md` (Phase 1).
- Added `Inference` type to `types.ts`: `{ path, value, reason }`.
- Updated `CompileResult` to include `inferences: Inference[]`.
- Rewrote `normalizer.ts` to return `NormalizeResult = { document, inferences }` — every defaulted field now records its path, applied value, and human-readable reason.
- Updated `compile()` and `compileWithImports()` to surface `inferences` end-to-end.
- Added `normalizer.test.ts` coverage for inference array: presence, shape, correct paths, and no inference when fields are explicitly set.
- Added `ai-authoring.test.ts` — 44 fixtures across 6 categories simulating realistic AI generation mistakes:
  - Wrong enum casing (mvp, growth, Microservices)
  - Stale vocabulary (express, next, fastapi, jwt strategy, heroku)
  - Wrong section shapes (contracts as array, features as object, slos as array)
  - Invented fields without x- prefix
  - Missing required fields inside optional sections
  - Over-inference (verifying normalizer does and doesn't fire based on explicit vs. absent fields)

## Completed

- Published `reference/section-support.md` — support-level matrix per section covering schema strictness, normalization, generator consumption, and maturity level (stable / partial / minimal / placeholder).
- Added pointer from `reference/canonical-contract.md` to `reference/section-support.md`.
- Published `reference/ai-authoring.md` — compact machine-first authoring reference covering minimum valid document, all canonical enums, normalization auto-fill table, rejected legacy values, common generation mistakes, and when-in-doubt rules.
- Wired `reference/ai-authoring.md` into `reference/sdl-knowledge.md` as the top authority for AI generation and into `reference/canonical-contract.md` as a pointer.

- Wrote the repo audit in `AUDIT_REPORT.md`.
- Updated the audit to clarify scope classification, AI reliability priority, and spec-depth direction.
- Corrected visible vocabulary drift in `README.md`.
- Updated `reference/generators.md` to distinguish registry-backed artifact types from direct generator APIs.
- Updated `reference/normalization-defaults.md` to reflect implemented defaults instead of legacy mappings.
- Updated `reference/error-codes.md` to reflect current validator and warning vocabulary.
- Updated `reference/schema-reference.md` to reflect currently implemented root section shapes.
- Published `reference/canonical-contract.md` as the canonical naming and alias-policy reference for active `v1.1`.
- Updated `spec/SDL-v1.1.md` to stop overstating richer stable section shapes for `contracts`, `features`, and `slos`.
- Repointed `README.md`, `reference/sdl-knowledge.md`, `reference/schema-reference.md`, `reference/generators.md`, and `spec/SDL-v1.1.md` at the canonical contract reference.
- Corrected a stale parser help message from `0.1` to `1.1`.
- Fixed `templates/event-driven-microservices.sdl.yaml` to use an extension field for non-schema metadata.
- Added a regression test that compiles the canonical README quick example.
- Added a regression test sweep that compiles positive single-file examples and all starter templates.
- Normalized multi-file showcase examples to canonical SDL plus `x-` extensions where they intentionally exceed the stable contract.
- Added regression coverage that compiles `medchat` and `nexper-crm` through `compileWithImports()` with zero resolve errors.
