# @arch0/sdl Package Roadmap

All planned items are complete. See [CHANGELOG.md](../../CHANGELOG.md) for version history.

For SDL language evolution, see [`spec/ROADMAP.md`](../../spec/ROADMAP.md).

## Current State

- 520 tests, 0 failures
- 13 registry-backed artifact types, 5 direct API generators
- All outputs carry `tier: deterministic | inferred | advisory`
- Advisory outputs carry a review header in the generated file
- `compile()` returns `inferences[]` — every normalizer-applied default is visible
- `migrate()` detects and fixes all known stale SDL vocabulary
- `summarizeGenerationResults()` provides formatted tier breakdown for CLI consumers
- `contracts.apis[]` and `domain.entities[]` read by openapi and data-model generators
- `slos.services[]` drives per-service alert thresholds in monitoring generator
- `resilience` section drives specific rules in coding-rules generator
- `compliance.frameworks[]` drives compliance-checklist generator
