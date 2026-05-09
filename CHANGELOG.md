# Changelog

## Unreleased

### Added

- `architecture.errorConventions` — solution-wide error envelope, status↔code mapping, and default retry policy. Cross-cutting architectural decision used to generate error middleware, typed SDK error classes, and OpenAPI `ErrorEnvelope` schemas. Spec section in `spec/SDL-v1.1.md`; canonical enums in `reference/canonical-contract.md`; full field surface in the JSON schema.
- `Endpoint*` and `ErrorConventions` TypeScript types mirrored into `packages/sdl/src/types.ts` and `packages/sdl/src/schema/sdl-v1.1.d.ts` (the package-internal `.d.ts` had been stale).

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
