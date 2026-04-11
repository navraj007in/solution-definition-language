# Phase 1 Worklist

Purpose: restore one canonical SDL contract across docs, examples, schema references, and public APIs before adding new features.

## In Progress

- Separate truly canonical generated surfaces from stale generated type declarations.

## Remaining

- Add support-level labeling per section:
  - documented
  - schema-validated
  - normalized
  - generator-consumed
- Add an AI authoring quick reference for canonical values and required sections.

## Completed

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
