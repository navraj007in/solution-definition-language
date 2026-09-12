# SDL v2 validation reports

**Unreleased draft; v1.1 diagnostic codes are unchanged.** This defines a portable serialization of CF-001 outcomes. Rule IDs identify v2 specification requirements, not package error-code aliases. [diagnostics.schema.json](diagnostics.schema.json) defines record structure; DG-002–DG-004 add reference, outcome, and scope predicates.

**DG-001 — Report envelope.** A report is a separate artifact with required `format: sdl-validation-report/v1`, `scope`, `outcome`, `sources`, `diagnostics`, and `advice`. All records are closed except `x-*`. Arrays remain required even when empty. It is neither SDL input nor a normalization success envelope, and cannot be imported as an architecture module. The format versions the report, not the SDL language. Every scope requires the exact release `baseline` under BL-001; an unknown or digest-mismatched baseline cannot support a conformance claim.

```yaml
format: sdl-validation-report/v1
scope:
  kind: full-document
  sdlVersion: "2.0"
  baseline: sdl-v2.0-draft.1
outcome: accept
sources:
  - id: solution.sdl.yaml
    kind: source
diagnostics: []
advice: []
```

A scope is either `{kind: full-document, sdlVersion: "2.0", baseline: "sdl-v2.0-draft.1"}` or `{kind: rules, sdlVersion: "2.0", baseline: "sdl-v2.0-draft.1", rules: [rule IDs...]}` with a nonempty list of distinct declared IDs. A rule-scoped result checks exactly the named requirements and their necessary input dependencies; it is not full-document conformance. Scope is always explicit. Structural checking alone uses `rules: [FD-001]` and cannot claim the semantic rules were executed. Future baselines use their own exact published ID; this format does not hard-code draft.1 as its only value.

A core diagnostic requires `rule` (a declared specification rule ID), `severity: error | warning`, `category: validation | resource`, `stage`, nonblank `message`, and `location`. `stage` is `input | source | composition | structure | semantics | normalization | result`; the last is for final validity/artifact checks. Optional `kind` is a nonempty machine-readable subtype; when a rule specifies an advisory kind, that exact kind is required. Other subtype vocabularies and message wording are implementation-specific. Location identifies the offending declaration or nearest available containing declaration. Optional `related` holds other contributing locations. Stage names identify the check that established the finding, not an assertion that all earlier stages succeeded on every independent subtree.

**DG-002 — Source locations.** Each source descriptor has nonempty string `id` and `kind: source | assembled | external`. IDs are unique and refer to a stable operation input or attempted input under IM-002/EC-002; no fetching follows from a descriptor. Include sources needed by diagnostics even if reading/parsing failed or later composition removed their values. An assembled snapshot must be labeled assembled, not misattributed to an original file. External contract sources have kind external. Source snapshots or read failures remain associated with those IDs outside the report.

A location requires `source` resolving to one descriptor; optional `path` is an array of decoded string keys/nonnegative integer indices. `[]` names the root. A provided path must resolve into that source's decoded snapshot; for missing required fields, report the nearest existing parent and name the missing field in the message/subtype. If input cannot be decoded, omit `path`; never invent one. Optional one-based `line` and `column` must appear together and point into the original source presentation; line endings do not change decoded paths. Neither presentation coordinates nor a dotted string replace an available decoded path. Implementations must provide a decoded path when the offending/containing node is known.

Related locations obey the same rules. Composition conflicts and override advisories retain both contributors (one primary and at least one related location); external-reference failures identify the referring SDL path plus the attempted external descriptor, adding its decoded selector path when available. Removed/overwritten declarations retain original-source locations. Diagnostic ordering, messages, and source-ID spellings may differ between implementations; equivalence is based on rule, category, severity, applicable kind, and the identified source nodes. A processor need not enumerate downstream errors in an invalid/unread subtree or duplicate one finding for every generic rule that also implies it.

**DG-003 — Outcomes and severity.** `accept` requires no core error diagnostics and successful evaluation of every applicable rule in the declared scope. It may carry core warnings. `reject` requires at least one validation-category error and no resource-category error. `resource-failure` requires at least one resource-category error; known independent validation findings may coexist, but incomplete evaluation cannot claim validity or invalidity for the unread portion. Resource-category diagnostics always have error severity. Nonfatal operational events may be extension metadata, not downgraded resource failures.

A processor may stop at an established validation rejection without attempting later reads. If it does attempt them and encounters a resource failure, report resource-failure. Missing files and malformed input follow the classifications in IM/EC/IN; “resource” is not a catch-all for invalid references. Warning rules retain their nonblocking severity; a core rule must not be reclassified by a profile. Rejected or resource-failed operations produce no successful normalized-document envelope. An accepted report alone contains no document result: a normalization result, when returned, is a separate ND-006 artifact for that operation and scope.

**DG-004 — Scoped advice and conformance claims.** Every rule ID in a report or its rule scope must be declared in this draft. Core diagnostics must concern the claimed scope; a rules-scoped report includes only diagnostics governed by one of its listed rules. Scope dependencies may instead cause the operation to stop with the appropriate dependency rule included in the scope; they cannot silently broaden an accepted claim. Full-document reports cover FD-006's complete portable pipeline and cannot be produced from a schema-only or slice-only check.

`advice` contains optional profile findings, each requiring `profile: {id, version}` (nonempty strings), nonempty `code`, nonblank `message`, and `severity: warning`; optional `location` follows DG-002. Profiles cannot insert findings into core `diagnostics`, change `outcome`, or change normalization results. The schema does not select or define advisory algorithms. External-language validation, deployment checks, and policy gates that have their own failures must publish separately identified results; they are not disguised as core SDL errors or as completed work merely because an advisory profile is enabled.

The [diagnostic fixtures](conformance/diagnostics.yaml) cover report packaging, source references, scope claims, and outcome distinctions. Their checker verifies artifact integrity; it does not establish that a reported architectural finding actually follows from the source. That remains the semantic validator's responsibility.
