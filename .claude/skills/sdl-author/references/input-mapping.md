# SDL Input Mapping

Use this when converting loose requirements into SDL.

## Fact Extraction

Map input phrases to stable SDL fields only when the meaning is explicit enough:

| Input signal | SDL target |
|---|---|
| Product/app name | `solution.name` |
| One-line purpose | `solution.description` |
| Prototype, MVP, first release | `solution.stage: MVP` |
| Scaling product or established SaaS | `solution.stage: Growth` |
| Regulated, multi-region, audited enterprise system | `solution.stage: Enterprise` |
| Next.js, React app, admin portal | `architecture.projects.frontend[]` |
| API, backend, service, worker | `architecture.projects.backend[]` or `architecture.services[]` |
| React Native, Flutter, iOS, Android | `architecture.projects.mobile[]` |
| PostgreSQL, MongoDB, DynamoDB, SQL Server | `data.primaryDatabase.type` |
| Redis, queue, search, object storage | `data.cache`, `data.queues`, `data.search`, `data.storage` |
| Auth0, Cognito, Entra, Clerk, Supabase auth | `auth.provider` plus `auth.strategy` |
| Stripe, email, SMS, analytics, monitoring, CDN | `integrations` |
| AWS, Azure, GCP, Vercel, Railway, Render | `deployment.cloud` |
| Terraform, Bicep, Pulumi, CDK, CloudFormation | `deployment.infrastructure.iac` |
| GDPR, HIPAA, SOC2, PCI, SOX, ISO27001 | `compliance` or `nonFunctional.compliance` depending on schema support |
| Uptime target, expected users, latency, encryption | `nonFunctional` |
| Personas, core flows, business model | `product` |
| Epics, planned capabilities | `features[]` |
| REST, GraphQL, gRPC, webhook, async API | `contracts.apis[]` |

## Architecture Style Heuristics

- Use `modular-monolith` for a single deployable API/backend with modules, even if it has a separate frontend.
- Use `microservices` only when there are multiple independently deployable backend services.
- Use `serverless` when the primary compute model is functions/serverless services.
- If style is unclear, default to `modular-monolith` and include a review item.

## Conservative Defaults

When the user asks for "a valid SDL" and does not specify details:

- Use `solution.stage: MVP`.
- Use `architecture.style: modular-monolith`.
- Use one backend named `api` when backend behavior is described.
- Use one frontend named `web` when UI behavior is described.
- Use `data.primaryDatabase.type: postgres` and `hosting: managed` only if persistence is clearly required but the database is not named. Otherwise ask or record a review item.

## Review Items

Create review items instead of schema fields when the input lacks:

- exact cloud provider
- exact auth provider
- compliance framework applicability
- uptime target or traffic assumptions
- payment/email/SMS vendor
- service boundaries
- database technology
- API style

Use this style:

```yaml
x-review:
  - topic: deployment cloud
    question: Confirm whether production should target AWS, Azure, GCP, Vercel, Railway, Render, Cloudflare, or fly.io.
```

Only use `x-review` if the user wants review metadata inside the SDL. Otherwise report review items outside the YAML.
