# SDL Language Roadmap

This document records completion and future evolution of the SDL specification. It is subordinate to [SDL v1.1](SDL-v1.1.md): roadmap proposals do not change the active contract. [Completion Decisions](completion-decisions.md) records the selected D01–D08 designs and their boundaries.

For the discovery-tooling roadmap, see [the repository roadmap](../ROADMAP.md). For package support and delivery, see the [support matrix](../reference/section-support.md) and [changelog](../CHANGELOG.md). Specification completion is assessed independently of package implementation.

## Current Language Surface — v1.1

SDL v1.1 is the active language version. Its 23 conceptual root sections count `techDebt` and `technicalDebt` as one concern and exclude the version/import metadata.

| Area | Current documented scope |
|---|---|
| Core architecture | Solution, product, projects/services, auth, data, integrations, NFRs, deployment, constraints, testing, observability, evolution, debt, and artifact requests |
| API inventory | `contracts.apis[]`: names, API types, optional ownership, and extension pointers to external specifications; ownership and portable references remain undefined in v1.1 and are defined for v2 under D01/D05 |
| Domain model | Entities, fields, and relationships, with additional metadata; full types, identity, key, and relationship semantics remain undefined in v1.1 and are defined for v2 under D02 |
| Features | Flat feature items with `name`, `description`, `priority`, `stage`, and `status`; stage and status already belong to v1.1 |
| Error conventions | Optional `architecture.errorConventions` envelope, status mapping, and retry policy; cross-policy semantics remain D05 |
| Compliance, SLOs, resilience | Structured declarations already belong to v1.1; scalar, reference, and scope gaps remain in v1.1 and are resolved for v2 in the decision record |
| Open metadata | `costs`, `backupDr`, and `design` accept heterogeneous metadata; their illustrative examples are not complete normative field catalogues |
| Composition | Import Forms A/B/C and identity-keyed merging are documented v1.1 features; limit behavior and full precedence remain undefined in v1.1 and are defined for v2 under D03 |

Package labels such as stable, partial, minimal, and placeholder describe implementation coverage. They do not decide whether a language requirement is normative or fully specified.

## Specification Completion Milestones

### 1. Reconcile current documentation

Align authority order, current-versus-future field labels, root/module wording, defaults references, open metadata descriptions, and version policy. Make examples agree with existing requirements and identify unresolved definitions explicitly.

The September 2026 consistency pass completes this bounded mechanical milestone. Later v2 passes resolve the listed choices; a corrected wording contradiction remains distinct from a newly selected major-version semantic definition.

### 2. Complete shared definitions and the field catalogue

Start with identity and references, operational scalars, import precedence, and domain keys, since these determine whether independent implementations interpret a document consistently. Draft a short input/document profile alongside them, then complete requiredness, cardinality, and the remaining field catalogue. A reader must not need package source to determine a field's meaning.

Write examples and expected results as each definition is settled. Dependencies: D01–D04 and D08, with compatibility assessed under D07. Existing enums and container shapes are the baseline, not proof that all underlying semantics are complete.

**Progress:** the first semantic slice is defined in the [v2 foundations draft](v2/README.md), with a [scoped conformance corpus](v2/conformance/README.md). It covers the input profile, identity/references, composition, operational scalars, domain keys/fields, and compliance conversion. The subsequent [full-document consolidation](v2/FULL-SPEC.md) completes the selected portable field catalogue and requiredness. Incompatible rules target v2 under the selected policy; v1.1 is preserved.

### 3. Settle cross-section semantics

Define organizational ownership separately from component binding; decide project/service and environment relationships; complete domain, import, external-contract, and normalization semantics. Develop composition, normalization, and valid/invalid examples with these decisions; unresolved alternatives remain proposals until a result is adopted.

**Progress:** [Ownership and Bindings](v2/OWNERSHIP-BINDINGS.md) defines the selected team, API/component, many-to-many service/project, integration-use, database-access, and hosted-environment relationships with expected-result cases. [Contracts and Errors](v2/CONTRACTS-ERRORS.md) now defines portable external references and shared HTTP error/retry policies. [Domain Metadata](v2/DOMAIN-METADATA.md) completes the portable index, constraint, and relationship-role catalogue. [Scope and Operations](v2/SCOPE-OPERATIONS.md) defines the portable persistence, recovery, cost, and metadata boundaries. [Normalization](v2/NORMALIZATION.md) completes the selected debt/default/provenance semantics. The selected cross-section definitions are now established; the [consolidated contract](v2/FULL-SPEC.md) now integrates full fields and documents.

Dependencies: D01–D06. New fields or incompatible reinterpretations require a version decision under D07. A current implementation gap is not a reason to discard a well-defined requirement.

### 4. Complete rules and consolidate conformance coverage

Every normative rule needs a defined predicate, applicability, field paths, severity, and valid/invalid examples. Consolidate the examples developed during milestones 2–3, check rule and boundary-case coverage, and publish their expected meaning before packages implement them.

**Progress:** the [consolidated field contract](v2/FULL-SPEC.md), [validation reports](v2/DIAGNOSTICS.md), [historical rule dispositions](v2/RULE-COVERAGE.md), and full-document/report fixtures define the selected portable D08 scope. [D07](v2/RELEASE-MIGRATION.md) now supplies frozen baseline identities and migration records. Coverage checks establish fixture integrity, not exhaustive semantic proof or package conformance.

Dependencies: D07 and D08, plus the semantic decisions above. Implementation support is a separate follow-up.

## Versioning and Compatibility Policy

`sdlVersion` identifies the language contract, not a package release. [D07](v2/RELEASE-MIGRATION.md) now identifies exact publications outside SDL documents: active `sdl-v1.1-2026-09-12` and unreleased `sdl-v2.0-draft.1`. Conformance and migration claims name both language version and baseline; no revision field is added to SDL.

- Editorial corrections align documents without changing the accepted vocabulary or intended meaning.
- Compatible minor additions preserve the validity and meaning of existing conformant documents. Adding optional fields or values can be compatible; tightening a constraint is not automatically compatible merely because the field is optional.
- Removing valid vocabulary, requiring new information in existing documents, or changing previously specified meaning requires a major language version. Interpretation includes defaults, identity, and merge behavior as well as structure.
- Implementations should identify the contract baseline they support; package numbering alone is insufficient to describe language support.

The selected completion policy preserves v1.1 and assigns incompatible rules to the [unreleased v2 draft](v2/README.md). Its compatibility ledger distinguishes selected draft semantics from current language requirements. Package implementation remains later work.

### v1.2 boundary

v1.2 is planned, with no breaking changes assigned to it. In particular:

- Feature `stage` and `status`, import Forms B/C, `architecture.errorConventions`, and the structured contracts/domain/compliance/SLO/resilience containers are already v1.1 surface; they must not be reintroduced as new v1.2 features.
- `constant` in error retry policies and `fixed` in resilience retry policies remain valid in their respective locations. Removing either spelling is not a v1.2 change. Any proposed additive alias needs an explicit mapping and compatibility review.
- New bindings, scalar restrictions, required keys, or normalization changes receive a release assignment after their compatibility impact is understood. “Spec completion” does not automatically make a change nonbreaking.

### Migration definition

The [v1.1-to-v2 migration plan](v2/migrations/v1.1-to-v2.0-draft.1.json) identifies exact endpoints, affected path patterns, governing rules, compatibility, transformation safety, preconditions, and author decisions. Its result format carries replayable changes and cannot claim target conformance while decisions or resource failures remain. Existing migration utilities remain package capabilities; their presence or absence does not alter the language contract.

## Scope Decisions

SDL retains an API-inventory role. Per-operation request/response definitions belong in external OpenAPI, GraphQL, gRPC, or AsyncAPI specifications. The portable reference mechanism is defined in [Contracts and Errors](v2/CONTRACTS-ERRORS.md); validating the external language and its operations is separately scoped.

Feature dependencies, flags, and rollout policies are extension metadata today. The completion pass does not silently promote them into first-class fields.

[Scope and Operations](v2/SCOPE-OPERATIONS.md) defines database-free/storage-only designs, typed recovery coverage and cost scenarios. Design and compliance evidence metadata remain explicitly open; stage-derived heuristic advice is separately scoped. Provider execution, live prices, and certification verification are not core conformance claims.

Inheritance, mixins, and executable infrastructure-feasibility analysis are not commitments in the current completion milestone. Project/service binding is now defined in the v2 ownership/binding draft. External references and shared error/retry policies are now defined in the v2 contracts draft, independently of current package support.

## Versioning History

| Version | Status | Scope |
|---|---|---|
| v0.1 | Retired | Original prototype; see the changelog |
| v1.1 | Active, preserved baseline `sdl-v1.1-2026-09-12` | Current language surface above, including its historically documented completion gaps; exact bytes are content-addressed |
| v1.2 | Planned | Compatible additions only; exact scope follows the completion decisions |
| v2.0 | Unreleased baseline `sdl-v2.0-draft.1` | Consolidated field/semantic/diagnostic contract, full fixtures, compatibility inventory, and migration grammar in `spec/v2/`; stable promotion and package implementation remain later work |
