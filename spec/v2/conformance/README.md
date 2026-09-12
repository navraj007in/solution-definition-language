# SDL v2 specification conformance cases

**Draft specification examples, independent of package support.** [cases.yaml](cases.yaml) records inputs and expected outcomes for [Foundations](../FOUNDATIONS.md); [bindings.yaml](bindings.yaml) covers [Ownership and Bindings](../OWNERSHIP-BINDINGS.md); [contracts.yaml](contracts.yaml) covers [Contracts and Errors](../CONTRACTS-ERRORS.md); [domain-metadata.yaml](domain-metadata.yaml) covers [Domain Metadata](../DOMAIN-METADATA.md); [scope-operations.yaml](scope-operations.yaml) covers [Scope and Operations](../SCOPE-OPERATIONS.md); [normalization.yaml](normalization.yaml) covers [Normalization](../NORMALIZATION.md). These cases are not fed to the v1.1 compiler and do not assert that v2 is implemented.

## Case format

Each manifest identifies format `sdl-conformance-cases/v1` and its target (`sdl-v2-foundations-draft`, `sdl-v2-bindings-draft`, `sdl-v2-contracts-draft`, `sdl-v2-domain-metadata-draft`, `sdl-v2-scope-operations-draft`, or `sdl-v2-normalization-draft`). Each case has a globally unique `id`, a `scope`, governing `rules`, an input, and an `expected` result. Rule IDs refer to the draft prose, not existing package error codes. Optional `sourceFile` names a worked-example YAML file relative to this directory; its decoded value must equal the case's `value`.

| Scope | Input | Predicates evaluated |
|---|---|---|
| `input` | Raw YAML `source` string | Input-profile rules only |
| `identity` | Decoded fragment in `value` | Identifier namespaces, uniqueness, and references; unrelated full-document requirements are outside scope |
| `scalar` | `field` path and decoded `value` | The selected scalar grammar, bound, or policy-object spelling |
| `domain` | Decoded fragment in `value` | Domain fields, keys, constraints, and relationships plus applicable identity rules |
| `composition` | Root filename, virtual `files` mapping of filenames to YAML strings, optional `limits` | Source profile/structure, import graph, merge semantics, and the case's named post-merge predicates |
| `normalization` | Decoded assembled fragment in `value`; optional source snapshots and expected result artifact | Compliance/debt conversion, closed default policy, authored-value preservation, and the named provenance rules; unrelated full-document requirements are outside scope |
| `normalization-result` | Result artifact in `value`, original `sourceValues`, and `assembledInput` | The ND-006–ND-008 result/lineage/journal/suggestion predicates; rejection applies to the artifact, not its embedded SDL declaration |
| `bindings` | Decoded fragment in `value` | Ownership, implementation/access/use bindings, selected hosting coverage, region policy, and listener scopes; applicable references use the foundation namespaces |
| `domain-metadata` | Decoded domain fragment in `value`, optional `records` mapping | Index/constraint identities, ordered tuples, uniqueness/foreign-key semantics, local/root roles, selectors/cardinality, and cross-database advisories under the named rules |
| `scope-operations` | Decoded fragment in `value` | Database intent, storage identity, environment topology/coverage, recovery/global requirements, exact cost arithmetic, applicability/open metadata, and the named advisories |
| `contracts` | Decoded fragment in `value`, optional external resources, payload, or call observation | The named external-reference, applicability, envelope, mapping, and retry rules; unrelated full-document requirements are outside scope |

`expected.outcome` is `accept`, `reject`, or `resource-failure`. Reject/resource cases list the required failing rule(s) in `violations`. An implementation may report additional independently established diagnostics. Acceptance applies only to the declared scope; it does not certify a complete v2 document.

Positive cases specify one or more observable results:

- `value`: exact decoded or normalized result. Mapping order is ignored, sequence order is significant, and numeric equality is exact.
- `assertions`: selected result paths with either `equals` or `length`; unmentioned fields are unconstrained by that assertion.
- `contributions`: exact order of canonical source contributions during composition.
- `meaning`: semantic interpretation, such as milliseconds, percentage, or total executions.
- `edges`: pairs of source and target service names. `targets`: objects with `sourcePath` pointing to the authored reference field and `targetPath` pointing to the resolved declaration. `effectiveFields`: effective flag values keyed by `Entity.field`. `opaqueTypes`: custom type names whose application-specific meaning is not validated.
- `warnings`: required advisory kinds and rule identifiers; paths are included where relevant.
- `forbiddenWarnings`: advisory kinds/rules that must not be emitted for the case; an empty `warnings` list alone does not prohibit other advisories.
- `idempotent: true`: applying the same normalization to its output leaves the value unchanged.

Paths in assertions are lists of decoded string keys and nonnegative array indices. Virtual file keys are canonical paths relative to the root directory; SDL import reads come from `files`. An absent file is missing. The corpus does not currently simulate symlinks, concurrent file changes, or every resource ceiling; those host obligations remain in the prose.

The corpus includes cross-source versus within-source identity collisions, whole-entry replacement, diamond traversal without replay, three-level portability, failed resolution, case-sensitive references, duration/percentage bounds, explicit keys, nullable defaults, decimal constraints, foreign-key targets, and compliance precedence.

Binding cases additionally cover many-to-many service/project implementation, owner/component separation, database access carried by implementation projects, canonical integration identities, external services, explicit environment selection, region containment, and private/shared port scopes across environments. A binding-scope success does not verify real cloud capabilities, physical database permissions, or full-document conformance.

## Normalization artifacts

A normalization case may supply `sourceValues`, a mapping from source descriptor IDs to original decoded input snapshots. Its `value` is the assembled input. Optional `expected.result` is the complete ND-006 success envelope and its `document` must equal `expected.value`. Optional `resultFile` links that envelope to a YAML artifact relative to this directory, separately from a linked SDL `sourceFile`. Cases with supplied composition lineage assume the stated assembly stage; they do not require the normalization operation to infer original file ancestry.

A normalization-result case instead tests a candidate envelope supplied in `value`, with `assembledInput` and `sourceValues` as its input snapshots. Positive envelopes must cover every terminal output node, resolve their locators, accurately describe before/after states, and reconstruct the normalized value through their change journal. Negative artifact cases intentionally violate those rules. Suggestions stay outside the document and journal. This fixture format does not put provenance or suggestion fields into the SDL language.

The [worked input](../examples/normalization.sdl.yaml) has two debt spellings and two compliance shorthand sources; its [result](../examples/normalization.result.yaml) shows coalesced/moved debt origins, synthesized applicability, removed shorthand fields, and preserved empty parents. A fresh operation on canonical input has an empty change journal.

## Operational scope examples

Scope-operation cases use authored declarations and derived results only: they do not query providers, prices, databases, or legal applicability. Money-result strings denote exact decimal values, so `"0.30"` and `"0.3"` have equal numeric meaning; authored spellings remain preserved. Coverage results identify modeled environments/resources and distinguish missing topology from an empty topology. Positive cases with required warnings remain valid declarations. Missing-design/framework heuristic kinds under SO-011 are prohibited portable-core findings in the named cases, not a specification of optional profile outputs.

## Domain record examples

Domain-metadata cases may include `records`, a mapping of entity names to arrays of materialized JSON-compatible record objects. This is fixture input, not an SDL field. `meaning.constraintsSatisfied` evaluates the named DX-003/DX-004 invariants over those record sets; an omitted entity record set is empty. Other cases report ordered field pairs, uniqueness guarantees, or effective relationship cardinality. A declaration can be accepted while a particular record set fails an invariant. These results do not assert that packages inspect application data or execute DDL. Authored omission and effective meaning remain distinct; a derived relationship type does not insert a `type` field into normalized output.

## Contract resources and observations

Contract and composition cases may supply `resources`, a mapping of root-relative canonical filenames to external file text. These files are not SDL imports; GraphQL/Protobuf text is not parsed as YAML. An absent resource is missing unless `resourceFailures` specifies `permission-denied` or `limit-exceeded` for that filename. A file cannot supply both content and a failure. Optional `resourceFiles` maps virtual filenames to real worked-example paths relative to this directory, so their exact text can be checked for drift. These fixture fields are not SDL language fields.

`payload` is a JSON-compatible candidate envelope body. `expected.meaning.payloadConforms` specifies whether it satisfies EC-005/EC-006. An accepted SDL declaration can have `payloadConforms: false`; this is distinct from rejecting the SDL input.

`observation` describes a failed call. Required fields are `api` (inventory name), `status` (HTTP integer), `code` (string or null for missing), `replaySafe` (boolean or null for unknown), and `failedExecution` (positive integer counting the failed execution across the logical call). Optional `retryAfter` is an array of received field values, with absence equivalent to no header; `responseReceivedAt` is a UTC timestamp, required for evaluating a date header; `remainingDeadlineMs` is a nonnegative remaining duration. These fixtures treat failure completion and response receipt as the same instant. Unless specified, there is no cancellation, open circuit, expired deadline, or other operational stop condition. Missing/unknown replay safety never means true.

Retry results use `meaning.retry`, `maxExecutions`, `minimumDelayMs`, and `producerConventionViolation` where relevant. `minimumDelayMs` is an exact lower bound, not a requirement to schedule at precisely that instant. A `reason` identifies an established blocking predicate (`ineligible`, `outside-standard-convention`, `no-policy`, `budget-exhausted`, or `deadline`); it does not prescribe diagnostic wording, ordering, or exclude additional blockers. An accepted policy with `retry: false` is a valid declaration whose evaluated call must not retry. `externalFormatValidated: false` states that portable reference acceptance has not certified an ecosystem document. Resource and operational results are scoped to the case's governing rules.

The [worked SDL example](../examples/contracts-errors.sdl.yaml) references a [local OpenAPI file](../examples/contracts/status.openapi.yaml). The two policies permit three total executions, with generated minimum waits of 300 ms and 400 ms. A valid two-second Retry-After raises the corresponding wait to 2,000 ms. Optional `error.detail` can be absent; if present, its `requestId` is required. The linked case checks that both artifact contents still match the fixture.

## Integrity check

From the repository root:

```sh
node spec/v2/conformance/check-corpus.mjs
```

This checks all nine manifests, unique case IDs, rule links and coverage, required expected results, target paths, virtual file names, observation/record-fixture structure, and YAML syntax for SDL sources expected to be accepted. Positive input-profile examples have their decoded values compared with expected values, and linked SDL/external worked examples are checked for drift against their cases. Positive normalization artifacts additionally check terminal-origin coverage, source locators, exact before/after states, and change-journal reconstruction, without implementing the rules that select debt/compliance transformations. Rejected sources/artifacts may intentionally be malformed. It uses the repository's installed YAML dependency to read fixtures; it does not invoke SDL packages, implement the v2 semantic validator, or validate external language grammars.

A passing integrity check establishes that the examples are consistently packaged and linked. It does not prove that every expected result follows from the prose, nor that any package passes the examples. Semantic expected results require specification review; implementation conformance follows later.


## Full documents and validation reports

[full-document.yaml](full-document.yaml) combines the slices under FD-006. Each `value` is the complete assembled input; `expected.value` on acceptance is its normalized document. `expected.structure` independently says whether the assembled input passes the draft structural schema. Semantic rejection may have `structure: accept`; structural success alone never changes the expected full outcome. Optional `files`/`root` supply the original virtual graph whose assembly is `value`; `contributions` records its expected order. Their syntax and packaging are checked, but assembly and semantic outcomes are not computed by this checker. External resources use the existing contract-fixture mechanism.

The [minimal](../examples/full-minimal.sdl.yaml), [services-only](../examples/full-services-only.sdl.yaml), and [production](../examples/full-production.sdl.yaml) examples are complete draft inputs. Production includes declared backup coverage, explicit access and hosting, domain metadata, shared API errors, authored costs, and aliases whose expected normalized result appears in its case.

[diagnostics.yaml](diagnostics.yaml) tests candidate report artifacts in `value`; its `expected.outcome` is the validity of that artifact, independently of the candidate's reported SDL outcome. A valid report may describe rejected SDL. `sourceValues` supplies decoded snapshots; `unavailableSources` identifies sources without decoded snapshots. `reportFile` links a report example for drift checks. DG-001 structure, DG-002 internal references, DG-003 outcome consistency, and DG-004 declared rule/scope IDs are checked for these artifacts. Presentation coordinate accuracy and whether a claimed finding/scope is truthful require the producing implementation and original source presentation, not just these snapshots.

The checker also compiles all four specification-owned JSON schemas with mutation disabled, checks full-document structural expectations and positive normalized-document structure, and compares the rendered [field catalogue](../FIELD-CATALOGUE.md) for drift. It uses installed Ajv/YAML libraries as generic readers; it neither invokes SDL package validators nor implements full v2 semantics. YAML-source counts include syntactically valid sources from graphs expected to fail later semantic checks.

## Release and migration artifacts

[release-migration.yaml](release-migration.yaml) checks the content-addressed baseline manifests, complete [migration plan](../migrations/v1.1-to-v2.0-draft.1.json), and candidate result artifacts. A release-manifest case verifies its generic schema, unique paths/precedence, repository containment, and exact SHA-256 bytes. The published plan must use known endpoint manifests, unique records, compatible classification pairs, safe action modes, declared rule IDs, and cover every non-BL/MG document/report rule.

Migration-result cases may supply `sourceValue` for change replay. The checker verifies record/action identity, exact before/after state, candidate/document reconstruction, endpoint identity, outcome invariants, and target structural validity for `migrated`. It does not execute path-pattern actions, decide architecture facts, validate source v1.1 semantics, or prove target v2 semantics. The [worked migrated result](../examples/migration-result.yaml) follows two author-approved changes: the version marker and a chosen logical database ID.
