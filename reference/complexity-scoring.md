# SDL Complexity Scoring Specification

**Version:** 1.0.0  
**Date:** April 2026  
**Status:** Released  
**Author:** SDL Discovery Agent Research + Community Review  

> 👉 **New to complexity scoring?** Start with the **[Complexity Scoring Guide](COMPLEXITY_GUIDE.md)** for a user-friendly introduction. This document covers the technical details, formulas, and thresholds.

---

## Executive Summary

This specification explains **why your system is hard** by measuring software architecture complexity and delivery burden across six observable dimensions.

**Core insight:** Architecture and delivery burden are orthogonal. A simple system can be operationally immature, and a complex system can be operationally mature. Understanding both is what drives real insights.

**Two primary indices:**
1. **Architecture Complexity Index** — What makes the system hard to understand and reason about?
2. **Delivery Burden Index** — What makes it hard to operate and scale safely?

Each dimension includes:
- Observable score (1-10)
- Confidence level (high/medium/low)
- Evidence basis (what was discovered)

**Optional unified score** for dashboard summaries, but always report both indices.

---

## Table of Contents

1. [Architecture Complexity Index](#architecture-complexity-index)
2. [Delivery Burden Index](#delivery-burden-index)
3. [Confidence & Evidence](#confidence--evidence)
4. [Unified Executive Score (Optional Dashboard View)](#unified-executive-score-optional-dashboard-view)
5. [NASA SCM Integration (Refined)](#nasa-scm-integration-refined)
6. [Configurable Profiles](#configurable-profiles)
7. [SDL Schema](#sdl-schema)
8. [Examples](#examples)
9. [Known Limitations](#known-limitations)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Architecture Complexity Index

**Question:** How hard is it to understand, reason about, and modify this system?

This index measures what's **inherent to the system design itself**, independent of team maturity or tooling.

### Dimension 1: Structural Complexity

**What:** The shape of the architecture — how many pieces and how they connect, with emphasis on **coupling density**, not just size.

**Key principle:** A large loosely-coupled system is simpler than a small tightly-coupled one.

**Observable factors:**
- Number of services/components (N from NASA SCM)
- Number of connections between them (I from NASA SCM)
- **Coupling density** (new) — average dependencies per service
  - Example: 18 services with 45 interactions = 2.5 avg deps/service (moderate)
  - Example: 8 services with 35 interactions = 4.4 avg deps/service (very high)
- **Critical path depth** (new) — longest dependency chain
  - Example: A → B → C → D (depth 3) is harder to change than A → B (depth 1)
- **Fan-in / Fan-out** (new) — services with high incoming or outgoing dependencies
  - High fan-in (many services depend on this): risk concentration
  - High fan-out (this service depends on many): wide blast radius for changes
- Depth of the call stack (synchronous depth)
- Deployment targets (how many distinct runtimes)
- Data store types (polyglot persistence)

**Scoring (1-10):**

| Score | Profile | Coupling Density | Critical Depth | Notes |
|-------|---------|------------------|------------------|-------|
| 1-2 | Monolith or 2-3 services | <1.0 deps/service | 1-2 | Single deployment, single DB |
| 3-4 | Monolith + 2-4 services | 1.0-1.5 deps/service | 2-3 | Low coupling, independent pieces |
| 5-6 | 5-10 services | 1.5-2.5 deps/service | 3-4 | Moderate connectivity, manageable |
| 7-8 | 15-25 services | 2.5-4.0 deps/service | 4-5 | Dense interaction, hard to trace |
| 9-10 | 30+ services OR heavy coupling | >4.0 deps/service | 5+ | Highly interconnected, fragile |

**Why it matters:**
- More nodes = more failure points
- Higher coupling = harder to understand impact of changes
- Longer critical paths = slower debugging and deployment
- High fan-in services = bottlenecks and risk concentration

**Evidence basis:**
- Service inventory with dependency edges
- Interaction patterns from code and config (direct measurement, not inference)
- Deployment manifests
- Database enumeration

**Confidence typically:** HIGH (directly discoverable via code analysis)

---

### Dimension 2: Dynamic Complexity

**What:** How hard is it to reason about **runtime behavior** given the architecture?

This is where async, eventual consistency, real-time requirements, and distributed state create subtle reasoning burden. A system can be structurally simple but dynamically complex.

**Key principle:** Async is not simpler. It's decoupled structurally but harder to reason about at runtime.

**Observable factors — now explicitly separated:**

#### 2a: Temporal Complexity
- Async patterns (queues, events, workflows)
- Timing-dependent logic (retries with backoff, timeouts, throttling)
- State expiration (TTLs, cache invalidation)
- Event ordering requirements
- Delay-sensitive business logic

#### 2b: State Complexity
- Distributed state (shared cache, distributed locks)
- Eventual consistency windows (how long before data syncs?)
- State divergence risks (when can replicas disagree?)
- Saga patterns (multi-step transactions, compensation)
- State reconciliation complexity

#### 2c: Consistency Model
- Strong consistency (single source of truth, immediate)
- Eventual consistency (eventual sync, temporary divergence)
- Causal consistency (ordering guarantees)
- Weak consistency (anything goes)

**Scoring (1-10):**

| Score | Temporal | State | Consistency | Example |
|-------|----------|-------|-------------|---------|
| 1-2 | Sync only | Single source | Strong | REST API, transactional DB |
| 3-4 | Some async (isolated) | Mostly single-source | Strong | Email queue, not critical path |
| 5-6 | Heavy async, event-driven | Distributed cache | Eventual | Publish/subscribe, async notifications |
| 7-8 | Complex timing (retries, sagas) | Complex distributed state | Eventual + compensation | Saga transactions, eventual with rollback |
| 9-10 | Consensus, choreography | Byzantine state | Weak/consensus | Blockchain-like, CRDT replication |

**Why it matters:**
- Async = harder to trace execution
- Distributed state = harder to reproduce failures
- Eventual consistency = window for bugs, must understand sync delays
- Timeouts and retries = exponential complexity in debugging

**Key distinction from structural complexity:**
- A structurally simple async system (score 7) is harder to debug than a structurally large synchronous system (score 3)
- This dimension captures **runtime reasoning burden**, not just architecture

**Evidence basis:**
- Queue/event patterns in code
- Message broker config
- Eventual consistency documentation
- Timeout/retry logic enumeration
- Database replication setup
- WebSocket/streaming endpoints

**Confidence typically:** MEDIUM-HIGH (patterns are observable, but reasoning complexity is partially subjective)

---

### Dimension 3: Integration Complexity

**What:** How many external systems does the solution depend on, and what's the failure impact?

**Key principle:** Integration danger isn't just about count — it's about blast radius.

**Observable factors:**
- Number of third-party integrations
- Criticality of each (payment processing vs. analytics)
- Integration type (simple REST vs. complex SDK vs. embedded)
- SLA dependency (if service X goes down, are we down?)
- Rate limits and quotas (do they constrain our growth?)
- Data synchronization requirements (real-time sync vs. eventual)
- Vendor lock-in level
- **Failure isolation** (new) — circuit breakers, fallbacks, graceful degradation
  - Does this integration have a circuit breaker?
  - What's the fallback if it fails? (return cached data, skip feature, queue for retry, fail hard?)
  - Can we degrade gracefully?
- **Blast radius** (new) — what happens if this integration fails?
  - Does it take down the entire system? (blast radius = critical)
  - Does it degrade specific features? (blast radius = moderate)
  - Is it non-blocking with fallback? (blast radius = low)

**Scoring (1-10):**

| Score | Count | Critical Integrations | Failure Isolation | Blast Radius | Notes |
|-------|-------|----------------------|-------------------|--------------|-------|
| 1-2 | 0-2 | None | N/A | All isolated | Non-critical integrations only |
| 3-4 | 2-5 | 1 | Partial (1-2 with fallback) | Limited | Some fallback strategies |
| 5-6 | 5-10 | 2-3 | Partial (circuit breakers for some) | Moderate | Some critical paths, some protection |
| 7-8 | 10-15 | 3-5+ | Limited (few with fallback) | High | Multiple critical, few safeguards |
| 9-10 | 15+ | 5+ | None (no circuit breakers) | Critical cascades | Tightly coupled, cascading failures |

**Why it matters:**
- Each integration = potential outage vector
- Rate limits = scaling blocker
- Vendor lock-in = portability cost
- **Failure isolation = risk mitigation**
- Missing circuit breakers = cascading failure risk
- No fallback = customers down when partner is down

**Evidence basis:**
- SDK imports in package manifests
- Third-party API calls in code
- Environment variables for API keys
- Deployment configs referencing external services
- Circuit breaker library presence (resilience4j, polly, opossum, hystrix)
- Fallback logic in code (cached responses, feature flags, graceful degradation)
- Health checks for external dependencies

**Confidence typically:** HIGH (integrations are discoverable; fallback strategies can be inferred from code)

---

### Dimension 4: Technology Complexity

**What:** How diverse, immature, or fragmented is the tech stack?

**Observable factors:**
- Number of programming languages in use
- Number of frameworks/runtimes (does each service use a different framework?)
- Maturity of each (established vs. bleeding-edge)
- Polyglot persistence (SQL, NoSQL, graph, time-series, all mixed)
- Version fragmentation (multiple Node versions, Python 2 vs 3)
- Custom tooling (homegrown frameworks vs. standard libraries)

**Scoring (1-10):**

| Score | Languages | Frameworks | DB Types | Maturity | Version Drift |
|-------|-----------|-----------|----------|----------|---------------|
| 1-2 | 1 | 1 | 1 | All established | Current versions |
| 3-4 | 2 | 2 | 2 | Mostly established | Minor drift |
| 5-6 | 3+ | 3+ | 3+ | Mix of mature/newer | Some outdated |
| 7-8 | 5+ | 5+ | 4+ | Several bleeding-edge | Significant drift |
| 9-10 | 7+ | 7+ | 5+ | Many experimental | Major version gaps |

**Why it matters:**
- Each language = hiring challenge
- Context switching = cognitive load
- Immature tech = unexpected issues and early obsolescence
- Maintenance burden grows with diversity
- Version fragmentation = inconsistent security patches

**Evidence basis:**
- Language detection from package manifests (package.json, go.mod, Cargo.toml, etc.)
- Framework dependencies
- Version scanning
- Custom utilities/frameworks in codebase

**Confidence typically:** HIGH (dependencies are directly discoverable)

---

## Delivery Burden Index

**Question:** How much operational effort and organizational coordination is required to safely ship and operate this system?

This index measures **delivery friction, operational maturity, and coordination burden**. A system can be architecturally simple but operationally immature (high burden).

### Dimension 5: Delivery Burden (Operational)

**What:** How hard is it to deploy, monitor, and maintain?

This measures **the burden placed on operations and SRE teams**, not the inherent complexity of running the system.

**Observable factors:**
- CI/CD maturity (manual → fully automated)
- Infrastructure as Code (none, partial, full)
- Observability (logging, metrics, distributed tracing)
- Secrets management (env vars, vault, HSM)
- Backup & DR strategy (none, documented, tested, automated)
- Number of environments (dev/staging/prod, plus regional)
- Deployment frequency (how often can we safely ship?)
- On-call burden (MTTR, mean time to recovery)

**Scoring (1-10):**

| Score | CI/CD | IaC | Observability | Secrets | DR | Deployment Freq |
|-------|-------|-----|---|---------|----|----|
| 1-2 | Full auto | Full | Comprehensive (logs/metrics/traces) | Vault/HSM | Tested, automated | Daily+ |
| 3-4 | Mostly auto | Partial | Good (logs/metrics) | Vault | Documented | 2-3x/week |
| 5-6 | Manual gates | Basic | Basic logging | Env vars | Partial | Weekly |
| 7-8 | Mostly manual | Ad-hoc | Sparse | Env vars | Undocumented | Monthly |
| 9-10 | Fully manual | None | No observability | Hardcoded | None | Rare |

**Why it matters:**
- Low maturity = high on-call burden and context switching
- Low maturity = long MTTR (mean time to recovery)
- Low maturity = prevents scaling (can't safely add services)
- Low maturity = slow onboarding (new engineers need tribal knowledge)
- Good observability = fast diagnosis and recovery

**Key distinction:**
- This measures **operational readiness**, not system difficulty
- A structurally complex system with great automation scores *lower* than a simple system with manual deployments

**Evidence basis:**
- GitHub Actions / GitLab CI / Azure DevOps presence
- Terraform / CloudFormation / Bicep files
- ELK / Prometheus / DataDog / Jaeger config
- Health check endpoints
- Backup policies
- Deployment scripts and infrastructure

**Confidence typically:** MEDIUM (some automation is directly observable, but maturity requires deeper investigation)

---

### Dimension 6: Organizational Complexity

**What:** How many teams and handoff points are needed to deliver and operate this system?

This captures **Conway's Law**: organization structure mirrors code structure.

**Important caveat:** This dimension is **hard to auto-discover accurately**. Auto-discovered scores will have **LOW confidence** and must be validated by the architecture team.

**Observable factors (with confidence caveats):**
- Number of services per team (ideal: 1-3 services per engineer) — *inferred, not observed*
- Cross-team dependencies — *observable in code, but impact depends on team structure*
- Knowledge silos — *inferred from code complexity, not reliable*
- Ownership clarity — *observable if CODEOWNERS file exists; otherwise unknown*
- Synchronization overhead — *inferred; actual overhead depends on team culture*
- Hiring burden — *inferred from tech diversity, but depends on labor market*

**Scoring (1-10):**

| Score | Teams Est. | Services/Team | Cross-team Deps | Ownership | Notes |
|-------|-----------|-----------------|-----------------|-----------|-------|
| 1-2 | 1 | 1 per person | None | Clear | Single team, single repo |
| 3-4 | 2 | 3-5 per person | Minimal | Clear | 2 teams, clear boundaries |
| 5-6 | 3-5 | 2-3 per person | Moderate | Partial | Moderate coordination needed |
| 7-8 | 5-10 | 2+ per person | Heavy | Unclear | Complex dependency graph |
| 9-10 | 10+ | 1-2 per person | Chaotic | Missing | Major silos, 50% on coordination |

**Why it matters:**
- More teams = more communication overhead
- Cross-team dependencies = slower delivery (need coordination)
- Silos = bugs that cross team boundaries
- Coordination cost grows **super-linearly** (10th team is much harder than 2nd)

**Scoring guidance:**

For auto-discovery, use this formula with **LOW confidence**:

```
estimated_teams = max(1, ceil(num_services / 3.5))
  # Assumes ideal 3-5 services per engineer
  
cross_team_deps = count(service_A → service_B where A and B are independent)
  # From code analysis

org_score = 2 + (teams * 1.0) + (cross_team_deps * 0.5)
  # Then normalize to 1-10

CONFIDENCE: LOW
REASON: Organization structure is not in code. Actual impact depends on:
  - Team skill level and autonomy
  - Communication tools and culture
  - Hiring and retention
  - Service ownership clarity
```

**Better approach:** Include org complexity as **user-input-enhanced**:

```yaml
organizational:
  score: 6.5
  confidence: low
  auto_estimated: true
  estimated_from: "18 services → ~5 teams, 45 cross-service deps"
  requires_validation: true
  
  # User can override with actual data
  override:
    actual_teams: 4  # "We have 4 teams, not 5"
    score: 5.5       # "Coordination is better than code suggests"
    confidence: high
```

**Evidence basis:**
- Service count (infer teams as N/3.5)
- Ownership files (CODEOWNERS, team assignments) — if present
- Service dependencies (cross-team calls)
- Git patterns (code change velocity by service)

**Confidence typically:** LOW (auto-discovered); HIGH (if provided by team)

---

## Confidence & Evidence

**Every dimension includes three fields:**

```yaml
dimensions:
  dynamic:
    score: 7.5                          # 1-10
    confidence: medium                  # high | medium | low
    evidence:                           # What was observed
      - "12 async event patterns found in service-to-service communication"
      - "Socket.io WebSocket state synchronization detected"
      - "No distributed tracing found (MTTR inference: high)"
```

**Confidence interpretation:**

| Level | Meaning | When to trust |
|-------|---------|---|
| **HIGH** | Directly observable in code/config | Always; take action |
| **MEDIUM** | Inferred from multiple signals | Usually; ask clarifying questions |
| **LOW** | Estimated from patterns or assumptions | Validate with team; don't assume |

**Why confidence matters:**
- A score of 7 with HIGH confidence is a different signal than 7 with LOW confidence
- Low-confidence dimensions should be validated by architecture team before acting
- Low confidence is **OK** — it just means "needs human review"

---

## Unified Executive Score (Optional Dashboard View)

For executives and dashboards, optionally show a **single number** combining both indices.

**IMPORTANT:** This is a useful summary, **but always report both indices first**. Unified score masks important distinctions.

### Calculation

```
unified_score = (
  (architecture_index / 10) * 0.60 +   # 60% - what makes system hard to understand
  (delivery_index / 10) * 0.40         # 40% - what makes it hard to operate
)

Result: 1-10 scale
```

**Why these weights:**
- Architecture drives long-term complexity (you live with design for years)
- Delivery burden is important but more addressable (tooling improves faster than refactoring)

### Interpretation

```
1-2:    Simple          MVP, landing page, small team
3-4:    Moderate        Growing SaaS, monolith with good ops
5-6:    Complex         Established product, 5-10 services
7-8:    Very Complex    Mature platform, 15+ services
9-10:   Extreme         Enterprise system, distributed consensus
```

### Presentation

**DO show:**
```
Architecture Complexity Index: 7.2
Delivery Burden Index: 5.8
---
Optional Unified: 6.7 (for dashboard only)
```

**DON'T show:**
```
Complexity Score: 6.7
(This hides the critical breakdown)
```

---

## NASA SCM Integration (Refined)

### System Complexity Metric (SCM) — For Structural Complexity

NASA SCM measures the **structural dimension only**:

```
SCM = N + I_weighted

Where:
  N = Number of major nodes (services, frontends, workers, libs)
  I_weighted = Weighted sum of interactions

Interaction weights:
  - Synchronous (HTTP, gRPC): weight = 1.0
    Reason: Direct dependency, easy to trace but creates coupling
  
  - Asynchronous (queues, events): weight = 0.9
    Reason: Decoupled structurally BUT harder to reason about at runtime
    (not simpler; just different kind of hard)
  
  - Implicit (shared DB, shared cache): weight = 0.7
    Reason: Structurally hidden but creates hidden dependencies
```

**Example: Nexper**

```
N (Nodes):
  - 18 backend services
  - 7 frontend SPAs
  - 1 mobile app
  - 1 shared library
  = 27 nodes

I_weighted (Interactions):
  - 45 HTTP service-to-service calls (45 × 1.0 = 45)
  - 12 async/queue/event interactions (12 × 0.9 = 10.8)
  - 15 implicit DB dependencies (15 × 0.7 = 10.5)
  = 66.3 weighted interactions

SCM = 27 + 66.3 = 93.3
```

### Mapping SCM to Structural Complexity Score

```
SCM 0-10:      structural_score 1-2
SCM 10-30:     structural_score 3-4
SCM 30-70:     structural_score 5-6
SCM 70-150:    structural_score 7-8
SCM 150+:      structural_score 9-10
```

For Nexper: SCM 93.3 → structural_score ≈ 7.5

**Also calculate coupling density:**

```
coupling_density = total_interactions / num_services
                 = 66.3 / 18 = 3.7 avg dependencies per service
```

This reveals: even though Nexper has high SCM, each service only depends on ~3.7 others on average. Compare to a system where a 10-service system with 45 interactions (4.5 avg deps) — *more tightly coupled* despite smaller size.

---

## Configurable Profiles

**Weights should be configurable based on context.** Different organizations care about different dimensions.

### Profile 1: Startup (Speed > Scale)

```yaml
weights:
  architecture_index:
    structural: 0.20
    dynamic: 0.15
    integration: 0.30      # Integration risk is the biggest unknown
    technology: 0.35       # Speed requires flexibility
  
  delivery_index:
    delivery_burden: 0.40  # Speed matters more than ops perfection
    organizational: 0.60   # Org overhead is the scaling limiter
```

**Rationale:** Startups optimize for speed and flexibility. Tech diversity is acceptable if team skill is high. Ops maturity is secondary.

---

### Profile 2: Enterprise Regulated (Safety > Speed)

```yaml
weights:
  architecture_index:
    structural: 0.30
    dynamic: 0.25
    integration: 0.15      # Fewer integrations reduces audit surface
    technology: 0.30       # Avoid unknowns and bleeding-edge
  
  delivery_index:
    delivery_burden: 0.60  # High ops maturity required for compliance
    organizational: 0.40   # Org is established; focus on ops discipline
```

**Rationale:** Enterprise systems must be highly observable, automatable, and auditable. Complexity is tolerated if operations are flawless.

---

### Profile 3: Platform Engineering (Operability > Innovation)

```yaml
weights:
  architecture_index:
    structural: 0.40       # Stable foundations matter; easy for consumers to understand
    dynamic: 0.25
    integration: 0.10      # Platform is insular
    technology: 0.25       # Tech standardization matters for maintainability
  
  delivery_index:
    delivery_burden: 0.70  # Self-service requires flawless ops
    organizational: 0.30   # Teams are stable; ops burden is primary concern
```

**Rationale:** Platforms live or die by operational excellence. A poorly-operated simple platform is worse than a well-operated complex one.

---

## SDL Schema

### YAML Structure

```yaml
sdlVersion: "1.2"

solution:
  name: "Nexper"
  
  # Complexity section
  complexity:
    # Reference profile
    profile: "enterprise"  # startup | enterprise | platform
    
    # ─────────────────────────────────────────────────────
    # LAYER A: ARCHITECTURE COMPLEXITY INDEX
    # ─────────────────────────────────────────────────────
    architecture_index:
      description: "What makes this system hard to understand and reason about?"
      
      # Dimension 1: Structural
      structural:
        score: 7.5
        confidence: high
        evidence:
          - "27 total nodes (18 services, 7 frontends, 1 mobile, 1 library)"
          - "66.3 weighted interactions (45 sync, 12 async, 15 implicit)"
          - "NASA SCM = 93.3"
          - "Coupling density: 3.7 avg dependencies per service (moderate-high)"
          - "Critical path depth: 4 (auth → billing → appointments → notifications)"
          - "Max fan-in: settings service (7 incoming deps) — risk concentration"
        
        breakdown:
          services: 18
          frontends: 7
          mobile: 1
          libraries: 1
          total_nodes: 27
          sync_interactions: 45
          async_interactions: 12
          implicit_dependencies: 15
          nasa_scm: 93.3
          coupling_density: 3.7
          critical_path_depth: 4
          max_fan_in: 7
          max_fan_out: 5
      
      # Dimension 2: Dynamic
      dynamic:
        score: 8.0
        confidence: medium
        
        temporal:
          score: 7.5
          evidence:
            - "12 async queue patterns"
            - "Retry logic with exponential backoff detected"
            - "WebSocket real-time state synchronization"
        
        state:
          score: 8.0
          evidence:
            - "Distributed cache (Redis) shared across services"
            - "Eventual consistency in subscription billing"
            - "No saga compensation patterns detected"
        
        consistency_model:
          score: 8.5
          model: "eventual"
          evidence:
            - "Subscription service uses eventual consistency"
            - "Notification queue has delays (eventual delivery)"
            - "Chat history may lag real-time state"
        
        overall_evidence:
          - "No distributed tracing detected (debugging complexity inferred)"
          - "Heavy async patterns increase reasoning burden"
      
      # Dimension 3: Integration
      integration:
        score: 7.5
        confidence: high
        evidence:
          - "16 external integrations enumerated"
          - "3 critical-path integrations: Stripe (payment), Dyte (video), Cognito (auth)"
          - "4 storage services: Azure Blob, AWS S3, MongoDB, Redis"
        
        failure_isolation:
          score: 6.0  # How well protected?
          evidence:
            - "Stripe has retry logic (not circuit breaker)"
            - "Auth fallback: cached tokens (30min TTL)"
            - "Chat fallback: queue for offline messages"
            - "Missing: circuit breakers for Dyte, Azure services"
        
        integrations:
          total: 16
          
          critical:  # Would take system down if failed
            - name: "Stripe"
              type: "payment"
              blast_radius: "high"
              fallback: "queue for retry, customer can't pay"
              circuit_breaker: false
            
            - name: "Dyte"
              type: "video"
              blast_radius: "medium"
              fallback: "graceful degradation (audio-only)"
              circuit_breaker: false
            
            - name: "AWS Cognito"
              type: "auth"
              blast_radius: "critical"
              fallback: "cached JWT (30min window)"
              circuit_breaker: false
          
          non_critical:  # Degraded but not down
            - "SendGrid, Twilio, Firebase (all have fallbacks)"
      
      # Dimension 4: Technology
      technology:
        score: 6.0
        confidence: high
        evidence:
          - "Single language: TypeScript 5.7-5.9 across all services"
          - "Backend: Express.js 4.21, Mongoose 8.17.0 (all services)"
          - "Frontend: React 18-19, Vite 7, TailwindCSS 3.4"
          - "Mobile: React Native 0.81.5, Expo 54"
          - "4 data store types: MongoDB, Redis, Azure Blob, AWS S3"
        
        breakdown:
          languages: 1       # TypeScript only
          frameworks: 3      # Express, React, React Native
          db_types: 4        # MongoDB, Redis, Blob, S3
          version_drift: 1   # Minimal
      
      # Subtotal
      architecture_subtotal: 7.25  # Average of 4 dimensions
    
    # ─────────────────────────────────────────────────────
    # LAYER B: DELIVERY BURDEN INDEX
    # ─────────────────────────────────────────────────────
    delivery_index:
      description: "What makes it hard to deploy, monitor, and operate at scale?"
      
      # Dimension 5: Delivery Burden (Operational)
      delivery_burden:
        score: 5.0
        confidence: medium
        evidence:
          - "CI/CD: Missing (manual deployments via shell scripts)"
          - "IaC: Missing (no Terraform, CloudFormation)"
          - "Observability: Good logging (Winston), missing metrics/tracing"
          - "Health checks: Basic /health endpoint"
          - "Secrets: .env files (not vault)"
          - "DR: Unclear (no documented plan)"
        
        factors:
          ci_cd: "missing"         # +2.0
          infrastructure_as_code: "missing"   # +1.5
          observability:
            logging: "good"        # -0.5
            metrics: "missing"     # +0.5
            tracing: "missing"     # +1.0
          secrets_mgmt: "env_vars"      # +1.0
          health_checks: "basic"        # +0.5
          backup_dr: "unknown"          # +1.0
      
      # Dimension 6: Organizational
      organizational:
        score: 7.5
        confidence: low
        auto_discovered: true
        requires_validation: true
        
        estimated_from:
          "18 services → ~5 teams (services/3.5)"
          "45 cross-service dependencies → moderate coordination burden"
          "No CODEOWNERS file → ownership unclear"
        
        evidence:
          - "18 services suggest 4-5 teams"
          - "Cross-service dependencies: auth→billing→appointments (chain)"
          - "Chat coordination: relies on settings, comm, auth"
        
        inference_basis: |
          This score is estimated from code structure alone.
          VALIDATION REQUIRED: Ask team about actual org structure,
          hiring, and communication overhead.
        
        override_example: |
          If actual data is available, use this:
          organizational:
            score: 5.5
            confidence: high
            actual_teams: 4
            validation_notes: "Coordination better than code suggests"
      
      # Subtotal
      delivery_subtotal: 6.25  # Average of 2 dimensions
    
    # ─────────────────────────────────────────────────────
    # LAYER C: OPTIONAL — UNIFIED EXECUTIVE SCORE
    # ─────────────────────────────────────────────────────
    executive_summary:
      # ALWAYS SHOW BOTH INDICES FIRST
      architecture_index: 7.25
      delivery_index: 6.25
      
      # Optional unified for dashboard/quick reference only
      unified_score: 6.9  # (7.25 * 0.60) + (6.25 * 0.40)
      level: "very-complex"
      
      interpretation: |
        Nexper is a very complex system driven primarily by architectural 
        decisions (27 nodes, async patterns, 3 critical integrations) rather 
        than operational immaturity.
        
        Key insight: With investments in CI/CD and distributed tracing,
        delivery burden could drop 1-1.5 points. Architecture is "hard by design"
        and will require that complexity.
    
    # ─────────────────────────────────────────────────────
    # REDUCTION PLAN (Prioritized)
    # ─────────────────────────────────────────────────────
    reduction_plan:
      - rank: 1
        title: "Implement CI/CD Pipeline (GitHub Actions)"
        target_dimension: "delivery_burden"
        current_score: 5.0
        target_score: 4.2
        impact: "-0.8 delivery burden, -0.3 unified"
        timeline: "4 weeks"
        effort: "medium"
        business_value: "Automate deployments, reduce human error, enable faster shipping"
        estimated_cost: "$40k"
      
      - rank: 2
        title: "Add Circuit Breakers + Fallbacks (Critical Integrations)"
        target_dimension: "integration"
        current_score: 7.5
        target_score: 6.5
        impact: "-1.0 integration, -0.3 unified"
        timeline: "6 weeks"
        effort: "medium"
        business_value: "Prevent cascading failures from Stripe, Dyte, Cognito outages"
        estimated_cost: "$25k"
      
      - rank: 3
        title: "Add Distributed Tracing (Jaeger + OpenTelemetry)"
        target_dimension: "dynamic"
        current_score: 8.0
        target_score: 7.0
        impact: "-1.0 dynamic, -0.4 unified"
        timeline: "6 weeks"
        effort: "medium"
        business_value: "Reduce MTTR for async issues, improve debuggability"
        estimated_cost: "$30k"
      
      - rank: 4
        title: "Add API Gateway (Kong)"
        target_dimension: "structural"
        current_score: 7.5
        target_score: 6.5
        impact: "-1.0 structural, -0.4 unified"
        timeline: "8 weeks"
        effort: "high"
        business_value: "Consolidate auth, rate-limiting, logging; reduce cross-service concerns"
        estimated_cost: "$80k"
    
    # ─────────────────────────────────────────────────────
    # RISK ASSESSMENT
    # ─────────────────────────────────────────────────────
    risks:
      critical:
        - title: "No distributed tracing"
          dimension: "dynamic"
          impact: "Extremely difficult production debugging for async issues"
          mitigation: "Implement OpenTelemetry + Jaeger"
          probability: "high"
        
        - title: "Missing circuit breakers on critical integrations"
          dimension: "integration"
          impact: "If Stripe/Dyte/Cognito fails, entire system fails"
          mitigation: "Add circuit breakers + fallback strategies"
          probability: "medium"
          frequency: "Stripe SLA 99.5% = ~1.8 hours/year downtime"
      
      high:
        - title: "Manual deployments"
          dimension: "delivery_burden"
          impact: "Configuration drift, human error, slow recovery"
          mitigation: "Implement CI/CD automation"
        
        - title: "Coordination overhead"
          dimension: "organizational"
          impact: "18 services with 5 teams = super-linear coordination cost"
          mitigation: "Clear ownership, API contracts, async-first communication"
    
    # ─────────────────────────────────────────────────────
    # HISTORICAL TRACKING (For Drift Analysis)
    # ─────────────────────────────────────────────────────
    history:
      - date: "2026-04-11"
        architecture_index: 7.25
        delivery_index: 6.25
        unified_score: 6.9
        source: "SDL Discovery Agent v1.0"
        notes: "Baseline discovered. CI/CD investment will improve delivery_index."
```

---

## Examples

### Example 1: Simple SaaS (Architecture: 3.5, Delivery: 3.5, Unified: 3.5)

**Profile:** Startup

```yaml
architecture_index:
  structural: 3.0    # Monolith + 2 services
  dynamic: 2.5       # Mostly synchronous
  integration: 4.5   # Stripe + SendGrid (both non-critical path)
  technology: 3.0    # Node + React
  subtotal: 3.25

delivery_index:
  delivery_burden: 4.0     # Good CI/CD, basic monitoring
  organizational: 3.0      # 2-person team, clear ownership
  subtotal: 3.5

unified: 3.35
```

---

### Example 2: Enterprise Platform (Architecture: 8.5, Delivery: 7.5, Unified: 8.1)

**Profile:** Enterprise

```yaml
architecture_index:
  structural: 8.8    # 40+ services, SCM ≈ 250, coupling ≈ 5.2
  dynamic: 8.5       # Complex workflows, eventual consistency, sagas
  integration: 9.0   # 20+ integrations, multiple critical
  technology: 7.0    # Java, Python, Go, Scala, Kotlin
  subtotal: 8.3

delivery_index:
  delivery_burden: 8.0     # Manual infrastructure, incomplete IaC
  organizational: 7.0      # 8-10 teams, clear boundaries but coordination overhead
  subtotal: 7.5

unified: 8.1
```

---

## Known Limitations

**This model is a heuristic, not a scientific truth.**

### Limitation 1: Organizational Complexity is Hard to Auto-Discover

- Auto-discovered scores for organizational complexity will have **LOW confidence**
- Actual org impact depends on team hiring, culture, communication patterns, and org design
- **Mitigation:** Require team validation; support user-input-enhanced override

### Limitation 2: Weights Are Context-Dependent

- The default weights assume an enterprise SaaS
- Startup, regulated, and platform contexts differ significantly
- **Mitigation:** Use configurable profiles; always document why you weighted them

### Limitation 3: Some Factors Are Subjective

- "Async is harder to reason about" vs "Async is more decoupled" — both true
- Reasonableness of tech diversity depends on hiring market and team skill
- **Mitigation:** Always include evidence and confidence scores; encourage team review

### Limitation 4: Doesn't Measure Everything

- Domain complexity (is this a hard problem?) — not measured
- Team expertise and hiring (can we staff this?) — inferred only
- Market fit and business strategy — out of scope
- **Mitigation:** Use this alongside other architecture reviews

### Limitation 5: Can't Predict Effort Accurately

- Complexity score is **correlative, not predictive**
- A system with score 7 doesn't deterministically take 2x effort of score 4
- **Mitigation:** Use score to identify *where* effort is, not *how much*

### Limitation 6: Integration Fallback Strategies Hard to Detect

- Circuit breakers can be library-level (hard to detect) or architectural (easy to detect)
- Fallback logic might be business-specific (inferred from code, not explicit)
- **Mitigation:** Require team input for accurate blast radius assessment

---

## Implementation Roadmap

### Phase 1: Discovery (April 2026)
- ✅ SDL Discovery Agent extracts all dimensions automatically
- ✅ Calculates both indices + optional unified score
- ✅ Generates reports with evidence and confidence
- ✅ Supports coupling density and critical path depth (structural)
- ✅ Separates temporal, state, consistency (dynamic)
- ✅ Detects circuit breakers and fallback strategies (integration)
- ✅ User-input-enhanced org complexity with validation
- Target: SDL Discovery Agent v1.0 with full schema

### Phase 2: Validation (Q2 2026)
- Test on 5-10 real architectures
- Get feedback from architects on scoring accuracy
- Refine weights based on real data
- Validate circuit breaker detection
- Validate organizational complexity overrides
- Target: Specification validated and proven

### Phase 3: Standardization (Q3 2026)
- Propose to SDL working group
- Integrate into SDL v1.2 spec (optional `x-complexity` extension)
- Add to JSON schema and validator
- Create CLI tool for standalone complexity scoring
- Target: Standardization of complexity scoring in SDL ecosystem

### Phase 4: Advanced Features (Q4 2026+)
- Complexity forecasting (predict score 6 months out)
- Trend analysis (track complexity regression/improvement)
- Comparison tool (benchmark against similar systems)
- AI-driven optimization suggestions
- Integration with cost estimation

---

## Strategic Positioning

**The goal of this specification is not to "calculate complexity" but to explain why your system is hard.**

Key differentiators:

1. **Honest about what we know and don't know** — confidence scores + evidence, not false objectivity
2. **Actionable breakdown** — two indices that reveal different improvement levers
3. **Grounded in observable facts** — not based on vibes or estimates
4. **Failure-aware** — includes integration blast radius, not just count
5. **Team-validated** — supports override with actual org data
6. **Contextual** — different weight profiles for different org types

**Usage statement:**
> This specification helps architecture teams understand the actual sources of complexity in their systems. Use it to identify where effort is concentrated, validate architectural decisions, and plan reduction strategies with stakeholder confidence.

---

## References

### Academic & Standards
- [NASA System Complexity Metric](https://ntrs.nasa.gov/api/citations/20205005154/downloads/%20223%20A%20System%20Complexity%20Metric%20(SCM)%20rev%201.pdf) — Structural complexity foundation
- [NIST Cybersecurity Framework 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) — Maturity tiers (separate from complexity)
- [IEEE - Measuring Enterprise Architecture Complexity](https://ieeexplore.ieee.org/document/8536112/) — Multi-dimensional EA complexity
- [Lehman's Laws of Software Evolution](https://en.wikipedia.org/wiki/Lehman%27s_laws_of_software_evolution) — Complexity growth over time

### Microservices & Distributed Systems
- "Building Microservices" by Sam Newman — Distributed systems complexity
- "The Phoenix Project" by Gene Kim — Operational complexity impact
- "Designing Data-Intensive Applications" by Martin Kleppmann — Consistency complexity
- "Resilience4j Circuit Breaker Pattern" — Failure isolation patterns

---

## FAQ

**Q: Why two indices instead of one score?**  
A: Architectural complexity and delivery burden are orthogonal. Understanding both reveals what actually drives effort. A simple system can be operationally immature, and vice versa.

**Q: Is async really harder to reason about?**  
A: Yes. Async is structurally decoupled but dynamically complex (race conditions, timing). This spec separates temporal, state, and consistency complexity to be precise about *why* it's hard.

**Q: Can I modify the weights?**  
A: Yes. Use profiles (startup/enterprise/platform) or customize for your context. Always document why.

**Q: What's the difference between unified score and the indices?**  
A: Indices show the breakdown (architecture vs. delivery). Unified is a summary for dashboards. Always present indices first.

**Q: Does high complexity mean bad architecture?**  
A: No. Netflix is complex by necessity. The goal is **optimal** complexity — enough for the problem, not more.

**Q: How should I validate organizational complexity?**  
A: Don't rely on auto-discovered scores. Get actual data: number of teams, services per team, cross-team dependencies, ownership clarity. Then override the auto-discovered score with confidence: high.

**Q: How often should I re-score?**  
A: Every major change (new service, platform adoption, CI/CD implementation). Quarterly review recommended.

**Q: Can I compare two architectures?**  
A: Yes, carefully. Always look at the dimensions and evidence, not just the unified score. A 7/10 SaaS is different from a 7/10 financial system.

---

## Version History

- **1.0.0** (April 2026) — Initial release with community refinements
  - Two-layer model: Architecture Complexity Index + Delivery Burden Index
  - Six observable dimensions with confidence scoring
  - Coupling density, critical path depth, fan-in/fan-out analysis for structural complexity
  - Temporal/state/consistency separation in dynamic complexity
  - Integration blast radius with fallback/circuit breaker detection
  - Organizational complexity as user-input-enhanced with low confidence auto-discovery
  - Configurable profiles: startup, enterprise, platform engineering
  - De-emphasized unified score; always show both indices
  - Evidence-based scoring with confidence ratings
  - Strategic positioning: "explain why systems are hard" not "calculate complexity"

---

## Feedback & Contributions

This specification is **refined and production-ready**. Feedback welcome:

- Are the dimensions working in your architecture reviews?
- Is coupling density accurate for your systems?
- Does blast radius detection match reality?
- How do the profiles perform in your context?

Open issues or PRs to evolve this specification collaboratively.

---

**Citation:** This specification is a framework for understanding architecture complexity and delivery burden. It incorporates community review and is designed to explain why systems are hard rather than claiming false objectivity. It can be used as a standalone assessment tool or integrated into SDL documentation.
