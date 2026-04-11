# SDL Generators Reference

SDL generators produce output files from an SDL document. Every `GeneratorResult` carries a `tier` field that signals the confidence level of the output.

This reference distinguishes between:

- registry-backed artifact types usable via `generate()` and `generateAll()`
- direct generator APIs exported by the package but not part of the `ArtifactType` registry

For the canonical artifact naming table, see [`canonical-contract.md`](canonical-contract.md).

## Generator Tiers

Every generator result includes a `tier` field:

| Tier | Meaning | Review required? |
|---|---|---|
| `deterministic` | Correct by construction from SDL facts. Same input always produces identical output. | No — safe to consume directly in CI or tooling |
| `inferred` | Derived from SDL facts via heuristics. Structurally sound, but conventions and severity choices may need adjustment. | Recommended — worth a review before committing |
| `advisory` | Starting point only. Useful scaffold, not a deliverable. | Yes — always review and edit before use |

## Registry-Backed Artifact Types

| Generator | Artifact Type | Tier | Output Files | SDL Sections Consumed |
|---|---|---|---|---|
| Architecture Diagram | `architecture-diagram` | `deterministic` | Mermaid architecture diagram | architecture, data, auth |
| Repo Scaffold | `repo-scaffold` | `deterministic` | Starter app structure and config files | architecture, data, auth, deployment |
| IaC Skeleton | `iac-skeleton` | `deterministic` | CI/CD pipeline plus infrastructure skeleton files | deployment, architecture.projects, testing |
| OpenAPI | `openapi` | `deterministic` | OpenAPI 3.1 YAML spec | architecture.projects, auth, product |
| Data Model | `data-model` | `deterministic` | ORM schemas and ERD output | data, architecture.projects, auth |
| Sequence Diagrams | `sequence-diagrams` | `deterministic` | Mermaid sequence diagrams | product, architecture, auth, data |
| Coding Rules | `coding-rules` | `inferred` | CLAUDE.md, Cursor, Copilot, Aider rules | Most SDL sections |
| Coding Rules Enforcement | `coding-rules-enforcement` | `inferred` | Lint, architecture test, and CI enforcement files | architecture, data, auth, testing |
| ADR | `adr` | `advisory` | Architecture decision records in Markdown | architecture, data, auth, deployment |
| Backlog | `backlog` | `advisory` | Markdown backlog and stories | product, architecture, auth, integrations |
| Deployment Guide | `deployment-guide` | `advisory` | Step-by-step deployment instructions | deployment, architecture.projects, data |
| Cost Estimate | `cost-estimate` | `advisory` | Infrastructure cost breakdown | data, deployment, integrations, auth |
| Compliance Checklist | `compliance-checklist` | `advisory` | Per-framework compliance checklist in Markdown | compliance |

## Direct Generator APIs

These generators are exported directly by the package and are not addressable through the `ArtifactType` registry. All are `deterministic`.

| Generator API | Tier | Typical Output Files | SDL Sections Consumed |
|---|---|---|---|
| `generateDockerCompose()` | `deterministic` | `artifacts/docker/docker-compose.yml` | architecture.projects, data, deployment |
| `generateKubernetes()` | `deterministic` | Kubernetes manifest files | architecture.projects, data, deployment, nonFunctional |
| `generateMonitoring()` | `deterministic` | Prometheus, alert rules, Grafana dashboard | observability, slos, architecture.projects |
| `generateNginxConfig()` | `deterministic` | `artifacts/nginx/nginx.conf` | architecture.projects |
| `generateDeployDiagram()` | `deterministic` | Deployment diagram file | deployment, architecture.projects |

## Utility Exports

These functions are exported for use by CLI tools and consumers.

| Export | Purpose |
|---|---|
| `summarizeGenerationResults(results)` | Returns a formatted tier breakdown string for CLI output — shows deterministic / inferred / advisory counts with review guidance |
| `getGeneratorTier(artifactType)` | Returns the tier for a registry artifact type without generating |
| `getImplementedArtifactTypes()` | Returns the list of registry-backed artifact types |

## Migration

`migrate(yamlString)` detects stale or invalid SDL patterns and returns a corrected document with a list of changes made. Handles all known legacy vocabulary from v0.1 and early v1.1 examples.

```typescript
import { migrate } from '@arch0/sdl';

const result = migrate(oldYaml);
// result.clean        — true if no changes were needed
// result.changes      — [{ path, from, to, reason }]
// result.document     — corrected plain object (serialize with yaml.stringify)
// result.compilesClean — true if migrated doc passes compile()
// result.remainingErrors — validation errors not fixed by migration
```

Migration cases handled:
- `stage: mvp` → `stage: MVP` (and growth → Growth, enterprise → Enterprise)
- `framework: express` → `framework: nodejs`
- `framework: next` → `framework: nextjs`
- `framework: fastapi` → `framework: python-fastapi`
- `auth.strategy: jwt` → `auth.strategy: oidc` + `auth.sessions.accessToken: jwt` + `auth.provider: custom`
- `contracts: [...]` → `contracts: { apis: [...] }`
- `features: { phase1: [...] }` → `features: [...]` with `x-phase` annotation
- `slos: [...]` → `slos: { services: [...] }`
- Unknown root keys without `x-` prefix → prefixed with `x-`

## Usage

### Via npm package

```typescript
import {
  parse,
  validate,
  normalize,
  generate,
  generateAll,
  generateDockerCompose,
  getGeneratorTier,
} from '@arch0/sdl';

const { data } = parse(yamlString);
const { valid } = validate(data);
const normalized = normalize(data);

// Registry-backed artifact — result always includes tier
const result = generate(normalized, 'openapi');
console.log(result.tier);   // 'deterministic'
console.log(result.files);  // [{ path: 'artifacts/api/openapi.yaml', content: '...' }]

// All registry-backed artifacts listed in doc.artifacts.generate
const all = generateAll(normalized);
// all.results — each result has tier set
// Filter by tier
const safe = all.results.filter(r => r.tier === 'deterministic');
const drafts = all.results.filter(r => r.tier === 'advisory');

// Direct generator API — also carries tier
const compose = generateDockerCompose(normalized);
console.log(compose.tier);  // 'deterministic'

// Look up tier without generating
const tier = getGeneratorTier('cost-estimate');  // 'advisory'
```

### Via API

```
POST /api/sdl/generate
Body: { sdl: "<yaml string>", artifactType?: "architecture-diagram" }
```

### Via CLI

```bash
arch0 generate solution.sdl.yaml --artifact architecture-diagram --output ./artifacts/
```

## Advisory Output Guidance

`adr`, `backlog`, `cost-estimate`, and `deployment-guide` are generated as useful starting points — not finished deliverables.

**ADR** — generates decision records for architectural choices already captured in SDL. The structure and decision statement are correct, but consequences, alternatives considered, and team context require human authoring.

**Backlog** — generates user stories from personas and core flows. Stories are plausible and properly formatted but not prioritised or estimated. Treat as a first draft for team refinement.

**Cost Estimate** — produces rough monthly infrastructure estimates from cloud and stack choice. Not a quote. Actual costs depend on traffic patterns, reserved capacity, support tier, and negotiated rates.

**Deployment Guide** — produces step-by-step deployment instructions derived from SDL deployment config. Correct in structure but will need environment-specific values, secrets management details, and runbook context that SDL does not capture.

## Coding Rules Detail

The coding rules generator (`inferred`) produces framework-aware rules covering 27+ categories:

- Architecture boundaries and service isolation
- File structure and naming conventions
- Data access patterns and ORM rules
- API design conventions
- Authentication provider-specific rules
- Error handling patterns
- Integration patterns
- Testing strategy
- Observability rules
- Security checklist
- Code quality (SOLID, DRY, SRP)
- Design patterns per framework
- Performance patterns
- Import organization
- Resilience patterns
- Input validation
- Concurrency safety
- Configuration management
- Migration safety
- Git workflow conventions

Rules are tailored per runtime: Node.js, Python, Go, .NET, Java, Rust, Ruby, PHP.

Per-component rules are generated at each component's `path` from the SDL for multi-repo support.

## Coding Rules Enforcement Detail

Hard gates generated from SDL (`inferred` — review rule severity before committing to CI):

| Tool | Language | What It Enforces |
|---|---|---|
| `.eslintrc.sdl.js` | TypeScript/JS | 20+ architecture rules |
| `pyproject.sdl.toml` | Python | Ruff + Mypy + pytest coverage |
| `.golangci.sdl.yml` | Go | 16+ linter rules with complexity limits |
| `.dependency-cruiser.sdl.cjs` | TypeScript/JS | Module boundary enforcement |
| `.lintstagedrc.sdl.json` | All | Pre-commit hook commands |
| `.husky/pre-commit` | All | Git pre-commit hook |
| `__tests__/architecture.sdl.test.ts` | TypeScript | Conformance tests |
| `ArchitectureTest.java` | Java | ArchUnit tests |
| `ArchitectureTests.cs` | .NET | NetArchTest tests |
| `enforce-architecture.yml` | All | CI gate workflow |
