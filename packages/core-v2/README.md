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
| Structural validation, full-document mode (FD-001, `sdl-v2.schema.json`) | FULL-SPEC.md | **Implemented** — `validateStructure()`, checked against all 43 `full-document.yaml` cases' `expected.structure` field. The schema already encodes FD-002's document-minimum rule and FD-003's PII/ORM checks (verified: all 43 cases correctly accept/reject), but rule attribution is coarse: every failure is reported as `FD-001`, since mapping an AJV error to those more specific sub-rules needs a JSON-pointer-path-to-rule-ID table this package doesn't have — see `src/structure.ts`'s header comment |
| Structural validation, per-source fragment mode (ST-001) | FOUNDATIONS.md | Not started — needs a schema transform that strips `required` from "ordinary object" property schemas but keeps it on array-item schemas (ST-002's distinction); naturally pairs with the resolver/composition work below |
| Composition / resolver (IM-001–IM-006) | FOUNDATIONS.md | **Implemented, one documented gap** — `compose()` covers import declaration parsing/path safety (IM-001), canonical file identity (IM-002), postorder traversal with diamond/cycle handling (IM-003), the merge algorithm including identity-keyed arrays (IM-004), depth limits with `resource-failure` classification (IM-005), and sidecar rejection (IM-006), plus the two narrow slices composition depends on directly: per-source local-duplicate detection (ID-002 via ST-001) and sdlVersion consistency across modules (ST-003). 20/21 `scope: composition` cases pass; `merge-invalid-source-cannot-be-overridden` needs SC-003 (attempt-count grammar, not implemented) and is a known, explicitly excluded gap in both the conformance script and the test suite (`it.skip`) — see `src/compose.ts`'s header comment |
| Combined full-document check (structure + identity) | — | **Implemented, five documented gaps** — `validateFullDocument()` chains `validateStructure()` then `checkIdentity()`, in ST-003's stage order. This is not FD-006 (full-document conformance): no composition, no semantic slices beyond identity, no normalization. 38/43 `full-document.yaml` cases pass on `expected.outcome`; the 5 gaps each need a semantic slice this package doesn't have (FD-003's ORM exclusion, SO-001, SC-001, DM-001 ×2) — see `src/validate-document.ts`'s header comment |
| Semantic validation (cross-field, per-slice) | OWNERSHIP-BINDINGS.md, CONTRACTS-ERRORS.md, DOMAIN-METADATA.md, SCOPE-OPERATIONS.md | Not started |
| Normalization (ND-*) | NORMALIZATION.md | Not started |
| Diagnostic report envelope (DG-*) | DIAGNOSTICS.md | Not started — `Diagnostic` in `src/diagnostics.ts` is only the per-finding shape, not the full report envelope |
| Identity/change (diff) engine | — | Not started; this is what replaces v1.1's `diff()`/`classifyDiffForAdr()` split once the identity model exists |
| Migration tooling | RELEASE-MIGRATION.md | Not started |

Nothing here has been asked to accept `sdlVersion: "2.0"` end to end yet — that's the point at which this package would start being a real alternative to `@sdl/core`.

## Design choices carried over from `@sdl/core`'s 1.1 fixes

- **ESM-only, `NodeNext` module resolution, from the start.** `@sdl/core` 1.1 shipped `dist-esm/` built with `moduleResolution: "bundler"`, which compiles extension-less relative imports that native Node ESM can't load — it needed a post-build rewrite script to fix. This package avoids that by writing `.js` extensions directly in its own relative imports (the normal `NodeNext` convention) and building once, for ESM only. No dual CJS/ESM build, no post-build rewrite.
- **Diagnostics carry a `rule` ID from the spec prose (e.g. `"IN-002"`), not a package error code**, per DIAGNOSTICS.md's own instruction that rule IDs "identify v2 specification requirements, not package error-code aliases."
- **The structural schema is loaded directly from `spec/v2/sdl-v2.schema.json` at runtime (`src/schema.ts`), not copied into this package.** `@sdl/core` 1.1 keeps a copy and a CI check (`check:schema-mirror`) to catch it drifting from the source of truth — the mirror had already drifted once before that check existed. One copy means nothing to keep in sync. This only works inside the monorepo checkout; it would need to change (bundle the schema file at build time) before any standalone publish.

## Running the conformance corpus

```sh
npm run conformance
```

Runs `parseInputProfile()` and `checkIdentity()` against every `scope: input` / `scope: identity` case in `spec/v2/conformance/cases.yaml` (including the fixtures' own `assertions`, checked against the case's input since neither function transforms the document), `compose()` against every `scope: composition` case (checking outcome, violations, contributions order, assertions against the *merged* document, and warnings), plus `validateStructure()` and `validateFullDocument()` against `full-document.yaml`'s `expected.structure` and `expected.outcome` fields respectively. Cases needing a semantic slice this package doesn't have are excluded from the pass/fail count and reported separately by name and reason (never silently dropped) — see the status table above. Reports pass/fail per case plus which corpus scopes/manifests/fields aren't wired up yet at all. This is separate from `spec/v2/conformance/check-corpus.mjs`, which checks the corpus's own internal consistency and deliberately never invokes an implementation.

## Development

```sh
npm install
npm run build
npm test          # node:test against dist/__tests__
npm run conformance
```
