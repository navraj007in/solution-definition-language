# Changelog

## v0.1.0 — March 2026

### Initial Release

**Core Schema:**
- `solution` — project identity, stage, team size
- `product` — personas, features, MVP scope
- `architecture` — style, projects (backend/frontend/mobile), shared types
- `data` — primary database, secondary databases, cache, queues, search, storage
- `auth` — strategy, providers, MFA, RBAC
- `integrations` — third-party services with purpose and tier
- `nonFunctional` — performance, security, availability requirements
- `deployment` — cloud provider, CI/CD, containerization
- `constraints` — budget, timeline, team composition
- `testing` — strategy, coverage targets, frameworks
- `observability` — logging, monitoring, tracing, alerting
- `techDebt` — known debt items with severity and remediation plan
- `evolution` — future phases with triggers and requirements
- `artifacts` — generation control for output types

**Validation:**
- JSON Schema (draft-07) validation
- 5 conditional validation rules
- 15 normalization/auto-inference rules
- 4 warning detection rules
- Human-readable error messages with fix suggestions

**Multi-File Support:**
- `imports` array for modular SDL files
- Automatic merge with deep object merging and array concatenation
- Circular dependency detection

**Generators (16):**
- Docker Compose, Kubernetes, Terraform, Nginx
- CI/CD (GitHub Actions, GitLab CI, Jenkins)
- Coding rules (CLAUDE.md, .cursorrules, copilot-instructions.md, .aider/conventions.md)
- Coding rules enforcement (ESLint, Ruff, golangci-lint, architecture tests)
- OpenAPI, data model, deployment diagram, monitoring
- ADR rules, cost estimate, backlog, deployment guide

**Templates (12):**
- SaaS Starter, E-Commerce, Marketplace, Mobile App API
- AI Chat App, Internal Tool, API Only, Event-Driven Microservices
- Real-Time Collaboration, Admin Dashboard, Landing Page, Portfolio Blog

### Planned for v0.2

- `design` section — visual design language (tokens, palette, typography)
- `environments` section — runtime environment definitions
- `interServiceCommunication` section — service-to-service patterns
- `configuration` section — config management strategy
- `errorHandling` section — error handling patterns
