import type { ArtifactType, SDLDocument } from '../types';
import type { GeneratorFn, GeneratorResult, GenerateAllResult } from './types';
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
};

/** Get the set of implemented artifact types */
export function getImplementedArtifactTypes(): ArtifactType[] {
  return Object.keys(GENERATOR_MAP) as ArtifactType[];
}

/** Generate a single artifact type */
export function generate(doc: SDLDocument, artifactType: ArtifactType): GeneratorResult | null {
  const generator = GENERATOR_MAP[artifactType];
  if (!generator) return null;
  return generator(doc);
}

/** Generate all artifacts listed in doc.artifacts.generate */
export function generateAll(doc: SDLDocument): GenerateAllResult {
  const results: GeneratorResult[] = [];
  const skipped: ArtifactType[] = [];

  for (const artifactType of doc.artifacts.generate) {
    const generator = GENERATOR_MAP[artifactType];
    if (generator) {
      results.push(generator(doc));
    } else {
      skipped.push(artifactType);
    }
  }

  return { results, skipped };
}

/** Generate CI/CD pipeline specifically */
export function generateCiCd(doc: SDLDocument): GeneratorResult {
  return generateCiCdPipeline(doc);
}

/** Generate Docker Compose for local development */
export function generateDockerCompose(doc: SDLDocument): GeneratorResult {
  return generateDockerComposeInternal(doc);
}

/** Generate Kubernetes manifests (Deployment, Service, HPA, Ingress, ConfigMap, Namespace) */
export function generateKubernetes(doc: SDLDocument): GeneratorResult {
  return generateKubernetesInternal(doc);
}

/** Generate monitoring configs (Prometheus, alert rules, Grafana dashboard) */
export function generateMonitoring(doc: SDLDocument): GeneratorResult {
  return generateMonitoringInternal(doc);
}

/** Generate Nginx reverse proxy configuration */
export function generateNginxConfig(doc: SDLDocument): GeneratorResult {
  return generateNginxConfigInternal(doc);
}

/** Generate AI coding rules (CLAUDE.md, .cursorrules, copilot-instructions) from SDL */
export function generateCodingRules(doc: SDLDocument): GeneratorResult {
  return generateCodingRulesInternal(doc);
}

/** Generate enforcement configs (ESLint, dependency-cruiser, arch tests, CI gates) from SDL */
export function generateCodingRulesEnforcement(doc: SDLDocument): GeneratorResult {
  return generateCodingRulesEnforcementInternal(doc);
}

export { generateDeployDiagram } from './deploy-diagram';
export type { DeployDiagramInput } from './deploy-diagram';
export type { GeneratorFn, GeneratorResult, GenerateAllResult, GeneratedFile } from './types';
