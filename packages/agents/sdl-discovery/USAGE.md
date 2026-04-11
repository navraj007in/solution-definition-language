# SDL Discovery Agent — Usage Guide

## Quick Start

### 1. Scan Your Repository (Discovery Mode)

```bash
cd /path/to/solution-definition-language

claude-code --agent sdl-discovery-agent \
  --repos ./packages/sdl \
  --output ./architecture-output
```

This scans `packages/sdl` and generates:
- `draft.sdl.yaml` — generated SDL v1.1 document
- `sdl-discovery-report.md` — markdown summary
- `confidence-report.json` — confidence scores
- `unknowns-and-review-items.md` — review checklist
- `sdl-discovery.json` — scan metadata

### 2. Scan Multiple Repositories

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./packages/sdl,./packages/sdl-playground \
  --output ./architecture-output
```

### 3. Scan with Hints

Provide domain or environment context to refine inference:

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./packages/sdl \
  --domain_hints "sdl=core-library,playground=frontend" \
  --environment_hints "dev=localhost,prod=sdl.dev" \
  --output ./architecture-output
```

### 4. Inventory Mode (Conservative)

Safe baseline without inference:

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./packages/sdl \
  --mode inventory \
  --output ./architecture-output
```

### 5. Drift Detection

Compare against existing SDL:

```bash
claude-code --agent sdl-discovery-agent \
  --repos ./packages/sdl \
  --existing_sdl ./solution.sdl.yaml \
  --mode drift \
  --output ./architecture-output
```

### 6. Monorepo Scanning

Detect workspace boundaries automatically:

```bash
claude-code --agent sdl-discovery-agent \
  --repos . \
  --mode monorepo \
  --output ./architecture-output
```

---

## Understanding the Outputs

### draft.sdl.yaml

The generated SDL v1.1 document. Structure:

```yaml
sdlVersion: "1.1"

solution:
  name: Solution Definition Language
  description: Structured language for capturing architecture decisions
  stage: active

architecture:
  style: modular-monolith
  projects:
    core:
      - name: sdl
        framework: nodejs
        language: typescript
        type: library
        runtime: nodejs
        confidence: high
        evidence:
          - file: packages/sdl/package.json
          - file: packages/sdl/src/index.ts
        interfaces:
          - protocol: module
            confidence: high

data:
  primaryDatabase: null  # No database detected
  cache: null

auth: null

integrations: []

deployment:
  cloud: npm
  ciCd:
    provider: github-actions
    targets:
      - npm-publish

assumptions:
  - SDL parser is consumable as npm package
  - Validation uses JSON Schema
  - No runtime database required

review_items:
  - title: Playground deployment target unclear
    severity: medium
    description: sdl-playground builds to static site but deploy target not evidenced
```

**Key sections:**
- `confidence` — high/medium/low on each element
- `evidence` — traceable to file/line
- `assumptions` — inferred relationships flagged for review
- `review_items` — ambiguities for human validation

### sdl-discovery-report.md

Markdown summary for architects:

```markdown
# SDL Discovery Report

## Scan Summary

- **Repositories scanned:** 3
- **Files examined:** 247
- **Mode:** discovery
- **Timestamp:** 2026-04-11T14:23:15Z

## Discovered Components

### Services
- `@arch0/sdl` (library, TypeScript, NodeJS)
  - Confidence: HIGH
  - Evidence: package.json, src/index.ts
  - Framework: Standard library
  - No entrypoint (library)

### Frontends
- `sdl-playground` (React, TypeScript)
  - Confidence: HIGH
  - Evidence: package.json (react), pages/...
  - Build: Next.js (app directory)
  - Deploy: Vercel or static site

...

## Architecture Summary

The solution-definition-language project is a modular monorepo with:
- **Core library** (@arch0/sdl) — parser, validator, normalizer for SDL documents
- **Interactive playground** — web-based SDL editor
- **Marketing site** — landing page and docs

## Confidence Notes

- HIGH confidence: Core library has clear entrypoint and manifest
- MEDIUM confidence: Deployment targets inferred from CI/CD (not fully explicit)
- LOW confidence: Site deployment target unclear

## Known Limitations

- No runtime inspection (what actually runs in production)
- No audit of deployment history (what's actually deployed now)
- Service ownership not evident (teams/owners not declared)

## Review Items (5)

1. Playground deployment target unclear — is it Vercel, static site, or Docker?
2. sdlang-site framework — Next.js or pure static? (affects deployment)
3. CI/CD targets not all explicit in workflows
...
```

### confidence-report.json

Machine-readable confidence scores:

```json
{
  "summary": {
    "high_confidence_components": 2,
    "medium_confidence_components": 1,
    "low_confidence_components": 0,
    "total_components": 3,
    "overall_confidence": "high",
    "components_requiring_review": 0
  },
  "components": [
    {
      "id": "sdl-core",
      "name": "@arch0/sdl",
      "type": "library",
      "confidence": "high",
      "evidence_count": 4,
      "evidence_sources": [
        "packages/sdl/package.json",
        "packages/sdl/src/index.ts",
        "packages/sdl/tsconfig.json"
      ],
      "review_required": false
    }
  ],
  "dependencies": [
    {
      "source": "sdl-playground",
      "target": "sdl-core",
      "type": "import",
      "confidence": "high",
      "evidence_count": 2
    }
  ]
}
```

### unknowns-and-review-items.md

Human decision checklist:

```markdown
# Review Items and Unknowns

## Critical (0)

None.

## High Priority (2)

- [ ] **Deployment target unclear: sdl-playground**
  - Issue: CI/CD deploys to multiple possible targets
  - Evidence: GitHub Actions workflow, but target URL not explicit
  - Action: Confirm Vercel, Netlify, or static host deployment
  - Owner: TBD

- [ ] **Service ownership**
  - Issue: No CODEOWNERS or team assignments detected
  - Evidence: No docs/OWNERSHIP or .github/CODEOWNERS
  - Action: Add ownership documentation
  - Owner: TBD

## Medium Priority (3)

- [ ] SDK dependency graph may be incomplete
  - Only examined direct imports, not transitive deps
  
- [ ] TypeScript type safety — strict mode not enforced everywhere
  - Evidence: tsconfig.json settings vary per package

...

## Unknowns (3)

1. True production database — no evidence of runtime database
2. Feature flags or configuration management system
3. Observability/monitoring stack
```

---

## Workflow: From Discovery to Validated SDL

### Step 1: Generate Draft

```bash
claude-code --agent sdl-discovery-agent \
  --repos . \
  --output ./architecture-output
```

### Step 2: Review Report

Read `sdl-discovery-report.md` and note any surprises or conflicts.

### Step 3: Address Review Items

Open `unknowns-and-review-items.md` and resolve each flagged item:

- **Rename duplicates:** If two repos represent the same service, merge them
- **Confirm inferences:** Verify inferred dependencies actually exist
- **Mark deprecated:** If a repo is dead, document it
- **Clarify ownership:** Assign teams/owners
- **Add missing context:** Update docs if architecture isn't evident from code

### Step 4: Validate SDL

Open `draft.sdl.yaml` and:

1. ✅ Check component names make sense
2. ✅ Verify dependencies are correct
3. ✅ Review confidence levels (are they realistic?)
4. ✅ Check for obvious gaps (missing services, datastores)
5. ✅ Remove low-confidence sections if not useful
6. ✅ Add business context (domain, product info)

### Step 5: Commit

Once validated, rename and commit:

```bash
mv architecture-output/draft.sdl.yaml solution.sdl.yaml
git add solution.sdl.yaml
git commit -m "Add validated SDL from discovery"
```

### Step 6: Iterate

Re-scan periodically to detect drift:

```bash
# Quarterly or after major architecture changes
claude-code --agent sdl-discovery-agent \
  --repos . \
  --existing_sdl solution.sdl.yaml \
  --mode drift \
  --output ./drift-report
```

Compare against committed SDL to detect changes.

---

## Tips

### Performance

- For large monorepos, scan one workspace at a time
- Ignore node_modules and build artifacts:
  ```bash
  --ignore_patterns "node_modules/**,dist/**,build/**,coverage/**"
  ```

### Accuracy

- Provide domain hints if components have generic names:
  ```bash
  --domain_hints "core=library,web=frontend,api=service,jobs=worker"
  ```

- Provide environment hints to refine deployment inference:
  ```bash
  --environment_hints "dev=localhost,staging=staging.example.com,prod=example.com"
  ```

### Review

- Sort review items by severity
- Batch similar items (e.g., all "unclear ownership" items together)
- Use review items to improve documentation

### Validation

- Compare generated SDL against your own understanding
- If confidence seems wrong, check HEURISTICS.md for the scoring rules
- File issues if heuristics miss obvious signals

---

## Troubleshooting

### "No components detected"

- Check ignore patterns (might be hiding all files)
- Verify repo paths are correct
- Try `--mode inventory` for conservative baseline

### "Confidence too low"

- Check [HEURISTICS.md](./HEURISTICS.md) for signal weights
- Provide domain hints to refine inference
- Add missing entrypoint files if not obvious (README comments, etc.)

### "Review items too numerous"

- Filter by severity
- Group by category (ownership, conflicts, etc.)
- Prioritize "critical" items first

### "Some services/libs missing"

This is normal! The agent can only see what's in code/config. Add review items for:
- Services deployed but not in repos (managed services)
- Infrastructure services not explicitly mentioned
- Internal tooling used by multiple services

---

## Next Steps

1. Run discovery on your repo
2. Review draft SDL and reports
3. Validate + commit to git
4. Use SDL for code generation or architecture validation
5. Re-scan periodically to detect drift

See [README.md](./README.md) for full documentation.
