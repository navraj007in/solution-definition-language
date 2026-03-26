// ─── Blueprint Progress Tracker Types ───

export type ComponentStatus = 'not_started' | 'in_progress' | 'done';

export type ProgressCategory =
  | 'architecture_decisions'
  | 'backend_services'
  | 'databases'
  | 'frontends'
  | 'auth'
  | 'integrations'
  | 'infrastructure'
  | 'observability';

export interface ComponentProgress {
  id: string;                    // e.g., "service:auth", "database:postgres", "integration:stripe"
  category: ProgressCategory;
  label: string;
  status: ComponentStatus;
  evidence: string[];            // what triggered this status
  blockers?: string[];
}

export interface CategorySummary {
  category: ProgressCategory;
  label: string;
  completed: number;
  total: number;
  percent: number;
  components: ComponentProgress[];
}

export interface ProgressSnapshot {
  projectId: string;
  overallPercent: number;
  categories: CategorySummary[];
  generatedAt: string;
}

// ─── Evidence Inputs ───

export interface CodebaseSignals {
  detectedDependencies: Record<string, string>;  // package name -> version
  detectedFiles: string[];                        // relative paths of key files
  detectedConfigs: string[];                      // config file names found
}

export interface ProgressEvidence {
  deliverables: { type: string; title: string; createdAt: string }[];
  completedPhases: string[];
  codebaseSignals?: CodebaseSignals;
  scaffoldManifest?: import('./verification-spec.types').ScaffoldManifest;
}

// ─── Manual Overrides ───

export interface ManualOverride {
  componentId: string;
  status: ComponentStatus;
  note?: string;
  setAt: string;
}
