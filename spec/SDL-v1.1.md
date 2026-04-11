# SDL Specification v1.1

**Complete Solution Design Language** — comprehensive architecture specification with API contracts, data models, SLOs, compliance, feature planning, and resilience patterns.

For canonical enum values, artifact types, stable root section shapes, and alias policy, see [`../reference/canonical-contract.md`](../reference/canonical-contract.md).

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

Current implementation note:

- The active schema and exported types are the source of truth for exact field shapes.
- Some richer narrative examples below describe possible future expansion areas, but the implemented `v1.1` contract is intentionally narrower today.

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
2. **Domain entities** — if `domain.entities[]` defined, must match entity names in contracts
3. **SLOs** — each `slos` entry must reference a component in `architecture.projects`
4. **Compliance** — if `compliance.frameworks[].applicable === true`, requirements must be mapped to implementation
5. **Features** — feature `dependsOn` must reference other feature IDs that exist
6. **Resilience** — circuit breaker targets must be valid component or external service names

---

## Validation Pipeline

SDL v1.1 uses the standard validation pipeline with extended conditional rules for new sections:

```
YAML string → parse() → validate() → normalize() → detectWarnings() → SDL document
```

1. **Parse** — YAML to JavaScript object
2. **Validate** — JSON Schema validation + 26 conditional rules
3. **Normalize** — 15+ auto-inference rules fill missing fields
4. **Warnings** — 10+ rules detect potential issues (non-blocking)

### Conditional Rules (Errors)

These rules catch logical inconsistencies and must pass for valid SDL (26 rules total):

**Reference Integrity (9 rules):**
1. **Environment Components** → every component in `environments[].components` must exist in `architecture.projects`
2. **SLO Components** → every component in `slos[].component` must exist in `architecture.projects`
3. **Cost Components** → every component in `costs.infrastructure[].component` must exist in `architecture.projects`
4. **Circular Dependencies** → `architecture.projects[].dependsOn` must not form cycles
5. **API Endpoint Service** → each `contracts[].paths[].service` must exist in `architecture.projects`
6. **Foreign Key Targets** → entities in `domain.entities[].relationships[].target` must exist as entities
7. **Feature Dependencies** → `features.phase*.features[].dependsOn` must reference features in same/earlier phases
8. **Resilience Service References** → services in `resilience.circuitBreaker[].service` must exist in `architecture.projects`
9. **Backup Database References** → databases in `backupDr.databases[].name` must match `data.databases[].name`

**Type Compatibility (3 rules):**
10. **ORM-Database Pair** → `data.primaryDatabase.type` must be compatible with `architecture.projects[].orm`
11. **Framework-Language** → `architecture.projects[].framework` must be compatible with `.language`
12. **Auth Provider Integration** → if `auth.provider` is in integrations list, it must exist in `integrations[]`

**Deployment Integrity (5 rules):**
13. **Microservices Count** → `architecture.style: "microservices"` requires 2+ services
14. **Deployable Coverage** → every `deployable: true` component must appear in at least one environment
15. **Port Conflicts** → within each environment, no duplicate ports
16. **Region Support** → `deployment.regions[]` valid for `deployment.cloud`
17. **CloudFormation Constraint** → `deployment.ciCd.provider: "cloudformation"` only with AWS

**Data Model Integrity (4 rules):**
18. **Primary Key Required** → all `domain.entities[]` must have `primaryKey: true` field
19. **Cross-Database Foreign Keys** → FK relationships across databases noted as limitations
20. **Unique Component Names** → component names globally unique (all categories)
21. **Entity Ownership** (v1.1) → each `domain.entities[]` should be owned by a component

**Configuration Completeness (3 rules):**
22. **Deployable Component Fields** → `deployable: true` components must have `path` and `runtime`
23. **OIDC Provider** → `auth.provider: "oidc"` requires issuer URL
24. **Compliance Framework Validity** → `compliance.frameworks[].name` must be recognized (GDPR, HIPAA, SOC2, PCI-DSS, CCPA)

**Resilience & Performance (2 rules):**
25. **Resilience Thresholds** → `resilience.circuitBreaker[].failureThreshold` and `retryPolicy[].maxRetries` > 0
26. **SLO Reasonableness** → `slos[].availability.target` between 90-99.99%, latency.p99 > latency.p50

**PII & Security (1 rule):**
27. **PII Encryption** → if any entity has PII fields, `data` must have `encryption.atRest: true`

### Warning Rules

These are non-blocking but flag potential issues (10+ rules):

1. **Microservices with small team** — microservices style with < 3 team members
2. **Aggressive timeline vs scope** — complex architecture with < 4 week timeline
3. **Multi-persona without auth** — 3+ personas but no auth defined
4. **Budget vs cost mismatch** — estimated costs exceed budget
5. **Cross-database foreign keys** — relationships span different databases
6. **Unused integrations** — integrations listed but not in any `dependsOn`
7. **Missing observability** — production-stage architecture without observability section
8. **Loose SLO targets** — production SLOs < 99% availability
9. **High cost variance** — scenarios differ by >10x between low/high
10. **Feature phase cycles** — features depend on features in future phases (soft validation)
11. **Compliance gaps** — project stage suggests compliance need but no frameworks defined
12. **Design tokens missing** → stage: "production" without `design.tokens` defined

---

## Version Strategy

- **v1.1** — Complete specification (production-grade)
- **Future**: later versions may extend cloud-native, tracing, and event-driven modeling
