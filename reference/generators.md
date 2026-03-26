# SDL Generators Reference

SDL generators produce deterministic output files from an SDL document. Same input always produces identical output.

## Generator List

| Generator | Artifact Type | Output Files | SDL Sections Consumed |
|---|---|---|---|
| Docker Compose | `docker-compose` | `docker-compose.yml`, `docker-compose.dev.yml` | architecture.projects, data, deployment |
| Kubernetes | `kubernetes` | Deployments, Services, Ingress, ConfigMaps per environment | architecture.projects, data, deployment, nonFunctional |
| Terraform | `terraform` | Modular `.tf` files (compute, database, networking, IAM) | architecture.projects, data, deployment, auth |
| Nginx | `nginx` | `nginx.conf` with reverse proxy and upstream configs | architecture.projects |
| CI/CD | `ci-cd` | GitHub Actions, GitLab CI, or Jenkins pipeline files | deployment.ciCd, architecture.projects, testing |
| Coding Rules | `coding-rules` | CLAUDE.md, .cursor/rules/architecture.mdc, .github/copilot-instructions.md, .aider/conventions.md | All sections |
| Coding Rules Enforcement | `coding-rules-enforcement` | ESLint, Ruff, golangci-lint configs, architecture tests, CI gate | architecture, data, auth, testing |
| OpenAPI | `openapi` | OpenAPI 3.1 YAML spec | architecture.projects (endpoints) |
| Data Model | `data-model` | ORM schemas (Prisma, Drizzle, SQLAlchemy, Mongoose) | data, architecture.projects (ORM choice) |
| Deployment Diagram | `deploy-diagram` | Mermaid deployment diagram | deployment, architecture.projects |
| Monitoring | `monitoring` | Observability config (Prometheus, Grafana, alerts) | observability, architecture.projects |
| ADR Rules | `adr-rules` | Architecture decision enforcement rules | ADR files (MADR format) |
| Cost Estimate | `cost-estimate` | Infrastructure cost breakdown | data, deployment, integrations, auth |
| Backlog | `backlog` | Sprint plan with user stories | architecture.projects, product.features |
| Deployment Guide | `deployment-guide` | Step-by-step deployment instructions | deployment, architecture.projects |
| Sequence Diagrams | `sequence-diagrams` | Mermaid sequence diagrams per API endpoint | architecture.projects (endpoints) |

## Usage

### Via npm package

```typescript
import { parse, validate, normalize, generate, generateAll } from '@arch0/sdl';

const { data } = parse(yamlString);
const { valid } = validate(data);
const normalized = normalize(data);

// Single generator
const result = generate(normalized, 'docker-compose');
// result.files = [{ path: 'docker-compose.yml', content: '...' }, ...]

// All generators
const all = generateAll(normalized);
// all = [{ artifactType: 'docker-compose', files: [...] }, ...]
```

### Via API

```
POST /api/sdl/generate
Body: { sdl: "<yaml string>", artifactType?: "docker-compose" }
```

### Via CLI

```bash
arch0 generate solution.sdl.yaml --artifact docker-compose --output ./infra/
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
