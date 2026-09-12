# SDL v2 foundations

**Active for the 2.x line; v1.1 is unchanged.** This document defines the foundation semantics of the [v2 specification](README.md). Rule identifiers belong to the v2 specification, not the package diagnostic-code registry. A conforming implementation must satisfy each applicable rule; diagnostic message wording and ordering are not prescribed.

Examples and machine-readable expected results live in the [conformance corpus](conformance/README.md). The [consolidated contract](FULL-SPEC.md) and [structural schema](sdl-v2.schema.json) now define all v2 container shapes without an implicit v1.1 fallback. [Validation reports](DIAGNOSTICS.md) serialize CF-001 outcomes.

[Ownership and Bindings](OWNERSHIP-BINDINGS.md) extends these foundations with explicit team, project/service, API, database, integration, and hosting relationships. Its v2 changes include the canonical `deployment.environments` location and per-target/per-placement hosting fields; these replace the corresponding v1.1 locations in v2 only.

## Input and value model

The serialization basis is the [YAML 1.2.2 Core Schema](https://yaml.org/spec/1.2.2/#103-core-schema). The restrictions below are SDL design choices on top of YAML.

| Rule | Requirement |
|---|---|
| IN-001 | Each source is UTF-8 YAML containing exactly one document whose root is a mapping. Use YAML 1.2 Core scalar resolution. An explicit `%YAML` directive, if present, must specify `1.2`; other directives are forbidden. |
| IN-002 | Every mapping key resolves to a string. Duplicate keys are errors, including differently quoted keys with the same decoded string. Mapping order has no semantic meaning. Sequence order is preserved. |
| IN-003 | Explicit node tags and the decoded mapping key `<<` are forbidden everywhere, including extension metadata. Quote a scalar to keep it a string. |
| IN-004 | Anchors and aliases are allowed within one source and expand by value. An unknown alias or cyclic expansion is an error. Aliases cannot refer to another file. No shared object identity survives parsing. |
| IN-005 | Values are strings, booleans, null, finite numbers, arrays, and string-keyed objects. NaN and infinities are errors. Numeric interpretation must not silently round a value; a processor unable to preserve the value must report a resource/representation failure. An integer is a number with no fractional part. |

Thus plain `true` is a boolean, plain `yes` and `2026-09-11` are strings, and quoted `"99.9"` is a string. A blank document is null and fails IN-001. The profile also applies to arbitrary metadata; “open” does not admit cyclic graphs or executable tags. Comments, quote style, anchor names, and mapping presentation order are not document values.

Resource limits must be disclosed. Exhausting a byte, node, alias-expansion, numeric-precision, or import limit is a failed operation, not successful partial parsing and not proof that the language input is invalid. A failed operation must not expose a partial value as a conformant result.

## Authored fragments and validation stages

**ST-001 — Source validity.** Every source must first satisfy the input profile. Check each present field's declared type, enum, scalar grammar/bound, and closed-object policy before composition. Check duplicate local declarations in the identity collections below. An invalid value cannot be repaired merely by overriding it in a later source. Unknown `x-*` values are preserved and receive only input-profile validation unless their extension is explicitly understood.

**ST-002 — Assembly.** An imported fragment may omit document sections, object members, and `sdlVersion`. Missing required members of ordinary objects are checked on the assembled document. An array item is a complete declaration: its own required fields must be supplied in that source. In particular, project items need their required project fields, entity items need `name` and `fields`, and field items need `name` and `type`. Cross-source references and constraints involving multiple values are evaluated after composition. This permits a relationship to reference an entity declared in another module.

**ST-003 — Version and final validity.** A full v2 root uses `sdlVersion: "2.0"`. Every module that states a version must state the same version; a different version cannot be overwritten away. After resolution, check the complete document's required sections and fields, identities, references, cross-field predicates, and normalization validity in that order. A source with no imports follows the same stages. Scoped corpus fixtures intentionally omit unrelated full-document sections; their scope is explicit.

The stage order is input → local structural checks → graph resolution/composition → full structure → cross-field semantics → normalization → validity check. A stage failure stops successful completion; diagnostics may include other independently established errors, but need not enumerate errors in an unread or structurally invalid subtree.

## Identity and references

**ID-001 — Identifier comparison.** Component, entity, field, custom-integration, and environment identifiers must match `^[A-Za-z_][A-Za-z0-9_-]*$`. Comparison is exact and case-sensitive. There is no trimming, case folding, Unicode normalization, prefix guessing, or implicit rename. `api` and `API` are distinct; ` api` is invalid. Dots and slashes are excluded so reference syntax has unambiguous delimiters. Import labels retain their separate grammar in IM-001.

Feature and API inventory names are display identities: nonempty strings with no leading/trailing ASCII space (U+0020) and no control characters (U+0000–U+001F or U+007F–U+009F). They may contain internal spaces and other Unicode characters. Their comparison is also exact. This rule does not turn every descriptive `name` elsewhere in the document into a referenceable identifier.

**ID-002 — Namespaces and uniqueness.** The following target sets are built from the final assembled document. Repeated declarations within a single source are also errors under ST-001. “Unique” means at most one entry for each identity in the specified set.

| Identity set | Declaration | Uniqueness scope |
|---|---|---|
| Components | `architecture.projects.frontend[]`, `.backend[]`, `.mobile[]`, and `architecture.services[]`, keyed by `name` | One shared global namespace across all four lists |
| Services | `architecture.services[].name` | Subset of components, not an alias of projects |
| Entities | `domain.entities[].name` | Entire entities array |
| Fields | `domain.entities[].fields[].name` | One entity; different entities may share a field name |
| Custom integrations | `integrations.custom[].name` | Entire custom integration array |
| Environments | `deployment.environments[].name` | Entire environments array; OB-007 replaces the v1.1 CI/CD location |
| Indexes | `domain.entities[].indexes[].name` | Per entity under DX-001; separate from constraint names |
| Constraints | `domain.entities[].constraints[].name` | Per entity under DX-001; separate from index names |
| Named relationships | Root and entity-local relationships with `name` | Combined `(from, name)` namespace under DX-005; local source is its owning entity |
| Storage resources | `data.storage.blobs.id`, `.files.id` | Across storage slots under SO-002; distinct from database IDs |
| Data instances | Environment `dataInstances[].name` | Per environment under SO-003 |
| Recovery plans | `backupDr.plans[].name` | Global plan-name and environment/resource-pair uniqueness under SO-004 |
| Cost scenarios/comparisons | `costs.scenarios[].name`, `.comparisons[].name` | Separate global namespaces under SO-007/SO-009; item names are per scenario |
| Compliance requirements | Framework `requirements[].requirement` | Per framework under SO-010 |
| Technical debt | `technicalDebt[].id` and input alias `techDebt[].id` | Each location is unique before/after composition; cross-alias reconciliation follows ND-001/ND-002 |
| Teams | `solution.teams[].name` | Entire teams array under OB-001 |
| Databases | `data.primaryDatabase.id`, `data.secondaryDatabases[].id` | One shared store namespace under OB-005 |
| Hosting targets | `deployment.targets[].name` | Entire target array under OB-007 |
| Features | `features[].name` | Entire feature array |
| API inventory entries | `contracts.apis[].name` | Entire API inventory array |
| SLO declarations | `slos.services[].name` | At most one SLO entry per referenced component |

**ID-003 — Reference resolution.** A reference must resolve to exactly one declaration in its prescribed target set. Unknown targets and ambiguous targets are errors; order of declaration is irrelevant.

| Reference field | Target and meaning |
|---|---|
| `architecture.services[].dependencies[]` | Service identifier; dependency edges go from the declaring service to the named service. Projects and integrations are not targets. |
| `slos.services[].name` | Component identifier; the SLO belongs to that component. |
| `domain.relationships[].from` / `.to` | Entity identifier; orientation is from the declaring source entity to the target entity. |
| `domain.entities[].fields[].foreignKey` | `Entity.field`, with exactly one dot; see DM-005. |

**ID-004 — Dependency graph.** A service may not depend on itself. The directed service dependency graph must be acyclic. Duplicate occurrences of the same dependency string in one list describe one edge and do not create additional executions or a uniqueness error.

API `owner`, project/service bindings, entity/database ownership, and integration-use bindings are not resolved by matching names. Their explicit fields and predicates are defined in [Ownership and Bindings](OWNERSHIP-BINDINGS.md). Import labels do not add names to any target set, and a shared library's descriptive name does not automatically become a component.

## Imports and composition

**IM-001 — Declarations and paths.** An import entry is a nonempty path string or an object requiring `name` and `path`, both nonempty strings, with no other fields except `x-*` metadata. Such metadata belongs to the import declaration and is removed from the assembled architecture with `imports`, while remaining available in source provenance. An explicit label must match `^[A-Za-z][A-Za-z0-9_-]*$`. A string entry derives its label from the basename with `.sdl.yaml`, `.sdl.yml`, `.yaml`, or `.yml` removed, as applicable; a derived label must satisfy the same grammar. Labels are unique within one file's import list. Use an explicit label to disambiguate equal stems.

Paths use `/` separators and resolve relative to the declaring file, within the import root (the root document's containing directory). Reject absolute paths, backslashes, URI schemes/drive prefixes, NUL characters, and paths that escape that root after collapsing `.` and `..`. A path with `.sdl.yaml`/`.sdl.yml` selects that file. Other `.yaml`/`.yml` files are accepted with a `nonstandard-extension` advisory. Otherwise try `.sdl.yaml` then `.sdl.yml`. Only absence permits trying the second suffix: unreadable or malformed preferred files are errors, not a fallback signal.

**IM-002 — File identity.** Canonical file identity is the resolved file within the import root, independent of its import label and alternate spellings such as `./parts/../shared`. A filesystem host must resolve aliases such as symlinks to the same identity, enforce the root boundary on the resolved target, and report inconsistent/case-ambiguous lookups instead of silently selecting another file. Virtual hosts provide the same stable-identity guarantee. Reads within one operation must refer to a consistent source snapshot or fail if a detected change prevents one.

**IM-003 — Traversal and precedence.** Use one accumulator and depth-first, left-to-right traversal of each file's import list. Merge each file's own content only after visiting its imports. Merge a canonical file at most once across the entire operation. The root file therefore contributes last. This is a single global postorder sequence, not recursive merging of cached, already-expanded subtrees.

For each visit:

1. Resolve the target's canonical identity. If it is on the active traversal stack, fail with a cycle error.
2. If it is already completed, contribute nothing and do not descend again. This is the diamond/shared-module case.
3. Check the supported depth/resource budget, parse and locally validate the file, and push it onto the active stack.
4. Visit its imports in listed order, then merge its own content with `imports` removed.
5. Pop the file and mark it completed. No file is marked completed after a failure.

**IM-004 — Merge operation.** Apply these rules to the next file's own content and the accumulator. Equality means decoded value equality, ignoring mapping presentation order.

| Existing and incoming values | Result |
|---|---|
| Key absent from accumulator | Copy the incoming value |
| Both values are objects | Recurse by key |
| Both values are arrays at `domain.entities`, `integrations.custom`, or `features` | Merge by exact `name`; see below |
| Both values are other arrays | Concatenate in source order; an incoming empty array does not clear earlier entries |
| Any other combination, including null or different container kinds | Incoming value replaces existing value; report a `scalar-override` warning if the values differ |

In identity-keyed arrays, append new identities. On a cross-source collision, replace the entire earlier entry in its existing position and emit a `duplicate-array-item` warning, even if the two entries are equal. This is not a recursive patch of an entity or feature. Duplicate identities inside one source are already errors under ST-001. Registrations are exact paths: an extension array or entity field array named `features` does not inherit the root feature-array behavior.

Scalar-override warnings also apply to container replacement; the historical warning name does not change the rule. Null is a value, not a deletion marker, and must still satisfy the destination field's type. Reject an explicit null before merging where the declared field does not admit null; permitted domain defaults and open metadata can contain null. Source-valid replacements may nevertheless fail final structure or cross-field semantics. Merge diagnostics and final validity are separate outcomes.

**IM-005 — Completeness and limits.** Root depth is zero; conforming processors support at least three nested import levels. They may support more. A supported-depth limit measures the active first-visit traversal; revisiting a completed file does not consume another level. A known active-stack cycle is reported before a depth failure. If a limit prevents reading further files, report a resource failure and do not claim that the unvisited graph is acyclic. Missing files, invalid declarations, source errors, cycles, unreadable sources, and resource limits all prevent a successful result. Preview output may be exposed only as explicitly incomplete, with no conformance claim.

**IM-006 — Sidecars.** Reject imported files at root-relative canonical paths `sdl/assumptions.sdl.yaml` and `sdl/complexity.sdl.yaml`. Also reject an imported fragment whose remaining root fields, after removing `imports` and optional `sdlVersion`, are nonempty and all start with `x-`. This retains the distinction between architecture modules and discovery sidecars. An empty mapping fragment (`{}`) is a no-op; a blank YAML document remains invalid under IN-001. A fragment containing only imports may aggregate modules. The sidecar rule does not prohibit `x-*` content alongside actual SDL section declarations.

Example: root imports A then B; both import shared; A overrides shared. The contribution order is shared, A, B, root. Shared does not reappear before B and cannot reset A's override. The corpus includes this case explicitly.

## Operational scalars and field conventions

**SC-001 — Duration grammar.** A duration is a string matching `^(0|[1-9][0-9]*)(\.[0-9]+)?(ms|s|m|h|d|w)$`. Units are fixed elapsed time: one second is 1,000 milliseconds; minute/hour/day/week are respectively 60 seconds, 60 minutes, 24 hours, and 7 days. Fractional values are allowed and interpreted exactly. A day is not a calendar date interval. No signs, exponent notation, leading/trailing spaces, combined units, months, or years are accepted. `0.5s` and `500ms` have equal meaning; spelling is preserved rather than rewritten. The field table below supplies the zero policy.

**SC-002 — Availability grammar.** Both `nonFunctional.availability.target` and `slos.services[].availability` are percent strings matching `^(0|[1-9][0-9]*)(\.[0-9]+)?%$`. The value is a percentage, not a fraction: `"99.9%"` means 99.9 percent. For both fields, the exact numeric percentage must be within 90 through 99.999 inclusive. Quoted numeric strings without `%` and numeric YAML values are invalid. Trailing fractional zeroes are accepted and preserved. This makes the prior SLO acceptance bounds explicit and applies them consistently to the global target in v2.

**SC-003 — Counts and thresholds.** Attempt counts are integers at least 1 and count the first execution: 1 means no retry; 3 permits at most two retries. Rate-limit request counts are positive integers per fixed 60-second interval; this declares an average quota, not a token-bucket or window-alignment algorithm. Circuit-breaker thresholds are integer percentages from 1 through 99 inclusive. No implicit coercion from strings or booleans is permitted.

| Field | Value grammar / bound | Interpretation |
|---|---|---|
| `auth.sessions.ttl.access`, `.refresh` | SC-001, strictly positive | Token lifetime |
| `nonFunctional.performance.apiResponseTime`, `.pageLoadTime` | SC-001, strictly positive | Response/load time objective; no implied percentile |
| `nonFunctional.backup.retention` | SC-001, strictly positive | Fixed retention duration |
| `slos.services[].latencyP95` | SC-001, strictly positive | 95th-percentile latency objective |
| `resilience.circuitBreaker.timeout` | SC-001, strictly positive | Time before allowing a recovery probe after opening |
| `resilience.timeout.default` | SC-001, strictly positive | Default per-attempt execution timeout; total retry budget is not specified by this field |
| `resilience.retryPolicy.initialInterval` | SC-001, zero allowed | Delay before the first retry |
| `resilience.retryPolicy.maxAttempts` | SC-003 | Maximum total executions |
| `architecture.errorConventions.retry_policy.max_attempts` | SC-003 | Maximum total executions under that error policy |
| `architecture.errorConventions.retry_policy.base_ms`, `.cap_ms` | Nonnegative integer milliseconds | Initial retry delay and maximum delay; `cap_ms` must be at least `base_ms` |
| `resilience.circuitBreaker.threshold` | SC-003 | Failure percentage at which the breaker opens |
| `resilience.rateLimit.requestsPerMinute` | SC-003 | Requests per 60 seconds |

**SC-004 — Location-specific spelling.** Existing snake_case error-convention fields and camelCase resilience fields remain valid only at their declared locations. New first-class field names use camelCase unless an explicit exception is specified. `constant` and `fixed` remain their existing location-specific backoff values. No casing or unit conversion is inferred from similar names. Cross-policy retry precedence, eligibility, and delay progression are defined in [Contracts and Errors](CONTRACTS-ERRORS.md#one-retry-policy-evaluation-per-logical-call); this section supplies their scalar meanings and bounds.

Maintenance windows, `integrations.custom[].rateLimit`, growth estimates such as `dataGrowthPerMonth`, and timing metadata in intentionally open sections are descriptive strings/metadata until separately formalized. They are not implicitly parsed using SC-001 or SC-003. A latency/availability objective without a measurement window does not define an error-budget calculation or prove that the objective is met.

## Domain field catalogue and key semantics

**DM-001 — Entities and keys.** Each entity requires an identifier `name` and a nonempty `fields` array. Each field requires identifier `name` and string `type`. Each entity declares exactly one field with `primaryKey: true`. A field named `id` is not an implicit key. Composite primary keys are outside the v2 portable domain model; named tuple uniqueness/foreign-key constraints under [Domain Metadata](DOMAIN-METADATA.md) cannot substitute for the required single-field primary key. Field uniqueness is per entity under ID-002.

Entity `description` and `table` remain optional strings. `table` is a physical naming hint, not entity identity or a database binding. Root `domain.entities` and `domain.relationships` remain optional arrays; an empty domain declares no entities. Entity `indexes`, `constraints`, and entity-local `relationships` have the typed records and predicates in [Domain Metadata](DOMAIN-METADATA.md). Root relationships retain DM-006 semantics, extended there with optional role names and explicit foreign-key bindings. No declaration implies provider-specific database DDL.

**DM-002 — Types.** The portable type names and value domains are:

| Type | Meaning for an authored `default` or `enum` value |
|---|---|
| `string` | A string; length counts Unicode scalar values |
| `boolean` | A boolean |
| `integer` | A finite number with no fractional part; no fixed storage width is implied |
| `number`, `decimal` | A finite exact numeric value; `decimal` additionally supports decimal precision/scale constraints |
| `uuid` | A string of 8-4-4-4-12 hexadecimal digits separated by hyphens; comparison of authored values is exact, with no case rewrite |
| `date` | A string `YYYY-MM-DD` representing a valid Gregorian calendar date, year 0001–9999 |
| `datetime` | A date followed by `T` and `hh:mm:ss`, optional fractional seconds, then `Z` or a signed `hh:mm` UTC offset; hour 00–23, minute/second 00–59, offset hour 00–23 and minute 00–59. Leap-second notation is not part of this profile. |
| `json` | Any value admitted by the input model |

Null is governed by DM-003 for every type, including `json`. No automatic string/number or date conversion occurs. UUID/date/datetime types do not select a language-runtime class or storage type. `number` and `decimal` share the admitted values but express different modeling intent; they are not interchangeable foreign-key types.

A custom type must use `x-` followed by an ID-001 identifier, such as `x-Money`. It is an opaque type name whose values receive input-profile checks only; its application-specific validity is outside portable SDL. Arbitrary unprefixed type names are rejected in v2. Extensions may supply additional meaning, but cannot silently redefine portable types.

**DM-003 — Presence and nullability.** These flags describe the materialized logical record, after any application-side defaulting or generation. They are not requirements on an API request body.

| `required` | `nullable` | Allowed materialized field states |
|---|---|---|
| false | false | Absent, or a non-null typed value |
| false | true | Absent, null, or a non-null typed value |
| true | false | Present with a non-null typed value |
| true | true | Present with null or a non-null typed value |

For a non-key field, omitted `required`, `nullable`, `primaryKey`, `unique`, and `generated` mean false. A primary key implies `required: true`, `nullable: false`, and `unique: true`; explicitly contradictory flags are errors. Effective defaults must not be inserted by core normalization under ND-003/ND-004, but every processor must interpret them identically. They may be exposed in a separate effective-value view. A generated key is still present in the materialized record. `generated: true` and an authored `default` are mutually exclusive.

**DM-004 — Field constraints.** The remaining declared attributes are defined as follows; each is optional unless another predicate requires it.

| Attribute | Type and requirement |
|---|---|
| `primaryKey`, `required`, `nullable`, `unique`, `generated` | Boolean, with DM-001/DM-003 semantics. `unique: true` constrains present non-null values across records of that entity; absent/null values do not collide. |
| `foreignKey` | String reference under DM-005 |
| `default` | Authored value used when a materialized field would otherwise be absent; it does not replace explicit null. It must satisfy the field's type, nullability, enum, and applicable size/precision constraints. SDL does not execute the default. |
| `enum` | Nonempty array of distinct values satisfying the field's type, nullability, and size/precision constraints. If present, a default must equal one of its members. Numeric equality is by exact value; object key order is irrelevant and array order matters. |
| `maxLength` | Positive integer, permitted only for `string`; applies to string values and string defaults/enum members |
| `precision` | Positive integer, permitted only for `decimal` |
| `scale` | Nonnegative integer, requires `precision`, and must not exceed it |
| `description` | Descriptive string with no validation effect |
| `onUpdate` | Nonempty descriptive string naming an application-side update policy; SDL preserves it and does not execute or validate that policy |

For decimal constraints, absent `scale` means zero when `precision` is present. A value must be exactly representable as an integer times `10^-scale`, and its absolute value must be less than `10^(precision-scale)`. This defines size without binary floating-point rounding. `precision: 5, scale: 2` admits 999.99 and rejects 1000 or 1.234. Null, when permitted, bypasses non-null type/size tests but remains subject to an authored enum.

Domain field objects remain open to additional metadata. Unrecognized attributes are preserved with no portable constraint semantics; `x-*` is the recommended spelling. They cannot override the declared attributes above. This openness does not make an entity object open.

**DM-005 — Foreign keys.** `foreignKey` is exactly `Entity.field`, where both components satisfy ID-001. The entity and field must exist after composition. The target field must have a uniqueness guarantee under [DX-003](DOMAIN-METADATA.md#foreign-key-constraints): its primary-key/field flag or a single-field unique index/constraint qualifies; a multi-field guarantee alone does not establish single-field uniqueness. Source and target type names must match exactly. Self-references and cycles between foreign keys are allowed; they are distinct from the forbidden service dependency cycles. A nullable/optional source permits null/absence and checks the reference constraint only for a present non-null record value. This is a model constraint, not a claim that SDL validates application records or installs a database constraint.

**DM-006 — Root relationships.** Each root relationship requires `from` and `to` entity identifiers. Optional `type` is `one-to-one`, `one-to-many`, `many-to-one`, or `many-to-many`; omission leaves cardinality unspecified. In `one-to-many`, one `from` entity instance relates to many `to` instances; `many-to-one` is the converse. “One” sets an upper bound of one, not mandatory participation. Minimum participation is not expressed by these values. Self-relationships are allowed. A root relationship does not fabricate a foreign-key field, infer ownership, or select a join table. [DX-005–DX-007](DOMAIN-METADATA.md#relationship-roles-and-explicit-foreign-key-bindings) define local relationship records, shared named-role identity, explicit foreign-key selectors, and the cardinality checks for bound relationships. Unbound declarations retain the meanings above; neither location overrides the other.

## Compliance vocabulary and normalization boundary

**NM-001 — Per-location vocabulary.** Root `compliance.frameworks[].name` accepts exactly `GDPR`, `HIPAA`, `SOC2`, `SOC2-Type2`, `PCI-DSS`, `CCPA`, `ISO27001`, `ISO 27001`, `SOX`, `FERPA`, and `FISMA`. Normalize only the listed root alias `ISO 27001` to `ISO27001`. Lowercase root names are invalid. Shorthand arrays at `nonFunctional.compliance.frameworks` and `constraints.compliance` accept exactly the six lowercase values below.

| Shorthand | Canonical root name |
|---|---|
| `gdpr` | `GDPR` |
| `hipaa` | `HIPAA` |
| `soc2` | `SOC2` |
| `pci-dss` | `PCI-DSS` |
| `iso27001` | `ISO27001` |
| `sox` | `SOX` |

**NM-002 — Canonical conversion.** If the root `compliance` section is absent, read the NFR shorthand list first, then the constraints list; convert by the table, deduplicate by canonical name, and create `{name, applicable: true}` entries in first-occurrence order. A present shorthand list, even empty, produces `compliance.frameworks` (possibly empty). With neither root nor shorthand declarations, leave compliance absent.

If root `compliance` is present, it is authoritative even when `{}` or its frameworks array is empty. Do not add frameworks or infer applicability from shorthands. If shorthand names are not represented by root entries with `applicable: true`, emit a `shadowed-compliance-shorthand` advisory. Normalize root aliases. Two root entries that become equal in canonical name are an error, even if their other fields match; do not merge requirement objects implicitly. Omitted root applicability stays omitted and means unspecified, not false or true.

The normalized value removes the two shorthand-list fields after reconciliation, preserving all other fields and parent objects. Each created, renamed, or removed value must have provenance recording its source field(s) and whether it was a canonical conversion or a shadowed declaration. Reapplying this transformation must leave the normalized value unchanged.

**NM-003 — Preservation and defaults.** Missing, explicit null, empty string, empty object, empty array, zero, and false are distinct authored states. Structural validity determines where each is allowed; normalization must not repair an invalid authored field or treat every falsy value as absence. Preserve authored values except for an explicitly specified canonical transformation such as NM-002. Domain flag defaults in DM-003 define effective meaning; they do not authorize generation of architecture facts.

The package's stage/cloud/framework defaults are not adopted as normative v2 defaults. A suggestion based on project stage, inferred hosting, or missing metadata must remain distinguishable from an authored declaration. [Normalization](NORMALIZATION.md) defines the closed default policy, effective-value catalogue, debt reconciliation, and provenance result format under D04. The normalized result must satisfy the same applicable language predicates as the valid pre-normalization document.

## Conformance and diagnostics

**CF-001 — Observable outcomes.** Each scoped operation reports accept, reject, or resource failure. Accept requires all applicable predicates in that scope to hold. Warnings/advisories do not convert rejection or resource failure into acceptance. A diagnostic identifies the rule, severity, source file, and field path when available; composition diagnostics retain both contributing source locations. Line/column reporting is recommended but not normative. Invalid YAML can report a source location without a decoded field path.

Paths are sequences of decoded object keys and zero-based array indices in the corpus. This avoids assigning parsing semantics to punctuation in a display identity. Error ordering and user-visible wording may differ between implementations. The corpus's `rules` lists link each example to its governing predicates; `expected.violations` identifies the required failing predicates, while incidental downstream failures are not prescribed. `expected.forbiddenWarnings` identifies advisories that must not occur; a list of required warnings alone does not assert their absence. A positive case has an explicit value, interpretation, or set of assertions, not merely a “valid” label.

Full language conformance also requires the remaining v2 field catalogue and rule set. Passing only these foundation cases must be reported as foundation-scope coverage.
