# Contributing to SDL

Thank you for your interest in contributing to the Solution Design Language specification.

## Types of Contributions

### Schema Changes (RFC Process)

Changes to the SDL schema (adding fields, modifying types, changing validation rules) follow an RFC process:

1. **Open an issue** using the "Schema Change" template
2. **Describe the change** — what section, what fields, what types
3. **Provide rationale** — why this is needed, what use cases it enables
4. **Show examples** — YAML examples of the new schema in use
5. **Consider backward compatibility** — can existing SDL files still validate?
6. **Discussion period** — community feedback for at least 7 days
7. **Implementation** — update JSON Schema, TypeScript types, and documentation

### Templates

New SDL templates are welcome. A good template:
- Represents a common product archetype
- Uses realistic values (not placeholders)
- Validates against the current schema
- Includes all relevant sections for the product type
- Has a clear name and description in `_index.yaml`

### Documentation

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add examples for under-documented sections
- Improve error message descriptions
- Add generator documentation

### Generators

New generators or improvements to existing ones:
- Follow the `GeneratorResult` interface (returns `{ artifactType, files, metadata }`)
- Include tests with fixture SDL files
- Document what SDL sections the generator consumes

## Development Setup

```bash
# Clone the repo
git clone https://github.com/navraj007in/solution-definition-language.git
cd solution-definition-language

# Install dependencies for the reference implementation
cd packages/sdl
npm install

# Run tests
npm test

# Build
npm run build
```

## Validation

All templates and examples must validate against the JSON Schema:

```bash
# The CI workflow validates automatically on PR
npm test
```

## Code of Conduct

Be respectful, constructive, and collaborative. Architecture is opinionated — disagreements are expected and healthy. Focus on use cases and rationale, not personal preferences.

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0.
