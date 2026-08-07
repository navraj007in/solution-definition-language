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

## Import Resolution Errors

Emitted by `compileWithImports()` / `parseWithImports()` when resolving modular SDL. See `spec/SDL-v1.1.md` → *Modular SDL and Import Semantics*.

| Code | Cause |
|---|---|
| `MISSING_IMPORT` | An `imports[]` entry resolved to no file (neither `<path>.sdl.yaml` nor `<path>.sdl.yml`) |
| `CIRCULAR_IMPORT` | A file appears twice on the same import chain |
| `PARSE_ERROR` | An imported module failed to parse as YAML |

## Conditional Validation Rules (schema `allOf`)

All five are enforced by JSON Schema conditionals and mapped to stable codes in `packages/sdl/src/error-map.ts`.

| Rule | Condition | Error |
|---|---|---|
| **Microservices needs services** | `architecture.style: microservices` with fewer than 2 `architecture.services[]` | `MICROSERVICES_REQUIRES_SERVICES` |
| **OIDC needs provider** | `auth.strategy: oidc` without `auth.provider` | `OIDC_REQUIRES_PROVIDER` |
| **PII without encryption** | `nonFunctional.security.pii: true` without `encryptionAtRest: true` | `PII_REQUIRES_ENCRYPTION` |
| **Cloud + IaC mismatch** | `deployment.infrastructure.iac: cloudformation` with any `deployment.cloud` other than `aws` | `INCOMPATIBLE_CLOUD_IAC` |
| **Database + ORM mismatch** | `data.primaryDatabase.type: mongodb` with a backend `orm: ef-core` | `INCOMPATIBLE_DATABASE_ORM` |

> **Maintainer note:** `ALLOF_RULES` in `error-map.ts` is keyed by **position** in the schema's `allOf` array. Append new conditionals to the end — inserting one in the middle silently reassigns every code after it.

## Semantic Validation Errors (`SEM-*`)

Cross-section relational checks from `packages/sdl/src/semantic-validator.ts`, run after schema validation passes. 13 rules are implemented; SEM-006 is a permanent tombstone (see `spec/SDL-v1.1.md` → *Conditional Rules*).

| Rule | Code | Condition |
|---|---|---|
| SEM-001 | `DOMAIN_RELATIONSHIP_ENTITY_UNKNOWN` | `domain.relationships[].from` / `.to` names no entry in `domain.entities[].name` |
| SEM-002 | `SERVICE_DEPENDENCY_UNKNOWN` | `architecture.services[].dependencies[]` names an unknown service |
| SEM-003 | `SERVICE_SELF_DEPENDENCY` | A service lists itself in its own `dependencies[]` |
| SEM-004 | `SERVICE_DEPENDENCY_CYCLE` | The service dependency graph contains a cycle |
| SEM-005 | `SLO_SERVICE_UNKNOWN` | `slos.services[].name` matches no project or service name |
| SEM-007 | `PROJECT_NAME_DUPLICATE` | A name is reused across `architecture.projects.*` and `architecture.services` |
| SEM-008 | `DOMAIN_ENTITY_NAME_DUPLICATE` | `domain.entities[].name` is not unique |
| SEM-009 | `COMPLIANCE_FRAMEWORK_UNKNOWN` | `compliance.frameworks[].name` is outside the recognized set |
| SEM-010 | `AUTH_PROVIDER_MISSING` | `auth.strategy: passwordless` or `magic-link` without `auth.provider` |
| SEM-011 | `RESILIENCE_THRESHOLD_INVALID` | `resilience.circuitBreaker.threshold` outside 1–99 |
| SEM-012 | `RESILIENCE_RETRY_ATTEMPTS_INVALID` | `resilience.retryPolicy.maxAttempts` < 1 |
| SEM-013 | `SLO_AVAILABILITY_OUT_OF_RANGE` | `slos.services[].availability` outside 90.0–99.999%, or not parseable as a percentage |
| SEM-014 | `DEPLOYMENT_ENV_NAME_DUPLICATE` | `deployment.ciCd.environments[].name` is not unique |

## Normalization Rules

Normalization produces no errors — it fills omitted fields and records each one as an `Inference` on the compile result.

The complete table of implemented defaults lives in [`normalization-defaults.md`](normalization-defaults.md), which is the single source of truth for it. It is deliberately not duplicated here; an earlier copy on this page had drifted to a shorter, stale list.

## Warning Rules

Warnings don't block validation but flag potential issues. They are returned on `ValidationResult.warnings` when schema validation passes — `detectWarnings()` runs inside `validate()`, not as a separate pipeline stage.

These are the **4 codes currently emitted** by `packages/sdl/src/warnings.ts`. `spec/SDL-v1.1.md` → *Warning Rules* defines 11 rules in total; the other 7 are normative but not yet implemented and emit nothing today.

| Warning | Condition | Suggestion |
|---|---|---|
| `COMPLEXITY_EXCEEDS_TEAM_CAPACITY` | `architecture.style: microservices` with fewer than 3 developers or 0 DevOps engineers | Consider `modular-monolith` for MVP; migrate when the team grows |
| `TIMELINE_TOO_AGGRESSIVE` | estimated dev-weeks (projects × core flows × 1.5 ÷ developers) exceed `constraints.timeline` | Reduce scope, extend the timeline, or add developers |
| `MISSING_RECOMMENDED_FIELD` | more than one persona (including an admin-like one, or more than two total) with no `auth` section | Add an `auth` section with strategy and roles |
| `BUDGET_INFRASTRUCTURE_MISMATCH` | estimated monthly infrastructure cost exceeds the `constraints.budget` tier ceiling | Use managed/serverless options, or raise the budget tier |
