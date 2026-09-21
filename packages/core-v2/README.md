# @sdl/core-v2

Reference implementation of the [SDL v2 language contract](../../spec/v2/README.md). **Early-stage — not published, not a replacement for [`@sdl/core`](../sdl/) yet.** `sdlVersion: "2.0"` is not accepted by any published SDL tooling; this package is where that support is being built, incrementally, against the v2 spec.

## Why a separate package instead of extending `@sdl/core`

v2 introduces an explicit identity model, a stricter composition algorithm, and a canonical change/diagnostic model that v1.1's resolver/diff/ADR code was never built around. Retrofitting those into `@sdl/core` would mean building them once now (against the v1.1 shape) and rebuilding them again for v2. This package starts from the v2 spec directly instead.

## Status

The v2 spec (`spec/v2/`) defines nine areas end to end: foundations (input profile, identity, composition), ownership/bindings, contracts/errors, domain metadata, scope/operations (persistence, recovery, costs), normalization, diagnostics, and release/migration. Each has its own conformance corpus under `spec/v2/conformance/`.

| Stage | Spec section | Status |
|---|---|---|
| Input profile (IN-001–IN-005) | [FOUNDATIONS.md](../../spec/v2/FOUNDATIONS.md) | **Implemented** — `parseInputProfile()`, all 14 `scope: input` cases in `conformance/cases.yaml` pass |
| Identity & references (ID-001–ID-004) | FOUNDATIONS.md | **Partially implemented** — `checkIdentity()` covers components (ID-001/ID-002), service dependency references and cycle detection (ID-003/ID-004), and SLO-target references (ID-002/ID-003). All 11 `scope: identity` cases pass. ID-002's other ~17 identity sets (entities, fields, custom integrations, environments, indexes, constraints, named relationships, storage resources, data instances, recovery plans, cost scenarios/comparisons, compliance requirements, technical debt, teams, databases, hosting targets, features, API inventory) are not implemented — see the header comment in `src/identity.ts` |
| Structural validation (ST-001, `sdl-v2.schema.json`) | FULL-SPEC.md | Not started |
| Composition / resolver (IM-*) | FOUNDATIONS.md | Not started |
| Semantic validation (cross-field, per-slice) | OWNERSHIP-BINDINGS.md, CONTRACTS-ERRORS.md, DOMAIN-METADATA.md, SCOPE-OPERATIONS.md | Not started |
| Normalization (ND-*) | NORMALIZATION.md | Not started |
| Diagnostic report envelope (DG-*) | DIAGNOSTICS.md | Not started — `Diagnostic` in `src/diagnostics.ts` is only the per-finding shape, not the full report envelope |
| Identity/change (diff) engine | — | Not started; this is what replaces v1.1's `diff()`/`classifyDiffForAdr()` split once the identity model exists |
| Migration tooling | RELEASE-MIGRATION.md | Not started |

Nothing here has been asked to accept `sdlVersion: "2.0"` end to end yet — that's the point at which this package would start being a real alternative to `@sdl/core`.

## Design choices carried over from `@sdl/core`'s 1.1 fixes

- **ESM-only, `NodeNext` module resolution, from the start.** `@sdl/core` 1.1 shipped `dist-esm/` built with `moduleResolution: "bundler"`, which compiles extension-less relative imports that native Node ESM can't load — it needed a post-build rewrite script to fix. This package avoids that by writing `.js` extensions directly in its own relative imports (the normal `NodeNext` convention) and building once, for ESM only. No dual CJS/ESM build, no post-build rewrite.
- **Diagnostics carry a `rule` ID from the spec prose (e.g. `"IN-002"`), not a package error code**, per DIAGNOSTICS.md's own instruction that rule IDs "identify v2 specification requirements, not package error-code aliases."

## Running the conformance corpus

```sh
npm run conformance
```

Runs `parseInputProfile()` and `checkIdentity()` against every `scope: input` / `scope: identity` case in `spec/v2/conformance/cases.yaml`, including the fixtures' own `assertions` (checked against the case's input, since neither function transforms the document), and reports pass/fail per case plus which corpus scopes/manifests aren't wired up yet. This is separate from `spec/v2/conformance/check-corpus.mjs`, which checks the corpus's own internal consistency and deliberately never invokes an implementation.

## Development

```sh
npm install
npm run build
npm test          # node:test against dist/__tests__
npm run conformance
```
