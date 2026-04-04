# SDL Specification v1.1

**Complete Solution Design Language** — comprehensive architecture specification with API contracts, data models, SLOs, compliance, feature planning, and resilience patterns.

## Overview

SDL v1.1 extends v0.1 with production-grade details:
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

# Core (required in both v0.1 & v1.1)
solution: {}
architecture: {}
data: {}

# v1.1 Additions (optional but recommended)
contracts: {}        # API specs (OpenAPI, GraphQL, gRPC)
domain: {}           # Detailed entity definitions with fields
features: {}         # Feature planning, MVP phases, flags
compliance: {}       # Regulatory requirements
slos: {}             # Service level objectives per component
resilience: {}       # Circuit breakers, retries, timeouts
costs: {}            # Pricing model, per-component costs
backupDr: {}         # RTO/RPO, failover strategy
design: {}           # Design tokens, theming, component library

# v0.1 Sections (unchanged)
product: {}
auth: {}
deployment: {}
environments: []
nonFunctional: {}
observability: {}
integrations: []
constraints: {}
testing: {}
techDebt: []
```

---

## NEW: API Contracts Section

Formal API contract definitions for REST, GraphQL, and gRPC services.

```yaml
contracts:
  - name: api-server
    type: openapi | graphql | grpc
    version: "3.1.0"
    path: sdl/contracts/api-server.openapi.yaml
    endpoints:
      count: 42
      baseUrl: "https://api.example.com/v1"
      
  - name: subscription-service
    type: graphql
    path: sdl/contracts/subscription.graphql
    
  - name: worker-service
    type: grpc
    path: sdl/contracts/worker.proto
```

**External contract files** (referenced, not embedded):
- `sdl/contracts/api-server.openapi.yaml` — Full OpenAPI 3.1 spec
- `sdl/contracts/subscription.graphql` — GraphQL SDL
- `sdl/contracts/worker.proto` — Protobuf definitions

---

## NEW: Domain Model Section

Detailed entity definitions with fields, types, relationships, and constraints.

```yaml
domain:
  entities:
    - name: User
      description: "System user with authentication"
      table: users
      fields:
        - name: id
          type: uuid
          primaryKey: true
          generated: true
          description: "Unique user identifier"
        - name: email
          type: string
          maxLength: 255
          unique: true
          nullable: false
          description: "Email address, used for login"
        - name: password_hash
          type: string
          nullable: false
          description: "Bcrypt hashed password"
        - name: role
          type: enum
          enum: [user, team_admin, super_admin]
          default: user
          nullable: false
        - name: created_at
          type: timestamp
          default: "NOW()"
          nullable: false
        - name: updated_at
          type: timestamp
          default: "NOW()"
          onUpdate: "NOW()"
          nullable: false
        - name: deleted_at
          type: timestamp
          nullable: true
          description: "Soft delete timestamp"
      
      relationships:
        - name: orders
          type: one-to-many
          target: Order
          foreignKey: user_id
        - name: profile
          type: one-to-one
          target: UserProfile
          foreignKey: user_id
      
      indexes:
        - name: idx_email
          fields: [email]
          unique: true
        - name: idx_role
          fields: [role]
        - name: idx_created_at
          fields: [created_at]
        - name: idx_deleted_at
          fields: [deleted_at]
      
      constraints:
        - type: check
          expression: "length(email) > 0"
        - type: unique
          fields: [email]
    
    - name: Order
      table: orders
      fields:
        - name: id
          type: uuid
          primaryKey: true
        - name: user_id
          type: uuid
          nullable: false
          foreignKey: Users.id
        - name: total
          type: decimal
          precision: 10
          scale: 2
          nullable: false
        - name: status
          type: enum
          enum: [pending, processing, completed, cancelled]
          default: pending
        - name: items
          type: json
          description: "Order line items as JSON array"
        - name: created_at
          type: timestamp
          default: "NOW()"
      
      indexes:
        - fields: [user_id, created_at]
        - fields: [status]
```

---

## NEW: Features Section

Feature planning, MVP phasing, feature flags, and dependencies.

```yaml
features:
  phase1:
    name: MVP
    deadline: "2026-06-30"
    features:
      - id: user-auth
        name: "User Authentication"
        description: "Email/password signup and login"
        priority: critical
        estimatedDays: 5
      - id: user-profile
        name: "User Profile Management"
        priority: high
        estimatedDays: 3
        dependsOn: [user-auth]
  
  phase2:
    name: Growth
    deadline: "2026-09-30"
    features:
      - id: team-management
        name: "Team Collaboration"
        priority: high
        estimatedDays: 8
        dependsOn: [user-auth]
      - id: api-integrations
        name: "Third-party API Integrations"
        priority: medium
        estimatedDays: 5
  
  phase3:
    name: Enterprise
    features:
      - id: sso
        name: "Single Sign-On (SAML/OIDC)"
        priority: high
      - id: audit-logging
        name: "Audit Logging & Compliance"
        priority: critical
  
  featureFlags:
    - name: new-dashboard
      rollout: 50%
      targetAudience: beta-users
      phase: phase2
    - name: ai-recommendations
      rollout: 0%
      phase: phase3
```

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

Service level objectives and key performance indicators per component.

```yaml
slos:
  - componentId: api-server
    name: "API Server SLO"
    availability:
      target: 99.9%
      window: monthly
      errorBudget: "43 minutes/month"
    latency:
      p50: 50ms
      p95: 200ms
      p99: 500ms
      p999: 1000ms
    throughput:
      rps: 1000
      concurrentUsers: 5000
    errorRate:
      target: 0.1%
      maxErrors: 1 per 1000 requests
    
    slis:
      - metric: http-request-duration
        description: "API response time"
        query: "histogram_quantile(0.99, rate(http_request_duration_seconds[5m]))"
        threshold: 500ms
      - metric: http-error-rate
        description: "5xx error rate"
        query: "rate(http_requests_total{status=~'5..'}[5m])"
        threshold: 0.001
      - metric: database-connection-pool
        description: "Available DB connections"
        threshold: "> 10 available"
    
    alerts:
      - name: HighErrorRate
        condition: "error_rate > 0.005"
        severity: critical
        action: "page on-call engineer"
      - name: HighLatency
        condition: "p99_latency > 1000ms for 5m"
        severity: warning
        action: "notify ops team"
  
  - componentId: web-app
    availability:
      target: 99.5%
    latency:
      p95: 2000ms
      p99: 5000ms
```

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

## Migration from v0.1 to v1.1

**v0.1 files remain unchanged:**
- `solution.sdl.yaml` — core architecture
- `sdl/product.sdl.yaml`
- `sdl/auth.sdl.yaml`
- `sdl/deployment.sdl.yaml`
- `sdl/environments.sdl.yaml`
- `sdl/nfr.sdl.yaml`

**v1.1 additions:**
- `sdl/contracts.sdl.yaml` — API contract definitions
- `sdl/domain.sdl.yaml` — Entity definitions with fields
- `sdl/features.sdl.yaml` — Feature planning and flags
- `sdl/compliance.sdl.yaml` — Regulatory requirements
- `sdl/slos.sdl.yaml` — Service level objectives
- `sdl/resilience.sdl.yaml` — Fault tolerance patterns
- `sdl/costs.sdl.yaml` — Pricing and cost model
- `sdl/backup-dr.sdl.yaml` — Disaster recovery strategy
- `sdl/design.sdl.yaml` — Design tokens and system

**Update main file:**
```yaml
sdlVersion: "1.1"

imports:
  - sdl/product.sdl.yaml
  - sdl/auth.sdl.yaml
  - sdl/deployment.sdl.yaml
  - sdl/environments.sdl.yaml
  - sdl/nfr.sdl.yaml
  # v1.1 additions:
  - sdl/contracts.sdl.yaml
  - sdl/domain.sdl.yaml
  - sdl/features.sdl.yaml
  - sdl/compliance.sdl.yaml
  - sdl/slos.sdl.yaml
  - sdl/resilience.sdl.yaml
  - sdl/costs.sdl.yaml
  - sdl/backup-dr.sdl.yaml
  - sdl/design.sdl.yaml
```

---

## Version Strategy

- **v0.1** — Core architecture (lightweight, fast)
- **v1.1** — Complete specification (production-grade)
- **Future**: v1.2+ for cloud-native (Kubernetes), distributed tracing, event sourcing

