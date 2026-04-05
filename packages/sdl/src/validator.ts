import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import sdlSchema from './schema/sdl-v1.1.schema.json';
import { mapAjvErrors } from './error-map';
import { detectWarnings } from './warnings';
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

export function validate(data: unknown): ValidationResult {
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
