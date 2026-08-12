# SDL Normalization Defaults

The SDL normalizer auto-infers sensible defaults when optional fields are omitted. This allows minimal SDL files to produce complete, valid documents.

## How It Works

```
YAML input → parse() → validate() → normalize() → complete SDL document
```

The normalizer runs AFTER validation. It only fills in fields that are:
1. Not explicitly set in the input
2. Can be deterministically inferred from other fields

The current implementation is defined by `packages/sdl/src/normalizer.ts`. This reference summarizes the implemented defaults rather than earlier aspirational mappings.

**Invariant:** every value the normalizer emits stays inside the schema's enums and constraints, so a normalized document is itself valid SDL (`validate(normalize(x).document)` passes). See *Validation Pipeline* in [`../spec/SDL-v1.1.md`](../spec/SDL-v1.1.md).

## Implemented Defaults

| Field | Inferred From | Default |
|---|---|---|
| `product.personas` | missing `product` section | `[]` |
| `product.coreFlows` | missing `product` section | `[]` |
| `deployment.cloud` | project mix | `railway` when backend or mobile exists, otherwise `vercel` |
| `nonFunctional.availability.target` | `solution.stage` | `99.9` for `MVP`, `99.95` for `Growth`, `99.99` for `Enterprise` |
| `nonFunctional.scaling` | `solution.stage` | stage-based user estimates |
| `artifacts.generate` | missing `artifacts` section | `[]` |
| `solution.regions.primary` | missing `solution.regions` | `us-east-1` |
| `data.primaryDatabase.name` | `solution.name` | slugified solution name plus `_db` |
| `architecture.projects.frontend[].type` | frontend project present | `web` |
| `architecture.projects.backend[].type` | backend project present | `backend` |
| `deployment.runtime.frontend/backend` | `deployment.cloud` | cloud-specific runtime mapping |
| `deployment.networking.publicApi` | missing networking section | `true` |
| `deployment.ciCd.provider` | missing CI/CD section | `github-actions` |
| `nonFunctional.security.encryptionAtRest` | `security.pii: true` | `true` |
| `nonFunctional.security.encryptionInTransit` | missing explicit value | `true` |
| `architecture.projects.backend[].orm` | backend framework plus primary database | framework/database mapping |
| `technicalDebt` | `techDebt` authored without `technicalDebt` | entries mirrored to the canonical `technicalDebt` key (concatenated by unique `id` when both are authored) |
| `compliance.frameworks` | shorthand locations only (`nonFunctional.compliance.frameworks` / `constraints.compliance`) | union lifted into canonical root `compliance.frameworks[]` as `{name, applicable: true}` entries; an authored root section always wins |
| `testing.unit.framework` | first backend framework | framework-specific test runner |
| `observability.logging.structured` | missing explicit value | `true` when logging section exists |

## Frontend Defaults

| Framework | Rendering | Styling | State Management |
|---|---|---|---|
| `nextjs` | no implemented rendering inference | no implemented styling inference | no implemented state inference |
| `react` | no implemented rendering inference | no implemented styling inference | no implemented state inference |
| `vue` | no implemented rendering inference | no implemented styling inference | no implemented state inference |
| `angular` | no implemented rendering inference | no implemented styling inference | no implemented state inference |
| `svelte` | no implemented rendering inference | no implemented styling inference | no implemented state inference |

## Backend ORM Mapping

The ORM inference is keyed on the **pair** of backend `framework` and `data.primaryDatabase.type`. This table mirrors `FRAMEWORK_ORM_MAP` in `packages/sdl/src/constants.ts` exactly:

| Backend Framework | Database | Inferred ORM |
|---|---|---|
| `nodejs` | `postgres`, `mysql`, `sqlserver` | `prisma` |
| `nodejs` | `mongodb` | `mongoose` |
| `python-fastapi` | `postgres`, `mysql`, `sqlserver` | `sqlalchemy` |
| `dotnet` | `postgres`, `mysql`, `sqlserver` | `ef-core` |
| `go` | `postgres`, `mysql`, `sqlserver` | `gorm` |
| `java-spring` | `postgres`, `mysql`, `sqlserver` | `hibernate` |

**Pairs not in this table infer nothing.** If a framework/database combination is unmapped — for example `dotnet` + `mongodb`, or any framework not listed — the normalizer leaves `orm` unset rather than guessing. In particular, `ef-core` is only ever inferred for `dotnet` with a relational database; when `data.primaryDatabase.type` is `mongodb`, the only ORM the normalizer can produce is `mongoose` (for `nodejs` backends). This is what keeps the inference consistent with validation rule 10 (*ORM-Database Pair*: `mongodb` is incompatible with `ef-core`) — see the *Normalization Closure* requirement in `spec/SDL-v1.1.md` § Validation Pipeline.
