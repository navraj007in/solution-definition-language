# SDL Normalization Defaults

The SDL normalizer auto-infers sensible defaults when optional fields are omitted. This allows minimal SDL files to produce complete, valid documents.

## How It Works

```
YAML input → parse() → validate() → normalize() → complete SDL document
```

The normalizer runs AFTER validation. It only fills in fields that are:
1. Not explicitly set in the input
2. Can be deterministically inferred from other fields

## Runtime → Language Mapping

| Runtime | Inferred Language |
|---|---|
| `node` | `typescript` |
| `python` | `python` |
| `go` | `go` |
| `java` | `java` |
| `dotnet` | `csharp` |
| `rust` | `rust` |
| `ruby` | `ruby` |
| `php` | `php` |

## Framework → Runtime Mapping

| Framework | Inferred Runtime |
|---|---|
| `express`, `fastify`, `nest`, `koa`, `hapi` | `node` |
| `fastapi`, `django`, `flask`, `starlette` | `python` |
| `gin`, `echo`, `fiber`, `chi` | `go` |
| `spring`, `quarkus`, `micronaut` | `java` |
| `aspnet`, `dotnet-minimal` | `dotnet` |
| `actix`, `axum`, `rocket` | `rust` |
| `rails`, `sinatra` | `ruby` |
| `laravel`, `symfony` | `php` |

## Runtime + Database → ORM Mapping

| Runtime | Database | Inferred ORM |
|---|---|---|
| `node` | `postgres` | `prisma` |
| `node` | `mysql` | `prisma` |
| `node` | `mongodb` | `mongoose` |
| `python` | `postgres` | `sqlalchemy` |
| `python` | `mysql` | `sqlalchemy` |
| `python` | `mongodb` | `mongoengine` |
| `go` | any | `none` (raw SQL or GORM) |
| `java` | any | `hibernate` |
| `dotnet` | any | `efcore` |

## Cloud Provider Inference

| Signal | Inferred Cloud |
|---|---|
| Default | `aws` |
| AI-heavy project (agent components) | `gcp` |
| Enterprise features (SAML, AD auth) | `azure` |
| `constraints.budget: free` | `aws` (best free tier) |

## Stage → Availability Mapping

| Stage | Default Availability |
|---|---|
| `mvp` | `99%` |
| `growth` | `99.9%` |
| `production` | `99.95%` |
| `enterprise` | `99.99%` |

## Stage → Budget Mapping

| Stage | Default Budget Ceiling |
|---|---|
| `mvp` | `$500/month` |
| `growth` | `$5,000/month` |
| `production` | `$50,000/month` |
| `enterprise` | No ceiling |

## Frontend Defaults

| Framework | Rendering | Styling | State Management |
|---|---|---|---|
| `next` | `ssr` | `tailwind` | `zustand` |
| `react` | `spa` | `tailwind` | `zustand` |
| `vue` | `spa` | `tailwind` | `pinia` |
| `angular` | `spa` | `scss` | `ngrx` |
| `svelte` | `spa` | `tailwind` | built-in stores |
| `nuxt` | `ssr` | `tailwind` | `pinia` |
