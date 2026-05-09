# Changelog

## Unreleased

### Added

- `architecture.errorConventions` — solution-wide error envelope, status↔code mapping, and default retry policy. Cross-cutting architectural decision used to generate error middleware, typed SDK error classes, and OpenAPI `ErrorEnvelope` schemas. Spec section in `spec/SDL-v1.1.md`; canonical enums in `reference/canonical-contract.md`; full field surface in the JSON schema.
- `Endpoint*` and `ErrorConventions` TypeScript types mirrored into `packages/sdl/src/types.ts` and `packages/sdl/src/schema/sdl-v1.1.d.ts` (the package-internal `.d.ts` had been stale).
- **`imports[]` ergonomic forms (Form B and Form C).** Existing path entries (Form A — `sdl/services.sdl.yaml`) are unchanged. New: Form B drops the `.sdl.yaml`/`.sdl.yml` extension (`- sdl/services`); the resolver tries `.sdl.yaml` then `.sdl.yml`. Form C accepts an explicit `{ name, path }` object; `name` is reserved for future cross-module references and is currently used for diagnostics + duplicate-detection. Names should match `^[a-zA-Z][a-zA-Z0-9_-]*$` (kebab-case allowed). Forms may be mixed within one `imports[]` list. New `ImportEntry` and `NamedImport` types exported from `@sdl/core`. Spec changes in `spec/SDL-v1.1.md` § "Modular SDL and Import Semantics"; quick-reference in `reference/ai-authoring.md`. 12 new resolver tests cover the new shapes; existing multi-file showcase examples still pass through the unchanged Form A path.

### Removed

- Reverted typed `architecture.services[].endpoints[]` (PR #1, commit 2e87c30). SDL is intentionally not an API description language — per-operation contracts belong in OpenAPI / GraphQL SDL / gRPC / AsyncAPI files, referenced from `contracts.apis[]` via `x-` extension fields. The reverted PR would have introduced a homegrown OpenAPI-lite vocabulary inside SDL.

### Changed

- `reference/canonical-contract.md` authority order corrected to put `spec/SDL-v1.1.md` first (matches the spec's own claim of normative authority and `reference/schema-reference.md`'s hierarchy).
- `spec/SDL-v1.1.md` API Contracts Section rewritten to make the "inventory + external spec pointer" stance explicit; the prior text deferred richer shapes to a future version that will not arrive in SDL.
- `spec/ROADMAP.md` v1.2 plan for `contracts` updated: drops the "extension fields for endpoints" phrasing and reaffirms that per-operation detail belongs in external specs, not SDL.
- Two new validation rules for `errorConventions` (status range, retry-policy consistency); rule count goes from 25 to 27 active.

## v1.1.0

### Active Standard

- SDL `v1.1` is the active contract
- canonical naming and alias policy published in `reference/canonical-contract.md`
- public docs aligned to the active `v1.1` schema and runtime types
- starter templates and showcase examples validated against the active contract
- README and example corpus covered by automated tests
