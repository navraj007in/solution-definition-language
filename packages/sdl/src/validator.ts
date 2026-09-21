import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import sdlSchema from './schema/sdl-v1.1.schema.json';
import { mapAjvErrors } from './error-map';
import { detectWarnings } from './warnings';
import { validateSemantics } from './semantic-validator';
import type { SDLDocument, ValidationResult, ValidationSummary } from './types';

// ─── AJV Setup ───

// strict: false because schema uses custom `errorMessage` keyword
const ajv = new Ajv({ allErrors: true, strict: false });

let compiled: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!compiled) {
    compiled = ajv.compile(sdlSchema);
  }
  return compiled;
}

// ─── Public API ───

/**
 * Schema-only validation: runs the AJV JSON Schema (including the
 * conditional allOf rules) and returns contextual warnings + a summary on
 * success. Does NOT run the semantic cross-section rules in
 * `validateSemantics` (reference integrity, uniqueness, cycle detection,
 * etc.) — a `valid: true` result here can still be semantically invalid SDL.
 * Use `validateDocument` for a combined result.
 */
export function validateSchema(data: unknown): ValidationResult {
  const validator = getValidator();
  const valid = validator(data);

  if (!valid) {
    const errors = mapAjvErrors(validator.errors || []);
    return { valid: false, errors, warnings: [] };
  }

  // Schema passed — run contextual warnings
  const sdl = data as SDLDocument;
  const warnings = detectWarnings(sdl);
  const summary = buildSummary(sdl);

  return { valid: true, errors: [], warnings, summary };
}

/**
 * Combined validation: JSON Schema first, then (only if the schema passes)
 * the semantic cross-section rules. This is what `compile()` runs, and what
 * the README describes as "the validator" — use this whenever the caller's
 * `valid: true` needs to mean "safe to treat as well-formed SDL", not just
 * "schema-shaped".
 */
export function validateDocument(data: unknown): ValidationResult {
  const schemaResult = validateSchema(data);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  const semanticErrors = validateSemantics(data as SDLDocument);
  if (semanticErrors.length > 0) {
    return { valid: false, errors: semanticErrors, warnings: schemaResult.warnings };
  }

  return schemaResult;
}

/**
 * @deprecated Alias for `validateDocument`. Prior to 1.2.0 this function
 * only ran schema validation, so `valid: true` did not guarantee the
 * document passed the semantic rules described in the README — that was a
 * bug, not a documented distinction. Call `validateSchema` directly if you
 * specifically want schema-only validation (e.g. to report schema and
 * semantic errors in separate passes), or `validateDocument` to make the
 * combined intent explicit at the call site.
 */
export function validate(data: unknown): ValidationResult {
  return validateDocument(data);
}

// ─── Summary Builder ───

function buildSummary(sdl: SDLDocument): ValidationSummary {
  const frontendCount = sdl.architecture.projects.frontend?.length ?? 0;
  const backendCount = sdl.architecture.projects.backend?.length ?? 0;
  const mobileCount = sdl.architecture.projects.mobile?.length ?? 0;
  const projects = frontendCount + backendCount + mobileCount;

  return {
    architecture: sdl.architecture.style,
    projects,
    estimatedCost: estimateCostRange(sdl),
    artifactsToGenerate: sdl.artifacts?.generate?.length ?? 0,
  };
}

function estimateCostRange(sdl: SDLDocument): string {
  const cloud = sdl.deployment?.cloud;
  const budget = sdl.constraints?.budget;

  // Simple heuristics based on cloud + budget tier
  if (budget === 'startup' || (cloud !== undefined && ['vercel', 'railway', 'render'].includes(cloud))) {
    return '$0-100/mo';
  }
  if (budget === 'scaleup') {
    return '$100-500/mo';
  }
  if (budget === 'enterprise') {
    return '$500-5000/mo';
  }
  return '$50-300/mo';
}
