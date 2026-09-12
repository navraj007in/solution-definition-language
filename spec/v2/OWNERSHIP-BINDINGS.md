# SDL v2 ownership and bindings

**Unreleased draft; v1.1 is unchanged.** This document defines the D01 ownership/deployment model and the ownership/persistence part of D02. It extends [Foundations](FOUNDATIONS.md); the existing namespaces, validation stages, scalar rules, and import algorithm still apply. New fields and replaced v1.1 locations are assigned to v2 in the [compatibility ledger](README.md#compatibility-ledger).

## Model and applicability

A **team** is an accountable organizational group. A **project** is a buildable implementation unit. A **service** is a logical capability that may be implemented by several projects, share a project with other services, or be supplied externally. A **target** is an independently identified hosting/resource namespace in a declared cloud and region. An **environment** selects active projects/services and their placements on targets. A **database** is a declared store, independent of its physical database name.

These relationships are explicit. A matching name, repository directory, framework, or team does not create a binding. Optional missing ownership means unspecified ownership; it does not mean unowned, inherit another owner's value, or create a team. Optional missing implementation/access metadata likewise means unspecified. If a declaration makes a claim that needs a binding, the predicates below require sufficient information to validate that claim.

## New and changed field catalogue

Unless a row says otherwise, fields are optional. Every new object is closed except for `x-*` metadata. Declared strings do not admit null. Identifier fields and references use ID-001; descriptive names are distinguished explicitly. All reference lists below are arrays of strings interpreted as sets: repetitions add no multiplicity or extra permissions. Record arrays have the uniqueness rules stated below.

| Location | Type, required fields, and meaning |
|---|---|
| `solution.teams[]` | Team objects requiring identifier `name`; optional `displayName` and `description` strings. Display names do not identify teams. |
| Project `owner`, service `owner`, API `owner`, entity `owner`, database `owner`, custom integration `owner` | One team identifier. These fields always express organizational accountability. |
| Built-in integration section `owner`; `auth.owner` | One team identifier with the same meaning; neither creates a provider declaration. |
| Hosting target `owner`; environment `owner` | One team identifier accountable for that hosting namespace or environment; independent of the owners of hosted projects. |
| Storage `owner` | Team ownership extends to `data.storage.blobs`/`.files` under [SO-002](SCOPE-OPERATIONS.md#database-free-and-storage-only-systems). |
| Project `path` | Repository-root-relative source directory; required for any project placed in an environment. See OB-003. |
| Project `language` | Primary implementation-language value from OB-003. Optional, even when a project is deployed. |
| Service `implementation` | Tagged object: `{kind: projects, projects: [project identifiers...]}` or `{kind: external}`. `kind` is required; the projects form requires at least one project and the external form forbids `projects`. |
| `contracts.apis[].component` | One component identifier for the API's implementing/exposing component; independent of API `owner`. |
| Project/service `usesIntegrations[]` | Integration references in the syntax defined by OB-006. |
| Project/service `dataAccess[]` | Objects requiring `database` (database identifier) and `mode` (`read`, `write`, or `read-write`). At most one entry per database within that component. |
| `data.primaryDatabase.id`, `data.secondaryDatabases[].id` | Required identifiers on every declared database. Existing `name` is still an optional physical-name hint. |
| `domain.entities[].database` | One database identifier for the entity's persistent store. Omission leaves persistence unspecified. |
| `domain.entities[].managedBy` | One component identifier for the entity's authoritative logical manager; distinct from team `owner`. |
| `deployment.targets[]` | Objects requiring identifier `name`, `cloud`, and `region`; optional `owner` and `description`. A target denotes one resource namespace, not a project or environment. |
| `deployment.environments[]` | Objects requiring identifier `name`, `projects`, `services`, and `placements` arrays; optional `owner`. Existing CI metadata `autoApproval`, `requiresTests` (booleans), and `secrets` (array of secret-name strings) is optional here. These are declarations, not credentials or instructions to execute a deployment. |
| Environment `dataInstances[]` | Optional resource-instance catalogue defined in [SO-003](SCOPE-OPERATIONS.md#environment-data-instances); its presence makes database-access coverage explicit. |
| Environment `projects[]` | Hosted project identifiers selected for this environment. May be empty. |
| Environment `services[]` | Logical service identifiers active in this environment, including active external dependencies. May be empty. |
| Environment `placements[]` | Objects requiring `project`, `target`, and `runtime`; optional `ports`. A placement hosts the named project on the named target in this environment. |
| Placement `ports[]` | Listener objects requiring integer `number` (1–65535) and `protocol` (`tcp` or `udp`); optional identifier `network`. See OB-010 for isolation and collisions. |

“Project” includes items in `architecture.projects.frontend`, `.backend`, and `.mobile`, except that hosted implementation/placement targets below are explicitly restricted to frontend and backend projects. Mobile delivery through stores or device distribution is outside this hosting model; mobile projects can still carry organizational ownership and access declarations.

## Teams, components, and implementation

**OB-001 — Organizational ownership.** Team names are globally unique within `solution.teams`, including across imported fragments. Every authored `owner` at a location listed above must resolve to exactly one team. A component name is not a team reference, even if no team inventory exists. A team may share its spelling with a component because the namespaces are distinct. API, entity, database, project, and service owners need not be the same: they express accountability for different declarations. There is no equality constraint or implicit owner inheritance between them. Teams may be declared even if nothing currently names them as owner.

**OB-002 — Project/service bindings.** A projects implementation resolves each reference to a frontend/backend project, never another service, a mobile project, or a shared library. All listed projects jointly implement the service; the list does not express interchangeable alternatives. Several services may refer to one project, and a service may refer to several projects. Component names remain globally unique: a logical service and its project must have distinct names even when they represent closely related concepts.

An external implementation has no managed projects and requires no placement. Missing `implementation` permits an incomplete logical design but cannot satisfy an environment's active-service requirements. Service dependency edges still reference services under ID-003/ID-004; implementation bindings do not add dependency edges or imply calls between projects.

**OB-003 — Project source and language.** `path`, when authored, is `.` or a `/`-separated sequence of nonempty directory segments. Reject absolute paths, backslashes, NUL, colons (including drive/URI prefixes), and `.`/`..` segments except the standalone `.`. Resolve relative to the repository root supplied with the SDL input, not relative to an imported module. Imports never rebase this path. Path existence/build success is an implementation check; the language validates its declared form. Different projects may deliberately share a source directory, so path equality does not merge their identities.

`language`, when authored, must form a pair in the table. This is the draft's compatibility vocabulary for the primary implementation language, not an inference rule or a claim about every auxiliary language used by a project. Runtime/SDK versions remain separate. Omitting `language` is valid and does not fabricate a value.

| Project framework | Accepted primary languages |
|---|---|
| Frontend `nextjs`, `react`, `vue`, `svelte`, `solid` | `javascript`, `typescript` |
| Frontend `angular` | `typescript` |
| Backend `dotnet` | `csharp`, `fsharp` |
| Backend `nodejs` | `javascript`, `typescript` |
| Backend `python-fastapi` | `python` |
| Backend `go` | `go` |
| Backend `java-spring` | `java`, `kotlin` |
| Backend `ruby-rails` | `ruby` |
| Backend `php-laravel` | `php` |
| Mobile `react-native`, `ionic` | `javascript`, `typescript` |
| Mobile `flutter` | `dart` |
| Mobile `swift` | `swift` |
| Mobile `kotlin` | `kotlin` |

The previously scheduled removal of `dotnet-8` applies in this v2 draft. Migrate to `dotnet` and an explicit `runtimeVersion`; it is not a second framework/language pair.

**OB-004 — API binding.** An authored API `component` resolves to one component in the existing global namespace. Both projects and services are allowed. Its absence means an inventory entry without an implementation binding; it does not refer to the API name or its owner. API ownership may differ from the bound component's ownership. Binding an API to an external service is allowed. External specification references and shared error-policy applicability are defined separately in [Contracts and Errors](CONTRACTS-ERRORS.md). The component binding itself does not define operations or establish protocol conformance.

## Database identities, access, and entity stewardship

**OB-005 — Database and entity binding.** Database `id` values are globally unique across the primary and secondary database declarations. The fixed location `primaryDatabase` is not an implicit identifier; a physical `name` is never used as a reference fallback. Every `dataAccess[].database` and entity `database` reference must resolve. Every `managedBy` reference must resolve to a component. Team ownership alone grants no access and establishes no component manager.

A database identifier names a logical store. Environment project placements do not automatically create physical database instances, choose connection strings, place replicas, or establish regional data residency. [SO-003](SCOPE-OPERATIONS.md#environment-data-instances) defines explicit per-environment primary/replica data instances; connection strings and provider-specific physical topology remain separate profiles. A logical store may be referenced by projects selected in several environments without this model claiming that they share one physical production database.

An access mode denotes the permission set `{read}`, `{write}`, or `{read, write}`. Duplicate entries for one database in a component's `dataAccess` are errors, including equal entries and entries assembled from different modules; they are not silently combined into broader access. Absent lists do not prove absence of access, while an empty list explicitly declares no access requirements/grants within this model.

For a project, `dataAccess` declares its intended access. For a service, it declares logical access requirements. For a service with a projects implementation, the union of the implementing projects' declared access must cover every service requirement. At least one implementing project must provide each required permission; different projects may provide read and write. Missing project access declarations cannot satisfy a stated requirement. External services have no project-coverage check. This describes architectural intent, not an authorization mechanism or deployed database permissions.

If an entity declares both `database` and `managedBy`, its manager must declare write access to that database (direct project access or the service's own declared requirements). If only one binding is present, validate that reference but do not invent the other or claim stewardship/access completeness. A `managedBy` declaration means system-of-record responsibility; consumers may still have independent read/write access declarations. DB owner, entity owner, and component owner are independent team roles.

**OB-013 — Cross-database relationship advisory.** For each root domain relationship or field foreign key, resolve its endpoint entities first. If both entities have known, unequal `database` identifiers, emit `cross-database-reference`; this is an advisory, not an error. Known equal IDs emit no such advisory. If either binding is absent, do not infer that the relationship is local or cross-database. Root relationships and field foreign keys are separate declarations and may each produce an advisory. Nothing here promises a physical database-enforced foreign key across stores. Existing DM-005 target/type/uniqueness errors still reject independently. [DX-009](DOMAIN-METADATA.md#composition-normalization-and-diagnostics) extends this advisory to named foreign-key constraints and local relationships, preserving one advisory per authored declaration rather than duplicating a local relationship through a derived view.

## Integration identities and use

**OB-006 — Integration reference namespace.** Use exactly `builtin/<slot>` or `custom/<name>`. The built-in slots are `payments`, `email`, `sms`, `analytics`, `monitoring`, `cdn`, and `auth`. The first six target their corresponding `integrations.<slot>` object and exist as reference targets only when its `provider` is declared. `builtin/auth` targets the root `auth` declaration when it has a provider and its strategy is not `none`. Custom targets resolve by `integrations.custom[].name`. Vendor names are values, not integration identities: `stripe` is not a reference, and `custom/stripe` exists only when a custom integration named `stripe` is declared.

Provider-backed auth (`oidc`, `passwordless`, or `magic-link`) requires the existing `auth.provider` declaration. `api-key` may declare a provider; `none` forbids a provider. No duplicate custom-integration entry is required to restate an auth provider. Declaring an empty built-in section or only an `owner` does not establish a provider-backed target.

Each project/service use reference must resolve. For a service with a projects implementation, the union of implementing projects' declared uses must include each use declared on the service. This states which implementation units carry its logical integration requirements; no implementation-project coverage is required for external services. Service dependencies remain in their separate service namespace.

**OB-014 — Unreferenced-integration advisory.** Emit `unused-integration` for a declared target not named in any project/service `usesIntegrations` list. Whenever `builtin/auth` exists under OB-006, count it as used by the root authentication declaration, so authors are not required to duplicate that system-wide use on every project. Inspect the assembled architecture, not only active environments. The advisory means no use is recorded in SDL; it does not prove there is no actual use or invalidate a planned integration.

## Environments, targets, and coverage

**OB-007 — Environment and target identities.** Target names are unique within `deployment.targets`; environment names are unique within `deployment.environments`. Both use ID-001. In v2, `deployment.environments` is the only environment catalogue. `deployment.ciCd.environments` is rejected; move its items to the canonical location and explicitly add hosting selections. CI/CD remains configured through `deployment.ciCd.provider` and references the canonical catalogue rather than creating another one.

Each target requires `cloud` from `azure | aws | gcp | cloudflare | vercel | railway | render | fly-io` and a region string matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`. A target name identifies a resource namespace within that cloud/region (for example an account/cluster boundary); two distinct targets may deliberately have equal cloud/region values. Authors must use one identity when they mean the same namespace. Labels do not verify actual infrastructure isolation.

Global `deployment.cloud` and `deployment.runtime` are rejected in this v2 model. Cloud/region belong to targets and runtime belongs to placements; there is no competing global default. `deployment.targets` and `deployment.environments` are optional, allowing an architecture without a hosting plan. Authored empty lists remain empty. `deployment` no longer requires a global `cloud`; its remaining CI/CD, networking, and infrastructure sub-shapes retain their existing fields.

**OB-008 — Explicit coverage.** Every environment project must resolve to a frontend/backend project; mobile projects are not hosted placements. Every environment service must resolve to a service. Every placement must name a selected project and an existing target. Each selected project must have at least one placement. At most one placement for a given `(project, target)` pair is permitted in an environment. Placement lists express hosting topology, not replica counts.

Every selected service must have a declared implementation. For a projects implementation, all its implementing projects must be selected in that environment and therefore placed. For an external implementation, no managed project or placement is required. Every dependency of a selected service must also be selected, including external dependencies. A shared project may be selected while only some of the services it implements are active; SDL records that selection and does not generate feature flags or prove runtime isolation between those services.

Projects/services not selected by an environment are not required to be covered there. There is no implicit “production” environment and no rule requiring every project to run everywhere. A service itself cannot appear as a placement's `project`. Source/framework/runtime checks apply to hosted projects, not to an inferred deployable service.

**OB-009 — Placement completeness.** A placed project must declare `path` and its category's existing required project fields (including `framework`). Each placement must declare a nonempty runtime identifier matching `^[A-Za-z][A-Za-z0-9._+-]*$`. It names the intended hosting runtime/product, such as `ecs` or `s3+cloudfront`; it is not a framework name, version selector, or an executable deployment specification. This location deliberately uses an open identifier vocabulary so provider-specific runtimes do not require a language release. The old global category runtime enums are not silently consulted as defaults or as a compatibility matrix.

Target cloud/region and placement runtime are author declarations. Their references and shapes must be valid; actual provider availability, account permissions, and framework/runtime support require an explicitly identified capability profile or implementation check. They are not established by string membership or a live cloud lookup during portable language validation. Such checks must distinguish unsupported from unknown and report the capability-profile version. This pass does not claim to define that external capability catalogue.

**OB-011 — Region policy and infrastructure scope.** When `solution.regions` is authored, its primary/secondary strings use the target region grammar. Treat them as the allowed region set for all referenced targets. Every target used by a placement must have its region in that set. [SO-003/SO-004](SCOPE-OPERATIONS.md) extend referenced-target coverage to environment data instances and recovery destinations. An unused target is not an assertion of deployed resources and does not trigger this containment error. Primary is a designation, not an automatic target, traffic rule, or requirement to deploy there. Omission of `solution.regions` declares no additional region restriction. The literal `global` is an ordinary region label, not a wildcard.

The existing global `deployment.infrastructure.iac` describes the managed placements in this plan. If it is `cloudformation`, every target referenced by a placement, data instance, or recovery destination must declare `cloud: aws`; with none of those references the condition is vacuous and proves nothing about deployability. Mixed-cloud plans needing separate IaC tools must use extension metadata until per-target IaC is defined. Other provider capability checks follow OB-009 rather than pretending the region list is a provider support catalogue.

## Listener ports and network scope

**OB-010 — Port collisions.** A listener's `number` is an integer from 1 through 65535; `protocol` is exactly `tcp` or `udp`. Omitted `network` selects a project-private scope identified by `(environment, project)` within the target. This models independent application/container listeners, so different projects can both declare TCP 8080 without conflict.

An explicit `network` selects a shared scope identified by that label within the target, across environments. Its namespace is distinct from project-private scopes even when the label equals a project name. The full reservation key is `(target, scope-kind, scope-identity, protocol, number)`. Two listener declarations with the same key are an error, including duplicates within one placement. A shared network therefore catches cross-environment collisions when staging and production deliberately share a host/network namespace. Different targets, private scopes, or protocols do not collide.

This is listener reservation semantics, not a firewall, ingress-routing, IP allocation, NAT, or load-balancer model. Sharing a port using hostname/path-based routing belongs to such a model; it cannot be represented as two exclusive reservations in the same scope.

## Composition and validation

**OB-012 — Binding declarations during composition.** The new team, target, environment, data-access, placement, and port record arrays are concatenable under IM-004; they are not additional identity-keyed override arrays. Their uniqueness predicates are checked locally and on the assembled result. A repeated environment cannot be used as a partial override. New array items must carry their own required fields under ST-002; references can resolve to declarations in later modules. A reference list such as `implementation.projects` can be assembled by concatenation and is then interpreted as a set.

Unknown targets, wrong namespaces, malformed IDs, contradictory tagged implementations, access/use requirements not carried by their implementations, incomplete selected coverage, and port collisions reject the binding scope. Missing optional ownership or an unselected logical service with unknown implementation does not. Binding warnings remain non-blocking. No normalizer creates teams, chooses implementation projects, grants access, invents target regions, or fills environment selections.

## Earlier rule obligations

| Earlier v1.1 audit obligation | Concrete v2 definition |
|---|---|
| Rule 4: API ownership/reference ambiguity | OB-001 owner is a team; OB-004 component is the separate implementation reference |
| Rule 11: framework/language | OB-003 optional primary language and accepted pairs |
| Rule 12: auth/integration matching | OB-006 canonical provider-backed auth target; no redundant vendor-name entry |
| Rules 14/22: deployable coverage and fields | OB-008/OB-009 explicit selected projects, placements, source path, framework, and runtime |
| Rule 15: port conflicts | OB-010 precise private/shared listener scopes |
| Rule 16: region support | OB-011 authored region-policy containment; provider capability evidence is separately scoped in OB-009 |
| Rule 19 / cross-database warning | OB-005 explicit database identities; OB-013 predicate when both endpoints are bound |
| Rule 21: entity ownership | OB-001 organizational owner; OB-005 component stewardship and database/access binding |
| Unused-integration warning | OB-006 identities/use declarations and OB-014 exact advisory predicate |

## Worked example and verification boundary

[ownership-bindings.sdl.yaml](examples/ownership-bindings.sdl.yaml) shows two logical services sharing an implementation project, an external dependency, separate API and component owners, two stores, and two environments. [Binding conformance cases](conformance/bindings.yaml) give positive and negative expected results for these rules, including cross-environment shared-port collisions.

These definitions complete the selected ownership/binding design, not the entire v2 language. [Persistence, Recovery, Costs, and Metadata Scope](SCOPE-OPERATIONS.md) defines portable data-instance, recovery, and cost declarations. Provider capability catalogues, mobile distribution, per-target IaC, and physical database enforcement remain separate scope. [Full-document integration](FULL-SPEC.md) now supplies the consolidated field/rule contract. Packages and v1.1 schemas are not changed by this specification pass.
