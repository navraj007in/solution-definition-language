---
name: sdl-author
description: Generate, repair, and validate SDL v1.1 YAML from requirements, architecture notes, repo summaries, or diagrams. Use for solution.sdl.yaml, modular .sdl.yaml files, fragments, and review items.
---

# SDL Author

## Instructions

Use this skill to turn architecture intent into valid Solution Definition Language (SDL) v1.1. Favor small, schema-valid SDL over comprehensive-looking YAML that invents facts.

Claude Code can invoke this skill as `/sdl-author` or use it automatically when generating, repairing, or reviewing SDL.

## Reference Loading

1. If working in this `solution-definition-language` repo, load `reference/ai-authoring.md` first. It is the compact machine reference.
2. For deeper contract questions, load `spec/SDL-v1.1.md` or `reference/canonical-contract.md`.
3. If those repo files are unavailable, load `references/authoring-fast-path.md` from this skill.
4. For unclear input mapping, load `references/input-mapping.md`.

Do not use stale README snippets, old `.d.ts` files, or legacy SDL examples as the source of truth.

## Workflow

1. Extract facts from the input.
   - Identify product name, purpose, stage, architecture style, projects, database, auth, deployment, integrations, compliance, SLOs, and generated artifacts.
   - Separate explicit facts from assumptions. Put uncertain details in review notes or `x-*` metadata, not stable schema fields.
2. Draft the minimum valid SDL first.
   - Always include `sdlVersion`, `solution`, `architecture`, and `data`.
   - Add optional sections only when the input provides real facts or the user asks for a richer architecture baseline.
3. Use canonical SDL v1.1 values exactly.
   - Preserve enum casing and hyphenation, such as `MVP`, `modular-monolith`, `python-fastapi`, and `github-actions`.
   - Translate common aliases to canonical values before writing YAML.
4. Avoid unsupported schema fields.
   - Put custom metadata under `x-*` extension fields.
   - Do not invent non-`x-*` root sections.
5. Validate and repair.
   - Run `node .claude/skills/sdl-author/scripts/validate-sdl.mjs <file>` when a file exists.
   - If validation fails, fix the SDL and validate again.
   - Do not present SDL as complete until validation passes, unless validation is blocked and the blocker is stated.

## Authoring Rules

- Prefer omit over guess. Missing optional sections are valid; unknown enum values are not.
- Do not set normalizer-inferred fields unless the input explicitly requires an override.
- If an optional section is present, include that section's required fields.
- Use `features[]` as an array of objects. Do not group features by phase.
- Use `contracts.apis[]`, not a top-level `contracts[]`.
- Use `slos.services[]`, not a top-level `slos[]`.
- Use `auth.strategy: oidc` with `auth.sessions.accessToken: jwt` when the input says JWT-based OIDC.
- Use `x-*` keys for navigation patterns, UI notes, repo evidence, confidence, open questions, and source traceability.

## Output Shape

When generating SDL for a user, provide:

1. The SDL YAML or the path to the created SDL file.
2. A short list of assumptions or review items.
3. Validation result, including command run and any warnings.

When editing an existing SDL file, keep unrelated content intact and scope changes to the requested sections.

## Validation Script

From the repository root, use:

```bash
node .claude/skills/sdl-author/scripts/validate-sdl.mjs path/to/solution.sdl.yaml
```

Useful options:

```bash
node .claude/skills/sdl-author/scripts/validate-sdl.mjs path/to/solution.sdl.yaml --repo /path/to/solution-definition-language
node .claude/skills/sdl-author/scripts/validate-sdl.mjs path/to/solution.sdl.yaml --json
```

The script looks for the SDL core package in the current repo and uses its parser, validator, semantic validator, resolver, and normalizer when available.
