export { parse } from './parser';
export { validate } from './validator';
export { normalize } from './normalizer';
export { detectWarnings } from './warnings';
// Resolver (modular SDL imports)
export { parseWithImports, validatePerModule } from './resolver';
// Generators
export { generate, generateAll, generateCiCd, generateDockerCompose, generateKubernetes, generateMonitoring, generateNginxConfig, generateCodingRules, generateCodingRulesEnforcement, generateComplianceChecklist, generateDeployDiagram, getImplementedArtifactTypes, getGeneratorTier, summarizeGenerationResults } from './generators';
// ADR rules parser
export { parseADR, parseADRs, adrsToCodingRules } from './generators/adr-rules';
// Pricing knowledge base
export { PLATFORM_PRICING, getPlatformPricing, getComputeCost, getDatabaseCost, SERVICE_PRICING, getServicePricing, getServiceCost, projectCostGrowth, buildPricingSummaryForPrompt, } from './pricing';
// Migration
export { migrate } from './migrate';
// Diff
export { diff } from './diff';
// ADR Impact Classifier
export { classifyDiffForAdr } from './adr-impact';
// ADR Draft Generator
export { generateAdrDraftFromDiff } from './adr-draft';
// Progress tracker
export { resolveProgress } from './progress';
export { deriveVerificationSpec } from './progress';
// Templates
export { getTemplates, getTemplate, listTemplates } from './templates';
import { parse } from './parser';
import { validate } from './validator';
import { normalize } from './normalizer';
import { parseWithImports } from './resolver';
/**
 * Combined pipeline for modular SDL: resolve imports → merge → validate → normalize.
 * Accepts a readFile function to support both filesystem and API contexts.
 */
export function compileWithImports(rootYaml, readFile, rootPath = 'root') {
    const resolved = parseWithImports(rootYaml, readFile, rootPath);
    if (resolved.errors.length > 0 && Object.keys(resolved.document).length === 0) {
        return {
            success: false,
            errors: resolved.errors.map(e => ({
                type: 'error',
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
    // Normalize
    const { document: normalized, inferences } = normalize(resolved.document);
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
export function compile(yamlString) {
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
    // 3. Normalize (apply auto-inference defaults)
    const { document: normalized, inferences } = normalize(parseResult.data);
    return {
        success: true,
        errors: [],
        warnings: validationResult.warnings,
        document: normalized,
        summary: validationResult.summary ?? null,
        inferences,
    };
}
