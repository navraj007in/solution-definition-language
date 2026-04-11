# SDL Generators Reference

SDL generators produce deterministic output files from an SDL document. Same input always produces identical output.

This reference distinguishes between:

- registry-backed artifact types usable via `generate()` and `generateAll()`
- direct generator APIs exported by the package but not part of the `ArtifactType` registry

For the canonical artifact naming table, see [`canonical-contract.md`](canonical-contract.md).

## Registry-Backed Artifact Types

| Generator | Artifact Type | Output Files | SDL Sections Consumed |
|---|---|---|---|
| Architecture Diagram | `architecture-diagram` | Mermaid architecture diagram | architecture, data, auth |
| Repo Scaffold | `repo-scaffold` | Starter app structure and config files | architecture, data, auth, deployment |
| IaC Skeleton | `iac-skeleton` | CI/CD pipeline plus infrastructure skeleton files | deployment, architecture.projects, testing |
| ADR | `adr` | Architecture decision records in Markdown | architecture, data, auth, deployment |
| OpenAPI | `openapi` | OpenAPI 3.1 YAML spec | architecture.projects, auth, product, domain |
| Data Model | `data-model` | ORM schemas and ERD output | data, domain, architecture.projects |
| Sequence Diagrams | `sequence-diagrams` | Mermaid sequence diagrams | product, architecture, auth |
| Backlog | `backlog` | Markdown backlog and stories | product, architecture, auth, integrations |
| Deployment Guide | `deployment-guide` | Step-by-step deployment instructions | deployment, architecture.projects, data |
| Cost Estimate | `cost-estimate` | Infrastructure cost breakdown | data, deployment, integrations, auth |
| Coding Rules | `coding-rules` | CLAUDE.md, Cursor, Copilot, Aider rules | Most SDL sections |
| Coding Rules Enforcement | `coding-rules-enforcement` | Lint, architecture test, and CI enforcement files | architecture, data, auth, testing |

## Direct Generator APIs

These generators are exported directly by the package and are not currently addressable through the `ArtifactType` registry:

| Generator API | Typical Output Files | SDL Sections Consumed |
|---|---|---|
| `generateDockerCompose()` | `artifacts/docker/docker-compose.yml` | architecture.projects, data, deployment |
| `generateKubernetes()` | Kubernetes manifest files | architecture.projects, data, deployment, nonFunctional |
| `generateMonitoring()` | Prometheus, alert rules, Grafana dashboard | observability, architecture.projects |
| `generateNginxConfig()` | `artifacts/nginx/nginx.conf` | architecture.projects |
| `generateDeployDiagram()` | deployment diagram file | deployment, architecture.projects |

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
} from '@arch0/sdl';

const { data } = parse(yamlString);
const { valid } = validate(data);
const normalized = normalize(data);

// Registry-backed artifact
const result = generate(normalized, 'architecture-diagram');
// result.files = [{ path: 'artifacts/architecture/architecture.mmd', content: '...' }, ...]

// All registry-backed artifacts listed in doc.artifacts.generate
const all = generateAll(normalized);
// all = { results: [...], skipped: [...] }

// Direct generator API
const compose = generateDockerCompose(normalized);
// compose.files = [{ path: 'artifacts/docker/docker-compose.yml', content: '...' }, ...]
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

## Coding Rules Detail

The coding rules generator produces framework-aware rules covering 27+ categories:

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

Hard gates generated from SDL:

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
