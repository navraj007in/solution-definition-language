# SDL v2 — debt, defaults, and normalization provenance

**Status: active v2 completion of D04.** This extends [Foundations](FOUNDATIONS.md), the [domain catalogue](DOMAIN-METADATA.md), and [operational scope](SCOPE-OPERATIONS.md). It defines a portable normalization result and optional suggestion records independently of packages. [Cases](conformance/normalization.yaml) and a [worked input](examples/normalization.sdl.yaml) accompany the rules. v1.1 behavior is preserved; the historical [implemented defaults](../../reference/normalization-defaults.md) are not the v2 default contract.

Normalization acts on valid, assembled SDL values. It makes explicitly defined canonical transformations and preserves everything else. It does not complete a missing architectural decision, infer a provider, or make invalid input conformant by supplying required facts. Here “authored” means present in a supplied SDL source; it does not certify that a human rather than a generator wrote that source.

## Technical-debt catalogue and reconciliation

**ND-001 — Complete debt declarations.** Both `technicalDebt` and its input alias `techDebt` are optional arrays of complete debt records. Each record requires `id` (ID-001 identifier) and nonblank string `decision`, `reason`, and `impact`. Nonblank means containing at least one character other than ASCII space, tab, carriage return, or line feed. Optional `effort`, `triggerCondition`, and `mitigationPlan` are descriptive strings; optional `priority` is `low | medium | high | critical`. Records are closed except `x-*`. No effort unit, executable trigger, mitigation action, owner, status, or default priority is inferred.

IDs must be unique within each array, locally and after composition. Repeated records in the same location reject even if identical; neither debt location is an IM-004 identity-replacement collection. The special cross-alias comparison below is not permission to merge duplicate records within a location. All required fields must exist in their source array entry; complementary partial debt records cannot assemble across files or aliases.

**ND-002 — One canonical debt collection.** Reconcile only after IM-004 composition. Start with the canonical `technicalDebt` sequence in its authored order, then examine `techDebt` entries in their authored order. Append an alias entry whose ID is not present. When its ID already exists in the canonical collection, accept only if the entire decoded records are equal under IM-004, including optional fields and extensions; retain one record in the canonical position with provenance from both declarations. Any difference is a conflict error, not a canonical-location override or field-by-field merge. Equality ignores mapping order and compares numbers exactly, but does not ignore missing versus false, empty, or null attributes.

If only the alias exists, create `technicalDebt` with its sequence, even when empty. If neither exists, leave both absent. Always remove `techDebt` from the normalized document. A present empty canonical array contributes no entries and does not suppress a nonempty alias: the two spellings are contributions to the same debt collection. This differs deliberately from NM-002's authoritative root compliance section. Empty arrays do not erase imported entries. Record order never depends on hash-table iteration or the relative presentation order of the two root keys.

Identical cross-alias records require no warning: their combined origins record the duplication. A conflicting pair identifies the ID and both source locations and rejects normalization without a conformant partial result. Renaming IDs, choosing a preferred conflicting record, or dropping an extension requires a separate source edit; normalization does not make that decision.

## Closed normalization and default policy

**ND-003 — Allowed transformations and pipeline.** The portable document transformations are exactly ND-002 debt reconciliation and NM-002 compliance reconciliation/name conversion. This is a closed list for v2. Parse and validate each source, compose with provenance, validate assembled structure/references and canonical-collision preconditions, reconcile debt, reconcile compliance, validate the result, and evaluate post-normalization advisories such as SO-010. Other independent diagnostics may be collected earlier, but diagnostics based on converted names/applicability must use the canonical result. Invalid required fields, unsupported aliases such as `dotnet-8`, and invalid root compliance collisions reject before successful output; normalization is not a migration from another language version.

No document-value defaults are inserted beyond those two canonical transformations. Preserve source values, absent fields, explicit false/zero/null, empty collections, unknown permitted metadata, array order, currency/duration spelling, and unused parent objects. Do not recursively remove empty objects. The result must satisfy the same applicable validity predicates; a transformation failure cannot return a successfully normalized prefix. Source inputs must not be mutated.

For document values, normalization is idempotent: `N(N(d).document).document = N(d).document`. A fresh second invocation over an already canonical document has no change events. Its provenance describes its own supplied input, not a fabricated history of the first invocation. Persist earlier result artifacts separately if an audit needs that history.

**ND-004 — Effective defaults and derived meanings.** The following catalogue records effective interpretation, not inserted document fields. The cited semantic rule is authoritative for applicability/bounds. Optional fields not given an explicit effective meaning by this catalogue or another rule remain unspecified; in particular, missing booleans do not generally mean false. No framework, stage, target, or package convention adds an implicit default. Future field definitions require an explicit catalogue update to add an effective default.

| Field or situation | Effective interpretation; document remains unchanged | Source |
|---|---|---|
| Non-key domain field flags `required`, `nullable`, `primaryKey`, `unique`, `generated` | False when omitted; other declared uniqueness guarantees still apply | DM-003, DX-003 |
| Primary-key field | Required, non-nullable, unique; contradictory authored flags reject | DM-003 |
| Decimal `scale` with authored `precision` | Zero when scale omitted | DM-004 |
| Envelope field `required`, `nullable` | False when omitted, relative to the parent | EC-006 |
| Index `unique` | False when omitted; independent constraints are not cancelled | DX-002 |
| Bound relationship `type` | Derived from the selected foreign key and declared source uniqueness | DX-007 |
| Structured contract `spec.pointer` | Empty pointer/root selection when omitted; this does not apply to text formats | EC-003 |
| Listener `network` | Private scope keyed by environment/project; no fabricated network name | OB-010 |
| No retry policies | One execution and no automatic retry authorization | EC-009 |
| One of two retry policies absent | Only the authored policy contributes budget/delay | EC-009/EC-010 |
| Empty cost items or omitted cost total | Exact sum, zero for no items; do not insert `total` | SO-008 |
| Omitted owner/implementation/access/database mode/topology/recovery scope | The applicable rule's unspecified state, never inferred ownership, absence of persistence, or protection | OB-001/OB-005, SO-001/SO-003/SO-005 |
| Omitted applicability or retryability | Unspecified; never inferred true from stage/status | NM-002, SO-010, EC-007 |
| No authored region policy or comparison/budget | No additional author-region restriction or inferred cost finding | OB-011, SO-008/SO-009 |

Reference lists' set semantics, import-label derivation, coverage predicates, tuple null handling, and backoff arithmetic are already defined semantic operations, not document default insertion. A domain field's authored `default` is a materialized-record policy under DM-004; it never inserts a value into an SDL entity declaration or executes application data generation. Effective meanings may be reported separately but must not be relabeled as authored fields.

**ND-005 — Disposition of v1.1 implementation defaults.** Every historical inference group below has an explicit v2 disposition. Requiredness is checked before normalization; declining an inference does not make a required field optional.

| Historical inferred values | v2 core disposition |
|---|---|
| Empty personas/core flows from missing product; empty artifact requests | Leave the section/fields absent; authored empty arrays remain subject to their field validity |
| Deployment cloud/runtime and source-category `type` fields | Do not insert; targets/placements are explicit, and project category is not an authored `type` value |
| Stage-derived availability and scaling estimates | Leave objectives unspecified; no stage-to-target or capacity default |
| Primary region and database physical name | Do not generate `us-east-1`, names, or resources |
| Public API/networking and CI/CD provider | Do not infer public exposure or a build service |
| At-rest/in-transit encryption flags | Do not insert; authored security requirements must already be satisfied by valid input |
| ORM and unit-test framework from project/database mix | Do not choose a tool or depend on the first project in an array |
| Logging provider/structured flag and tracing sampling rate | Leave unspecified; no `true` or `0.1` insertion |
| Debt aliases | Apply ND-002; remove the alias and reject conflicting same-ID records |
| Compliance aliases/shorthands | Apply NM-002, including its expressly specified applicability conversion and shadowing advice |
| Deprecated framework aliases | Reject removed v2 vocabulary; conversion belongs to a separately identified migration |

A tool may offer alternatives under ND-008, but core normalization has the same result with or without a suggestion profile enabled. The default policy is complete as a policy for omitted values; the [consolidated contract](FULL-SPEC.md) supplies the complete field catalogue and requiredness.

## Portable result and source provenance

**ND-006 — Result envelope.** A successful normalization result is a separate value with this closed shape (except `x-*`):

```yaml
format: sdl-normalization-result/v1
document: {}           # normalized SDL value; scope may be a fixture fragment
provenance:
  sources: []           # input source descriptors
  origins: []           # one record for each terminal output node
  changes: []           # canonical transformation events
suggestions: []         # empty in core-only normalization
```

This is not a new SDL root shape or a file that may be imported as an SDL architecture module. The `document` member alone is SDL. Rejected/resource-failed operations do not return this success envelope; CF-001 governs their outcome/diagnostics. The format marker versions this result representation, not the language version or package. All arrays are required, even when empty.

A source descriptor is `{id, kind}`, with nonempty string `id` and `kind: source | assembled`. Source IDs are unique and stable within the operation. A source descriptor identifies the original canonical source file under IM-002 (or an explicit virtual source identity). An assembled descriptor identifies a supplied merged snapshot when original source lineage is unavailable. A processor must use the latter rather than falsely attributing values to an original file. A source identity is a reference to supplied input, not a URL to fetch or an executable path. A standalone parsed input may use one virtual source descriptor.

An input locator is `{source, path}`. `source` references a descriptor; `path` is an array of decoded string keys and nonnegative integer array indices into that descriptor's original decoded input snapshot. Every locator must resolve, including `[]` for a source root. Presentation line/column locations may be additional `x-*` metadata but cannot replace decoded paths. Source snapshots must remain available to the caller for checking locators; they are not duplicated inside this envelope. If retained separately, they must be associated with these IDs. This format makes no cryptographic authenticity claim.

A terminal output node is a scalar, null, or an empty array/object. An origin record is `{path, kind, inputs}` with `kind: source | canonical`, plus required `rule` for canonical origins and forbidden `rule` for source origins. The path identifies exactly one terminal node of the final document; every such node has exactly one origin record. `inputs` is a nonempty list of distinct locators. A source origin means the terminal value was supplied unchanged; array-index changes during composition do not by themselves make it canonical. A canonical origin identifies rule `ND-002` or `NM-002` and all directly contributing input locators, even if coalescing identical debt left that terminal value unchanged. Nonempty container provenance is the union of its terminal descendants' origins; empty containers have their own origin record.

For an appended/moved alias debt record, each terminal node cites its original alias terminal. For an identical cross-alias record, each terminal cites the corresponding terminal in both original records. Copied canonical debt records cite their original terminals. A synthesized compliance framework name/applicability cites every shorthand member contributing that canonical name; an empty synthesized frameworks list cites the contributing empty shorthand lists. A root framework alias rewrite cites the original name. A preserved parent that becomes empty when a shorthand child is removed gets a canonical NM-002 origin citing the original parent mapping. An empty normalized debt array created or coalesced from empty alias/canonical arrays gets a canonical ND-002 origin citing the contributing array roots. Other surviving values retain their supplied origins. Source lineage follows IM-004 winning values: normalization does not restore overwritten entity entries or invent source ancestry for them. This is a normalization journal, not a complete import replay log.

**ND-007 — Change events and determinism.** Each change event is `{rule, kind, path, before, after, inputs}`. `rule` is `ND-002` or `NM-002`; `kind` is `canonicalize | shadow`. Each state has required boolean `present`; a true state requires `value`, including explicit null, and a false state forbids `value`. Paths identify the changed member in the assembled pre-normalization document and the resulting document. Inputs are distinct nonempty source locators supplying the event's values or determining shadowing. The before/after snapshots must equal the actual values at that path, and applying all events must reconstruct the normalized document from the assembled input. Equal before/after states are not change events; identical debt coalescence can instead be observed through origins and alias removal.

Use these disjoint event boundaries, omitting boundaries whose values did not change:

1. ND-002: `technicalDebt` as one create/replace event, then removal of `techDebt` as one event. Each cites the supplied array roots that contributed to that event (both arrays for a changed combined canonical collection, only the alias array for its removal).
2. NM-002: when creating root compliance, one event for `compliance`, citing the contributing shorthand-list roots. Otherwise one event per changed root framework `name`, in array order.
3. NM-002: removal of the NFR shorthand list, then the constraints shorthand list. Each cites its original list; when an authored root wins, also cite the original root compliance mapping. A removal is `shadow` if at least one of that list's canonical names is not represented by an applicable-true root entry, otherwise `canonicalize`. Empty list removal is canonicalization.

An event that removes an alias does not claim the architecture fact was deleted; it records a serialization change and its retained origins. Changes do not include automatic defaults, effective meanings, or unapplied suggestions. Parents such as `nonFunctional.compliance: {}` are retained, so no cleanup event is implied.

Order source descriptors by first contribution in IM-003; include contributing sources even when none of their values survive. For a standalone/assembled input, use its descriptor alone. Order origin records by a depth-first traversal of the final document, sorting mapping keys by Unicode scalar-value sequence and traversing arrays by ascending index. Input locators are ordered by descriptor order, then lexicographically by path (shorter prefixes first, numeric segments before string segments, indices numerically and strings by Unicode scalar-value sequence). Repeat locators are collapsed. Event order is exactly the sequence above. These orders are independent of mapping presentation order. Repeated normalization of the same input snapshots/lineage must produce equal core envelopes; human-facing diagnostics and extension metadata may vary.

**ND-008 — Suggestions are separate proposals.** Each suggestion is `{profile, path, value, reason, inputs}`, where `profile: {id, version}` contains nonempty strings, `path` is a decoded prospective document path, `value` is an input-profile value, `reason` is a nonblank string, and `inputs` is a list of valid input locators (possibly empty for a profile convention). Profiles and suggestions are closed except `x-*`. A path may point to a missing member or propose creating a missing parent subtree; it must not rely on punctuation in a display name as a path encoding.

Suggestions are not applied to `document`, are not included as source origins or change events, and do not turn missing required data into successful core input. Competing suggestions can coexist and carry their own profile IDs/versions. A later explicit authoring operation may apply a proposal, producing a new input that must pass normal validity checks. The next normalization then treats that supplied input as its source; it does not erase the retained earlier suggestion artifact or falsely label the profile's reasoning as human authorship. Enabling a profile can add suggestions/advice, never alter core document/origin/change results or redefine a rule. Suggestion ordering is profile-specific and is not part of core determinism.

## Compatibility and completion boundary

| v1.1 behavior or gap | v2 rule | Migration consequence |
|---|---|---|
| Alias debt retained/mirrored; same-ID conflicts can be hidden | Single canonical collection, identical cross-alias coalescing, conflict rejection | Resolve divergent records deliberately; do not assume canonical empty clears alias entries |
| Historical stage/cloud/framework defaults | Closed core transformations; no architecture-value default insertion | Author required choices explicitly or retain them as separate tool suggestions |
| Effective versus serialized defaults unclear | Interpret the semantic catalogue without materializing it in normalized SDL | Do not confuse omitted flags/objectives with authored false or chosen targets |
| Free-form inference records | Versioned sidecar envelope, exact states/paths/origins, deterministic change boundaries | Keep result artifacts separate from SDL imports; preserve source snapshots if provenance must be checked |

The D04 policy and provenance representation are defined here, including the existing scalar/canonicalization rules they build on. [Full-document consolidation](FULL-SPEC.md) and [general diagnostics](DIAGNOSTICS.md) complete D08; [release baselines and migration](RELEASE-MIGRATION.md) complete the selected D07 definition. Optional suggestion-profile algorithms and package implementation are separate tasks.
