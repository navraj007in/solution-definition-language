# SDL v2 field catalogue

**Unreleased draft.** This catalogue is rendered from [sdl-v2.schema.json](sdl-v2.schema.json); [the consolidated contract](FULL-SPEC.md) and its linked semantic slices supply meanings and cross-field rules. No package definitions are required.

Each group is a reusable schema definition; `$` is the root document. Dotted paths describe nested fields, `[]` array items, and `<oneOf N>`/`<anyOf N>` alternative shapes. Required means required when its containing object/declaration exists, subject to ST-002 fragment assembly. Array-item rows are not themselves named fields. Unlisted lower bounds are zero; omitted fields stay absent. Conditional predicates are shown verbatim so requiredness is not lost in a flat table. All numbers are exact input-profile values.

Regenerate with `node spec/v2/conformance/render-catalogue.mjs --write`. The corpus checker compares this file with the rendering to detect drift.

## Document

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `$` | object (closed; x-* allowed) | required | `required: ["sdlVersion","solution","architecture","data"]` |
| `sdlVersion` | string | required | `const: "2.0"` |
| `imports` | array | optional | — |
| `imports[]` | one alternative | item | — |
| `imports[] <oneOf 1>` | string | alternative | `minLength: 1` |
| `imports[] <oneOf 2>` | object (closed; x-* allowed) | alternative | `required: ["name","path"]` |
| `imports[] <oneOf 2>.name` | string | required | `minLength: 1` |
| `imports[] <oneOf 2>.path` | string | required | `minLength: 1` |
| `solution` | SolutionMetadata | required | — |
| `product` | ProductContext | optional | — |
| `architecture` | Architecture | required | — |
| `auth` | Authentication | optional | — |
| `data` | DataLayer | required | — |
| `integrations` | Integrations | optional | — |
| `nonFunctional` | NFRs | optional | — |
| `deployment` | Deployment | optional | — |
| `constraints` | Constraints | optional | — |
| `technicalDebt` | array | optional | — |
| `technicalDebt[]` | TechDebt | item | — |
| `evolution` | Evolution | optional | — |
| `testing` | Testing | optional | — |
| `observability` | Observability | optional | — |
| `artifacts` | ArtifactConfig | optional | — |
| `techDebt` | array | optional | — |
| `techDebt[]` | TechDebt | item | — |
| `contracts` | object (closed; x-* allowed) | optional | — |
| `contracts.apis` | array | optional | — |
| `contracts.apis[]` | object (closed; x-* allowed) | item | `required: ["name"]`; `dependencies: {"spec":["type"]}` |
| `contracts.apis[].name` | string | required | `minLength: 1`; `pattern: "^(?! )(?!.*[\\u0000-\\u001F\\u007F-\\u009F])(?!.* $).+$"` |
| `contracts.apis[].type` | string | optional | `enum: ["rest","graphql","grpc","webhook","asyncapi"]` |
| `contracts.apis[].owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `contracts.apis[].component` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `contracts.apis[].errorConventions` | string | optional | `enum: ["standard","external"]` |
| `contracts.apis[].spec` | object (closed; x-* allowed) | optional | `required: ["path","format","version"]` |
| `contracts.apis[].spec.path` | string | required | `minLength: 1` |
| `contracts.apis[].spec.format` | string | required | `enum: ["openapi","asyncapi","graphql","protobuf"]` |
| `contracts.apis[].spec.version` | string | required | `minLength: 1`; `pattern: "^(?! )(?!.*[\\u0000-\\u001F\\u007F-\\u009F])(?!.* $).+$"` |
| `contracts.apis[].spec.pointer` | string | optional | — |
| `contracts.apis[].description` | string | optional | — |
| `domain` | object (closed; x-* allowed) | optional | — |
| `domain.entities` | array | optional | — |
| `domain.entities[]` | object (closed; x-* allowed) | item | `required: ["name","fields"]` |
| `domain.entities[].name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `domain.entities[].table` | string | optional | — |
| `domain.entities[].indexes` | array | optional | `minItems: 0` |
| `domain.entities[].indexes[]` | DomainIndex | item | — |
| `domain.entities[].constraints` | array | optional | `minItems: 0` |
| `domain.entities[].constraints[]` | DomainConstraint | item | — |
| `domain.entities[].relationships` | array | optional | `minItems: 0` |
| `domain.entities[].relationships[]` | LocalRelationship | item | — |
| `domain.entities[].fields` | array | required | `minItems: 1` |
| `domain.entities[].fields[]` | object (open) | item | `required: ["name","type"]` |
| `domain.entities[].fields[].name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `domain.entities[].fields[].type` | string | required | `pattern: "^(string\|boolean\|integer\|number\|decimal\|uuid\|date\|datetime\|json\|x-[A-Za-z_][A-Za-z0-9_-]*)$"` |
| `domain.entities[].fields[].required` | boolean | optional | — |
| `domain.entities[].fields[].nullable` | boolean | optional | — |
| `domain.entities[].fields[].primaryKey` | boolean | optional | — |
| `domain.entities[].fields[].foreignKey` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*\\.[A-Za-z_][A-Za-z0-9_-]*$"` |
| `domain.entities[].fields[].unique` | boolean | optional | — |
| `domain.entities[].fields[].generated` | boolean | optional | — |
| `domain.entities[].fields[].default` | any input-profile value | optional | — |
| `domain.entities[].fields[].enum` | array | optional | `minItems: 1`; `uniqueItems: true` |
| `domain.entities[].fields[].enum[]` | any input-profile value | item | — |
| `domain.entities[].fields[].maxLength` | integer | optional | `minimum: 1` |
| `domain.entities[].fields[].precision` | integer | optional | `minimum: 1` |
| `domain.entities[].fields[].scale` | integer | optional | `minimum: 0` |
| `domain.entities[].fields[].onUpdate` | string | optional | `minLength: 1` |
| `domain.entities[].fields[].description` | string | optional | — |
| `domain.entities[].owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `domain.entities[].managedBy` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `domain.entities[].database` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `domain.entities[].description` | string | optional | — |
| `domain.relationships` | array | optional | `minItems: 0` |
| `domain.relationships[]` | RootRelationship | item | — |
| `features` | array | optional | — |
| `features[]` | object (closed; x-* allowed) | item | `required: ["name"]` |
| `features[].name` | string | required | `minLength: 1`; `pattern: "^(?! )(?!.*[\\u0000-\\u001F\\u007F-\\u009F])(?!.* $).+$"` |
| `features[].priority` | string | optional | `enum: ["critical","high","medium","low"]` |
| `features[].stage` | string | optional | `enum: ["MVP","Growth","Enterprise"]` |
| `features[].status` | string | optional | `enum: ["planned","in-progress","done","deferred"]` |
| `features[].description` | string | optional | — |
| `compliance` | object (closed; x-* allowed) | optional | — |
| `compliance.frameworks` | array | optional | — |
| `compliance.frameworks[]` | object (closed; x-* allowed) | item | `required: ["name"]` |
| `compliance.frameworks[].name` | string | required | `enum: ["GDPR","HIPAA","SOC2","SOC2-Type2","PCI-DSS","CCPA","ISO27001","ISO 27001","SOX","FERPA","FISMA"]` |
| `compliance.frameworks[].applicable` | boolean | optional | — |
| `compliance.frameworks[].notes` | string | optional | — |
| `compliance.frameworks[].requirements` | array | optional | — |
| `compliance.frameworks[].requirements[]` | object (closed; x-* allowed) | item | `required: ["requirement"]` |
| `compliance.frameworks[].requirements[].requirement` | string | required | `minLength: 1`; `pattern: "^(?! )(?!.*[\\u0000-\\u001F\\u007F-\\u009F])(?!.* $).+$"` |
| `compliance.frameworks[].requirements[].implementation` | string | optional | — |
| `compliance.frameworks[].requirements[].description` | string | optional | — |
| `compliance.certifications` | array | optional | — |
| `compliance.certifications[]` | object (open) | item | — |
| `compliance.dataResidency` | array | optional | — |
| `compliance.dataResidency[]` | object (open) | item | — |
| `compliance.dataRetention` | array | optional | — |
| `compliance.dataRetention[]` | object (open) | item | — |
| `slos` | object (closed; x-* allowed) | optional | — |
| `slos.services` | array | optional | — |
| `slos.services[]` | object (closed; x-* allowed) | item | `required: ["name"]` |
| `slos.services[].name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `slos.services[].availability` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?%$"` |
| `slos.services[].latencyP95` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `resilience` | object (closed; x-* allowed) | optional | — |
| `resilience.circuitBreaker` | object (closed; x-* allowed) | optional | — |
| `resilience.circuitBreaker.enabled` | boolean | optional | — |
| `resilience.circuitBreaker.threshold` | integer | optional | `minimum: 1`; `maximum: 99` |
| `resilience.circuitBreaker.timeout` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `resilience.retryPolicy` | object (closed; x-* allowed) | optional | `required: ["maxAttempts","backoff","initialInterval"]` |
| `resilience.retryPolicy.maxAttempts` | integer | required | `minimum: 1` |
| `resilience.retryPolicy.backoff` | string | required | `enum: ["exponential","linear","fixed"]` |
| `resilience.retryPolicy.initialInterval` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `resilience.timeout` | object (closed; x-* allowed) | optional | — |
| `resilience.timeout.default` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `resilience.rateLimit` | object (closed; x-* allowed) | optional | — |
| `resilience.rateLimit.requestsPerMinute` | integer | optional | `minimum: 1` |
| `costs` | object (closed; x-* allowed) | optional | — |
| `costs.scenarios` | array | optional | `minItems: 0` |
| `costs.scenarios[]` | CostScenario | item | — |
| `costs.comparisons` | array | optional | `minItems: 0` |
| `costs.comparisons[]` | CostComparison | item | — |
| `backupDr` | object (closed; x-* allowed) | optional | — |
| `backupDr.plans` | array | optional | `minItems: 0` |
| `backupDr.plans[]` | RecoveryPlan | item | — |
| `design` | object (open) | optional | — |

## SolutionMetadata

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `SolutionMetadata` | object (closed; x-* allowed) | when referenced | `required: ["name","description","stage"]` |
| `SolutionMetadata.name` | string | required | `minLength: 1`; `pattern: "^(?! )(?!.*[\\u0000-\\u001F\\u007F-\\u009F])(?!.* $).+$"` |
| `SolutionMetadata.stage` | string | required | `enum: ["MVP","Growth","Enterprise"]` |
| `SolutionMetadata.domain` | string | optional | `pattern: "^[A-Za-z0-9.-]+$"` |
| `SolutionMetadata.regions` | object (closed; x-* allowed) | optional | `required: ["primary"]` |
| `SolutionMetadata.regions.primary` | string | required | `pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"` |
| `SolutionMetadata.regions.secondary` | array | optional | `minItems: 0` |
| `SolutionMetadata.regions.secondary[]` | string | item | `pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"` |
| `SolutionMetadata.repository` | object (closed; x-* allowed) | optional | — |
| `SolutionMetadata.repository.org` | string | optional | — |
| `SolutionMetadata.repository.naming` | string | optional | — |
| `SolutionMetadata.teams` | array | optional | `minItems: 0` |
| `SolutionMetadata.teams[]` | object (closed; x-* allowed) | item | `required: ["name"]` |
| `SolutionMetadata.teams[].name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `SolutionMetadata.teams[].displayName` | string | optional | — |
| `SolutionMetadata.teams[].description` | string | optional | — |
| `SolutionMetadata.description` | string | required | `minLength: 10`; `maxLength: 200` |

## ProductContext

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `ProductContext` | object (closed; x-* allowed) | when referenced | `required: ["personas"]` |
| `ProductContext.personas` | array | required | — |
| `ProductContext.personas[]` | object (closed; x-* allowed) | item | `required: ["name","goals"]` |
| `ProductContext.personas[].name` | string | required | — |
| `ProductContext.personas[].goals` | array | required | — |
| `ProductContext.personas[].goals[]` | string | item | — |
| `ProductContext.personas[].accessLevel` | string | optional | `enum: ["public","authenticated","admin"]` |
| `ProductContext.coreFlows` | array | optional | — |
| `ProductContext.coreFlows[]` | object (closed; x-* allowed) | item | `required: ["name"]` |
| `ProductContext.coreFlows[].name` | string | required | — |
| `ProductContext.coreFlows[].steps` | array | optional | — |
| `ProductContext.coreFlows[].steps[]` | string | item | — |
| `ProductContext.coreFlows[].priority` | string | optional | `enum: ["critical","high","medium","low"]` |
| `ProductContext.valueProposition` | string | optional | — |

## Architecture

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Architecture` | object (closed; x-* allowed) | when referenced | `required: ["style"]`; `allOf: [{"if":{"required":["style"],"properties":{"style":{"const":"microservices"}}},"then":{"required":["services"],"properties":{"services":{"minItems":2}}}}]` |
| `Architecture.style` | string | required | `enum: ["modular-monolith","microservices","serverless"]` |
| `Architecture.projects` | object (closed; x-* allowed) | optional | — |
| `Architecture.projects.frontend` | array | optional | — |
| `Architecture.projects.frontend[]` | FrontendProject | item | — |
| `Architecture.projects.backend` | array | optional | — |
| `Architecture.projects.backend[]` | BackendProject | item | — |
| `Architecture.projects.mobile` | array | optional | — |
| `Architecture.projects.mobile[]` | MobileProject | item | — |
| `Architecture.services` | array | optional | — |
| `Architecture.services[]` | Service | item | — |
| `Architecture.sharedLibraries` | array | optional | — |
| `Architecture.sharedLibraries[]` | object (closed; x-* allowed) | item | — |
| `Architecture.sharedLibraries[].name` | string | optional | — |
| `Architecture.sharedLibraries[].language` | string | optional | — |
| `Architecture.errorConventions` | ErrorConventions | optional | — |
| `Architecture <anyOf 1>` | predicate | conditional | `{"required":["services"],"properties":{"services":{"minItems":1}}}` |
| `Architecture <anyOf 2>` | predicate | conditional | `{"required":["projects"],"properties":{"projects":{"required":["frontend"],"properties":{"frontend":{"minItems":1}}}}}` |
| `Architecture <anyOf 3>` | predicate | conditional | `{"required":["projects"],"properties":{"projects":{"required":["backend"],"properties":{"backend":{"minItems":1}}}}}` |
| `Architecture <anyOf 4>` | predicate | conditional | `{"required":["projects"],"properties":{"projects":{"required":["mobile"],"properties":{"mobile":{"minItems":1}}}}}` |

## ErrorConventions

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `ErrorConventions` | object (closed; x-* allowed) | when referenced | — |
| `ErrorConventions.envelope` | object (closed; x-* allowed) | optional | `required: ["kind","fields"]` |
| `ErrorConventions.envelope.kind` | string | required | `const: "object"` |
| `ErrorConventions.envelope.fields` | array | required | — |
| `ErrorConventions.envelope.fields[]` | object (closed; x-* allowed) | item | `required: ["name","type"]` |
| `ErrorConventions.envelope.fields[].name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*(\\.[A-Za-z_][A-Za-z0-9_-]*)*$"` |
| `ErrorConventions.envelope.fields[].type` | string | required | `enum: ["object","array","string","integer","number","boolean"]` |
| `ErrorConventions.envelope.fields[].required` | boolean | optional | — |
| `ErrorConventions.envelope.fields[].nullable` | boolean | optional | — |
| `ErrorConventions.envelope.fields[].description` | string | optional | — |
| `ErrorConventions.envelope.codeField` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*(\\.[A-Za-z_][A-Za-z0-9_-]*)*$"` |
| `ErrorConventions.status_mapping` | array | optional | — |
| `ErrorConventions.status_mapping[]` | object (closed; x-* allowed) | item | `required: ["status","code"]` |
| `ErrorConventions.status_mapping[].status` | integer | required | `minimum: 400`; `maximum: 599` |
| `ErrorConventions.status_mapping[].code` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `ErrorConventions.status_mapping[].retryable` | boolean | optional | — |
| `ErrorConventions.status_mapping[].retry_after_header` | boolean | optional | — |
| `ErrorConventions.retry_policy` | object (closed; x-* allowed) | optional | `required: ["max_attempts","backoff","base_ms","cap_ms"]` |
| `ErrorConventions.retry_policy.max_attempts` | integer | required | `minimum: 1` |
| `ErrorConventions.retry_policy.backoff` | string | required | `enum: ["exponential","linear","constant"]` |
| `ErrorConventions.retry_policy.base_ms` | integer | required | `minimum: 0` |
| `ErrorConventions.retry_policy.cap_ms` | integer | required | `minimum: 0` |

## FrontendProject

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `FrontendProject` | object (closed; x-* allowed) | when referenced | `required: ["name","framework"]` |
| `FrontendProject.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `FrontendProject.type` | string | optional | `enum: ["web","mobile-web","admin"]` |
| `FrontendProject.framework` | string | required | `enum: ["nextjs","react","vue","angular","svelte","solid"]` |
| `FrontendProject.rendering` | string | optional | `enum: ["ssr","ssg","spa"]` |
| `FrontendProject.stateManagement` | string | optional | `enum: ["context","redux","zustand","mobx","none"]` |
| `FrontendProject.styling` | string | optional | `enum: ["tailwind","css-modules","styled-components","sass","emotion"]` |
| `FrontendProject.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `FrontendProject.dataAccess` | array | optional | `minItems: 0` |
| `FrontendProject.dataAccess[]` | DataAccess | item | — |
| `FrontendProject.usesIntegrations` | array | optional | `minItems: 0` |
| `FrontendProject.usesIntegrations[]` | string | item | `pattern: "^(builtin/(payments\|email\|sms\|analytics\|monitoring\|cdn\|auth)\|custom/[A-Za-z_][A-Za-z0-9_-]*)$"` |
| `FrontendProject.path` | string | optional | `minLength: 1` |
| `FrontendProject.language` | string | optional | `enum: ["javascript","typescript","csharp","fsharp","python","go","java","kotlin","ruby","php","dart","swift"]` |

## BackendProject

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `BackendProject` | object (closed; x-* allowed) | when referenced | `required: ["name","framework"]` |
| `BackendProject.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `BackendProject.type` | string | optional | `enum: ["backend","worker","function"]` |
| `BackendProject.framework` | string | required | `enum: ["dotnet","nodejs","python-fastapi","go","java-spring","ruby-rails","php-laravel"]` |
| `BackendProject.runtimeVersion` | string | optional | `minLength: 1` |
| `BackendProject.apiStyle` | string | optional | `enum: ["rest","graphql","grpc","mixed"]` |
| `BackendProject.orm` | string | optional | `enum: ["ef-core","prisma","typeorm","sqlalchemy","gorm","sequelize","mongoose","hibernate"]` |
| `BackendProject.apiVersioning` | string | optional | `enum: ["url-prefix","header","query-param","none"]` |
| `BackendProject.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `BackendProject.dataAccess` | array | optional | `minItems: 0` |
| `BackendProject.dataAccess[]` | DataAccess | item | — |
| `BackendProject.usesIntegrations` | array | optional | `minItems: 0` |
| `BackendProject.usesIntegrations[]` | string | item | `pattern: "^(builtin/(payments\|email\|sms\|analytics\|monitoring\|cdn\|auth)\|custom/[A-Za-z_][A-Za-z0-9_-]*)$"` |
| `BackendProject.path` | string | optional | `minLength: 1` |
| `BackendProject.language` | string | optional | `enum: ["javascript","typescript","csharp","fsharp","python","go","java","kotlin","ruby","php","dart","swift"]` |

## MobileProject

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `MobileProject` | object (closed; x-* allowed) | when referenced | `required: ["name","platform","framework"]` |
| `MobileProject.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `MobileProject.platform` | string | required | `enum: ["ios","android","cross-platform"]` |
| `MobileProject.framework` | string | required | `enum: ["react-native","flutter","swift","kotlin","ionic"]` |
| `MobileProject.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `MobileProject.dataAccess` | array | optional | `minItems: 0` |
| `MobileProject.dataAccess[]` | DataAccess | item | — |
| `MobileProject.usesIntegrations` | array | optional | `minItems: 0` |
| `MobileProject.usesIntegrations[]` | string | item | `pattern: "^(builtin/(payments\|email\|sms\|analytics\|monitoring\|cdn\|auth)\|custom/[A-Za-z_][A-Za-z0-9_-]*)$"` |
| `MobileProject.path` | string | optional | `minLength: 1` |
| `MobileProject.language` | string | optional | `enum: ["javascript","typescript","csharp","fsharp","python","go","java","kotlin","ruby","php","dart","swift"]` |

## Service

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Service` | object (closed; x-* allowed) | when referenced | `required: ["name","kind"]` |
| `Service.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Service.kind` | string | required | `enum: ["backend","worker","function","api-gateway"]` |
| `Service.responsibilities` | array | optional | — |
| `Service.responsibilities[]` | string | item | — |
| `Service.exposes` | object (closed; x-* allowed) | optional | — |
| `Service.exposes.http` | object (closed; x-* allowed) | optional | — |
| `Service.exposes.http.basePath` | string | optional | — |
| `Service.exposes.http.openapi` | boolean | optional | — |
| `Service.exposes.grpc` | boolean | optional | — |
| `Service.exposes.graphql` | boolean | optional | — |
| `Service.dependencies` | array | optional | `minItems: 0` |
| `Service.dependencies[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Service.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Service.dataAccess` | array | optional | `minItems: 0` |
| `Service.dataAccess[]` | DataAccess | item | — |
| `Service.usesIntegrations` | array | optional | `minItems: 0` |
| `Service.usesIntegrations[]` | string | item | `pattern: "^(builtin/(payments\|email\|sms\|analytics\|monitoring\|cdn\|auth)\|custom/[A-Za-z_][A-Za-z0-9_-]*)$"` |
| `Service.implementation` | Implementation | optional | — |

## Authentication

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Authentication` | object (closed; x-* allowed) | when referenced | `required: ["strategy"]`; `allOf: [{"if":{"required":["strategy"],"properties":{"strategy":{"enum":["oidc","passwordless","magic-link"]}}},"then":{"required":["provider"]}},{"if":{"required":["strategy"],"properties":{"strategy":{"const":"none"}}},"then":{"not":{"anyOf":[{"required":["provider"]}]}}}]` |
| `Authentication.strategy` | string | required | `enum: ["oidc","passwordless","magic-link","api-key","none"]` |
| `Authentication.provider` | string | optional | `enum: ["cognito","auth0","entra-id","entra-id-b2c","firebase","supabase","clerk","custom"]` |
| `Authentication.roles` | array | optional | `minItems: 1` |
| `Authentication.roles[]` | string | item | — |
| `Authentication.sessions` | object (closed; x-* allowed) | optional | — |
| `Authentication.sessions.accessToken` | string | optional | `enum: ["jwt","opaque"]` |
| `Authentication.sessions.refreshToken` | boolean | optional | — |
| `Authentication.sessions.ttl` | object (closed; x-* allowed) | optional | — |
| `Authentication.sessions.ttl.access` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `Authentication.sessions.ttl.refresh` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `Authentication.mfa` | boolean | optional | — |
| `Authentication.socialProviders` | array | optional | — |
| `Authentication.socialProviders[]` | string | item | `enum: ["google","github","microsoft","apple","facebook","twitter"]` |
| `Authentication.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## DataLayer

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `DataLayer` | object (closed; x-* allowed) | when referenced | — |
| `DataLayer.primaryDatabase` | Database | optional | — |
| `DataLayer.secondaryDatabases` | array | optional | — |
| `DataLayer.secondaryDatabases[]` | Database | item | — |
| `DataLayer.storage` | object (closed; x-* allowed) | optional | — |
| `DataLayer.storage.blobs` | object (closed; x-* allowed) | optional | `required: ["id","provider"]` |
| `DataLayer.storage.blobs.provider` | string | required | `enum: ["azure-blob","s3","gcs","cloudflare-r2"]` |
| `DataLayer.storage.blobs.public` | boolean | optional | — |
| `DataLayer.storage.blobs.id` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataLayer.storage.blobs.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataLayer.storage.files` | object (closed; x-* allowed) | optional | `required: ["id","provider"]` |
| `DataLayer.storage.files.provider` | string | required | `enum: ["azure-blob","s3","gcs","cloudflare-r2"]` |
| `DataLayer.storage.files.id` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataLayer.storage.files.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataLayer.cache` | object (closed; x-* allowed) | optional | — |
| `DataLayer.cache.type` | string | optional | `enum: ["redis","memcached","none"]` |
| `DataLayer.cache.required` | boolean | optional | — |
| `DataLayer.cache.useCase` | array | optional | — |
| `DataLayer.cache.useCase[]` | string | item | `enum: ["session","api","query"]` |
| `DataLayer.queues` | object (closed; x-* allowed) | optional | — |
| `DataLayer.queues.provider` | string | optional | `enum: ["rabbitmq","azure-service-bus","sqs","kafka","redis"]` |
| `DataLayer.queues.useCase` | array | optional | — |
| `DataLayer.queues.useCase[]` | string | item | `enum: ["async-jobs","event-streaming","notifications"]` |
| `DataLayer.search` | object (closed; x-* allowed) | optional | — |
| `DataLayer.search.provider` | string | optional | `enum: ["elasticsearch","algolia","typesense","azure-search","meilisearch","pinecone","qdrant","weaviate"]` |
| `DataLayer.databaseMode` | string | optional | `enum: ["none","declared"]` |

## Database

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Database` | object (closed; x-* allowed) | when referenced | `required: ["id","type","hosting"]` |
| `Database.type` | string | required | `enum: ["postgres","mysql","sqlserver","mongodb","dynamodb","cockroachdb","planetscale"]` |
| `Database.hosting` | string | required | `enum: ["managed","self-hosted","serverless"]` |
| `Database.name` | string | optional | — |
| `Database.size` | string | optional | `enum: ["small","medium","large"]` |
| `Database.role` | string | optional | `enum: ["primary","read-replica","analytics"]` |
| `Database.id` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Database.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## Integrations

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Integrations` | object (closed; x-* allowed) | when referenced | — |
| `Integrations.payments` | object (closed; x-* allowed) | optional | — |
| `Integrations.payments.provider` | string | optional | `enum: ["stripe","paypal","square","adyen","braintree"]` |
| `Integrations.payments.mode` | string | optional | `enum: ["subscriptions","one-time","marketplace"]` |
| `Integrations.payments.currency` | string | optional | — |
| `Integrations.payments.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.email` | object (closed; x-* allowed) | optional | — |
| `Integrations.email.provider` | string | optional | `enum: ["sendgrid","mailgun","ses","postmark","resend","smtp"]` |
| `Integrations.email.useCase` | array | optional | — |
| `Integrations.email.useCase[]` | string | item | `enum: ["transactional","marketing","notifications"]` |
| `Integrations.email.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.sms` | object (closed; x-* allowed) | optional | — |
| `Integrations.sms.provider` | string | optional | `enum: ["twilio","vonage","aws-sns","messagebird"]` |
| `Integrations.sms.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.analytics` | object (closed; x-* allowed) | optional | — |
| `Integrations.analytics.provider` | string | optional | `enum: ["posthog","mixpanel","amplitude","google-analytics","plausible"]` |
| `Integrations.analytics.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.monitoring` | object (closed; x-* allowed) | optional | — |
| `Integrations.monitoring.provider` | string | optional | `enum: ["datadog","newrelic","azure-monitor","sentry","cloudwatch"]` |
| `Integrations.monitoring.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.cdn` | object (closed; x-* allowed) | optional | — |
| `Integrations.cdn.provider` | string | optional | `enum: ["cloudflare","fastly","azure-cdn","cloudfront"]` |
| `Integrations.cdn.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.custom` | array | optional | — |
| `Integrations.custom[]` | object (closed; x-* allowed) | item | `required: ["name","apiType"]` |
| `Integrations.custom[].name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Integrations.custom[].apiType` | string | required | `enum: ["rest","graphql","soap","grpc"]` |
| `Integrations.custom[].authMethod` | string | optional | `enum: ["api-key","oauth2","basic","none"]` |
| `Integrations.custom[].rateLimit` | string | optional | — |
| `Integrations.custom[].owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## NFRs

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `NFRs` | object (closed; x-* allowed) | when referenced | — |
| `NFRs.availability` | object (closed; x-* allowed) | optional | `required: ["target"]` |
| `NFRs.availability.target` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?%$"` |
| `NFRs.availability.maintenanceWindow` | string | optional | — |
| `NFRs.scaling` | object (closed; x-* allowed) | optional | — |
| `NFRs.scaling.expectedUsersMonth1` | integer | optional | `minimum: 0` |
| `NFRs.scaling.expectedUsersYear1` | integer | optional | `minimum: 0` |
| `NFRs.scaling.peakConcurrentUsers` | integer | optional | `minimum: 0` |
| `NFRs.scaling.dataGrowthPerMonth` | string | optional | — |
| `NFRs.performance` | object (closed; x-* allowed) | optional | — |
| `NFRs.performance.apiResponseTime` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `NFRs.performance.pageLoadTime` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `NFRs.security` | object (closed; x-* allowed) | optional | `required: ["pii"]`; `allOf: [{"if":{"required":["pii"],"properties":{"pii":{"const":true}}},"then":{"required":["encryptionAtRest"],"properties":{"encryptionAtRest":{"const":true}}}}]` |
| `NFRs.security.pii` | boolean | required | — |
| `NFRs.security.phi` | boolean | optional | — |
| `NFRs.security.pci` | boolean | optional | — |
| `NFRs.security.encryptionAtRest` | boolean | optional | — |
| `NFRs.security.encryptionInTransit` | boolean | optional | — |
| `NFRs.security.auditLogging` | string | optional | `enum: ["none","basic","detailed","compliance"]` |
| `NFRs.security.penetrationTesting` | boolean | optional | — |
| `NFRs.compliance` | object (closed; x-* allowed) | optional | — |
| `NFRs.compliance.frameworks` | array | optional | — |
| `NFRs.compliance.frameworks[]` | string | item | `enum: ["gdpr","hipaa","sox","pci-dss","iso27001","soc2"]` |
| `NFRs.backup` | object (closed; x-* allowed) | optional | — |
| `NFRs.backup.frequency` | string | optional | `enum: ["hourly","daily","weekly"]` |
| `NFRs.backup.retention` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `NFRs.backup.pointInTimeRecovery` | boolean | optional | — |

## Deployment

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Deployment` | object (closed; x-* allowed) | when referenced | — |
| `Deployment.networking` | object (closed; x-* allowed) | optional | `required: ["publicApi"]` |
| `Deployment.networking.publicApi` | boolean | required | — |
| `Deployment.networking.waf` | boolean | optional | — |
| `Deployment.networking.ddos` | boolean | optional | — |
| `Deployment.networking.privateEndpoints` | boolean | optional | — |
| `Deployment.networking.customDomain` | boolean | optional | — |
| `Deployment.ciCd` | object (closed; x-* allowed) | optional | `required: ["provider"]` |
| `Deployment.ciCd.provider` | string | required | `enum: ["github-actions","gitlab-ci","azure-devops","circleci","jenkins"]` |
| `Deployment.infrastructure` | object (closed; x-* allowed) | optional | — |
| `Deployment.infrastructure.iac` | string | optional | `enum: ["terraform","bicep","pulumi","cdk","cloudformation"]` |
| `Deployment.infrastructure.stateBacking` | string | optional | — |
| `Deployment.targets` | array | optional | `minItems: 0` |
| `Deployment.targets[]` | HostingTarget | item | — |
| `Deployment.environments` | array | optional | `minItems: 0` |
| `Deployment.environments[]` | Environment | item | — |

## Environment

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Environment` | object (closed; x-* allowed) | when referenced | `required: ["name","projects","services","placements"]` |
| `Environment.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Environment.autoApproval` | boolean | optional | — |
| `Environment.requiresTests` | boolean | optional | — |
| `Environment.secrets` | array | optional | — |
| `Environment.secrets[]` | string | item | — |
| `Environment.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Environment.projects` | array | required | `minItems: 0` |
| `Environment.projects[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Environment.services` | array | required | `minItems: 0` |
| `Environment.services[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Environment.placements` | array | required | `minItems: 0` |
| `Environment.placements[]` | Placement | item | — |
| `Environment.dataInstances` | array | optional | `minItems: 0` |
| `Environment.dataInstances[]` | DataInstance | item | — |

## Constraints

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Constraints` | object (closed; x-* allowed) | when referenced | — |
| `Constraints.budget` | string | optional | `enum: ["startup","scaleup","enterprise","custom"]` |
| `Constraints.budgetAmount` | string | optional | — |
| `Constraints.team` | object (closed; x-* allowed) | optional | — |
| `Constraints.team.backend` | integer | optional | `minimum: 0` |
| `Constraints.team.frontend` | integer | optional | `minimum: 0` |
| `Constraints.team.fullstack` | integer | optional | `minimum: 0` |
| `Constraints.team.devops` | integer | optional | `minimum: 0` |
| `Constraints.team.designer` | integer | optional | `minimum: 0` |
| `Constraints.team.developers` | integer | optional | `minimum: 0` |
| `Constraints.timeline` | string | optional | — |
| `Constraints.compliance` | array | optional | — |
| `Constraints.compliance[]` | string | item | `enum: ["gdpr","hipaa","sox","pci-dss","iso27001","soc2"]` |
| `Constraints.existingInfra` | object (closed; x-* allowed) | optional | — |
| `Constraints.existingInfra.mustReuse` | boolean | optional | — |
| `Constraints.existingInfra.description` | string | optional | — |
| `Constraints.skills` | object (closed; x-* allowed) | optional | — |
| `Constraints.skills.languages` | array | optional | — |
| `Constraints.skills.languages[]` | string | item | — |
| `Constraints.skills.cloudExperience` | array | optional | — |
| `Constraints.skills.cloudExperience[]` | string | item | `enum: ["azure","aws","gcp"]` |

## TechDebt

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `TechDebt` | object (closed; x-* allowed) | when referenced | `required: ["id","decision","reason","impact"]` |
| `TechDebt.id` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `TechDebt.decision` | string | required | `pattern: "[^ \\t\\r\\n]"` |
| `TechDebt.reason` | string | required | `pattern: "[^ \\t\\r\\n]"` |
| `TechDebt.impact` | string | required | `pattern: "[^ \\t\\r\\n]"` |
| `TechDebt.effort` | string | optional | — |
| `TechDebt.priority` | string | optional | `enum: ["low","medium","high","critical"]` |
| `TechDebt.triggerCondition` | string | optional | — |
| `TechDebt.mitigationPlan` | string | optional | — |

## Evolution

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Evolution` | object (closed; x-* allowed) | when referenced | — |
| `Evolution.triggers` | array | optional | — |
| `Evolution.triggers[]` | object (closed; x-* allowed) | item | `required: ["condition","action"]` |
| `Evolution.triggers[].condition` | string | required | — |
| `Evolution.triggers[].action` | string | required | — |
| `Evolution.triggers[].estimatedEffort` | string | optional | — |
| `Evolution.triggers[].blockers` | array | optional | — |
| `Evolution.triggers[].blockers[]` | string | item | — |
| `Evolution.roadmap` | array | optional | — |
| `Evolution.roadmap[]` | object (closed; x-* allowed) | item | — |
| `Evolution.roadmap[].stage` | string | optional | `enum: ["MVP","Growth","Enterprise"]` |
| `Evolution.roadmap[].targetDate` | string | optional | — |
| `Evolution.roadmap[].architectureChanges` | array | optional | — |
| `Evolution.roadmap[].architectureChanges[]` | string | item | — |
| `Evolution.roadmap[].newCapabilities` | array | optional | — |
| `Evolution.roadmap[].newCapabilities[]` | string | item | — |
| `Evolution.costProjection` | object (closed; x-* allowed) | optional | — |
| `Evolution.costProjection.currentMonthly` | string | optional | — |
| `Evolution.costProjection.atMVP` | string | optional | — |
| `Evolution.costProjection.atGrowth` | string | optional | — |
| `Evolution.costProjection.atEnterprise` | string | optional | — |

## ArtifactConfig

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `ArtifactConfig` | object (closed; x-* allowed) | when referenced | `required: ["generate"]` |
| `ArtifactConfig.generate` | array | required | — |
| `ArtifactConfig.generate[]` | string | item | `enum: ["architecture-diagram","sequence-diagrams","openapi","data-model","repo-scaffold","iac-skeleton","backlog","adr","deployment-guide","cost-estimate","coding-rules","coding-rules-enforcement","compliance-checklist"]` |
| `ArtifactConfig.formats` | object (closed; x-* allowed) | optional | — |
| `ArtifactConfig.formats.diagrams` | string | optional | `enum: ["mermaid","plantuml","structurizr"]` |
| `ArtifactConfig.formats.adr` | string | optional | `enum: ["markdown","asciidoc"]` |

## Testing

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Testing` | object (closed; x-* allowed) | when referenced | — |
| `Testing.unit` | object (closed; x-* allowed) | optional | — |
| `Testing.unit.framework` | string | optional | `enum: ["jest","vitest","pytest","xunit","go-test","junit","rspec","phpunit"]` |
| `Testing.e2e` | object (closed; x-* allowed) | optional | — |
| `Testing.e2e.framework` | string | optional | `enum: ["playwright","cypress","selenium","none"]` |
| `Testing.coverage` | object (closed; x-* allowed) | optional | — |
| `Testing.coverage.target` | integer | optional | `minimum: 0`; `maximum: 100` |
| `Testing.coverage.enforce` | boolean | optional | — |

## Observability

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Observability` | object (closed; x-* allowed) | when referenced | — |
| `Observability.logging` | object (closed; x-* allowed) | optional | — |
| `Observability.logging.provider` | string | optional | `enum: ["pino","winston","serilog","zerolog","log4j","structured"]` |
| `Observability.logging.structured` | boolean | optional | — |
| `Observability.logging.level` | string | optional | `enum: ["debug","info","warn","error"]` |
| `Observability.tracing` | object (closed; x-* allowed) | optional | — |
| `Observability.tracing.provider` | string | optional | `enum: ["opentelemetry","jaeger","zipkin","xray","none"]` |
| `Observability.tracing.samplingRate` | number | optional | `minimum: 0`; `maximum: 1` |
| `Observability.metrics` | object (closed; x-* allowed) | optional | — |
| `Observability.metrics.provider` | string | optional | `enum: ["prometheus","datadog","cloudwatch","grafana","none"]` |

## DataAccess

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `DataAccess` | object (closed; x-* allowed) | when referenced | `required: ["database","mode"]` |
| `DataAccess.database` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataAccess.mode` | string | required | `enum: ["read","write","read-write"]` |

## Implementation

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Implementation` | one alternative | when referenced | — |
| `Implementation <oneOf 1>` | object (closed; x-* allowed) | alternative | `required: ["kind","projects"]` |
| `Implementation <oneOf 1>.kind` | any input-profile value | required | `const: "projects"` |
| `Implementation <oneOf 1>.projects` | array | required | `minItems: 1` |
| `Implementation <oneOf 1>.projects[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Implementation <oneOf 2>` | object (closed; x-* allowed) | alternative | `required: ["kind"]` |
| `Implementation <oneOf 2>.kind` | any input-profile value | required | `const: "external"` |

## HostingTarget

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `HostingTarget` | object (closed; x-* allowed) | when referenced | `required: ["name","cloud","region"]` |
| `HostingTarget.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `HostingTarget.cloud` | string | required | `enum: ["azure","aws","gcp","cloudflare","vercel","railway","render","fly-io"]` |
| `HostingTarget.region` | string | required | `pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"` |
| `HostingTarget.owner` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `HostingTarget.description` | string | optional | — |

## Port

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Port` | object (closed; x-* allowed) | when referenced | `required: ["number","protocol"]` |
| `Port.number` | integer | required | `minimum: 1`; `maximum: 65535` |
| `Port.protocol` | string | required | `enum: ["tcp","udp"]` |
| `Port.network` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## Placement

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `Placement` | object (closed; x-* allowed) | when referenced | `required: ["project","target","runtime"]` |
| `Placement.project` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Placement.target` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `Placement.runtime` | string | required | `pattern: "^[A-Za-z][A-Za-z0-9._+-]*$"` |
| `Placement.ports` | array | optional | `minItems: 0` |
| `Placement.ports[]` | Port | item | — |

## DataInstance

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `DataInstance` | object (closed; x-* allowed) | when referenced | `required: ["name","resource","target","role"]`; `allOf: [{"if":{"properties":{"role":{"const":"primary"}},"required":["role"]},"then":{"not":{"anyOf":[{"required":["replicatesFrom"]},{"required":["maxLag"]}]}},"else":{"required":["replicatesFrom"]}}]` |
| `DataInstance.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataInstance.resource` | string | required | `pattern: "^(database\|storage)/[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataInstance.target` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataInstance.role` | string | required | `enum: ["primary","replica"]` |
| `DataInstance.replicatesFrom` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DataInstance.maxLag` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |

## DomainIndex

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `DomainIndex` | object (closed; x-* allowed) | when referenced | `required: ["name","fields"]` |
| `DomainIndex.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainIndex.fields` | array | required | `minItems: 1`; `uniqueItems: true` |
| `DomainIndex.fields[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainIndex.unique` | boolean | optional | — |
| `DomainIndex.description` | string | optional | — |

## DomainConstraint

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `DomainConstraint` | one alternative | when referenced | — |
| `DomainConstraint <oneOf 1>` | object (closed; x-* allowed) | alternative | `required: ["name","kind","fields"]` |
| `DomainConstraint <oneOf 1>.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainConstraint <oneOf 1>.kind` | any input-profile value | required | `const: "unique"` |
| `DomainConstraint <oneOf 1>.fields` | array | required | `minItems: 1`; `uniqueItems: true` |
| `DomainConstraint <oneOf 1>.fields[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainConstraint <oneOf 1>.description` | string | optional | — |
| `DomainConstraint <oneOf 2>` | object (closed; x-* allowed) | alternative | `required: ["name","kind","fields","target"]` |
| `DomainConstraint <oneOf 2>.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainConstraint <oneOf 2>.kind` | any input-profile value | required | `const: "foreignKey"` |
| `DomainConstraint <oneOf 2>.fields` | array | required | `minItems: 1`; `uniqueItems: true` |
| `DomainConstraint <oneOf 2>.fields[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainConstraint <oneOf 2>.target` | object (closed; x-* allowed) | required | `required: ["entity","fields"]` |
| `DomainConstraint <oneOf 2>.target.entity` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainConstraint <oneOf 2>.target.fields` | array | required | `minItems: 1`; `uniqueItems: true` |
| `DomainConstraint <oneOf 2>.target.fields[]` | string | item | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `DomainConstraint <oneOf 2>.description` | string | optional | — |

## RelationshipVia

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `RelationshipVia` | one alternative | when referenced | — |
| `RelationshipVia <oneOf 1>` | object (closed; x-* allowed) | alternative | `required: ["side","field"]` |
| `RelationshipVia <oneOf 1>.side` | string | required | `enum: ["from","to"]` |
| `RelationshipVia <oneOf 1>.field` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RelationshipVia <oneOf 2>` | object (closed; x-* allowed) | alternative | `required: ["side","constraint"]` |
| `RelationshipVia <oneOf 2>.side` | string | required | `enum: ["from","to"]` |
| `RelationshipVia <oneOf 2>.constraint` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## LocalRelationship

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `LocalRelationship` | object (closed; x-* allowed) | when referenced | `required: ["name","to"]` |
| `LocalRelationship.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `LocalRelationship.to` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `LocalRelationship.type` | string | optional | `enum: ["one-to-one","one-to-many","many-to-one","many-to-many"]` |
| `LocalRelationship.via` | RelationshipVia | optional | — |
| `LocalRelationship.description` | string | optional | — |

## RootRelationship

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `RootRelationship` | object (closed; x-* allowed) | when referenced | `required: ["from","to"]` |
| `RootRelationship.name` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RootRelationship.to` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RootRelationship.type` | string | optional | `enum: ["one-to-one","one-to-many","many-to-one","many-to-many"]` |
| `RootRelationship.via` | RelationshipVia | optional | — |
| `RootRelationship.description` | string | optional | — |
| `RootRelationship.from` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## RecoveryPlan

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `RecoveryPlan` | one alternative | when referenced | — |
| `RecoveryPlan <oneOf 1>` | object (closed; x-* allowed) | alternative | `required: ["name","environment","resource","method","reason"]` |
| `RecoveryPlan <oneOf 1>.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 1>.environment` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 1>.resource` | string | required | `pattern: "^(database\|storage)/[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 1>.notes` | string | optional | — |
| `RecoveryPlan <oneOf 1>.method` | any input-profile value | required | `const: "none"` |
| `RecoveryPlan <oneOf 1>.reason` | string | required | `pattern: "[^ \\t\\r\\n]"` |
| `RecoveryPlan <oneOf 2>` | object (closed; x-* allowed) | alternative | `required: ["name","environment","resource","method","rto","rpo","retention","destination","interval"]` |
| `RecoveryPlan <oneOf 2>.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 2>.environment` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 2>.resource` | string | required | `pattern: "^(database\|storage)/[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 2>.notes` | string | optional | — |
| `RecoveryPlan <oneOf 2>.method` | any input-profile value | required | `const: "periodic"` |
| `RecoveryPlan <oneOf 2>.rto` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 2>.rpo` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 2>.retention` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 2>.destination` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 2>.interval` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 3>` | object (closed; x-* allowed) | alternative | `required: ["name","environment","resource","method","rto","rpo","retention","destination"]` |
| `RecoveryPlan <oneOf 3>.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 3>.environment` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 3>.resource` | string | required | `pattern: "^(database\|storage)/[A-Za-z_][A-Za-z0-9_-]*$"` |
| `RecoveryPlan <oneOf 3>.notes` | string | optional | — |
| `RecoveryPlan <oneOf 3>.method` | any input-profile value | required | `const: "continuous"` |
| `RecoveryPlan <oneOf 3>.rto` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 3>.rpo` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 3>.retention` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?(ms\|s\|m\|h\|d\|w)$"` |
| `RecoveryPlan <oneOf 3>.destination` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |

## CostSubject

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `CostSubject` | one alternative | when referenced | — |
| `CostSubject <oneOf 1>` | object (closed; x-* allowed) | alternative | `required: ["kind"]` |
| `CostSubject <oneOf 1>.kind` | any input-profile value | required | `const: "solution"` |
| `CostSubject <oneOf 2>` | object (closed; x-* allowed) | alternative | `required: ["kind","ref"]` |
| `CostSubject <oneOf 2>.kind` | string | required | `enum: ["component","resource","integration"]` |
| `CostSubject <oneOf 2>.ref` | string | required | `minLength: 1` |

## CostItem

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `CostItem` | object (closed; x-* allowed) | when referenced | `required: ["name","subject","amount"]` |
| `CostItem.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `CostItem.subject` | CostSubject | required | — |
| `CostItem.amount` | string | required | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?$"` |
| `CostItem.description` | string | optional | — |

## CostScenario

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `CostScenario` | object (closed; x-* allowed) | when referenced | `required: ["name","currency","period","items"]` |
| `CostScenario.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `CostScenario.currency` | string | required | `pattern: "^[A-Z]{3}$"` |
| `CostScenario.period` | string | required | `enum: ["month","year"]` |
| `CostScenario.items` | array | required | `minItems: 0` |
| `CostScenario.items[]` | CostItem | item | — |
| `CostScenario.environment` | string | optional | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `CostScenario.total` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?$"` |
| `CostScenario.budget` | string | optional | `pattern: "^(0\|[1-9][0-9]*)(\\.[0-9]+)?$"` |
| `CostScenario.assumptions` | array | optional | `minItems: 0` |
| `CostScenario.assumptions[]` | string | item | `pattern: "[^ \\t\\r\\n]"` |

## CostComparison

| Path | Shape | Presence | Structural constraints |
|---|---|---|---|
| `CostComparison` | object (closed; x-* allowed) | when referenced | `required: ["name","low","high"]` |
| `CostComparison.name` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `CostComparison.low` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
| `CostComparison.high` | string | required | `pattern: "^[A-Za-z_][A-Za-z0-9_-]*$"` |
