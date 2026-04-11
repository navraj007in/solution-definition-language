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
| `MISSING_REQUIRED` | `{field}` is required | `solution.name is required` |
| `INVALID_TYPE` | `{field}` must be {type} | `solution.stage must be string` |
| `INVALID_ENUM` | `{field}` must be one of: {values} | `architecture.style must be one of: modular-monolith, microservices, serverless` |
| `UNKNOWN_FIELD` | Unknown property `{field}` | `solution.foo is not a recognized field` |
| `MIN_LENGTH` | `{field}` must not be empty | `solution.name must not be empty` |
| `MIN_ITEMS` | `{field}` must have at least {n} items | `architecture.projects.backend must have at least 1 item` |

## Conditional Validation Rules

The current implementation includes compatibility and policy checks expressed through schema conditionals and validator-side warnings. Representative examples:

| Rule | Condition | Error |
|---|---|---|
| **Cloud + IaC mismatch** | incompatible `deployment.cloud` and `deployment.infrastructure.iac` combination | `INCOMPATIBLE_CLOUD_IAC` |
| **Database + ORM mismatch** | incompatible `data.primaryDatabase.type` and backend `orm` combination | `INCOMPATIBLE_DATABASE_ORM` |
| **PII without encryption** | `nonFunctional.security.pii: true` without `encryptionAtRest: true` | `PII_REQUIRES_ENCRYPTION` |

## Normalization Rules

The normalizer auto-infers defaults when fields are omitted. The implemented rules in `packages/sdl/src/normalizer.ts` include:

| # | If Missing | Inferred From | Default Value |
|---|---|---|---|
| 1 | `product.personas`, `product.coreFlows` | missing `product` section | empty arrays |
| 2 | `deployment.cloud` | project mix | `railway` or `vercel` |
| 3 | `solution.regions.primary` | missing region config | `us-east-1` |
| 4 | `data.primaryDatabase.name` | `solution.name` | slugified name plus `_db` |
| 5 | frontend/backend project `type` | project kind | `web` or `backend` |
| 6 | `deployment.runtime` | `deployment.cloud` | cloud-specific runtime values |
| 7 | `deployment.networking.publicApi` | missing networking config | `true` |
| 8 | `deployment.ciCd.provider` | missing CI/CD config | `github-actions` |
| 9 | security encryption flags | security settings | `true` when implied |
| 10 | backend `orm` | backend framework plus database type | framework/database mapping |
| 11 | `testing.unit.framework` | first backend framework | framework-specific default |
| 12 | `nonFunctional.availability.target` | `solution.stage` | `99.9`, `99.95`, `99.99` |

## Warning Rules

Warnings don't block validation but flag potential issues:

| Warning | Condition | Suggestion |
|---|---|---|
| `COMPLEXITY_EXCEEDS_TEAM_CAPACITY` | microservices selected with a very small team | Consider simplifying architecture or increasing team capacity |
| `ADMIN_ROLE_REQUIRES_AUTH` | admin-like personas exist without auth | Add an auth strategy and access control model |
