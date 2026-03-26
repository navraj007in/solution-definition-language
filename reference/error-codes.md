# SDL Error Codes

## Parse Errors

| Code | Message | Cause |
|---|---|---|
| `EMPTY_INPUT` | Input is empty | Empty or whitespace-only YAML string |
| `YAML_PARSE_ERROR` | YAML parsing failed | Invalid YAML syntax |
| `NOT_AN_OBJECT` | Parsed result is not an object | YAML parsed to a scalar or array instead of object |

## Schema Validation Errors

Schema errors are produced by Ajv validation against the JSON Schema. They follow the pattern:

| Code | Message | Example |
|---|---|---|
| `REQUIRED_FIELD` | `{field}` is required | `solution.name is required` |
| `INVALID_TYPE` | `{field}` must be {type} | `solution.stage must be string` |
| `INVALID_ENUM` | `{field}` must be one of: {values} | `architecture.style must be one of: monolith, modular-monolith, microservices, serverless, hybrid` |
| `ADDITIONAL_PROPERTY` | Unknown property `{field}` | `solution.foo is not a recognized field` |
| `MIN_LENGTH` | `{field}` must not be empty | `solution.name must not be empty` |
| `MIN_ITEMS` | `{field}` must have at least {n} items | `architecture.projects.backend must have at least 1 item` |

## Conditional Validation Rules

These rules catch logical inconsistencies that JSON Schema alone cannot detect:

| Rule | Condition | Error |
|---|---|---|
| **Serverless + WebSocket** | `deployment.serverless: true` AND any endpoint uses WebSocket | Serverless cannot host persistent WebSocket connections. Use a managed WebSocket service or switch to container deployment. |
| **Free tier + production stage** | `solution.stage: production` AND `constraints.budget: free` | Production stage requires paid infrastructure. Specify a budget or change stage to MVP. |
| **Multi-region without database replication** | `deployment.regions.length > 1` AND `data.primaryDatabase.replication` is not set | Multi-region deployment requires database replication strategy. |
| **Agent without LLM** | Any component with `type: agent` AND no `llm` section in integrations | Agent components require an LLM integration. |
| **Auth provider mismatch** | `auth.provider` set to a specific provider AND no matching integration in `integrations` | Auth provider declared but not listed in integrations. |

## Normalization Rules

The normalizer auto-infers defaults when fields are omitted:

| # | If Missing | Inferred From | Default Value |
|---|---|---|---|
| 1 | `solution.stage` | — | `mvp` |
| 2 | `architecture.style` | Backend count, team size | `monolith` (1 backend), `modular-monolith` (2-3), `microservices` (4+) |
| 3 | Backend `runtime` | `framework` | Express/Fastify→`node`, FastAPI/Django→`python`, Gin/Echo→`go`, Spring→`java`, ASP.NET→`dotnet` |
| 4 | Backend `language` | `runtime` | node→`typescript`, python→`python`, go→`go`, java→`java`, dotnet→`csharp` |
| 5 | Backend `orm` | `runtime` + `data.primaryDatabase.type` | node+postgres→`prisma`, python+postgres→`sqlalchemy`, go→`none` |
| 6 | `deployment.cloud` | `constraints.budget`, team familiarity | `aws` (default), `gcp` (AI-heavy), `azure` (enterprise) |
| 7 | `deployment.ciCd.provider` | `deployment.cloud`, repo host | `github-actions` (default) |
| 8 | `data.primaryDatabase.type` | Backend framework | `postgres` (default), `mongodb` (MEAN/MERN stack) |
| 9 | `auth.strategy` | `solution.stage`, `auth.provider` | `jwt` (API), `session` (web app) |
| 10 | `nonFunctional.availability` | `solution.stage` | mvp→`99%`, growth→`99.9%`, production→`99.95%` |
| 11 | `constraints.budget` | `solution.stage` | mvp→`low`, growth→`medium`, production→`high` |
| 12 | `testing.strategy` | `solution.stage` | mvp→`unit`, growth→`integration`, production→`e2e` |
| 13 | Frontend `rendering` | `framework` | next→`ssr`, react→`spa`, vue→`spa` |
| 14 | Frontend `styling` | `framework` | next/react→`tailwind`, vue→`tailwind`, angular→`scss` |
| 15 | Frontend `stateManagement` | `framework` | react→`zustand`, vue→`pinia`, angular→`ngrx` |

## Warning Rules

Warnings don't block validation but flag potential issues:

| Warning | Condition | Suggestion |
|---|---|---|
| `NO_AUTH` | No `auth` section defined | Consider adding authentication — most apps need it |
| `NO_TESTING` | No `testing` section defined | Consider adding a testing strategy |
| `HIGH_COMPLEXITY` | More than 5 backend services with different runtimes | High operational complexity — consider reducing runtime diversity |
| `MISSING_OBSERVABILITY` | No `observability` section for production-stage projects | Production projects should have logging, monitoring, and alerting |
