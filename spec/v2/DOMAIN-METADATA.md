# SDL v2 — domain indexes, constraints, and relationships

**Status: active v2 completion of D02's portable domain catalogue.** This document extends [domain foundations](FOUNDATIONS.md#domain-field-catalogue-and-key-semantics) and [database bindings](OWNERSHIP-BINDINGS.md). It replaces the previously unspecified entity metadata arrays; it does not change v1.1. [Cases](conformance/domain-metadata.yaml) and a [worked example](examples/domain-metadata.sdl.yaml) accompany the definitions.

The domain model describes logical records and relationships. An index is an access-path declaration, a constraint states a record invariant, and a relationship describes a named or unnamed association. None installs a database object, selects an ORM, or guarantees provider support. Every entity still requires exactly one explicit primary-key field; multi-field uniqueness and foreign keys do not introduce composite primary keys.

## Records and identity

**DX-001 — Typed metadata records.** Entity `indexes`, `constraints`, and `relationships` are optional arrays, including empty arrays. Each entry is a complete mapping with a required `name` satisfying ID-001. Names are unique within each entity's own collection, not across all three collections: an index and a constraint may share a name. All records defined here are closed except `x-*`. Optional `description` is a string on index, constraint, and relationship records. Null is not an omitted field. Arbitrary legacy metadata must be deliberately translated or moved under an extension; extensions do not acquire portable semantics.

`fields` in an index or constraint is a nonempty ordered array of distinct field identifiers, each resolving within its owning entity. Names and references compare exactly. An entry refers to a direct declared field, not a dotted property path or expression. Reordering fields changes an index's access-path order and a foreign key's positional pairing, even where uniqueness of a tuple is unchanged.

## Indexes and uniqueness

**DX-002 — Index declaration.** An index requires `name` and `fields`; optional `unique` is boolean with effective default false. Fields are listed in access-path priority order, most significant first. Direction, collation, method, include columns, filters, expressions, and provider-specific options have no portable representation in this design; an understood extension/profile can describe them independently. No default index method or sort direction is inferred. Identical field lists with different index names are permitted and are not merged automatically.

`unique: true` also declares tuple uniqueness under DX-003. It is a logical assertion in addition to an access-path request. An ordinary index contributes no uniqueness. Neither form sets a field's authored `unique` flag, invents a key, or changes requiredness/nullability.

**DX-003 — Named uniqueness constraint and tuple semantics.** A uniqueness constraint requires `name`, `kind: unique`, and `fields`. It admits no `target` or referential-action members. The tuple of listed values must be distinct across materialized records of the entity, but a record with any absent or null member is excluded from this check. This extends DM-004's single-field null/absence behavior to tuples; it is not a provider-specific SQL null policy.

Equality is exact decoded-value equality as in IM-004: mapping member order is irrelevant, sequence order matters, numeric values compare exactly, and strings are not case-folded or otherwise normalized. Within each declared tuple, compare corresponding field values. Reordering a uniqueness declaration's field list leaves its predicate unchanged; it never permits swapping values between fields. Requiredness, type, enum, and scalar bounds still apply independently. A tuple constraint does not make each member individually unique or required.

A **declared unique field set** is the singleton primary-key field, a singleton field with `unique: true`, the fields of a `kind: unique` constraint, or the fields of an index with `unique: true`. A field tuple has a uniqueness guarantee for present non-null values if it contains every member of at least one such set. This permits a foreign key to reference a unique field plus an additional discriminator. Duplicate guarantees with different names are valid redundancy. An explicit field/index `unique: false` only declines that declaration's uniqueness guarantee; it does not cancel another constraint.

## Foreign-key constraints

**DX-004 — Positional foreign keys.** A foreign-key constraint requires `name`, `kind: foreignKey`, `fields`, and `target: {entity, fields}`. The target record is closed except `x-*`; its entity and field identifiers must resolve. The two field lists must have the same positive length, contain no repeated field, and pair by position. Each source and paired target field must have exactly the same DM-002 type name. Target fields must have a uniqueness guarantee under DX-003. Index order does not determine pairing; the authored target list does.

For a materialized source record, if any source member is absent or null, this foreign-key check does not require a target record. Otherwise, the complete source tuple must equal the paired target tuple of an existing target record. Partial-null tuples are allowed when individual fields allow those values. There is no inferred all-or-none presence constraint. Self-reference and cycles are allowed. Referential actions, cascades, deferrability, check expressions, and data migration execution remain external-profile concerns and are not standard members of this record.

DM-005's field `foreignKey: Entity.field` remains a one-field foreign-key declaration. Its target uniqueness test now uses DX-003, so a single-field unique constraint/index can establish eligibility. It does not inherit a multi-field guarantee that excludes other members. Field and named foreign keys are separate conjunctive declarations: one field may participate in several, and each must be satisfied. A named foreign key does not silently replace a field foreign key or vice versa. Primary-key rules, flags, defaults, and generated-value rules remain unchanged.

## Relationship roles and explicit foreign-key bindings

**DX-005 — Local and root relationship identity.** An entity-local relationship requires `name` and `to`; its source is the owning entity. Root `domain.relationships[]` retains required `from` and `to`, and now permits optional `name`. Both forms permit optional `type`, `via`, `description`, and `x-*`. `from`/`to` must resolve to entities. `type` retains DM-006's four cardinalities. A local record must not repeat `from`.

The identity of a named relationship is `(from, name)` across both locations. A duplicate identity is an error even if both declarations agree. Thus local `Order.relationships: [{name: purchaser, to: User}]` conflicts with root `{from: Order, name: purchaser, to: User}`. Different names can distinguish purchaser and approver roles between the same endpoints. Names may repeat under different source entities. Unnamed root relationships remain independent assertions without a referenceable identity; their equality does not collapse them. No endpoint-pair uniqueness rule is introduced.

A relationship without `via` is an independently described association. Its cardinality is not automatically matched to any field/constraint merely because the endpoint names agree. Multiple named roles can have different cardinalities. With neither `type` nor `via`, cardinality remains unspecified. No association creates a foreign key or join entity.

**DX-006 — Foreign-key selector.** `via` is a record requiring `side: from | to` and exactly one of `field` or `constraint`, both identifier references. `side` chooses the relationship endpoint entity that owns the foreign key. `field` selects a field with an authored DM-005 `foreignKey`; `constraint` selects a named `kind: foreignKey` constraint. The selected declaration must target the opposite endpoint entity. An ordinary field, unique constraint, missing selector, extra selector, or target mismatch rejects the binding. For self-relationships, explicit `side` still determines orientation; equal endpoint names do not erase it. A relationship refers to one foreign-key declaration, not a union of several.

**DX-007 — Cardinality consistency.** Every selected foreign key gives at most one target for a present, non-null source tuple. If its source tuple also has a uniqueness guarantee under DX-003, the maximum cardinality is `one-to-one` in either orientation. Otherwise it is `many-to-one` when `via.side: from`, or `one-to-many` when `via.side: to`.

An authored `type` on a bound relationship must equal that derived cardinality. Omitted `type` has that effective cardinality but remains omitted in the authored/normalized document. A stricter one-to-one claim must declare the corresponding source uniqueness; a looser many-to-many claim does not describe this selected foreign key and is rejected. An unbound many-to-many relationship remains valid. Derivation is from declared keys/uniqueness only; defaults, observed sample rows, or ORM behavior do not establish it. “One” is still a maximum, not mandatory participation; field requiredness governs the materialized source tuple separately.

Several relationship names may deliberately select the same foreign key, but each must satisfy this predicate. This catches conflicting cardinality claims sharing a concrete binding while permitting independently described roles without falsely equating them.

## Composition, normalization, and diagnostics

**DX-008 — Declaration stages and preservation.** ST-001/ST-002 apply. Present types, enums, identifier forms, nonempty/distinct field lists, complete array entries, and local duplicate names are checked before merging. References, uniqueness guarantees, selector targets, cross-location relationship identities, and derived cardinalities are checked on the assembled model. An entity remains an IM-004 identity-replacement unit: a later same-name entity replaces the entire earlier entry, including its fields, indexes, constraints, and local relationships. These nested arrays are not independently patched or merged across replacement entities. Root relationships continue to concatenate; an old root relationship can become invalid if its selected foreign key is removed by an entity replacement.

Normalization preserves authored locations, list order, extensions, explicit false values, and absent flags. It does not lift local relationships into the root array, deduplicate independent declarations, synthesize foreign keys, or materialize effective cardinalities/uniqueness as authored attributes. Consumers may build a derived relationship view with explicit `from`, provided it is separate from the normalized document and retains the originating source/path.

**DX-009 — Database advisory and diagnostic scope.** OB-013 also applies to each entity-local relationship and named foreign-key constraint. After successful endpoint resolution, emit `cross-database-reference` when both endpoints have known, unequal database IDs. An unknown binding is not a cross-database finding. Each authored field foreign key, named constraint, root relationship, and local relationship is a separate declaration and may generate its own advisory. A local relationship's derived view must not generate a second advisory for the same declaration. This remains a warning, not proof of physical database enforcement.

DX-001–DX-008 are declaration/semantic error rules; DX-009 is an advisory. Diagnostics use CF-001 source identity and decoded field paths. A reference failure identifies the referencing field/list member or selector; a cardinality mismatch identifies the relationship `type` and selected foreign key; a duplicate identifies the second declaration and its earlier declaration when available. Scoped record examples evaluate invariant meaning without asserting that SDL packages inspect live data.

## Compatibility and completion boundary

| Historical shape or gap | v2 interpretation | Migration requirement |
|---|---|---|
| Arbitrary metadata arrays | Closed named index, constraint, and relationship records | Translate known intent explicitly; preserve other metadata under `x-*` without claiming portable validation |
| Implicit database-specific index semantics | Ordered field lists; explicit uniqueness, no assumed algorithm/direction | Record intended order and uniqueness; leave provider details to an identified extension/profile |
| Field-only foreign keys | Additional named positional foreign keys with declared target uniqueness | Preserve exact field pairing, null/absence intent, and conjunction with existing field constraints |
| Root/local relationship overlap | Shared `(from, name)` identity and explicit selectors | Reconcile duplicate named declarations; distinguish independent roles deliberately |
| Unchecked cardinality claims | Bound relationships agree with declared foreign-key/source uniqueness | Add the intended uniqueness constraint or correct the cardinality/binding; do not infer it from data |

The selected portable D02 catalogue is now defined: single primary keys, field types/constraints, indexes, tuple uniqueness/foreign keys, ownership/store bindings, and relationship roles/cardinality. Composite primary keys, arbitrary executable check expressions, physical storage topology, and provider-specific DDL are explicitly outside this model. [D06's scope definitions](SCOPE-OPERATIONS.md) cover portable storage/recovery declarations; [D07](RELEASE-MIGRATION.md) classifies and maps their baseline transition.

Full-document integration and general diagnostics are now defined in the [consolidated contract](FULL-SPEC.md) and [report format](DIAGNOSTICS.md). Historical scoped examples retain their original scope.
