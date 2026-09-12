# SDL v2 specification draft

**Status: unreleased design draft.** The active language remains [SDL v1.1](../SDL-v1.1.md). This directory contains selected completion rules for the next major version; it does not make `sdlVersion: "2.0"` acceptable to v1.1 tools or change existing documents.

The user-selected release policy preserves v1.1 and assigns incompatible completion rules to this draft. Requirements expressed with “must” in this directory specify the draft design. They are not requirements on v1.1 implementations.

## Defined specification slices

Start with the [consolidated document contract](FULL-SPEC.md), [complete field catalogue](FIELD-CATALOGUE.md), and [structural schema](sdl-v2.schema.json). [Validation reports](DIAGNOSTICS.md) define portable outcomes and locations; [rule coverage](RULE-COVERAGE.md) records every historical rule disposition. These are self-contained draft definitions, not package implementation claims.

[Release Baselines and Migration](RELEASE-MIGRATION.md) identifies the active v1.1 baseline and this numbered v2 draft, defines compatibility classes and migration artifacts, and provides the complete v1.1-to-v2 change inventory. A numbered draft baseline is reviewable identity, not stable v2 publication.

[Foundations](FOUNDATIONS.md) defines the input profile, identifier/reference model, composition algorithm, operational scalar formats, domain keys and field constraints, and compliance vocabulary conversion. [Conformance cases](conformance/README.md) record their expected results independently of packages.

[Ownership and Bindings](OWNERSHIP-BINDINGS.md) completes the selected organizational, implementation, access, and hosting relationship model. It includes a [worked example](examples/ownership-bindings.sdl.yaml) and a [binding-case corpus](conformance/bindings.yaml).

[Contracts and Errors](CONTRACTS-ERRORS.md) defines portable external references, explicit error-policy applicability, envelope fields, status mappings, and shared retry evaluation. It includes a [worked example](examples/contracts-errors.sdl.yaml), [external OpenAPI file](examples/contracts/status.openapi.yaml), and [contract cases](conformance/contracts.yaml).

[Domain Metadata](DOMAIN-METADATA.md) completes the portable domain catalogue with ordered indexes, tuple uniqueness/foreign keys, named relationship roles, and cardinality consistency. See its [worked example](examples/domain-metadata.sdl.yaml) and [cases](conformance/domain-metadata.yaml).

[Persistence, Recovery, Costs, and Metadata Scope](SCOPE-OPERATIONS.md) defines database-free/storage-only systems, environment data instances, recovery coverage, exact cost scenarios, and compliance/open-metadata boundaries. See the [worked example](examples/scope-operations.sdl.yaml) and [cases](conformance/scope-operations.yaml).

[Normalization](NORMALIZATION.md) defines debt reconciliation, the closed default policy, effective-value catalogue, deterministic provenance, and unapplied suggestions. It includes a [worked input](examples/normalization.sdl.yaml), [result artifact](examples/normalization.result.yaml), and [cases](conformance/normalization.yaml).

| Decision | Defined in this draft | Boundary / later work |
|---|---|---|
| D01 | Team ownership, component/API bindings, many-to-many project/service implementation, integration use, canonical environments, explicit placements/coverage, regional policy, and port scopes | Selected binding design is defined; full-document integration is defined below; external provider capability profiles remain separate work |
| D02 | Entity/field identities, single primary keys, field constraints, ordered indexes, tuple uniqueness/foreign keys, named relationship roles and bound cardinalities, database identity/access, stewardship, and cross-database advisories | Selected portable catalogue, full-document integration, and migration assignment defined; primary/replica data topology is defined in SO-003; provider-specific topology remains outside the portable model |
| D03 | Import order, containing-file precedence, graph identity, diamonds/cycles, limits, fragment stages, sidecars, and merge outcomes | Full-document fixtures and breaking-interpretation migration record defined |
| D04 | Scalars/retries, compliance and debt reconciliation, closed default policy, effective-value catalogue, exact provenance/change journal, and separate suggestion records | Selected normalization policy, result format, full-document integration, and migration decisions defined; optional suggestion algorithms are separate |
| D05 | Root-relative external contract references, selectors/format markers, explicit applicability, envelope types/presence, status/code identities, shared retry budgets/delays and Retry-After | Portable design, full-document integration, and migration decisions defined; ecosystem validation and transport adapters are separate profiles |
| D06 | Database intent/storage IDs, environment data instances, per-resource recovery plans and global requirements, exact authored cost scenarios/comparisons, compliance mapping advice, and open metadata boundaries | Selected portable scope, full-document integration, and migration decisions defined; provider execution, price acquisition, and optional heuristic profiles are separate |
| D07 | Active v1.1 and numbered v2 draft content-addressed baselines; compatibility classes; complete change inventory; migration plan/result grammar and cases | Selected definition complete; stable v2 promotion is a future release act, while package implementation remains separate |
| D08 | YAML input profile, self-contained full field/structural catalogue, full-document fixtures, baseline-identified diagnostic serialization, and explicit advisory-profile boundary | Selected portable definition complete; profile algorithms and package implementation are separate |

## Compatibility ledger

All changes below target v2. Some clarify previously undefined meaning; others deliberately tighten acceptance. None is backported through an editorial v1.1 amendment.

| Area | Draft change | Migration requirement |
|---|---|---|
| Full structure | Self-contained v2 catalogue; projects container optional when services supply components; NFR objectives independently optional | Preserve required authored facts; remove placeholder projects/objectives deliberately; v1.1 requiredness remains unchanged |
| ORM binding | EF Core/MongoDB exclusion uses explicit backend data-access pairs | Declare actual accesses; do not infer a binding from the global primary database |
| Retained fields and advice | Nonnegative team/scaling counts, integer coverage percentage bounds, documented description fields, and separate optional heuristics | Repair invalid counts/targets; select a named advisory profile if historical heuristic behavior is wanted |
| YAML | One document, string keys, no duplicate keys, no explicit tags/merge keys or cyclic aliases; finite numeric values | Replace unsupported YAML forms with ordinary values and explicit SDL imports; preserve the resulting value |
| Identity | Explicit identifier syntax and exact case-sensitive comparison; additional uniqueness checks | Rename invalid or colliding identifiers and update all references together; never trim or case-fold automatically |
| Composition | Imports contribute once in depth-first postorder, then each containing file; incomplete resolution cannot succeed | Compare the expected merged result, especially diamonds and root overrides; restructure modules when the intended result differs |
| Fragments | Invalid authored values and duplicate identities within a source cannot be hidden by a later override | Repair the originating module; array entries are complete declarations, not partial patches |
| Availability | Both global and SLO availability use percent-suffixed strings with shared bounds | Convert a validated v1.1 global `"99.9"` to `"99.9%"`; resolve malformed/ambiguous values manually |
| Durations/counts | Explicit duration units, exact interpretation, positive or nonnegative bounds by field; attempts include the first execution | Convert only when the source unit and count meaning are known; do not guess whether an old count meant retries |
| Domain | Explicit single key, unique field names, defined presence/nullability and typed constraints | Add or reconcile key declarations; resolve contradictory flags, custom types, and foreign-key targets explicitly |
| Compliance | Canonical root vocabulary and exact shorthand conversion | Convert only the listed aliases; retain author-declared applicability and resolve unknown names |
| Domain metadata | Typed named indexes/constraints, positional tuple foreign keys, root/local role identity, explicit foreign-key selectors | Translate legacy metadata deliberately; resolve duplicate roles and cardinality conflicts; composite primary keys remain outside scope |
| Ownership | `owner` always refers to a declared team; API `component` and entity `managedBy` are separate component bindings | Review ambiguous v1.1 owner strings; do not guess whether a team or project was intended |
| Service implementation | Explicit tagged external/projects implementation; many-to-many project/service bindings with access/use coverage | Name implementation projects deliberately; a services-only architecture needs project declarations before managed hosting can be specified |
| Databases | Required logical `id`, explicit access declarations, and optional entity database/manager bindings | Assign stable IDs and update references; physical database names are not identity fallbacks |
| Hosting | Canonical `deployment.environments`, named targets, and project placements; global `deployment.cloud`/`runtime` and nested CI environment list are rejected | Move environments and explicitly select active services/projects; transfer known cloud/region/runtime facts into targets/placements and supply project source paths |
| Runtime vocabulary | Placement runtime is an open identifier; capability validation is separately scoped | Preserve known runtime intent, but do not treat an accepted string as proof of provider support |
| Ports and regions | Private/shared listener scopes, selected-placement coverage, and authored region-policy containment | State shared networks explicitly and review cross-environment reservations; extensions are not automatically promoted into the new fields |
| Normalization | Core transforms only debt/compliance aliases; no architecture defaults; provenance result remains outside SDL | Resolve debt conflicts; author required facts explicitly; preserve source lineage and separate suggestions from applied edits |
| Persistence and recovery | Optional primary database, explicit database intent, storage IDs, environment instances, typed recovery coverage and minimum requirements | Remove placeholders deliberately; identify resources/targets and reconcile coverage, exemptions, and global requirements |
| Costs and metadata | Typed scenarios and exact decimal amounts; explicit comparisons and applicability; design/evidence remain open | Supply units, subjects, and declared totals; migrate arbitrary cost/recovery metadata to standard fields or extensions |
| External contracts | Optional `spec` with root-relative local paths, format/version, and structured-document pointers | Resolve old extension targets before rewriting paths; external format acceptance is a separate check |
| Error conventions | Explicit API applicability, typed envelope paths/code selector, unique codes and statuses restricted to 400–599 | Select managed APIs and repair ambiguous types, nesting, code locations, and non-error statuses |
| Retry evaluation | Complete policy objects, one minimum attempt budget, longest applicable minimum wait, explicit replay eligibility | Review attempt counts and timing; do not infer missing policy members or replay safety |

Existing `retry_policy`/`base_ms` and `retryPolicy`/`initialInterval` field names remain in their respective locations. This draft does not rename them merely to impose a naming convention.

## Completion boundary

The selected portable field, identity/reference, composition, domain, ownership/binding, contract/error, persistence/recovery/cost, normalization, diagnostic, release-baseline, compatibility, and migration definitions are consolidated. The active v1.1 baseline and v2 draft.1 baseline are content-addressed; every v2 document/report rule has a migration classification. This is a complete specification draft, not a stable v2 release or a package-conformance claim. Stable promotion requires a new active manifest after review. Optional capability/advisory algorithms, mobile distribution, runtime execution, and package implementation remain separately scoped. Full-document fixtures declare that scope explicitly; earlier slice fixtures still claim only their named rules.
