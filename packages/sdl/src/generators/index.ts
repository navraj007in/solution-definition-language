import type { ArtifactType, SDLDocument } from '../types';
import type { GeneratorFn, GeneratorResult, GenerateAllResult, GeneratorTier, RawGeneratorResult } from './types';
import { generateArchitectureDiagram } from './architecture';
import { generateRepoScaffold } from './scaffold';
import { generateCiCdPipeline } from './cicd';
import { generateADRs } from './adr';
import { generateOpenApiSpec } from './openapi';
import { generateDataModel } from './data-model';
import { generateSequenceDiagrams } from './sequence-diagrams';
import { generateBacklog } from './backlog';
import { generateDeploymentGuide } from './deployment-guide';
import { generateCostEstimate } from './cost-estimate';
import { generateDockerCompose as generateDockerComposeInternal } from './docker-compose';
import { generateKubernetes as generateKubernetesInternal } from './kubernetes';
import { generateMonitoring as generateMonitoringInternal } from './monitoring';
import { generateNginxConfig as generateNginxConfigInternal } from './nginx';
import { generateCodingRules as generateCodingRulesInternal } from './coding-rules';
import { generateCodingRulesEnforcement as generateCodingRulesEnforcementInternal } from './coding-rules-enforcement';
import { generateComplianceChecklist as generateComplianceChecklistInternal } from './compliance-checklist';

/** Maps each implemented artifact type to its generator function */
const GENERATOR_MAP: Partial<Record<ArtifactType, GeneratorFn>> = {
  'architecture-diagram': generateArchitectureDiagram,
  'repo-scaffold': generateRepoScaffold,
  'iac-skeleton': generateCiCdPipeline,
  adr: generateADRs,
  openapi: generateOpenApiSpec,
  'data-model': generateDataModel,
  'sequence-diagrams': generateSequenceDiagrams,
  backlog: generateBacklog,
  'deployment-guide': generateDeploymentGuide,
  'cost-estimate': generateCostEstimate,
  'compliance-checklist': generateComplianceChecklistInternal,
};

/**
 * Confidence tier for each registry-backed artifact type.
 *
 * deterministic — correct by construction from SDL facts; same input always
 *   produces the same output; safe to use without manual review.
 *
 * inferred — derived from SDL facts via heuristics; structurally sound but
 *   may contain assumptions worth reviewing before committing.
 *
 * advisory — starting point only; requires human review and editing.
 */
const REGISTRY_TIER_MAP: Record<ArtifactType, GeneratorTier> = {
  // deterministic — pure structural mapping from SDL facts
  'architecture-diagram': 'deterministic',
  'repo-scaffold':        'deterministic',
  'iac-skeleton':         'deterministic',
  openapi:                'deterministic',
  'data-model':           'deterministic',
  'sequence-diagrams':    'deterministic',
  // inferred — SDL-derived but uses heuristics for conventions and rule severity
  'coding-rules':             'inferred',
  'coding-rules-enforcement': 'inferred',
  // advisory — useful starting points; require review before use
  backlog:               'advisory',
  adr:                   'advisory',
  'deployment-guide':    'advisory',
  'cost-estimate':       'advisory',
  'compliance-checklist': 'advisory',
};

/** Confidence tier for each direct API generator */
const DIRECT_TIER_MAP: Record<string, GeneratorTier> = {
  'docker-compose': 'deterministic',
  kubernetes:       'deterministic',
  monitoring:       'deterministic',
  nginx:            'deterministic',
  cicd:             'deterministic',
  'deploy-diagram': 'deterministic',
};

const ADVISORY_HEADER = '<!-- sdl:generated tier:advisory — review and edit before committing -->\n\n';

/** Inject tier into a raw generator result. Advisory outputs get a review header on Markdown files. */
function withTier(raw: RawGeneratorResult, tier: GeneratorTier): GeneratorResult {
  if (tier === 'advisory') {
    const files = raw.files.map((f) =>
      f.path.endsWith('.md') || f.path.endsWith('.mdc')
        ? { ...f, content: ADVISORY_HEADER + f.content }
        : f,
    );
    return { ...raw, files, tier };
  }
  return { ...raw, tier };
}

/** Get the set of implemented artifact types */
export function getImplementedArtifactTypes(): ArtifactType[] {
  return Object.keys(GENERATOR_MAP) as ArtifactType[];
}

/** Get the confidence tier for a registry-backed artifact type */
export function getGeneratorTier(artifactType: ArtifactType): GeneratorTier {
  return REGISTRY_TIER_MAP[artifactType] ?? 'advisory';
}

/** Generate a single artifact type */
export function generate(doc: SDLDocument, artifactType: ArtifactType): GeneratorResult | null {
  const generator = GENERATOR_MAP[artifactType];
  if (!generator) return null;
  return withTier(generator(doc), REGISTRY_TIER_MAP[artifactType] ?? 'advisory');
}

/** Generate all artifacts listed in doc.artifacts.generate when present */
export function generateAll(doc: SDLDocument): GenerateAllResult {
  const results: GeneratorResult[] = [];
  const skipped: ArtifactType[] = [];

  for (const artifactType of doc.artifacts?.generate ?? []) {
    const generator = GENERATOR_MAP[artifactType];
    if (generator) {
      results.push(withTier(generator(doc), REGISTRY_TIER_MAP[artifactType] ?? 'advisory'));
    } else {
      skipped.push(artifactType);
    }
  }

  return { results, skipped };
}

/** Generate CI/CD pipeline specifically */
export function generateCiCd(doc: SDLDocument): GeneratorResult {
  return withTier(generateCiCdPipeline(doc), DIRECT_TIER_MAP['cicd']);
}

/** Generate Docker Compose for local development */
export function generateDockerCompose(doc: SDLDocument): GeneratorResult {
  return withTier(generateDockerComposeInternal(doc), DIRECT_TIER_MAP['docker-compose']);
}

/** Generate Kubernetes manifests (Deployment, Service, HPA, Ingress, ConfigMap, Namespace) */
export function generateKubernetes(doc: SDLDocument): GeneratorResult {
  return withTier(generateKubernetesInternal(doc), DIRECT_TIER_MAP['kubernetes']);
}

/** Generate monitoring configs (Prometheus, alert rules, Grafana dashboard) */
export function generateMonitoring(doc: SDLDocument): GeneratorResult {
  return withTier(generateMonitoringInternal(doc), DIRECT_TIER_MAP['monitoring']);
}

/** Generate Nginx reverse proxy configuration */
export function generateNginxConfig(doc: SDLDocument): GeneratorResult {
  return withTier(generateNginxConfigInternal(doc), DIRECT_TIER_MAP['nginx']);
}

/** Generate AI coding rules (CLAUDE.md, .cursorrules, copilot-instructions) from SDL */
export function generateCodingRules(doc: SDLDocument): GeneratorResult {
  return withTier(generateCodingRulesInternal(doc), REGISTRY_TIER_MAP['coding-rules']);
}

/** Generate enforcement configs (ESLint, dependency-cruiser, arch tests, CI gates) from SDL */
export function generateCodingRulesEnforcement(doc: SDLDocument): GeneratorResult {
  return withTier(generateCodingRulesEnforcementInternal(doc), REGISTRY_TIER_MAP['coding-rules-enforcement']);
}

/** Generate a per-framework compliance checklist from compliance.frameworks[] */
export function generateComplianceChecklist(doc: SDLDocument): GeneratorResult {
  return withTier(generateComplianceChecklistInternal(doc), REGISTRY_TIER_MAP['compliance-checklist']);
}

/**
 * Returns a human-readable tier summary for a set of generator results.
 * Useful for CLI output and logging.
 *
 * Example output:
 *   Generated 8 artifacts:
 *
 *     deterministic (6)  architecture-diagram, repo-scaffold, openapi, ...
 *     inferred (2)       coding-rules, coding-rules-enforcement  ← review before committing
 *     advisory (4)       adr, backlog, deployment-guide, cost-estimate  ← drafts, edit before use
 *
 *   Advisory outputs require review. Run with --tier deterministic to skip them.
 */
export function summarizeGenerationResults(results: GeneratorResult[]): string {
  const byTier: Record<GeneratorTier, string[]> = {
    deterministic: [],
    inferred: [],
    advisory: [],
  };
  for (const r of results) {
    byTier[r.tier].push(r.artifactType);
  }

  const total = results.length;
  const lines: string[] = [`Generated ${total} artifact${total !== 1 ? 's' : ''}:`];

  const tierLines: string[] = [];
  if (byTier.deterministic.length > 0) {
    tierLines.push(`  deterministic (${byTier.deterministic.length})  ${byTier.deterministic.join(', ')}`);
  }
  if (byTier.inferred.length > 0) {
    tierLines.push(`  inferred (${byTier.inferred.length})       ${byTier.inferred.join(', ')}  ← review before committing`);
  }
  if (byTier.advisory.length > 0) {
    tierLines.push(`  advisory (${byTier.advisory.length})       ${byTier.advisory.join(', ')}  ← drafts, edit before use`);
  }

  if (tierLines.length > 0) {
    lines.push('');
    lines.push(...tierLines);
  }

  if (byTier.advisory.length > 0) {
    lines.push('');
    lines.push('Advisory outputs require review. Filter with --tier deterministic to skip them.');
  }

  return lines.join('\n');
}

export { generateDeployDiagram } from './deploy-diagram';
export type { DeployDiagramInput } from './deploy-diagram';
export type { GeneratorFn, GeneratorResult, GenerateAllResult, GeneratedFile, GeneratorTier, RawGeneratorResult } from './types';
