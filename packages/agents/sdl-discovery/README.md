# SDL Discovery Agent

Automatically scan code repositories and generate draft **Solution Definition Language (SDL)** specifications from observable architecture evidence.

## Purpose

The SDL Discovery Agent reverse-engineers your software architecture by analyzing:
- Manifests and dependency files
- Infrastructure-as-Code (Terraform, Kubernetes, Docker)
- CI/CD pipelines
- API contracts (OpenAPI, GraphQL)
- Source code entrypoints and patterns
- Configuration files

It produces a **draft SDL v1.1 document** suitable for architecture review, drift detection, and baseline documentation.

## Key Features

✅ **Evidence-Based** — Only asserts what's directly observable in code/config  
✅ **Confidence Scoring** — Marks each inference with high/medium/low confidence  
✅ **Human Review** — Flags ambiguities and conflicts for manual validation  
✅ **Multiple Modes** — Inventory, Discovery, Drift, or Monorepo scanning  
✅ **Structured Output** — Draft SDL, reports, and confidence scores  
✅ **Conservative** — Prefers "unknown" over fabricated certainty  

## Quick Start

### Via Claude Code CLI

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./your-repo-path \
  --output ./architecture-output
```

### Via Cowork Plugin (coming soon)

```
/architect:sdl:discover --repos @your-repos --mode discovery
```

## Scan Modes

### `discovery` (default)
Produce a usable draft SDL with moderate inference and service boundary detection.

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./repo1,./repo2 \
  --mode discovery \
  --output ./architecture-output
```

### `inventory`
Conservative factual listing of detected components, minimal inference.

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./repo \
  --mode inventory \
  --output ./architecture-output
```

### `drift`
Compare current repo evidence against an existing SDL to detect topology changes.

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./repo \
  --existing_sdl ./solution.sdl.yaml \
  --mode drift \
  --output ./architecture-output
```

### `monorepo`
Apply special heuristics for workspace-based monorepos (yarn, pnpm, lerna, gradle).

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./monorepo \
  --mode monorepo \
  --output ./architecture-output
```

## Outputs

The agent produces these files in the output directory:

| File | Purpose |
|------|---------|
| `solution.sdl.yaml` | Root SDL v1.1 document with imports |
| `sdl/*.sdl.yaml` | Modular SDL files (9 files: services, data, auth, integrations, deployment, contracts, artifacts, assumptions, **complexity**) |
| `complexity-report.md` | Human-readable complexity assessment (Architecture Index + Delivery Burden Index) |
| `sdl-discovery-report.md` | Markdown summary for architects (includes Complexity Summary) |
| `confidence-report.json` | Machine-readable confidence scores |
| `unknowns-and-review-items.md` | Human decision checklist |
| `sdl-discovery.json` | Structured scan metadata (includes `complexity_scores`) |

## Complexity Scoring (v1.0)

The agent automatically calculates **Architecture Complexity Index** and **Delivery Burden Index** for your system.

### What's Measured

**Architecture Complexity Index** — How hard is it to understand and reason about the system?
- **Structural:** Node count, interaction density, coupling density, critical path depth
- **Dynamic:** Async patterns, distributed state, consistency model
- **Integration:** External dependency count, blast radius, failure isolation
- **Technology:** Language/framework/database diversity, version fragmentation

**Delivery Burden Index** — How hard is it to operate and scale safely?
- **Operational:** CI/CD maturity, Infrastructure-as-Code, observability (logs/metrics/tracing), secrets management, health checks, backup/DR
- **Organizational:** Team count (estimated), cross-team dependencies, coordination overhead

### Outputs

**`sdl/complexity.sdl.yaml`**
```yaml
complexity:
  profile: startup | enterprise | platform  # auto-detected
  architecture_index: 7.25
  delivery_index: 6.25
  unified_score: 6.9  # optional executive summary
  
  # All 6 dimensions with scores, confidence, evidence, and breakdowns
  # Plus: reduction plan, risk assessment, historical tracking
```

**`complexity-report.md`**
- Both indices prominently displayed
- "Why this system is hard" narrative
- Prioritized reduction plan with effort/cost estimates
- Risk assessment (critical, high impact)
- Guidance on validating organizational complexity (auto-discovered = LOW confidence)

### Profiles

The scoring adapts to your context:
- **Startup:** Emphasizes speed and flexibility
- **Enterprise:** Emphasizes safety and auditability
- **Platform:** Emphasizes operational excellence

### Full Specification

See [reference/complexity-scoring.md](../../reference/complexity-scoring.md) for the complete v1.0 specification with detailed dimensions, confidence model, and reduction strategies.

## What Gets Discovered

The agent identifies and documents:
- **Services** (deployable applications/APIs)
- **Frontends** (web/mobile UIs)
- **Workers** (background jobs, queue consumers)
- **Libraries** (shared code packages)
- **Data Stores** (databases, caches)
- **Messaging** (queues, event systems)
- **External Integrations** (third-party services)
- **Auth** (identity, session, token strategies)
- **Deployment** (cloud, CI/CD, orchestration)
- **Interfaces** (API contracts, protocols)
- **Dependencies** (service-to-service, infrastructure)

## Supported Technologies

### Languages & Frameworks
- **TypeScript/JavaScript** — Node.js, Express, Next.js, React, Angular, Vue, etc.
- **Go** — standard library, Gin, Echo, etc.
- **.NET** — .NET Core, ASP.NET, etc.
- **Python** — FastAPI, Django, Flask, etc.
- **Java/Kotlin** — Spring, Gradle, Maven, etc.
- **Rust** — Cargo ecosystem
- **Ruby** — Rails, Sinatra, etc.

### Deployment & Orchestration
- **Docker** — single container and Compose
- **Kubernetes** — manifests and Helm charts
- **Serverless** — AWS Lambda, Azure Functions, Google Cloud Functions
- **IaC** — Terraform, CloudFormation, Bicep, Pulumi
- **Hosting** — Vercel, Netlify, Fly.io, etc.

### CI/CD
- GitHub Actions
- GitLab CI
- Azure DevOps
- Jenkins
- CircleCI

### APIs & Contracts
- OpenAPI/Swagger
- GraphQL
- gRPC (protobuf)
- AsyncAPI
- REST conventions

### Data & Messaging
- SQL databases (PostgreSQL, MySQL, MariaDB)
- NoSQL (MongoDB, DynamoDB, Firestore)
- Caches (Redis, Memcached)
- Message queues (RabbitMQ, Kafka, SQS, SNS)
- Event streams (Kafka, EventBridge, Pub/Sub)

### Auth
- JWT
- OAuth 2.0 / OpenID Connect
- Auth0, Okta, Cognito, Entra, Firebase
- Custom session management

## Architecture

```
┌─────────────────────────────────────────────┐
│ Claude Code CLI or Cowork Plugin            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ SDL Discovery Agent                         │
│ (System Prompt + Workflow Logic)            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ Evidence Extraction Module                  │
│ • Glob for file discovery                   │
│ • Read manifests & configs                  │
│ • Parse code entrypoints                    │
│ • Index infrastructure                      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ Component Detection Heuristics               │
│ • Service/Frontend/Worker/Library patterns  │
│ • Dependency correlation                    │
│ • Technology stack inference                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ SDL Generation & Confidence Scoring         │
│ • Generate v1.1 YAML                        │
│ • Assign confidence per field               │
│ • Flag review items                         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ Output Writers                              │
│ • draft.sdl.yaml                            │
│ • Reports & metadata                        │
│ • Review checklist                          │
└─────────────────────────────────────────────┘
```

## Confidence Model

The agent assigns confidence levels based on evidence strength:

### High Confidence
Directly evidenced by:
- Deployment manifests (Dockerfile, K8s YAML, terraform)
- Explicit config files (appsettings.json, package.json)
- Code entrypoints (main.go, Program.cs, index.js)
- API contract definitions

**Example:** Service name inferred from deployment manifest = HIGH

### Medium Confidence
Multiple weak signals align:
- SDK package + environment variable + endpoint reference
- Probable service purpose from repo name + routes + README

**Example:** Dependency inferred from package import + config var = MEDIUM

### Low Confidence
Pattern recognition or naming assumptions only:
- Domain ownership guessed from folder names
- Production topology inferred from single README statement
- Service interaction guessed from generic HTTP client

**Example:** Service interaction inferred from naming pattern only = LOW

## Human Review Workflow

The agent flags items requiring human validation:

1. **Review the generated SDL** — Check if inferred architecture matches reality
2. **Address flagged items** — Review unknowns and ambiguities
3. **Validate assumptions** — Confirm inferred dependencies
4. **Merge/rename** — Handle duplicate services or naming conflicts
5. **Commit to git** — Once validated, commit the SDL as source of truth

Example review items:
- "Two repos (auth-service-v1, auth-service) appear to represent the same service"
- "Deployment manifest targets prod, but code looks incomplete"
- "Database type unclear: connection string suggests PostgreSQL, but Mongo SDK is installed"

## Examples

See [examples/discovered-sdls/](../../examples/discovered-sdls/) for generated SDL outputs.

## Limitations

The agent cannot:
- Infer true business intent without documentation
- Detect hidden runtime dependencies not in code/config
- Verify correctness of unused or stale code
- Determine actual runtime topology (requires runtime inspection)
- Handle extremely unconventional project structures well
- Scale to scanning thousands of repos efficiently (designed for org-wide, not cloud-wide)

Always validate generated SDL with your architecture team before using as source of truth.

## Heuristics Reference

See [HEURISTICS.md](./HEURISTICS.md) for detailed component detection rules and signal weights.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Related

- **SDL Specification** — [Solution Definition Language v1.1](../../spec/SDL-v1.1.md)
- **SDL Parser & Validator** — [@arch0/sdl](../sdl/)
- **SDL Playground** — [Interactive SDL editor](../sdl-playground/)

## License

Apache-2.0
