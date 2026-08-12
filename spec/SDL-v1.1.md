# SDL Specification v1.1

**Complete Solution Design Language** — comprehensive architecture specification with API contracts, data models, SLOs, compliance, feature planning, and resilience patterns.

This document is the normative SDL v1.1 specification. All other documents are subordinate:
- [`../reference/canonical-contract.md`](../reference/canonical-contract.md) — quick-reference summary of enums, shapes, and aliases derived from this spec
- [`../reference/schema-reference.md`](../reference/schema-reference.md) — field listing and authority hierarchy
- Runtime schema/types in `packages/sdl/` — machine-executable derivations of this spec

If any subordinate document conflicts with this spec, this spec wins.

## Overview

SDL v1.1 provides production-grade architecture details:
- **API Contracts** — OpenAPI, GraphQL, gRPC specs
- **Data Model** — Entity definitions, fields, relationships, constraints
- **Feature Planning** — MVP phasing, feature flags, dependencies
- **Compliance** — GDPR, HIPAA, SOC2, PCI-DSS, CCPA requirements
- **SLO/SLI** — Service level objectives, key metrics, alert thresholds
- **Resilience** — Circuit breakers, retries, timeouts, fallback strategies
- **Cost Model** — Usage-based pricing, per-component costs
- **Backup & DR** — RTO/RPO, failover, replication strategies
- **Design System** — Formal design token definitions

## Document Structure

The root object is closed: every key below, plus any `x-` prefixed key, is accepted; anything else is rejected with `UNKNOWN_FIELD`.

```yaml
sdlVersion: "1.1"

# Core required sections
solution: {}
architecture:
  style: ...
  projects: {}          # frontend[], backend[], mobile[]
  services: []          # service inventory + responsibilities + dependencies
  sharedLibraries: []
  errorConventions: {}  # solution-wide error envelope, status mapping, retry policy
data: {}

# Modular SDL (root files only) — see "Modular SDL and Import Semantics"
imports: []          # stripped from the merged document before validation

# v1.1 Additions (optional but recommended)
contracts:
  apis: []           # API surface inventory (REST, GraphQL, gRPC, webhook, AsyncAPI)
domain: {}           # Detailed entity definitions with fields
features: []         # Feature items (current schema shape)
compliance: {}       # Regulatory requirements
slos: {}             # Service level objectives per component
resilience: {}       # Circuit breaker, retry, timeout, rate limit defaults
costs: {}            # Pricing model, per-component costs
backupDr: {}         # RTO/RPO, failover strategy
design: {}           # Design tokens, theming, component library
product: {}
auth: {}
deployment: {}
nonFunctional: {}
observability: {}
integrations: {}
constraints: {}
testing: {}
evolution: {}
artifacts: {}        # generate[] — which artifacts the toolchain should emit
techDebt: []         # `technicalDebt` is accepted as an equivalent spelling
```

There is **no** root-level `mobile`, `environments`, or `navigationPatterns` key; see *Mobile/Platform Specific* below and `reference/canonical-contract.md` → *Deprecated Or Rejected Legacy Forms*.

Implementation status note:

- This spec is the source of truth for field shapes. The active schema and exported types in `packages/sdl/` are derived from this spec; when they diverge, the spec governs and the package should be updated.
- Some sections below describe the full intended contract. Where the runtime package has not yet implemented a section, that section is marked **[not yet implemented]**. Implementors should treat unimplemented sections as planned, not optional.

---

## Modular SDL and Import Semantics

SDL documents may be split across multiple files using the `imports` key. This section defines the normative rules for how imports are resolved and merged.

### Import Declaration

`imports` is an optional array at the root of an SDL document. Each entry takes one of three forms — all three resolve through the same algorithm and may be mixed within a single `imports[]` list.

**Form A — path with explicit extension** (always supported):

```yaml
imports:
  - sdl/auth.sdl.yaml
  - sdl/deployment.sdl.yaml
```

**Form B — path with the extension inferred** (v1.1 amendment):

```yaml
imports:
  - sdl/auth          # resolves to sdl/auth.sdl.yaml or sdl/auth.sdl.yml
  - sdl/deployment
```

**Form C — explicit `{ name, path }` object** (v1.1 amendment):

```yaml
imports:
  - name: auth
    path: sdl/auth                 # implicit extension also works inside path
  - name: deployment
    path: sdl/deployment.sdl.yaml  # or be explicit
```

#### Resolution algorithm

For every entry, the resolver:

1. **Normalises to `{ name, path }`.** For string entries, `name` defaults to the filename stem (`auth` from `sdl/auth` or `sdl/auth.sdl.yaml`). For object entries, both fields are required.
2. **Resolves `path` to a file:**
   - If `path` already ends in `.sdl.yaml` or `.sdl.yml`, it is loaded as-is.
   - If `path` ends in any other YAML-shaped extension (`.yaml`, `.yml`), a warning is emitted and the file is loaded as-is.
   - Otherwise, the resolver tries `<path>.sdl.yaml` first, then `<path>.sdl.yml`. The first hit wins. If neither exists, a `missing-file` error is recorded.
3. **Validates `name`:** explicit names should match `^[a-zA-Z][a-zA-Z0-9_-]*$` (a warning is emitted otherwise — kebab-case is permitted because module filenames are commonly hyphenated). Names must be unique within a single `imports[]` list; duplicates are a `conflict` error. Use Form C with explicit names to disambiguate when two paths would derive the same default stem.

#### Constraints

- Paths must be relative to the file containing the `imports[]` list. The resolver joins each nested module's directory onto the paths it declares, so the host's `readFile` adapter always receives paths relative to the root file's directory. Absolute paths and `..`-traversal beyond the project root are rejected by the host's `readFile` adapter.
- Any resolution error (`missing-file`, `circular-import`, `parse-error`, `conflict`) fails compilation. Implementations must not return a successfully compiled document when any declared import could not be fully resolved — a partially merged architecture silently drops content the author declared.
- Each imported file is itself a valid SDL fragment (it may omit `sdlVersion` and may carry its own `imports[]`, subject to the depth limit below).
- Import order is significant: modules listed earlier are treated as the base; modules listed later override scalar values in earlier modules (see merge rules below). The form of an entry has no effect on merge order.
- `name` is currently used for diagnostics and to detect duplicate entries. It is reserved for future cross-module reference syntax (e.g. `$ref: <name>#/path`) — authors should pick stable names even though tooling does not yet consume them.

### Merge Rules (normative)

When the resolver merges an imported module into the accumulating document, it applies the following rules in order for each key:

1. **Key absent in base** — the value from the imported module is adopted without conflict.
2. **Both values are arrays** — concatenable arrays are concatenated with no deduplication; identity-keyed arrays (`domain.entities[]`, `integrations.custom[]`, `features[]`) merge by `name` with a `duplicate-array-item` warning on collision (see *Array Merge Semantics* below).
3. **Both values are non-null objects** — merge recursively, applying these same rules.
4. **Scalar conflict** (both values are scalars, or one is a scalar and the other is an object/array) — the imported module's value wins (*last writer wins*). A `scalar-override` warning is emitted. This is intentional: it allows modules to specialize or override defaults set by earlier modules.
5. **`imports` key** — never merged. Each file's `imports` list is only used to queue further resolution; it is stripped from the accumulated document.

### Depth Limit

**Portability limit:** Implementations must support at least **3** levels of import nesting (root → depth 1 → depth 2 → depth 3). Imports beyond depth 3 may be skipped; when skipped, a warning must be emitted.

This is an implementation portability requirement, not a semantic property of SDL itself. The SDL language does not assign meaning to nesting depth; the limit exists so that conformant implementations can be built without unbounded recursion guards. Circular imports (file A imports file B which imports file A) are always an error regardless of depth; detect them via the resolution stack (the chain of files currently being resolved), not a global visited set. A module reachable through two non-cyclic branches (a diamond dependency: root imports A and B, both import shared) is **not** a cycle — it must be loaded and merged exactly once, with subsequent encounters skipped silently.

Practical note: most SDL documents need at most 2 levels. Depth 3 is reserved for large architectures with nested module trees (e.g. a monorepo root → service-group module → per-service detail).

### Array Merge Semantics: Concatenable vs. Identity-Keyed

Not all arrays should be blindly concatenated across modules. The spec distinguishes two kinds:

**Concatenable arrays** — order matters, duplicates are valid, append is correct:
- `techDebt[]`, `compliance.frameworks[]`, `contracts.apis[]`, `slos.services[]`
- `architecture.projects.*[]` — components from different modules describe different parts of the system

**Identity-keyed arrays** — each entry has a logical identity field; importing the same entry twice is a modeling error:
- `domain.entities[]` — keyed by `name`; two entries with the same `name` in different modules is a duplicate identity, not an append (see the rule below)
- `integrations.custom[]` — keyed by `name`
- `features[]` — keyed by `name` (`FeatureSection` has no `id` field); duplicate `name` values across modules should produce a warning

**Rule for implementations:** When merging arrays, if the array is identity-keyed and two entries share the same identity field, emit a `duplicate-array-item` warning and retain the later entry (last-writer-wins, consistent with scalar override behavior). Concatenable arrays never produce duplicate warnings.

### What Should Not Be Imported

The following are sidecar outputs produced by tooling and **must not** appear in `imports`:
- `sdl/assumptions.sdl.yaml` — discovery review items, not architecture description
- `sdl/complexity.sdl.yaml` — complexity scoring, not architecture description
- Any file whose root keys are all `x-*` extension fields

Listing sidecar files in `imports` would force all SDL consumers to understand discovery-layer metadata. Keep sidecar files adjacent to the SDL but outside the import graph.

### Extension Fields in Imported Modules

Any key prefixed with `x-` is an extension field. Extension fields:
- Are preserved verbatim during merge (same merge rules as above apply)
- Are ignored by validators that do not know them
- Are the correct mechanism for tooling metadata such as `x-confidence`, `x-evidence`, and `x-review-required`

---

## NEW: API Contracts Section

`contracts.apis[]` is a lightweight **inventory** of the externally addressable API surfaces in the solution — one entry per surface — used by tooling that needs a flat catalog (API portals, ownership reports, gateway registration). It does not describe individual operations.

```yaml
contracts:
  apis:
    - name: api-server
      type: rest
      owner: backend-team
    - name: subscription-service
      type: graphql
      owner: subscriptions-team
    - name: worker-service
      type: grpc
      owner: platform-team
```

**SDL is intentionally not an API description language.** Per-operation contracts (request/response shapes, status codes, parameter validation) live in the appropriate ecosystem standard — OpenAPI for REST, GraphQL SDL, gRPC `.proto`, AsyncAPI for events. Reference those external files from SDL via `x-` extension fields on `contracts.apis[]` entries (e.g. `x-spec-path: ./openapi/api-server.yaml`). The `Service.exposes.http.openapi: boolean` flag remains the way to declare that a service emits an OpenAPI document at runtime.

---

## NEW: Error Conventions (architecture.errorConventions)

`architecture.errorConventions` declares a single error envelope shape, status↔code mapping, and default retry policy that all services in the architecture honour. It is a cross-cutting architectural decision (sibling to `nonFunctional.security.encryptionAtRest`) — not a per-operation contract — so that error middleware, typed SDK error classes, and OpenAPI `ErrorEnvelope` schemas can be generated once and reused across every service in the solution.

```yaml
architecture:
  errorConventions:
    envelope:
      kind: object
      fields:
        - name: error
          type: object
          required: true
        - name: error.code
          type: string
          required: true
        - name: error.message
          type: string
          required: true
        - name: error.requestId
          type: string
          required: true
    status_mapping:
      - status: 400
        code: VALIDATION_ERROR
        retryable: false
      - status: 401
        code: UNAUTHORIZED
        retryable: false
      - status: 409
        code: CONFLICT
        retryable: false
      - status: 429
        code: RATE_LIMITED
        retryable: true
        retry_after_header: true
      - status: 503
        code: SERVICE_UNAVAILABLE
        retryable: true
        retry_after_header: true
    retry_policy:
      max_attempts: 3
      backoff: exponential
      base_ms: 200
      cap_ms: 5000
```

`errorConventions` carries three optional sub-shapes: `envelope` (the wire shape of every error response — `kind: object` plus a `fields[]` array of `name` / `type` / optional `required` / optional `description`), `status_mapping[]` (each entry: `status` 100–599, `code`, optional `retryable`, optional `retry_after_header`), and `retry_policy` (`max_attempts`, `backoff: exponential | linear | constant`, `base_ms`, `cap_ms`). The full field surface and required/optional flags live in `reference/canonical-contract.md` and the JSON schema; they are not duplicated here.

### Cross-document consistency

- `architecture.errorConventions.retry_policy` is the **default** retry policy for error responses. `resilience.retryPolicy` (a single object — see *Resilience Section* below) may tighten or relax it at the transport layer; the two should not contradict each other's semantics (e.g. don't set `maxAttempts: 1` while the convention declares 429 and 503 retryable).
- **Known vocabulary split:** the two backoff enums do not use the same spelling for a constant-delay strategy — `architecture.errorConventions.retry_policy.backoff` accepts `exponential | linear | constant`, while `resilience.retryPolicy.backoff` accepts `exponential | linear | fixed`. `constant` and `fixed` denote the same strategy. Aligning them is a breaking change to one of the two sections and is deferred to v1.2; until then, authors must use the spelling each section declares.
- `envelope.kind` is fixed at `object` in v1.1; the field exists so future shapes (e.g. Problem+JSON-style arrays) can be introduced without a breaking change. Authors must always set it to `object`.

---

## NEW: Domain Model Section

Current implemented shape: entities with lightweight field and relationship modeling.

```yaml
domain:
  entities:
    - name: User
      fields:
        - name: id
          type: uuid
        - name: email
          type: string
          required: true
        - name: passwordHash
          type: string
          required: true
    - name: Order
      fields:
        - name: id
          type: uuid
        - name: userId
          type: uuid
        - name: total
          type: decimal
          required: true

  relationships:
    - from: Order
      to: User
      type: many-to-one
```

---

## NEW: Features Section

Current implemented shape: flat feature array.

```yaml
features:
  - name: User Authentication
    description: Email/password signup and login
    priority: critical
  - name: Team Collaboration
    description: Shared workspaces, roles, and member management
    priority: high
  - name: API Integrations
    description: Third-party API integrations
    priority: medium
```

Future direction:

- phased planning, dependencies, flags, rollout metadata, and delivery status should be treated as planned expansion until schema and types support them directly

---

## NEW: Compliance Section

Regulatory and compliance requirements.

```yaml
compliance:
  frameworks:
    - name: GDPR
      applicable: true
      requirements:
        - requirement: data-deletion
          description: "Right to be forgotten - users can request data deletion"
          implementation: soft-delete with 30-day purge grace period
        - requirement: consent-tracking
          description: "Track explicit user consent for data processing"
          implementation: consent_log table with timestamps and versions
        - requirement: data-portability
          description: "Export user data in portable format"
          implementation: JSON export endpoint
        - requirement: privacy-by-design
          description: "Minimize data collection, default encryption"
    
    - name: HIPAA
      applicable: false
      notes: "Not applicable - no PHI handling"
    
    - name: SOC2-Type2
      applicable: true
      requirements:
        - requirement: access-control
          implementation: RBAC with audit logging
        - requirement: encryption-at-rest
          implementation: AES-256 encryption in RDS
        - requirement: encryption-in-transit
          implementation: TLS 1.2+ for all connections
    
    - name: PCI-DSS
      applicable: false
      notes: "Stripe handles payment data, we don't store card info"
  
  certifications:
    - name: SOC2-Type2
      targetDate: "2026-12-31"
      auditor: "Big4 Firm"
  
  dataResidency:
    - region: us-east-1
      dataTypes: [user-data, logs]
      compliance: [GDPR, CCPA]
    - region: eu-west-1
      dataTypes: [eu-user-data]
      compliance: [GDPR]
  
  dataRetention:
    - dataType: logs
      retentionDays: 90
      reason: "SOC2 requirement"
    - dataType: deleted-user-data
      retentionDays: 30
      reason: "GDPR right to be forgotten grace period"
    - dataType: audit-logs
      retentionDays: 2555
      reason: "7-year legal requirement"
```

---

## NEW: SLO/SLI Section

Current implemented shape: service-level overview keyed by service name.

```yaml
slos:
  services:
    - name: api-server
      availability: "99.9%"
      latencyP95: "200ms"
    - name: web-app
      availability: "99.5%"
      latencyP95: "2000ms"
```

Future direction:

- richer SLI definitions, alerting rules, windows, and error budgets are reasonable extensions
- they should not be treated as stable `v1.1` contract surface until schema and types are expanded

---

## NEW: Resilience Section

Solution-wide fault tolerance defaults: circuit breaking, retries, timeouts, and rate limiting.

`resilience` declares **one default policy per pattern**, not a per-target list. Each of the four sub-keys is a single object, and each is closed (`additionalProperties: false`) apart from `x-` extension fields:

```yaml
resilience:
  circuitBreaker:
    enabled: true
    threshold: 50       # percent failure rate that trips the breaker; 1–99
    timeout: 30s

  retryPolicy:
    maxAttempts: 3
    backoff: exponential   # exponential | linear | fixed
    initialInterval: 100ms

  timeout:
    default: 30s

  rateLimit:
    requestsPerMinute: 1000
```

### Per-target resilience detail

The four sub-keys above are deliberately scalar defaults. Per-service or per-dependency overrides — bulkheads, fallback strategies, retryable status lists, per-endpoint budgets — are **not** part of the stable v1.1 contract and are rejected by the schema as unknown fields. Express them as extension fields:

```yaml
resilience:
  circuitBreaker:
    enabled: true
    threshold: 50
    timeout: 30s
  x-bulkheads:
    - name: payment-processing
      threads: 20
      queue: 100
  x-fallbacks:
    - service: recommendation-engine
      failureMode: error
      strategy: "return empty recommendations"
```

This mirrors the stance taken in *API Contracts* above: SDL records the cross-cutting architectural decision, and richer per-target policy belongs either in `x-` extensions or in the resilience library's own configuration.

---

## NEW: Cost Model Section

Pricing structure, usage-based costs, per-component cost breakdown.

```yaml
costs:
  model: usage-based
  
  infrastructure:
    compute:
      - component: api-server
        platform: aws-ec2
        instanceType: t3.large
        instances: 3
        costPerMonth: 300
      - component: web-app
        platform: vercel
        costPerMonth: 100
    
    database:
      - name: primary-postgres
        provider: aws-rds
        instanceType: db.t3.large
        storage: 100GB
        backup: enabled
        costPerMonth: 400
    
    storage:
      - name: s3-bucket
        provider: aws-s3
        storage: 500GB
        costPerMonth: 50
    
    cdn:
      - name: cloudfront
        provider: aws-cloudfront
        bandwidth: 1TB
        costPerMonth: 200
  
  thirdParty:
    - name: stripe
      category: payments
      fee: "2.9% + $0.30 per transaction"
      expectedVolume: "$50k/month"
      monthlyCost: 1550
    
    - name: sendgrid
      category: email
      volume: 100k emails/month
      costPerMonth: 100
    
    - name: sentry
      category: error-tracking
      events: 1m/month
      costPerMonth: 500
    
    - name: datadog
      category: monitoring
      hosts: 10
      costPerMonth: 1500
  
  total:
    infrastructure: 1050
    thirdParty: 3650
    monthly: 4700
    annual: 56400
  
  scaling:
    - milestone: "10k users"
      estimatedCost: 8000
    - milestone: "100k users"
      estimatedCost: 15000
    - milestone: "1m users"
      estimatedCost: 35000
```

---

## NEW: Backup & DR Section

Disaster recovery strategy, RTO/RPO, failover, replication.

```yaml
backupDr:
  strategy: active-passive
  
  databases:
    - name: primary-postgres
      rto: 15m
      rpo: 5m
      backup:
        frequency: hourly
        retention: 30 days
        type: continuous-backup
      replication:
        target: read-replica in us-west-2
        lag: < 1s
      failover:
        automatic: true
        manual: true
        switchoverTime: < 1m
  
  storage:
    - name: s3-user-uploads
      rto: 1h
      rpo: 1h
      backup:
        type: s3-versioning + cross-region-replication
        target: s3 bucket in eu-west-1
        retention: 90 days
  
  siteFailover:
    primary: us-east-1
    secondary: us-west-2
    healthCheck: every 30s
    automaticFailover: true
    switchoverTime: 2m
    testSchedule: monthly
    lastTestDate: "2026-03-15"
  
  recoveryProcedures:
    - scenario: database-corruption
      rto: 30m
      steps:
        - "Detect corruption via integrity checks"
        - "Promote read-replica to primary"
        - "Restore from hourly backup if needed"
    
    - scenario: regional-outage
      rto: 10m
      steps:
        - "Health check fails in us-east-1"
        - "Automatic DNS failover to us-west-2"
        - "Validate health in secondary region"
```

---

## NEW: Design System Section

Formal design token definitions, theming, component library.

```yaml
design:
  personality: professional-structured
  
  tokens:
    colors:
      primary: "#0066cc"
      primary-dark: "#004499"
      secondary: "#00a3e0"
      success: "#10b981"
      warning: "#f59e0b"
      error: "#ef4444"
      neutral-50: "#f9fafb"
      neutral-900: "#111827"
    
    typography:
      headingFont: Figtree
      bodyFont: Inter
      monoFont: "JetBrains Mono"
      scale:
        h1: 32px
        h2: 24px
        h3: 20px
        body: 16px
        small: 14px
    
    spacing:
      xs: 4px
      sm: 8px
      md: 16px
      lg: 24px
      xl: 32px
    
    radius:
      sm: 4px
      md: 8px
      lg: 12px
      full: 9999px
    
    shadows:
      sm: "0 1px 2px rgba(0,0,0,0.05)"
      md: "0 4px 6px rgba(0,0,0,0.1)"
      lg: "0 10px 15px rgba(0,0,0,0.1)"
  
  componentLibrary: shadcn/ui
  iconLibrary: lucide-react
  
  themes:
    - name: light
      colors:
        background: "#ffffff"
        text: "#111827"
    - name: dark
      colors:
        background: "#111827"
        text: "#f9fafb"
  
  layouts:
    - name: dashboard
      description: "Sidebar navigation with header"
    - name: marketing
      description: "Hero + content sections"
    - name: app-shell
      description: "Tab navigation with content area"
```

---

## Mobile/Platform Specific

**There is no root-level `mobile` section.** Mobile applications are modeled as entries in `architecture.projects.mobile[]`, alongside `frontend[]` and `backend[]`. The root schema is closed (`additionalProperties: false`), so a top-level `mobile:` key is rejected with `UNKNOWN_FIELD`.

```yaml
architecture:
  projects:
    mobile:
      - name: mobile-app
        platform: cross-platform     # ios | android | cross-platform
        framework: react-native      # react-native | flutter | swift | kotlin | ionic
```

Store-submission and platform-version metadata (minimum OS version, notarization, target SDK, store listing assets) is not part of the stable v1.1 contract. Attach it with `x-` extension fields on the project entry:

```yaml
architecture:
  projects:
    mobile:
      - name: mobile-app
        platform: ios
        framework: swift
        x-min-os-version: "14.0"
        x-notarization: required
        x-app-store:
          screenshots: 5
          keywords: [productivity, collaboration]
```

See `reference/canonical-contract.md` for the full `platform` and `framework` enums.

---

## Validation Rules (v1.1)

This is the informal summary; the authoritative list with per-rule enforcement status is *Conditional Rules (Errors)* below.

1. **Contracts** — if `architecture.projects.backend[].apiStyle === "rest"`, a corresponding `contracts.apis[]` entry should exist *(not yet enforced)*
2. **Domain entities** — if `domain.entities[]` defined, entity `name` values must be unique *(enforced: SEM-008)*
3. **SLOs** — `slos.services[].name` entries must correspond to a name in `architecture.projects` or `architecture.services` *(enforced: SEM-005)*
4. **Compliance** — if `compliance.frameworks[].applicable === true`, requirements should be mapped to implementation *(not yet enforced)*
5. ~~**Features dependsOn**~~ — removed; `FeatureSection` has no `dependsOn` field in the current type contract
6. **Resilience** — `resilience.circuitBreaker.threshold` must be between 1 and 99 when present *(enforced: SEM-011)*. The check is on `threshold` alone; it does not depend on `enabled`.

---

## Validation Pipeline

SDL v1.1 uses the standard validation pipeline with extended conditional rules for new sections:

```
YAML string → parse() → validate() [→ detectWarnings()] → validateSemantics() → normalize() → SDL document
```

1. **Parse** — YAML to JavaScript object
2. **Validate** — JSON Schema validation (5 structural `allOf` rules) + 28 conditional rules, of which 14 are implemented as semantic checks (`SEM-*`)
3. **Normalize** — 20 auto-inference rules fill missing fields and canonicalise aliases (see [`../reference/normalization-defaults.md`](../reference/normalization-defaults.md))

**Normalized-validity invariant (normative):** the normalizer's output must itself be a valid SDL document — `validate(normalize(validInput).document)` passes schema validation and `validateSemantics` returns no errors. Every default the normalizer emits (runtimes, ORMs, fabricated sections) must stay inside the schema's enums and constraints. This invariant is enforced by the conformance suite (`audit-conformance.test.ts`) across every example and template.
4. **Warnings** — 11 rules defined, 4 currently emitted (non-blocking)

Note that `detectWarnings()` is invoked from inside `validate()`, not as a separate pipeline stage; warnings are returned on the `ValidationResult` when schema validation passes.

### Normalization Closure (normative)

`normalize()` runs **after** `validate()`, and normalizer output is not re-validated. This means every auto-inference rule must be *closed over the validation rules*: an inference may never produce a document that `validate()` would have rejected had the inferred value been authored explicitly.

Concretely for the ORM inference (see [`../reference/normalization-defaults.md`](../reference/normalization-defaults.md) § Backend ORM Mapping):

- Inference is keyed on the **pair** of backend `framework` and `data.primaryDatabase.type`. There is no unconditional per-framework default; a framework/database pair that is not in the mapping table infers nothing and leaves `orm` unset.
- Because rule 10 below forbids `mongodb` + `ef-core`, the mapping table must never contain (and does not contain) an `ef-core` entry for `mongodb`. The only ORM inferable when the primary database is `mongodb` is `mongoose` (for `nodejs` backends).
- Every inferred value must be a member of the corresponding enum in the canonical contract (e.g. every ORM value in the mapping table, including `hibernate` for `java-spring`, is in the `orm` enum).

A conformant implementation that adds a new inference rule, or a new row to an inference mapping, must check it against the conditional rules in this section before shipping it.

### Conditional Rules (Errors)

> **Implementation status:** The reference package enforces these rules through two mechanisms:
> - **JSON Schema (AJV)** — structural and type rules run during schema validation (`packages/sdl/src/validator.ts`)
> - **Semantic validator** — cross-section relational rules run via `packages/sdl/src/semantic-validator.ts`, invoked from the public `index.ts` API. **13** rules are implemented, numbered SEM-001…SEM-005 and SEM-007…SEM-014. There is no SEM-006: it was retired with the removed rule 9 (*Resilience Service References*), and the identifier is a permanent tombstone so existing SEM numbers stay stable.
>
> Rules marked **[enforced: ...]** are active and will reject invalid documents.
> Rules marked **[not yet implemented]** are normative but not yet enforced by the reference package.
> Rules marked **[not yet implemented, field absent]** require a type contract expansion before they can be enforced.

These rules catch logical inconsistencies and must pass for valid SDL (28 active rules; rules 7–9 are tombstones for removed rules):

**Reference Integrity (6 active rules, 3 tombstones):**
1. **SLO Service References** **[enforced: SEM-005]** → every `slos.services[].name` must match a component name in `architecture.projects` or `architecture.services`
2. **Cost Components** **[not yet implemented, field absent]** → `CostSection` currently defines only `monthly` and `notes`; a per-component cost breakdown (`costs.infrastructure[].component`) is not in the active type contract. This rule is a placeholder for when `CostSection` is expanded.
3. **Service Dependency Integrity** **[enforced: SEM-002, SEM-003, SEM-004]** → entries in `architecture.services[].dependencies[]` must reference known service names (SEM-002); a service may not depend on itself (SEM-003); the dependency graph must be acyclic (SEM-004). Note: `dependsOn` is not a first-class field on project types; these rules apply to `architecture.services[].dependencies[]` only.
4. **API Contract Service** **[not yet implemented]** → `contracts.apis[].owner` (if present) must match a component name in `architecture.projects`
5. **Foreign Key Targets** **[enforced: SEM-001]** → `domain.relationships[].from` and `.to` must each match a name in `domain.entities[].name`
6. **Backup Coverage** **[not yet implemented]** → `backupDr.backups[].target` should reference a value matching `data.primaryDatabase.type` or an entry in `data.secondaryDatabases[]`
7. ~~**Environment Components**~~ — removed; `environments` is not a root-level SDL key.
8. ~~**Feature Dependencies (phase-keyed)**~~ — removed; `features` is a flat array, not a phase-keyed object.
9. ~~**Resilience Service References**~~ — removed; `resilience.circuitBreaker` is a single configuration object.

**Type Compatibility (3 rules):**
10. **ORM-Database Pair** **[enforced: JSON schema allOf]** → `data.primaryDatabase.type: "mongodb"` is incompatible with `architecture.projects.backend[*].orm: "ef-core"`. Other ORM-database incompatibilities are not yet checked. Two scope notes: (a) because validation precedes normalization, this rule checks *authored* `orm` values; the normalizer is required by *Normalization Closure* (above) to never infer a value this rule would reject. (b) The rule covers `architecture.projects.backend[]` only — `architecture.services[]` entries carry no `framework` or `orm` field, so services-style architectures declare persistence per backend *project*, not per service.
11. **Framework-Language** **[not yet implemented, field absent for `.language`]** → `architecture.projects[*][].framework` compatibility with the project language cannot be checked until `.language` is a typed field on project types.
12. **Auth Provider Integration** **[not yet implemented]** → if `auth.provider` names a third-party value (`auth0`, `clerk`, `cognito`, `firebase`, `supabase`), it should also appear in `integrations`

**Deployment Integrity (6 rules):**
13. **Microservices Count** **[enforced: JSON schema allOf]** → `architecture.style: "microservices"` requires `architecture.services` to have at least 2 entries
14. **Deployable Coverage** **[not yet implemented, field absent]** → `deployable` is not a first-class field on `FrontendProject`, `BackendProject`, or `MobileProject` in the current type contract; it is an `x-` extension field. This rule applies when `x-deployable: true` is set. Formal field promotion is tracked as a future contract change.
15. **Port Conflicts** **[not yet implemented]** → within each environment, no two components may declare the same `port`
16. **Region Support** **[not yet implemented]** → `deployment.regions[]` values must be valid for `deployment.cloud`
17. **CloudFormation Constraint** **[enforced: JSON schema allOf]** → `deployment.infrastructure.iac: "cloudformation"` is only valid when `deployment.cloud: "aws"`. (The field lives under `deployment.infrastructure`, not `deployment.ciCd`.) Conformance pair: `examples/conformance/valid/aws-cloudformation.yaml` must pass, `examples/single-file/azure-cloudformation.yaml` must fail with `INCOMPATIBLE_CLOUD_IAC`.
28. **Deployment Environment Uniqueness** **[enforced: SEM-014]** → `deployment.ciCd.environments[].name` values must be unique within the environments array

**Data Model Integrity (4 rules):**
18. **Primary Key Required** **[not yet implemented]** → `DomainField` includes `primaryKey` in the active contract (alongside `nullable`, `foreignKey`, `unique`, `generated`, `default`, `enum`, `maxLength`, `precision`, `scale`, `description`, `onUpdate`); the check that each entity declares exactly one `primaryKey: true` field is not yet enforced.
19. **Cross-Database Foreign Keys** **[not yet implemented]** → FK relationships (`domain.relationships[].to`) that span databases should be flagged as warnings, not errors
20. **Unique Component Names** **[enforced: SEM-007, SEM-008]** → project and service `name` values must be globally unique across all `architecture.projects` categories and `architecture.services` (SEM-007); domain entity names must be unique within `domain.entities` (SEM-008)
21. **Entity Ownership** **[not yet implemented, field absent]** → `DomainEntity` currently defines only `name` and `fields[]`; an `owner` field is not in the active type contract. This rule is a placeholder for when `DomainEntity` is expanded.

**Configuration Completeness (4 rules):**
22. **Deployable Component Fields** **[not yet implemented, field absent]** → depends on `deployable` being a first-class field (see rule 14); when `x-deployable: true` is set, the component should also declare `x-path` or have a `framework` that implies a known runtime
23. **Auth Strategy Provider** **[enforced: JSON schema allOf + SEM-010]** → `auth.strategy: "oidc"` requires `auth.provider` to be set (JSON schema allOf); `auth.strategy: "passwordless"` or `"magic-link"` also requires `auth.provider` (SEM-010)
24. **Compliance Framework Validity** **[enforced: SEM-009]** → `compliance.frameworks[].name` must be one of: `GDPR`, `HIPAA`, `SOC2`, `SOC2-Type2`, `PCI-DSS`, `CCPA`, `ISO27001`, `ISO 27001`, `SOX`, `FERPA`, `FISMA`
31. **Architecture Non-Empty** **[enforced: SEM-015]** → `architecture` must declare at least one component: a project in any `architecture.projects` category (frontend/backend/mobile) or an entry in `architecture.services`. Fails with `ARCHITECTURE_EMPTY`.

**Resilience & Performance (2 rules):**
25. **Resilience Thresholds** **[enforced: SEM-011, SEM-012]** → `resilience.circuitBreaker.threshold` must be between 1 and 99 (SEM-011); `resilience.retryPolicy.maxAttempts` must be ≥ 1 (SEM-012)
26. **SLO Reasonableness** **[enforced: SEM-013]** → `slos.services[].availability` must be between 90.0% and 99.999% when present. Note: `slos.services[].latencyP95` string format validation is not yet enforced.

**PII & Security (1 rule):**
27. **PII Encryption** **[enforced: JSON schema allOf]** → if `nonFunctional.security.pii: true`, then `nonFunctional.security.encryptionAtRest` must also be `true`. Note: `pii` is a field on `nonFunctional.security`, not on individual entity fields (`DomainField` has no `pii` property in the current type contract).

**Error Conventions (2 rules):**
29. **Status Range** **[enforced: JSON schema range]** → `architecture.errorConventions.status_mapping[].status` must be in the range 100–599.
30. **Retry Policy Consistency** **[not yet implemented]** → when both are present, `resilience.retryPolicy` (a single object) should not contradict `architecture.errorConventions.retry_policy` (e.g. mark as non-retryable a status the convention declares retryable).

### Warning Rules

These are non-blocking but flag potential issues. **4 of the 11 are implemented** in `packages/sdl/src/warnings.ts`; the rest are normative but not yet emitted. The same `[enforced]` / `[not yet implemented]` convention used for conditional rules applies here.

1. **Microservices with small team** **[enforced: `COMPLEXITY_EXCEEDS_TEAM_CAPACITY`]** — `architecture.style: microservices` with < 3 developers or 0 DevOps engineers
2. **Aggressive timeline vs scope** **[enforced: `TIMELINE_TOO_AGGRESSIVE`]** — estimated dev-weeks (projects × core flows × 1.5 ÷ developers) exceed `constraints.timeline`
3. **Multi-persona without auth** **[enforced: `MISSING_RECOMMENDED_FIELD`]** — no `auth` section with an admin-like persona present, or more than 2 personas
4. **Budget vs cost mismatch** **[enforced: `BUDGET_INFRASTRUCTURE_MISMATCH`]** — estimated monthly infrastructure cost exceeds the `constraints.budget` tier ceiling
5. **Cross-database foreign keys** **[not yet implemented]** — relationships span different databases
6. **Unused integrations** **[not yet implemented]** — integrations listed but not referenced in any `architecture.services[].dependencies[]`
7. **Missing observability** **[not yet implemented]** — stage `Growth` or `Enterprise` without an observability section
8. **Loose SLO targets** **[not yet implemented]** — stage `Growth` or `Enterprise` with SLOs < 99% availability
9. **High cost variance** **[not yet implemented]** — scenarios differ by >10x between low/high
10. ~~**Feature phase cycles**~~ — removed; `FeatureSection` has no dependency field in the current type contract.
11. **Compliance gaps** **[not yet implemented]** — project stage suggests compliance need but no frameworks defined
12. **Design section missing** **[not yet implemented]** → stage `"Enterprise"` without a `design` section defined (`DesignSection` currently exposes `personality`, `colors`, and `typography`; a `tokens` sub-field is not in the active type contract)

Warning codes are documented in [`../reference/error-codes.md`](../reference/error-codes.md).

---

## Version Strategy

- **v1.1** — Active specification. Amendments folded into v1.1 after initial publication: import Forms B and C, identity-keyed array merge semantics, the `compliance-checklist` artifact type, and the normalized-validity invariant. Documents do not need to distinguish amendment levels — `sdlVersion: "1.1"` covers all of them.
- **Future**: later versions may extend cloud-native, tracing, and event-driven modeling
