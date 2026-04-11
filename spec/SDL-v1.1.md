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

```yaml
sdlVersion: "1.1"

# Core required sections
solution: {}
architecture: {}
data: {}

# v1.1 Additions (optional but recommended)
contracts:
  apis: []           # API specs (REST, GraphQL, gRPC, webhook, AsyncAPI metadata)
domain: {}           # Detailed entity definitions with fields
features: []         # Feature items (current schema shape)
compliance: {}       # Regulatory requirements
slos: {}             # Service level objectives per component
resilience: {}       # Circuit breakers, retries, timeouts
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
techDebt: []
```

Implementation status note:

- This spec is the source of truth for field shapes. The active schema and exported types in `packages/sdl/` are derived from this spec; when they diverge, the spec governs and the package should be updated.
- Some sections below describe the full intended contract. Where the runtime package has not yet implemented a section, that section is marked **[not yet implemented]**. Implementors should treat unimplemented sections as planned, not optional.

---

## Modular SDL and Import Semantics

SDL documents may be split across multiple files using the `imports` key. This section defines the normative rules for how imports are resolved and merged.

### Import Declaration

```yaml
sdlVersion: "1.1"
imports:
  - sdl/auth.sdl.yaml
  - sdl/deployment.sdl.yaml
solution: {}
architecture: {}
data: {}
```

- `imports` is an optional array of relative file paths at the root of an SDL document.
- Imported paths must end in `.sdl.yaml` or `.sdl.yml`. Other extensions produce a warning.
- Each imported file is itself a valid SDL fragment (it may omit `sdlVersion` and `imports`).
- Import order is significant: modules listed earlier are treated as the base; modules listed later override scalar values in earlier modules (see merge rules below).

### Merge Rules (normative)

When the resolver merges an imported module into the accumulating document, it applies the following rules in order for each key:

1. **Key absent in base** — the value from the imported module is adopted without conflict.
2. **Both values are arrays** — arrays are concatenated. Deduplication is not applied; consumers must handle duplicate entries.
3. **Both values are non-null objects** — merge recursively, applying these same rules.
4. **Scalar conflict** (both values are scalars, or one is a scalar and the other is an object/array) — the imported module's value wins (*last writer wins*). A `scalar-override` warning is emitted. This is intentional: it allows modules to specialize or override defaults set by earlier modules.
5. **`imports` key** — never merged. Each file's `imports` list is only used to queue further resolution; it is stripped from the accumulated document.

### Depth Limit

**Portability limit:** Implementations must support at least **3** levels of import nesting (root → depth 1 → depth 2 → depth 3). Imports beyond depth 3 may be skipped; when skipped, a warning must be emitted.

This is an implementation portability requirement, not a semantic property of SDL itself. The SDL language does not assign meaning to nesting depth; the limit exists so that conformant implementations can be built without unbounded recursion guards. Circular imports (file A imports file B which imports file A) are always an error regardless of depth; detect them via a visited-file set.

Practical note: most SDL documents need at most 2 levels. Depth 3 is reserved for large architectures with nested module trees (e.g. a monorepo root → service-group module → per-service detail).

### Array Merge Semantics: Concatenable vs. Identity-Keyed

Not all arrays should be blindly concatenated across modules. The spec distinguishes two kinds:

**Concatenable arrays** — order matters, duplicates are valid, append is correct:
- `techDebt[]`, `compliance.frameworks[]`, `contracts.apis[]`, `slos.services[]`
- `architecture.projects.*[]` — components from different modules describe different parts of the system

**Identity-keyed arrays** — each entry has a logical identity field; importing the same entry twice is a modeling error:
- `domain.entities[]` — keyed by `name`; two entries with the same `name` in different modules is a conflict, not an append
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

Current implemented shape: lightweight API contract inventory.

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

Future direction:

- richer references to external OpenAPI, GraphQL SDL, gRPC, or AsyncAPI files can be added later
- those shapes should not be treated as part of the stable `v1.1` contract until schema and types are expanded

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

Fault tolerance patterns, circuit breakers, retries, timeouts, and fallbacks.

```yaml
resilience:
  circuitBreaker:
    - name: stripe-payment-service
      target: external
      failureThreshold: 5
      successThreshold: 2
      timeout: 30s
      backoffMultiplier: 2
      maxBackoff: 300s
      fallback: "queue payment for retry"
  
  retryPolicy:
    - name: external-api-calls
      maxAttempts: 3
      backoff:
        type: exponential
        initialDelayMs: 100
        maxDelayMs: 30000
        multiplier: 2
      retryableErrors: [500, 502, 503, 504, timeout]
  
  timeout:
    - name: api-server-response
      ms: 30000
      description: "Maximum time to wait for API response"
    - name: database-query
      ms: 5000
      description: "Maximum time for database query"
    - name: external-service-call
      ms: 10000
  
  bulkhead:
    - name: payment-processing
      threads: 20
      queue: 100
      description: "Isolate payment processing to prevent cascading failure"
  
  rateLimit:
    - name: api-server
      rps: 1000
      burstSize: 2000
      perUser: 100
      window: 1m
  
  fallback:
    - service: product-service
      failureMode: timeout
      fallbackStrategy: "return cached data (max 1h old)"
      
    - service: recommendation-engine
      failureMode: error
      fallbackStrategy: "return empty recommendations"
```

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

## NEW: Mobile/Platform Specific

Platform-specific requirements for mobile apps.

```yaml
mobile:
  - platform: ios
    minVersion: "14.0"
    notarization: required
    appStoreOptimization:
      - screenshots: 5
      - keywords: [productivity, collaboration]
  
  - platform: android
    minSdk: 21
    targetSdk: 34
    playStoreOptimization:
      screenshots: 8
```

---

## Validation Rules (v1.1)

1. **Contracts** — if `architecture.projects.backend[].apiStyle === "rest"`, must have corresponding OpenAPI contract
2. **Domain entities** — if `domain.entities[]` defined, entity `name` values must be unique
3. **SLOs** — `slos.services[].name` entries should correspond to a component name in `architecture.projects`
4. **Compliance** — if `compliance.frameworks[].applicable === true`, requirements must be mapped to implementation
5. ~~**Features dependsOn**~~ — removed; `FeatureSection` has no `dependsOn` field in the current type contract
6. **Resilience** — `resilience.circuitBreaker.enabled: true` requires `threshold > 0`

---

## Validation Pipeline

SDL v1.1 uses the standard validation pipeline with extended conditional rules for new sections:

```
YAML string → parse() → validate() → normalize() → detectWarnings() → SDL document
```

1. **Parse** — YAML to JavaScript object
2. **Validate** — JSON Schema validation + 25 conditional rules
3. **Normalize** — 15+ auto-inference rules fill missing fields
4. **Warnings** — 10+ rules detect potential issues (non-blocking)

### Conditional Rules (Errors)

> **Implementation status:** The reference package enforces these rules through two mechanisms:
> - **JSON Schema (AJV)** — structural and type rules run during schema validation (`packages/sdl/src/validator.ts`)
> - **Semantic validator** — cross-section relational rules run via `packages/sdl/src/semantic-validator.ts` (SEM-001 through SEM-014), invoked from the public `index.ts` API
>
> Rules marked **[enforced: ...]** are active and will reject invalid documents.
> Rules marked **[not yet implemented]** are normative but not yet enforced by the reference package.
> Rules marked **[not yet implemented, field absent]** require a type contract expansion before they can be enforced.

These rules catch logical inconsistencies and must pass for valid SDL (25 active rules; rules 7–9 are tombstones for removed rules):

**Reference Integrity (7 rules):**
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
10. **ORM-Database Pair** **[enforced: JSON schema allOf]** → `data.primaryDatabase.type: "mongodb"` is incompatible with `architecture.projects.backend[*].orm: "ef-core"`. Other ORM-database incompatibilities are not yet checked.
11. **Framework-Language** **[not yet implemented, field absent for `.language`]** → `architecture.projects[*][].framework` compatibility with the project language cannot be checked until `.language` is a typed field on project types.
12. **Auth Provider Integration** **[not yet implemented]** → if `auth.provider` names a third-party value (`auth0`, `clerk`, `cognito`, `firebase`, `supabase`), it should also appear in `integrations`

**Deployment Integrity (6 rules):**
13. **Microservices Count** **[enforced: JSON schema allOf]** → `architecture.style: "microservices"` requires `architecture.services` to have at least 2 entries
14. **Deployable Coverage** **[not yet implemented, field absent]** → `deployable` is not a first-class field on `FrontendProject`, `BackendProject`, or `MobileProject` in the current type contract; it is an `x-` extension field. This rule applies when `x-deployable: true` is set. Formal field promotion is tracked as a future contract change.
15. **Port Conflicts** **[not yet implemented]** → within each environment, no two components may declare the same `port`
16. **Region Support** **[not yet implemented]** → `deployment.regions[]` values must be valid for `deployment.cloud`
17. **CloudFormation Constraint** **[enforced: JSON schema allOf]** → `deployment.ciCd.iac: "cloudformation"` is only valid when `deployment.cloud: "aws"`
28. **Deployment Environment Uniqueness** **[enforced: SEM-014]** → `deployment.ciCd.environments[].name` values must be unique within the environments array

**Data Model Integrity (4 rules):**
18. **Primary Key Required** **[not yet implemented, field absent]** → `DomainField` currently defines `name`, `type`, and `required` only; `primaryKey` is not in the active type contract. This rule is a placeholder for when `DomainField` is expanded.
19. **Cross-Database Foreign Keys** **[not yet implemented]** → FK relationships (`domain.relationships[].to`) that span databases should be flagged as warnings, not errors
20. **Unique Component Names** **[enforced: SEM-007, SEM-008]** → project and service `name` values must be globally unique across all `architecture.projects` categories and `architecture.services` (SEM-007); domain entity names must be unique within `domain.entities` (SEM-008)
21. **Entity Ownership** **[not yet implemented, field absent]** → `DomainEntity` currently defines only `name` and `fields[]`; an `owner` field is not in the active type contract. This rule is a placeholder for when `DomainEntity` is expanded.

**Configuration Completeness (3 rules):**
22. **Deployable Component Fields** **[not yet implemented, field absent]** → depends on `deployable` being a first-class field (see rule 14); when `x-deployable: true` is set, the component should also declare `x-path` or have a `framework` that implies a known runtime
23. **Auth Strategy Provider** **[enforced: JSON schema allOf + SEM-010]** → `auth.strategy: "oidc"` requires `auth.provider` to be set (JSON schema allOf); `auth.strategy: "passwordless"` or `"magic-link"` also requires `auth.provider` (SEM-010)
24. **Compliance Framework Validity** **[enforced: SEM-009]** → `compliance.frameworks[].name` must be one of: `GDPR`, `HIPAA`, `SOC2`, `SOC2-Type2`, `PCI-DSS`, `CCPA`, `ISO27001`, `ISO 27001`, `SOX`, `FERPA`, `FISMA`

**Resilience & Performance (2 rules):**
25. **Resilience Thresholds** **[enforced: SEM-011, SEM-012]** → `resilience.circuitBreaker.threshold` must be between 1 and 99 (SEM-011); `resilience.retryPolicy.maxAttempts` must be ≥ 1 (SEM-012)
26. **SLO Reasonableness** **[enforced: SEM-013]** → `slos.services[].availability` must be between 90.0% and 99.999% when present. Note: `slos.services[].latencyP95` string format validation is not yet enforced.

**PII & Security (1 rule):**
27. **PII Encryption** **[enforced: JSON schema allOf]** → if `nonFunctional.security.pii: true`, then `nonFunctional.security.encryptionAtRest` must also be `true`. Note: `pii` is a field on `nonFunctional.security`, not on individual entity fields (`DomainField` has no `pii` property in the current type contract).

### Warning Rules

These are non-blocking but flag potential issues (10+ rules):

1. **Microservices with small team** — microservices style with < 3 team members
2. **Aggressive timeline vs scope** — complex architecture with < 4 week timeline
3. **Multi-persona without auth** — 3+ personas but no auth defined
4. **Budget vs cost mismatch** — estimated costs exceed budget
5. **Cross-database foreign keys** — relationships span different databases
6. **Unused integrations** — integrations listed but not referenced in any `architecture.services[].dependencies[]`
7. **Missing observability** — production-stage architecture without observability section
8. **Loose SLO targets** — production SLOs < 99% availability
9. **High cost variance** — scenarios differ by >10x between low/high
10. ~~**Feature phase cycles**~~ — removed; `FeatureSection` has no dependency field in the current type contract.
11. **Compliance gaps** — project stage suggests compliance need but no frameworks defined
12. **Design section missing** → stage: `"production"` without a `design` section defined (`DesignSection` currently exposes `personality`, `colors`, and `typography`; a `tokens` sub-field is not in the active type contract)

---

## Version Strategy

- **v1.1** — Complete specification (production-grade)
- **Future**: later versions may extend cloud-native, tracing, and event-driven modeling
