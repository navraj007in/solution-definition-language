# SDL release baselines and v1.1-to-v2 migration

This document completes D07 for the selected portable specification. It identifies the active v1.1 editorial baseline, publishes the active v2.0 baseline, classifies every v2 change, and defines migration-plan and migration-result records. It does not claim package support.

## Contract identity

**BL-001 — Version and baseline identity.** `sdlVersion` selects language semantics inside an SDL document. A baseline ID identifies one exact publication of those semantics outside the document. A conformance, migration, or release claim must name both. Baseline IDs are opaque, exact, case-sensitive strings; processors must not infer ordering or compatibility from their spelling.

The published baselines in this repository are:

| Baseline | Language | Status | Meaning |
|---|---|---|---|
| `sdl-v1.1-2026-09-13` | `1.1` | active | The preserved v1.1 specification after the editorial consistency amendments |
| `sdl-v2.0` | `2.0` | active | The published v2 specification baseline for the 2.x line |

SDL documents do not gain a baseline field. A document remains portable source rather than embedding repository publication history. APIs, command output, validation reports, and migration results carry the baseline separately. A processor that only knows `sdlVersion` may state version-level support, but it cannot claim conformance to one of these exact baselines.

**BL-002 — Content-addressed manifests.** A release manifest has `format: sdl-release-manifest/v1`, a unique ID, language version, status, publication date, and an ordered authority list. Each authority entry gives a repository-relative canonical path, role, precedence, and lowercase SHA-256 digest of the exact bytes. Paths use `/`, contain no empty, `.` or `..` segment, and are unique. Precedence is a positive integer and is unique; lower numbers win on contradiction. Roles are `normative-prose`, `structural-schema`, `normative-corpus`, or `derived-reference`.

The publication date is a valid Gregorian calendar date in `YYYY-MM-DD`. The manifest schema is [release-manifest.schema.json](release-manifest.schema.json). The [v1.1 manifest](releases/sdl-v1.1-2026-09-13.json) preserves the active contract and its principal derived structure/reference. The [v2 manifest](releases/sdl-v2.0.json) freezes the consolidated normative prose, structural/report/migration schemas, and migration plan. Generated field catalogues, navigation pages, audits, package source, and examples may be listed as derived material but do not outrank normative prose. A digest mismatch means the named baseline is not the checked-out content. Updating any listed byte requires a new baseline ID and manifest; never rewrite a published manifest to point to new content.

**BL-003 — Baseline status and succession.** Status is `draft | active | superseded | retired`. A draft is reviewable and testable but not a stable language release. Active is the currently published stable contract for its version line. Superseded remains valid historical identity and may name its successor. Retired is retained only for historical/migration recognition. Status does not alter the bytes or semantics of a baseline, and changing status requires a new publication record rather than editing its content-addressed authority list.

Both published baselines are active on their own version lines: `sdl-v1.1-2026-09-13` for 1.x and `sdl-v2.0` for 2.x. The v2.0 baseline is the target used by this migration plan and the v2 conformance corpus. It was promoted from the preceding numbered draft record by publishing this new active manifest after review of the compatibility inventory; package implementation is assessed separately.

## Compatibility classification

**BL-004 — Classification.** Every baseline-to-baseline change uses exactly one primary classification and one compatibility value. The classification describes the contract change, not how difficult a particular document is to migrate.

| Classification | Definition | Compatibility |
|---|---|---|
| `editorial` | Presentation or correction that cannot alter accepted values, normalized values, diagnostics required by a rule, or portable meaning | `compatible` |
| `semantic-clarification` | Defines previously unspecified meaning without contradicting a defined source-baseline meaning | `compatible` or `conditional` |
| `compatible-addition` | Adds optional vocabulary or a sidecar format while preserving existing conformant values and meaning | `compatible` |
| `relaxed-validation` | Accepts values the source baseline rejected without changing retained source values | `compatible` for old documents |
| `tightened-validation` | Rejects or newly requires repair of a value accepted by the source baseline | `breaking` |
| `changed-interpretation` | Retains syntax but changes merge, default, normalization, identity, reference, arithmetic, or advisory meaning | `breaking` |
| `relocated-vocabulary` | Moves or splits a declaration so the old path is not equivalent at the target baseline | `breaking` |
| `removed-vocabulary` | Removes a previously accepted field or enum value | `breaking` |

`compatibility` is `compatible | conditional | breaking`. Conditional means the class is nonbreaking only when stated preconditions hold, such as an unused optional field. A record may describe several affected paths only when they share one classification, compatibility conclusion, and migration action. The [machine-readable plan](migrations/v1.1-to-v2.0.json) is the complete inventory for this baseline pair. Every v2 document, normalization, and report rule from IN-001 through DG-004 is assigned to at least one record; a rule may appear in several when it governs distinct changes. BL/MG rules govern the manifests and migration artifacts themselves and are covered by their conformance cases rather than classified as changes to SDL documents.

**BL-005 — Release assignment.** Editorial v1.1 amendments are frozen in `sdl-v1.1-2026-09-13`. They do not add a new accepted `sdlVersion`. All new fields, changed rules, validation tightening, normalization changes, relocations, and removals defined in `spec/v2` belong to `sdl-v2.0`. Nothing in the plan assigns breaking behavior to v1.2. A later compatible v1.x addition needs its own baseline and compatibility record; it cannot be inferred from the v2 inventory.

## Migration plan

**MG-001 — Plan envelope and paths.** A plan uses `format: sdl-migration-plan/v1`, unique `id`, exact `from` and `to` endpoint objects, and nonempty `records`. Each endpoint requires `baseline` and `sdlVersion`. Plan endpoints must match published manifests. Record IDs match `MIG-[0-9]{3}`, are unique, and remain stable within the plan. Records require title, classification, compatibility, affected source/target path-pattern arrays, governing v2 rule IDs, an action, and a nonblank rationale.

Path patterns use JSON Pointer escaping (`~0`, `~1`), start with `/`, and add one migration wildcard: a whole segment `*` matches one array index or object key. The empty string names the document root. There is no recursive wildcard, filter, expression, URI-fragment form, or name-based lookup. Paths locate decoded values after source-baseline parsing and composition; they are not YAML presentation paths. A target path may be absent when vocabulary is removed. An empty source-path array denotes target-only vocabulary; an empty target-path array denotes removal or validation-only review.

**MG-002 — Actions and safety.** Each action requires `mode`, `operation`, and nonempty instructions. Mode is `automatic | conditional | author-decision | validation-only`. Operation is `preserve | set-value | map-value | rename | move | add | remove | restructure | review`. Automatic actions must be deterministic from the supplied source value and record and may not consult packages, network services, heuristics, array order where order is not semantic, or unstated defaults. Conditional actions list machine-checkable or precisely stated preconditions; unmet preconditions produce a decision rather than guessing. Author-decision actions require one or more decision prompts. Validation-only actions change no value and identify target predicates the candidate must satisfy.

Optional `mappings` are exact `{from, to}` value pairs used by `map-value`; both are input-profile values and source keys are distinct by exact value. Optional `setValue` is required only for `set-value`. Instructions and decisions explain the normative operation; they cannot weaken its mode. A `preserve` action copies matched values unchanged. Rename changes only the final object key; move changes the full location. Remove is automatic only when loss is explicitly safe under its preconditions. Add/restructure and ambiguous reference/identity repairs are author decisions unless the record supplies a complete deterministic mapping.

Migration is separate from ND core normalization. Apply source-baseline parsing, composition, and normalization first; execute migration records in their listed order; then validate and normalize against the target baseline. A v2 normalizer must not perform migration actions implicitly.

**MG-003 — Source validity and extension handling.** Migration requires a source document that successfully conforms to the named source baseline. Invalid source input yields `reject`; resource exhaustion or unread input yields `resource-failure`. A migrator may offer a separate repair workflow, but its output is new source input and must not be reported as a baseline migration of a conformant document.

Unknown `x-*` values are preserved byte-value-equivalently after decoding/re-encoding, subject to the target input profile. They are never promoted into new standard fields by matching names. Intentionally open v1.1 metadata receives the plan's explicit record: recognized portable intent is moved only through an author decision; remaining content stays under a chosen `x-*` extension or is deliberately removed. No action silently discards an unknown extension.

**MG-004 — Decisions and referential integrity.** A decision identifies the governing migration record, decoded source path, nonblank prompt, and nonempty options. Options are `{id, label}` with unique IDs; an optional proposed patch remains advisory until selected. Identity changes are one transaction: rename the declaration and every successfully resolved reference, then re-run uniqueness and reference checks. An unknown or ambiguous reference cannot be repaired from spelling similarity, case folding, list position, physical database name, framework, owner, or repository path.

Decisions are required for ambiguous ownership/component meanings, new logical database/storage/target IDs, project/service implementation, deployment restructuring, untyped domain/cost/recovery metadata, unsupported custom field types, and any scalar whose old unit/count meaning is not established. A tool may collect several independent decisions before stopping, but an unread or structurally invalid subtree is not a decision.

**MG-005 — Change records.** Every applied mutation records `record`, `operation`, `path`, `before`, and `after`. `record` resolves to the plan; operation matches its action; path is the concrete decoded target path with no wildcard. Before/after states use `{present, value?}`: `value` is required exactly when present is true. The before state must equal the current candidate before that event, and applying events in order must reconstruct the candidate. Pure validation/review/preserve records produce no change event. A rename/move is represented by a removal event at the source path followed by an addition at the target path, both naming the same record.

**MG-006 — Result envelope and outcomes.** A result uses `format: sdl-migration-result/v1` and requires plan/source/target baseline IDs, outcome, changes, decisions, and diagnostics. It is a sidecar, never SDL input. Outcomes are:

| Outcome | Required state |
|---|---|
| `migrated` | `document` is present, decisions and error diagnostics are empty, all changes replay, and the document conforms to and is normalized for the target baseline |
| `needs-decision` | One or more decisions are present; optional `candidate` is explicitly incomplete and must not be called target-conformant; `document` is absent |
| `reject` | At least one validation/precondition error diagnostic, no resource error, and no `document` |
| `resource-failure` | At least one resource error diagnostic and no `document`; known validation errors may coexist |

Migration diagnostics require a migration record, `MG-003` for source validity/resources, or `MG-007` for plan/baseline endpoint mismatch; they also require category `validation | precondition | resource`, severity `error | warning`, nonblank message, and optional decoded path. Resource diagnostics are errors. Warnings never change outcome. A migrated result may include warnings. A candidate is allowed only for `needs-decision` and never receives a conformance claim. Results must not embed successful normalization provenance as migration change records; an ND-006 result is a separate artifact.

**MG-007 — Determinism and idempotence.** With equal source values, source provenance, selected decisions, plan, and baseline contents, automatic/conditional migration produces equal target values, change records, remaining decisions, and core diagnostics. Presentation formatting and message wording may differ. Record order is normative; within one record, concrete matches sort lexicographically by decoded path using ND-007 ordering. Reapplying the same plan to its target output is an endpoint mismatch, not a second migration that rewrites values again.

A migration must not claim success when it skipped an applicable record, used a different baseline digest, or validated only the structural schema. A plan implementation may support a subset only if it reports `needs-decision` or `resource-failure` for unexecuted applicable records; subset support cannot produce `migrated`.

**MG-008 — Conformance fixtures.** The [release and migration cases](conformance/release-migration.yaml) include valid/invalid manifests, plans and result artifacts, automatic version/value mappings, required decisions, replay failures, endpoint mismatches, and target-invalid candidates. Their integrity checker validates artifact schemas, manifest hashes, rule assignment, paths, result outcomes, and change replay. It does not implement the migration decisions or establish target semantic validity; those are obligations for a later implementation.

## v1.1-to-v2 migration order

The published plan is authoritative; this sequence explains its dependency order:

1. Verify `sdl-v1.1-2026-09-13`, resolve/import/normalize using that baseline, and preserve source provenance.
2. Rewrite the version marker and exact safe aliases/value forms, including `dotnet-8` with an unambiguous runtime version and eligible percent strings.
3. Collect author decisions for invalid identities, team/component ownership, database/storage IDs, project/service bindings, deployment targets/environments, typed domain metadata, recovery/cost records, external specs/errors, and ambiguous scalar units/counts.
4. Apply selected transactional renames/references and structural relocations; retain unmatched open metadata under explicit extensions.
5. Remove target-forbidden vocabulary only after its meaning has been represented or the author chooses removal.
6. Validate every source-stage and full target rule, apply only ND/NM core normalization, and emit a result whose changes reconstruct the target candidate.

There is no universal automatic migration for an arbitrary v1.1 document. Minimal documents may migrate with a version rewrite and required identifiers; documents using deployment, open metadata, ambiguous owners, or implicit defaults normally require decisions. This is deliberate: the migration contract preserves author intent rather than converting guesses into architecture facts.
