# SDL v2 rule coverage and historical dispositions

**Active for the 2.x line.** The [consolidated document contract](FULL-SPEC.md), structural schema, and seven linked semantic/report documents define the portable requirements. The [corpus](conformance/README.md) supplies scoped and full-document expected results. Rule-group coverage is checked mechanically; it is not a proof of exhaustive predicate coverage or package conformance.

## Historical error catalogue

The numbers below refer to the v1.1 specification catalogue, not package diagnostic numbers. Their v2 dispositions are explicit so no global primary-database, deployment, default, or heuristic rule is silently inherited.

| v1.1 rule | v2 disposition |
|---|---|
| 1 SLO references | ID-003: global component namespace |
| 2 Cost components | SO-007: tagged subjects and explicit references |
| 3 Service dependencies | ID-003/ID-004: service-only targets, no self edges or cycles |
| 4 API contract service | OB-001/OB-004: team owner separated from component binding |
| 5 Relationship targets | ID-003, DM-005/DM-006, DX-004–DX-007: entity/field/tuple and role bindings |
| 6 Backup coverage | SO-003–SO-006: explicit topology and per-resource/environment coverage |
| 7–9 removed fields/rules | Remain tombstones; no root environments, phase-keyed feature dependencies, or per-service circuit-breaker map |
| 10 ORM/database | FD-003: explicit backend data-access bindings; no global primary-database inference |
| 11 Framework/language | OB-003: explicit optional primary-language pair |
| 12 Auth provider integration | OB-006: builtin/auth identity and strategy/provider rules |
| 13 Microservices count | FD-002: at least two logical services |
| 14 Deployable coverage | OB-007–OB-009: active selections, implementations, and placements |
| 15 Port conflicts | OB-010: target, private/shared scope, protocol, port |
| 16 Regions | OB-011, SO-003/SO-004: authored region containment for used targets; provider support separately scoped |
| 17 CloudFormation | OB-011: AWS for targets used by placements, data instances, or recovery destinations |
| 18 Primary key | DM-001/DM-003: one explicit key and consistent field flags |
| 19 Cross-database reference | OB-013/DX-009: nonblocking advisory, never an error merely for crossing stores |
| 20 Component/entity uniqueness | ID-002 and ST-001: global and local identity checks |
| 21 Entity ownership | OB-001/OB-005: team owner, manager, store, access |
| 22 Deployable fields | OB-009: explicit path, category fields, placement runtime |
| 23 Auth provider | OB-006: provider required for OIDC/passwordless/magic-link; forbidden for none |
| 24 Compliance vocabulary | NM-001/NM-002: explicit root/shorthand vocabularies and canonical identity |
| 25 Resilience bounds | SC-001/SC-003, EC-008: exact scalars, counts, complete retry policies |
| 26 SLO bounds | SC-001/SC-002: shared duration/availability grammar and limits |
| 27 PII encryption | FD-003: authored true requires explicit at-rest encryption true |
| 28 Environment uniqueness | ID-002/OB-007/OB-012: canonical deployment environment list |
| 29 Error status range | EC-007: 400–599, unique codes, explicit envelope/code binding |
| 30 Retry consistency | EC-008–EC-011: shared budget, delay, eligibility, Retry-After |
| 31 Nonempty architecture | FD-002: at least one project or service; no mandatory projects container |

## Historical warning catalogue

| v1.1 warning | v2 disposition |
|---|---|
| 1 Team capacity; 2 timeline; 3 persona/auth | Optional profiles under FD-005/DG-004; no inferred headcount, parsed narrative timeline, or implicit auth binding |
| 4 Budget tier mismatch | SO-008 uses explicit scenario budget and exact amounts; tier-derived estimates require a profile |
| 5 Cross-database references | OB-013/DX-009, one advisory per authored declaration |
| 6 Unused integrations | OB-014, using explicit integration references and builtin/auth treatment |
| 7 Missing observability; 8 stage/SLO | Optional profiles under FD-005/DG-004 |
| 9 Cost variance | SO-009: explicit comparable scenarios and exact greater-than-10× predicate |
| 10 Feature phase cycles | Remains removed |
| 11 Compliance gaps | SO-010: authored/normalized applicability and missing mappings; legal/stage inference remains outside core |
| 12 Missing design | Optional profile under SO-011/FD-005/DG-004 |

Import override/path and compliance-shadow advisories are separately defined in IM-001/IM-004/NM-002. Profiles cannot change these core conditions or outcome severity.

## Coverage claims

The checker requires a fixture for every named input/semantic/report group (CF-001 defines the fixture outcome contract itself). It also compiles both structural schemas without mutation options, compares the rendered field catalogue, checks expected full-document structural acceptance/rejection, checks accepted normalized-document structure, and verifies diagnostic artifact references/outcome consistency. Full-document cases include modular assembly, entity replacement, ownership/access, hosted topology/recovery, API errors/external references, costs, domain keys, canonicalization, and schema-valid semantic failures.

The checker does not resolve the virtual import graph, decide semantic validity, generate canonicalization, verify the truth of a diagnostic, execute migration decisions, or certify that a reported scope was executed. Those expected meanings are reviewable specification fixtures for later implementations. Each additional semantic predicate or regression still warrants focused cases; a rule-group count does not demonstrate that every field has every possible boundary tested. [D07](RELEASE-MIGRATION.md) now provides content-addressed baselines, classifications, migration artifacts, and their integrity cases.
