export { parse } from './parser';
export type { ParseResult } from './parser';
export { validate } from './validator';
export { validateSemantics } from './semantic-validator';
export { normalize } from './normalizer';
export type { NormalizeResult } from './normalizer';
export { detectWarnings } from './warnings';

// Resolver (modular SDL imports)
export { parseWithImports, validatePerModule } from './resolver';
export type { ResolvedSdl, SdlModule, ResolveWarning, ResolveError, FileReader } from './resolver';

// Generators
export { generate, generateAll, generateCiCd, generateDockerCompose, generateKubernetes, generateMonitoring, generateNginxConfig, generateCodingRules, generateCodingRulesEnforcement, generateComplianceChecklist, generateDeployDiagram, getImplementedArtifactTypes, getGeneratorTier, summarizeGenerationResults } from './generators';
export type { GeneratorFn, GeneratorResult, GenerateAllResult, GeneratedFile, GeneratorTier, RawGeneratorResult, DeployDiagramInput } from './generators';
export type { AITarget, CodingRulesOptions } from './generators/coding-rules';

// ADR rules parser
export { parseADR, parseADRs, adrsToCodingRules } from './generators/adr-rules';
export type { ParsedADR } from './generators/adr-rules';

// Pricing knowledge base
export {
  PLATFORM_PRICING, getPlatformPricing, getComputeCost, getDatabaseCost,
  SERVICE_PRICING, getServicePricing, getServiceCost,
  projectCostGrowth,
  buildPricingSummaryForPrompt,
} from './pricing';
export type { PlatformPricing, TierPricing, FreeTierInfo, ScaleProjection, ServicePricing } from './pricing';

// Migration
export { migrate } from './migrate';
export type { MigrateResult, MigrationChange } from './migrate';

// Diff
export { diff } from './diff';
export type { SDLDiffEntry, SDLDiffResult } from './diff';

// ADR Impact Classifier
export { classifyDiffForAdr } from './adr-impact';
export type { AdrCategory, AdrRuleCode, Severity, Confidence, CompoundTrigger, AdrImpactSuggestion, AdrImpactResult } from './adr-impact';

// ADR Draft Generator
export { generateAdrDraftFromDiff } from './adr-draft';
export type { AdrDraft } from './adr-draft';

// Progress tracker
export { resolveProgress } from './progress';
export { deriveVerificationSpec } from './progress';
export type {
  ComponentStatus, ProgressCategory, ComponentProgress,
  CategorySummary, ProgressSnapshot, CodebaseSignals,
  ProgressEvidence, ManualOverride,
  ComponentSpec, ArtifactCheck, ScaffoldManifest, ScaffoldManifestEntry,
} from './progress';

// Templates
export { getTemplates, getTemplate, listTemplates } from './templates';
export type { SDLTemplate } from './templates';

export type {
  Inference,
  SDLDocument,
  ComplianceFramework,
  ComplianceRequirement,
  ResilienceCircuitBreaker,
  ResilienceRetryPolicy,
  SolutionMetadata,
  ProductContext,
  Persona,
  CoreFlow,
  Architecture,
  Projects,
  FrontendProject,
  BackendProject,
  MobileProject,
  Service,
  Authentication,
  DataLayer,
  Database,
  Integrations,
  NFRs,
  Availability,
  Scaling,
  Security,
  Deployment,
  DeploymentRuntime,
  Constraints,
  Team,
  TechDebt,
  Evolution,
  Testing,
  Observability,
  ArtifactConfig,
  ArtifactType,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSummary,
  CompileResult,
} from './types';

import { parse } from './parser';
import { validate } from './validator';
import { validateSemantics } from './semantic-validator';
import { normalize } from './normalizer';
import { parseWithImports } from './resolver';
import type { FileReader, ResolvedSdl } from './resolver';
import type { SDLDocument, CompileResult, ValidationError as VError, Inference } from './types';

/**
 * Combined pipeline: parse YAML → validate schema → normalize defaults.
 * Returns a fully resolved SDL document or errors.
 */
export interface CompileWithImportsResult extends CompileResult {
  modules: ResolvedSdl['modules'];
  resolveWarnings: ResolvedSdl['warnings'];
  resolveErrors: ResolvedSdl['errors'];
}

/**
 * Combined pipeline for modular SDL: resolve imports → merge → validate → normalize.
 * Accepts a readFile function to support both filesystem and API contexts.
 */
export function compileWithImports(
  rootYaml: string,
  readFile: FileReader,
  rootPath: string = 'root',
): CompileWithImportsResult {
  const resolved = parseWithImports(rootYaml, readFile, rootPath);

  if (resolved.errors.length > 0 && Object.keys(resolved.document).length === 0) {
    return {
      success: false,
      errors: resolved.errors.map(e => ({
        type: 'error' as const,
        code: e.type === 'missing-file' ? 'MISSING_IMPORT' : e.type === 'circular-import' ? 'CIRCULAR_IMPORT' : 'PARSE_ERROR',
        path: e.path?.join('.') ?? '',
        message: `[${e.sourceModule}] ${e.message}`,
      })),
      warnings: [],
      document: null,
      summary: null,
      inferences: [],
      modules: resolved.modules,
      resolveWarnings: resolved.warnings,
      resolveErrors: resolved.errors,
    };
  }

  // Validate merged document
  const validationResult = validate(resolved.document);
  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors,
      warnings: [],
      document: null,
      summary: null,
      inferences: [],
      modules: resolved.modules,
      resolveWarnings: resolved.warnings,
      resolveErrors: resolved.errors,
    };
  }

  // Semantic validation (cross-section relational checks)
  const semanticErrors = validateSemantics(resolved.document as unknown as SDLDocument);
  if (semanticErrors.length > 0) {
    return {
      success: false,
      errors: semanticErrors,
      warnings: [],
      document: null,
      summary: null,
      inferences: [],
      modules: resolved.modules,
      resolveWarnings: resolved.warnings,
      resolveErrors: resolved.errors,
    };
  }

  // Normalize
  const { document: normalized, inferences } = normalize(resolved.document as unknown as SDLDocument);

  return {
    success: true,
    errors: [],
    warnings: validationResult.warnings,
    document: normalized,
    summary: validationResult.summary ?? null,
    inferences,
    modules: resolved.modules,
    resolveWarnings: resolved.warnings,
    resolveErrors: resolved.errors,
  };
}

/**
 * Combined pipeline: parse YAML → validate schema → normalize defaults.
 * Returns a fully resolved SDL document, validation warnings, and a list
 * of every field that was inferred by the normalizer.
 */
export function compile(yamlString: string): CompileResult {
  // 1. Parse YAML
  const parseResult = parse(yamlString);
  if (parseResult.errors.length > 0) {
    return {
      success: false,
      errors: parseResult.errors,
      warnings: [],
      document: null,
      summary: null,
      inferences: [],
    };
  }

  // 2. Validate against schema
  const validationResult = validate(parseResult.data);
  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors,
      warnings: [],
      document: null,
      summary: null,
      inferences: [],
    };
  }

  // 2.5. Semantic validation (cross-section relational checks)
  const semanticErrors = validateSemantics(parseResult.data as SDLDocument);
  if (semanticErrors.length > 0) {
    return {
      success: false,
      errors: semanticErrors,
      warnings: [],
      document: null,
      summary: null,
      inferences: [],
    };
  }

  // 3. Normalize (apply auto-inference defaults)
  const { document: normalized, inferences } = normalize(parseResult.data as SDLDocument);

  return {
    success: true,
    errors: [],
    warnings: validationResult.warnings,
    document: normalized,
    summary: validationResult.summary ?? null,
    inferences,
  };
}
