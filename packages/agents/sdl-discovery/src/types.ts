/**
 * Type definitions for SDL Discovery Agent
 */

export type ScanMode = 'inventory' | 'discovery' | 'drift' | 'monorepo';
export type ComponentType = 'service' | 'frontend' | 'worker' | 'library' | 'infra-module' | 'contract-package';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Evidence source for a component or relationship
 */
export interface Evidence {
  file: string;
  reason: string;
  repo?: string;
  confidence?: ConfidenceLevel;
}

/**
 * Detected software component
 */
export interface Component {
  id: string;
  type: ComponentType;
  name: string;
  description?: string;
  repo?: string;
  confidence: ConfidenceLevel;
  evidence: Evidence[];
  language?: string;
  framework?: string;
  runtime?: string;
  properties?: Record<string, unknown>;
  reviewRequired?: boolean;
}

/**
 * Inferred dependency between components
 */
export interface Dependency {
  source: string;
  target: string;
  type: 'http' | 'queue' | 'database' | 'cache' | 'event' | 'import' | 'unknown';
  confidence: ConfidenceLevel;
  evidence: Evidence[];
  bidirectional?: boolean;
  reviewRequired?: boolean;
}

/**
 * Detected data store
 */
export interface DataStore {
  id: string;
  type: 'database' | 'cache' | 'queue' | 'storage';
  technology: string;
  hosting?: 'managed' | 'self-hosted' | 'local';
  evidence: Evidence[];
  confidence: ConfidenceLevel;
  reviewRequired?: boolean;
}

/**
 * Detected external integration
 */
export interface ExternalIntegration {
  id: string;
  provider: string;
  type: string;
  usedBy: string[]; // component IDs
  evidence: Evidence[];
  confidence: ConfidenceLevel;
  reviewRequired?: boolean;
}

/**
 * Human review item
 */
export interface ReviewItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'conflict' | 'ambiguity' | 'dead-code' | 'unclear-boundary' | 'missing-evidence';
  title: string;
  description: string;
  affectedComponents?: string[];
  suggestedActions?: string[];
  resolved?: boolean;
}

/**
 * Scan summary metadata
 */
export interface ScanMetadata {
  timestamp: string;
  mode: ScanMode;
  reposScanned: string[];
  filesExamined: number;
  languageBreakdown: Record<string, number>;
  frameworksDetected: string[];
  signaturesMatched: number;
  executionTimeMs: number;
}

/**
 * Complete discovery result
 */
export interface DiscoveryResult {
  metadata: ScanMetadata;
  components: Component[];
  dependencies: Dependency[];
  datastores: DataStore[];
  integrations: ExternalIntegration[];
  reviewItems: ReviewItem[];
  unknownAreas: string[];
  assumptions: string[];
  confidence: {
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    averageConfidence: number;
  };
}

/**
 * SDL Discovery agent configuration
 */
export interface DiscoveryConfig {
  repos: string[];
  mode: ScanMode;
  outputDir: string;
  existingSdl?: string;
  domainHints?: Record<string, string>;
  environmentHints?: Record<string, string>;
  ignorePatterns?: string[];
  sdlVersion?: string;
  confidenceThreshold?: ConfidenceLevel;
  maxScanDepth?: number;
  monoRepoMode?: boolean;
}

/**
 * Heuristic rule for component detection
 */
export interface HeuristicRule {
  id: string;
  componentType: ComponentType;
  category: string;
  signal: string;
  weight: number; // 0.0 to 1.0
  confidence: ConfidenceLevel;
  indicators: string[];
}

/**
 * Analysis result from applying heuristics
 */
export interface HeuristicAnalysis {
  componentId: string;
  detectedType: ComponentType;
  score: number;
  matchedRules: HeuristicRule[];
  confidence: ConfidenceLevel;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complexity Scoring Types (v1.0)
// ─────────────────────────────────────────────────────────────────────────────

export type ComplexityProfile = 'startup' | 'enterprise' | 'platform';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very-complex' | 'extreme';
export type BlastRadius = 'critical' | 'high' | 'moderate' | 'low';
export type CiCdMaturity = 'missing' | 'partial' | 'automated';
export type IaCMaturity = 'missing' | 'partial' | 'full';
export type ObservabilityLevel = 'missing' | 'basic' | 'good';
export type SecretsMaturity = 'env_vars' | 'vault' | 'hsm';
export type DrMaturity = 'unknown' | 'none' | 'documented' | 'tested' | 'automated';
export type HealthCheckMaturity = 'missing' | 'basic' | 'comprehensive';

/**
 * Score for a single complexity dimension
 */
export interface DimensionScore {
  score: number; // 1-10
  confidence: ConfidenceLevel;
  evidence: string[];
}

/**
 * Breakdown of structural complexity metrics
 */
export interface StructuralBreakdown {
  services: number;
  frontends: number;
  workers: number;
  libraries: number;
  totalNodes: number;
  syncInteractions: number;
  asyncInteractions: number;
  implicitDependencies: number;
  nasaScm: number;
  couplingDensity: number;
  criticalPathDepth: number;
  maxFanIn: number;
  maxFanOut: number;
}

/**
 * Sub-dimension score for dynamic complexity
 */
export interface DynamicSubDimension {
  score: number;
  evidence: string[];
}

/**
 * Integration risk assessment
 */
export interface IntegrationRiskItem {
  name: string;
  type: string;
  blastRadius: BlastRadius;
  fallback: string;
  circuitBreaker: boolean;
}

/**
 * Technology stack breakdown
 */
export interface TechnologyBreakdown {
  languages: number;
  frameworks: number;
  dbTypes: number;
  versionDrift: number; // 0=none, 1=minor, 2=moderate, 3+=significant
}

/**
 * Delivery operational factors
 */
export interface DeliveryFactors {
  ciCd: CiCdMaturity;
  iac: IaCMaturity;
  observability: {
    logging: ObservabilityLevel;
    metrics: ObservabilityLevel;
    tracing: ObservabilityLevel;
  };
  secretsManagement: SecretsMaturity;
  healthChecks: HealthCheckMaturity;
  backupDr: DrMaturity;
}

/**
 * Prioritized complexity reduction action
 */
export interface ReductionPlanItem {
  rank: number;
  title: string;
  targetDimension: string;
  currentScore: number;
  targetScore: number;
  impact: string;
  timeline: string;
  effort: 'low' | 'medium' | 'high';
  businessValue: string;
  estimatedCost?: string;
}

/**
 * Risk flagged during complexity analysis
 */
export interface ComplexityRiskItem {
  title: string;
  dimension: string;
  impact: string;
  mitigation: string;
  probability?: 'low' | 'medium' | 'high';
  frequency?: string;
}

/**
 * Historical complexity score entry
 */
export interface ComplexityHistoryEntry {
  date: string;
  architectureIndex: number;
  deliveryIndex: number;
  unifiedScore: number;
  source: string;
  notes?: string;
}

/**
 * Complete complexity assessment result
 */
export interface ComplexityResult {
  profile: ComplexityProfile;

  architectureIndex: {
    structural: DimensionScore & { breakdown: StructuralBreakdown };
    dynamic: DimensionScore & {
      temporal: DynamicSubDimension;
      state: DynamicSubDimension;
      consistencyModel: DynamicSubDimension & { model: string };
    };
    integration: DimensionScore & {
      failureIsolation: DimensionScore;
      integrations: {
        total: number;
        critical: IntegrationRiskItem[];
        nonCritical: string[];
      };
    };
    technology: DimensionScore & { breakdown: TechnologyBreakdown };
    subtotal: number;
  };

  deliveryIndex: {
    deliveryBurden: DimensionScore & { factors: DeliveryFactors };
    organizational: DimensionScore & {
      autoDiscovered: boolean;
      requiresValidation: boolean;
      estimatedFrom: string;
    };
    subtotal: number;
  };

  executiveSummary: {
    architectureIndex: number;
    deliveryIndex: number;
    unifiedScore: number;
    level: ComplexityLevel;
    interpretation: string;
  };

  reductionPlan: ReductionPlanItem[];
  risks: {
    critical: ComplexityRiskItem[];
    high: ComplexityRiskItem[];
  };
  history: ComplexityHistoryEntry[];
}

/**
 * Input for complexity calculation
 */
export interface ComplexityInput {
  discoveryResult: DiscoveryResult;
  profile?: ComplexityProfile; // override auto-detected profile
}
