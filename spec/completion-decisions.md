# SDL Specification Completion Decisions

This document tracks language-design choices identified during the September 2026 specification audit. It is subordinate to [SDL v1.1](SDL-v1.1.md) for the active contract. The release policy preserves v1.1 and places incompatible completion rules in [SDL v2](v2/README.md), active for the 2.x line. A choice defined there is not an adopted v1.1 field, validation rule, or version change. Current package limitations do not determine the preferred language design.

The first milestone reconciled straightforward documentation contradictions. Subsequent passes define shared foundations, ownership/bindings, external contracts/error policies, the complete field/document contract, portable reports, content-addressed baselines, and migration artifacts in SDL v2. D01–D08 are selected and defined, and v2.0 is published as active; package implementation remains later work.

## Decision summary

| ID | Decision | Recommended direction | Affects |
|---|---|---|---|
| D01 | Components, ownership, and deployment bindings | Separate organizational ownership from component references; explicitly bind logical services to deployable projects | Contracts, architecture, deployment, integration references |
| D02 | Domain types, identity, and relationships | Define explicit identity and key semantics; specify field types, nullability, and relationship targets | Domain model, field catalogue, reference rules |
| D03 | Import completeness and precedence | Require a complete result for successful resolution; fail when limits prevent completion; state containing-file precedence | Imports, cycles, merge order, depth and path rules |
| D04 | Scalars and normalization | Define shared value grammars, naming conventions, and precedence; distinguish authored facts, language defaults, and tool suggestions | Durations, percentages, retry counts, field naming, compliance vocabularies, defaults, aliases |
| D05 | External contracts and error conventions | Standardize external references and error-policy semantics while retaining ecosystem API formats | API inventory, pointers, error envelopes, retry policies |
| D06 | Scope and open metadata | State supported use cases; formalize fields with shared architectural meaning and keep heterogeneous content explicitly open | Database-free systems, costs, recovery, design, compliance advice |
| D07 | Version baseline and compatibility | Freeze an identifiable baseline; version changes to accepted documents and meaning | v1.1 amendments, future releases, migrations |
| D08 | Input profile and conformance | Define a YAML-to-document profile and specification-owned examples | Parsing, fragments, diagnostics, validation |

**Definition status:** D03's import semantics and D08's input profile are defined in [Foundations](v2/FOUNDATIONS.md). D01's selected relationship model is defined in [Ownership and Bindings](v2/OWNERSHIP-BINDINGS.md), including the ownership/database-binding part of D02. D02’s portable domain catalogue is defined in [Domain Metadata](v2/DOMAIN-METADATA.md), including indexes, tuple constraints, and relationship roles; D04 has defined scalars, naming exceptions, compliance conversion, retry evaluation, and the debt/default/provenance rules in [Normalization](v2/NORMALIZATION.md). D05’s portable external-reference and shared HTTP-error design is defined in [Contracts and Errors](v2/CONTRACTS-ERRORS.md). D06’s selected portable persistence, recovery, cost, and metadata scope is defined in [Scope and Operations](v2/SCOPE-OPERATIONS.md). D08 now consolidates full fields, documents, and diagnostic reports; remaining release work is identified below; definition completion is not package support.

## Decision order and examples

Start with the decisions needed for consistent interpretation across implementations: identity and references (D01/D02), operational scalars (D04), containing-file/import precedence (D03), and domain keys (D02). Draft a short input profile (D08) alongside these decisions, then expand the remaining field catalogue. Assess each proposed change against the baseline and compatibility policy (D07) as it is designed.

Write valid, invalid, composition, and normalization examples with expected results alongside each definition. While a choice is open, label alternative results as proposals; after adoption, retain one specified result. The final conformance milestone consolidates and checks coverage of these examples rather than starting their creation.

## D01 — Components, ownership, and deployment bindings

**Choice:** Does API `owner` name a team or a component? How are services related to projects, and which component owns a deployment, integration, or region declaration?

**Selected design:** organizational owners are declared teams. APIs bind to components independently of their owner; services have explicit external or projects implementations, with many-to-many service/project relationships. Hosted environments explicitly select projects/services and place projects onto named cloud/region targets. No normalizer invents these relationships.

**Defined for v2:** team and component namespaces; owner/API bindings; source paths and primary-language compatibility; project/service cardinalities; integration identities, use, and implementation coverage; canonical environments and hosting targets; selected deployable coverage, runtime declarations, regional policy, and private/shared port scopes. See [Ownership and Bindings](v2/OWNERSHIP-BINDINGS.md).

**Definition outcome:** the selected ownership and hosting design has precise predicates and expected-result cases for rules 4, 11, 12, 14, 15, 16, and 22 and the unused-integration advisory. Region containment is a portable author-policy check; live provider availability requires a separately identified capability profile. Mobile distribution and per-target IaC are outside the hosted-project model rather than implicit bindings.

**Integration status:** the full v2 field catalogue and full-document fixtures consolidate these definitions under D08. The D07 migration plan classifies and assigns all new/replaced binding fields to v2; the historical v1.1 gaps remain preserved.

## D02 — Domain types, identity, and relationships

**Choice:** What is a domain entity's identity, how are keys declared, and what does each field or relationship mean?

**Defined for v2:** explicit single primary keys, entity/field uniqueness, portable and extension type names, presence/nullability, effective key flags, default/generated conflicts, typed enum/size/decimal constraints, `Entity.field` foreign keys, and root relationship direction/cardinality. [Ownership and Bindings](v2/OWNERSHIP-BINDINGS.md) adds logical database IDs, access coverage, entity owners/managers, and the cross-database advisory predicate. [Domain Metadata](v2/DOMAIN-METADATA.md) completes ordered indexes, named tuple uniqueness/foreign-key constraints, root/local relationship role identities, selectors, and cardinality consistency. Composite primary keys are outside the current portable v2 model; tuple constraints cannot substitute for the required key. See [domain foundations](v2/FOUNDATIONS.md#domain-field-catalogue-and-key-semantics).

**Definition outcome:** the selected portable D02 catalogue is defined with positive, negative, record-meaning, composition, and advisory cases. Named constraints and local relationships extend the cross-database advisory without duplicating a declaration through a derived view. No physical database DDL is inferred.

**Integration status:** full-document fixtures and diagnostic serialization are consolidated under D08, and D07 migration records cover the domain changes. [Scope and Operations](v2/SCOPE-OPERATIONS.md) defines portable per-environment data instances and primary/replica recovery topology. Arbitrary executable check expressions and provider-specific constraint options remain explicitly outside the portable domain model.

**Portable completion criterion met:** declared field/constraint meanings and relationship resolution are specified, with examples covering keys, optional values, collisions, tuple pairings, relationship roles, and multiple stores independently of an ORM implementation. This does not claim the whole v2 language or its packages are complete.

## D03 — Import completeness and precedence

**Choice:** Can a document with skipped imports count as fully resolved, and how do containing files and nested modules take precedence?

**Defined for v2:** a single depth-first postorder sequence, imports before each containing file, first-visit contribution of shared modules, explicit root/canonical file identity, active-stack cycles, failure when resource limits prevent completion, exact-path array merge behavior, complete array declarations, and source/final validation stages. Preview output is explicitly incomplete and never conformant. See [import foundations](v2/FOUNDATIONS.md#imports-and-composition).

**Integration status:** full-document composition fixtures supplement the scoped cases, and D07 records composition as a breaking interpretation change requiring graph review. The v1.1 depth/precedence gap remains documented in its historical contract; the v2 choice is not silently backported.

**Definition outcome:** root overrides, sibling order, diamonds, cycles, limits, malformed preferred files, sidecars, and invalid paths have specified results and corpus examples. Host-specific symlink/read-failure obligations are specified in prose; full implementation coverage follows later.

## D04 — Scalars and normalization

**Choice:** Which representations and defaults belong to the language, and what counts as an explicit authored choice?

**Recommendation:** define shared grammars for percentages, durations, rates, and retry counts, with units and numeric bounds. Record a field-naming convention and explicit exceptions for existing vocabulary; renaming existing fields or adding aliases requires a compatibility decision under D07. Separate values stated by an author from language defaults and tool-specific suggestions. Preserve explicit values, including an empty collection when its meaning is an explicit choice; document exceptions individually.

**Defined for v2:** percent-suffixed availability at both locations; exact fixed-unit durations and per-field zero policies; total-execution attempt counts; integer millisecond bounds; retained retry naming exceptions; exact compliance vocabulary conversion and authoritative root declarations; preservation of authored falsy/empty values. See [scalar foundations](v2/FOUNDATIONS.md#operational-scalars-and-field-conventions) and [normalization boundaries](v2/FOUNDATIONS.md#compliance-vocabulary-and-normalization-boundary).

**Selected completion:** [Normalization](v2/NORMALIZATION.md) defines complete debt records and canonical-first alias union, identical cross-alias coalescing, and rejection of divergent same-ID records. Core document transformations are closed to debt/compliance reconciliation; architecture choices and omitted objectives receive no inserted defaults. Effective defaults remain semantic interpretations. A versioned result envelope carries exact change states, terminal-value source lineage, and separate unapplied suggestions. The existing [v1.1 implementation defaults](../reference/normalization-defaults.md) have explicit v2 dispositions.

**Integration status:** full fields/documents and general diagnostics are consolidated under D08; D07 classifies normalization/default changes and defines their migration decisions. Suggestion-profile algorithms remain independently scoped; no provider or stage heuristic is a core default.

**Definition outcome:** the selected normalization policy and result representation meet that criterion through scoped alias/conflict/default/provenance cases, including falsy/empty preservation, idempotence, source locations, and replayable change events. This is a specification result, not package conformance or a complete language release.

## D05 — External contracts and error conventions

**Choice:** How are external API specifications located and identified, and how do error conventions relate to transport retry policies?

**Selected design:** retain API-inventory scope with an optional first-class `spec` reference, rooted at the root SDL directory. Define external format/version identity, structured-document pointers, exact missing/reference failure behavior, and separate external-language validation. Shared HTTP error conventions require explicit managed-API applicability. Envelope fields have typed dotted paths, relative presence/nullability, and an explicit code selector. Codes are unique, several codes may share an error status, and the two policies constrain one shared retry evaluation.

**Defined for v2:** [Contracts and Errors](v2/CONTRACTS-ERRORS.md), with a worked external contract and expected-result cases, completes the portable D05 design. Eligibility comes from the exact error mapping and established operation replay safety; total attempts use the smaller authored limit, delays use the greater independently generated wait, and Retry-After supplies a further minimum. This gives historical rules 29/30 concrete predicates without inventing a per-status resilience field.

**Integration status:** full-document coverage and diagnostic serialization are consolidated under D08; D07 classifies external-contract/error changes and their required decisions. Remote acquisition, external-language validators, protocol adapters, and per-operation overrides are explicitly outside the portable design. Existing backoff spellings remain valid at their respective locations. Scoped examples cover composition stability, valid policy combinations, precise declaration conflicts, and operational decisions to stop retrying.

## D06 — Scope and open metadata

**Choice:** Which architecture use cases must SDL represent, and which metadata needs a shared normative shape?

**Selected design:** distinguish database-free intent from statelessness; allow secondary-only and storage-only systems without placeholder databases. Give storage resources stable IDs and environments explicit primary/replica data instances. Define per-resource recovery plans with documented exceptions and global minimum requirements. Use authored cost scenarios with exact decimal amounts, explicit subjects, and comparable currencies/periods. Keep design and compliance evidence metadata open while making applicability and missing implementation mappings explicit.

**Defined for v2:** [Scope and Operations](v2/SCOPE-OPERATIONS.md), with a worked example and scoped cases, completes this portable design. Historical rules 2 and 6 now have concrete reference/coverage predicates. Cost-budget and variance warnings use only explicit numeric estimates. Compliance mapping advice follows authored/normalized applicability; stage-derived design/framework advice requires a separately selected profile.

**Integration status:** fields/full-document fixtures and diagnostic serialization are consolidated under D08; D07 now defines the recovery/cost/open-metadata migration decisions. Provider-specific resource capability and recovery execution, alternate replication models, pricing acquisition, legal/certification verification, and optional heuristic profiles are explicitly outside the portable core. Open objects and modeled recovery boundaries are stated rather than treated as successful verification.

## D07 — Version baseline and compatibility

**Choice:** How is the current v1.1 amendment set identified, and how are acceptance or interpretation changes released?

**Recommendation:** freeze an identifiable baseline and classify editorial corrections, compatible additions, tightened validation, changed defaults/merge meaning, and vocabulary removal separately. A minor release must preserve the meaning and validity of existing conformant documents. Breaking changes need an explicit major version and migration definition.

**Selected release policy:** preserve v1.1 and place incompatible completion work in SDL v2. The [compatibility ledger](v2/README.md#compatibility-ledger) assigns the changes and records migration requirements. Publishing v2 does not assert that the current packages accept its version marker.

**Selected completion:** [Release Baselines and Migration](v2/RELEASE-MIGRATION.md) publishes content-addressed `sdl-v1.1-2026-09-13` and `sdl-v2.0` manifests. Baseline identity remains outside SDL documents and accompanies conformance/migration claims. The machine-readable plan assigns every v2 document/report rule to one or more of 22 records with a primary compatibility class, source/target paths, action safety, and decision requirements. Migration results distinguish completed target documents, unresolved author decisions, source rejection, and resource failure with replayable changes.

This adds no accepted version value or revision field to v1.1. `"2.0"` belongs to the v2 baseline only. The D07 definition is complete, and v2.0 is published as active. Package migration support remains later work, not a specification gap.

## D08 — Input profile and conformance

**Choice:** Which YAML inputs and fragments are SDL, and how is language conformance demonstrated?

**Defined for v2:** YAML 1.2 Core resolution; one mapping document per source; string/unique keys; forbidden explicit tags and merge keys; acyclic local aliases expanded by value; finite exact numeric values; resource-failure outcomes; fragment validation stages; and a machine-readable format for scoped examples. The [foundation corpus](v2/conformance/README.md) is maintained alongside these definitions.

**Selected completion:** [Full Document Contract](v2/FULL-SPEC.md) and its self-contained schema/catalogue define requiredness, retained-field meaning, explicit ORM bindings, and the full pipeline. [Validation Reports](v2/DIAGNOSTICS.md) define baseline-identified scope, outcome, source locations, and separate advice. Full-document and report cases supplement the scoped corpus; the [historical rule dispositions](v2/RULE-COVERAGE.md) leave no implicit v1.1 rule inheritance. Advisory algorithms are optional profiles, not missing core predicates. D07 provides the exact release identity and migration inventory.

**Complete when:** positive, negative, normalization, and composition examples give expected interpretations and diagnostics. Package implementations can be assessed against those examples later.

## Milestone 1 outcome

The consistency pass aligns authority, top-level import wording, feature version labels, default references, open-metadata descriptions, and backoff compatibility language. It makes domain examples satisfy the existing explicit primary-key rule, removes ambiguous ownership values from the API example, and marks the formerly unresolved rule definitions with the decision IDs above. It also separates package support labels from specification maturity.

This completes the bounded contradiction-cleanup milestone. Subsequent passes define foundations, semantic slices, the full portable field/report contract, and D07 release/migration artifacts. The v2 specification is complete and published as active; package conformance remains separate future work.
