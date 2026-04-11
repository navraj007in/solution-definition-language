# SDL Discovery Agent & Complexity Scoring — Roadmap

## Overview

This roadmap outlines the development phases for the SDL Discovery Agent ecosystem, which reverse-engineers software architecture and scores system complexity.

**Current Status:** Phase 2 Complete ✅  
**Latest Release:** v1.2.0 (SDL Discovery Agent + Complexity Scoring)

---

## Phase 1: Foundation ✅ (Complete)

**Goal:** Establish types, patterns, and signal detection framework  
**Status:** Complete (integrated into v1.2.0)

**Deliverables:**
- ✅ SDL v1.1 type system (`DiscoveryResult`, `Component`, `Dependency`, etc.)
- ✅ Component detection heuristics (service, frontend, worker, library patterns)
- ✅ Complexity types and enums (`ComplexityResult`, 6 dimensions)
- ✅ Signal detection for observability/resilience/security (8 signal arrays)
- ✅ Complexity Scoring v1.0 specification (reference/complexity-scoring.md)
- ✅ SDL Discovery Agent v1.2.0 specification with Step 7 (complexity scoring)

**Key Decision:** `discoverArchitecture()` is intentionally a stub — discovery is agent-based, not a sync function.

---

## Phase 2: Complexity Calculation ✅ (Complete)

**Goal:** Implement real complexity scoring logic and report generation  
**Status:** Complete (committed, ready for compilation)

**Deliverables:**
- ✅ `src/complexity-calculator.ts` — All 6 dimensions with exact formulas
  - Structural: NASA SCM, coupling density, critical path depth, fan-in/out
  - Dynamic: temporal (workers, retries), state (shared DBs, locks), consistency model
  - Integration: criticality, circuit breaker detection, blast radius
  - Technology: language/framework/DB diversity
  - Delivery Burden: CI/CD, IaC, observability, secrets, health checks, DR
  - Organizational: team estimation (always LOW confidence)
- ✅ `src/complexity-report.ts` — Markdown report generator
  - Complexity indices table
  - "Why this system is hard" narrative
  - Reduction plan (ranked by impact)
  - Risk assessment (critical + high)
  - Confidence notes and next steps
- ✅ `src/complexity-yaml.ts` — YAML serialization for `complexity.sdl.yaml`
- ✅ Updated `src/index.ts` — Wired real `calculateComplexity()` implementation
- ✅ Extended `src/types.ts` — `packages[]` on Component, `DeliveryMetadata` on DiscoveryResult
- ✅ Test suite — 10/10 passing tests validating all dimensions

**Requirements Met:**
- Can calculate complexity from any `DiscoveryResult`
- Generates `complexity-report.md` markdown
- Generates `complexity.sdl.yaml` YAML
- Profile auto-detection (startup/enterprise/platform)
- Reduction plan with effort/cost estimates
- Risk assessment for high-scoring dimensions

---

## Phase 3: Discovery Orchestration (Next)

**Goal:** Implement full repository scanning and component detection (Steps 1-6)  
**Estimated Effort:** 4-6 weeks  
**Status:** Planned

**Deliverables:**
1. **`discoverArchitecture()` implementation** — Steps 1-6 orchestration
   - Step 1: Normalize scan context (detect monorepo structure, language ecosystems)
   - Step 2: Build evidence index (manifests, infrastructure, CI/CD, APIs, configs)
   - Step 3: Detect candidate components (apply heuristics)
   - Step 4: Correlate across repos (infer dependencies, shared infra)
   - Step 5: Score confidence (HIGH/MEDIUM/LOW per component)
   - Step 6: Generate modular SDL (9 YAML files + confidence report)

2. **Agent system prompt** — Implement `.claude/agents/sdl-discovery.md` logic
   - Evidence extraction strategies per file type
   - Pattern matching and inference rules
   - Review item flagging
   - Human decision points

3. **Modular SDL generation**
   - `sdl/services.sdl.yaml` — architecture section
   - `sdl/data.sdl.yaml` — data stores
   - `sdl/auth.sdl.yaml` — authentication
   - `sdl/integrations.sdl.yaml` — external services
   - `sdl/deployment.sdl.yaml` — cloud, CI/CD, artifacts
   - `sdl/contracts.sdl.yaml` — APIs
   - `sdl/artifacts.sdl.yaml` — docker images, builds
   - `sdl/assumptions.sdl.yaml` — inferred relationships, unknowns
   - `sdl/complexity.sdl.yaml` — complexity scores

4. **Output generation** (beyond complexity)
   - `sdl-discovery-report.md` — human-readable summary
   - `confidence-report.json` — per-component confidence scores
   - `unknowns-and-review-items.md` — human decision checklist
   - `sdl-discovery.json` — structured metadata

**Success Criteria:**
- Can scan a real repository and produce draft SDL
- Complexity scores match manual assessment (within ±0.5 on 10-point scale)
- Flagged review items are actionable
- Agent can handle monorepos and polyrepos
- Supports 6+ programming languages

---

## Phase 4: Validation & Refinement (Later)

**Goal:** Test against production systems and refine scoring accuracy  
**Estimated Effort:** 3-4 weeks  
**Status:** Planned

**Activities:**
1. **Real-world testing** — Scan 5-10 production systems
   - Compare auto-generated complexity scores vs. architect assessment
   - Refine scoring weights/thresholds
   - Document edge cases

2. **Confidence model validation**
   - Do HIGH confidence inferences match human review?
   - Are ambiguous areas correctly marked LOW?
   - Are false positives flagged as review items?

3. **Robustness testing**
   - Unconventional monorepo structures
   - Very large codebases (100K+ files)
   - Malformed/legacy repositories
   - Polyglot stacks

4. **Performance optimization**
   - Caching strategies
   - Parallel scanning
   - Large file handling

---

## Phase 5: User Experience & Integration (Later)

**Goal:** Make discovery accessible and actionable  
**Estimated Effort:** 4-6 weeks  
**Status:** Planned

**Deliverables:**

1. **CLI Tool** — Standalone `sdl-discover` command
   ```bash
   sdl-discover --repos ./repo --output ./sdl --profile enterprise
   ```
   - Discovery without agent wrapper
   - Batch processing of multiple repos
   - Config file support

2. **SDL Playground Integration**
   - Complexity scoring UI in web app
   - Visualize 6 dimensions with charts
   - Reduction plan prioritization tools
   - Export reports (PDF, markdown)

3. **Historical Tracking**
   - Store complexity scores per run
   - Compare trends over time
   - Track reduction plan progress
   - Dashboard view of improvements

4. **Documentation**
   - "Interpreting Your Complexity Report" guide
   - Reduction plan implementation guides
   - Best practices for architectural complexity management
   - Case studies (real examples)

5. **API Service** (optional)
   - `/discover` endpoint (POST repo path)
   - `/calculate-complexity` endpoint (POST DiscoveryResult)
   - `/generate-report` endpoint (markdown/YAML generation)
   - Hosted service for SaaS offering

---

## Phase 6: Advanced Features (Later)

**Goal:** Extended capabilities for large enterprises  
**Status:** Planned (low priority)

**Ideas:**
1. **Drift Detection** — Compare current architecture vs. prior SDL
2. **Team Mapping** — Link complexity to org structure and ownership
3. **Compliance Checking** — Flag architectures that violate policies
4. **Benchmarking** — Compare system complexity against industry standards
5. **Migration Planning** — Suggest refactoring sequences for reduction
6. **Automated Remediation** — Generate code suggestions (circuit breakers, observability, etc.)

---

## Technical Debt & Improvements

**Always Available:**
- [ ] TypeScript strict mode validation (when compiling)
- [ ] Expand language support (Go, Rust, Python, Java coverage)
- [ ] Improve heuristics accuracy based on Phase 4 feedback
- [ ] Add more integration types (SaaS, data pipelines, ML platforms)
- [ ] Performance benchmarks for large codebases
- [ ] Internationalization (non-English repo support)

---

## Dependencies & Blockers

**Phase 3 blockers:**
- None — ready to implement

**Phase 4 blockers:**
- Need access to 5+ production codebases for testing

**Phase 5 blockers:**
- SDL Playground must support complexity UI
- API infrastructure (if pursuing SaaS offering)

---

## Success Metrics

By end of Phase 3:
- ✅ Scan arbitrary repo → valid SDL + complexity score
- ✅ Agent can handle 80%+ of common architectures
- ✅ Review items are actionable (low false positive rate)
- ✅ Complexity scores within ±1 point of expert assessment

By end of Phase 4:
- ✅ Complexity scores validated across 10 systems
- ✅ Confidence model refined and tested
- ✅ Edge cases documented and handled

By end of Phase 5:
- ✅ Users can run discovery without understanding Claude agents
- ✅ Historical tracking shows value over time
- ✅ Reduction plans are measurable (complexity improves)

---

## Maintenance & Support

**Ongoing:**
- Monitor complexity scoring accuracy (post each Phase 4 validation)
- Update heuristics as new frameworks/patterns emerge
- Keep SDL specification aligned with community feedback
- Maintain agent spec clarity and examples

**Communication:**
- Release notes for major versions
- Changelog tracking improvements and fixes
- Architecture Decision Records (ADRs) for major changes

---

## Questions & Feedback

For questions about the roadmap or to propose changes, open an issue or discussion in the repository.

**Last Updated:** April 2026  
**Maintainer:** arch0 team  
**License:** Apache 2.0
