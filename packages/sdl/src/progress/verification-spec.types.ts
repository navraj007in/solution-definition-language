import type { ProgressCategory } from './progress.types';

export type ArtifactCheck =
  | { kind: 'file_exists'; path: string }
  | { kind: 'file_glob'; glob: string }
  | { kind: 'package_installed'; pkg: string; manifestPath: string }
  | { kind: 'dir_exists'; path: string };

export interface ComponentSpec {
  id: string;
  category: ProgressCategory;
  label: string;
  componentRoot: string;
  requiredChecks: ArtifactCheck[];
  optionalChecks?: ArtifactCheck[];
}

export interface ScaffoldManifestEntry {
  componentId: string;
  componentRoot: string;
  createdFiles: string[];
  installedPackages: Record<string, string[]>;
  scaffoldedAt: string;
  completed: boolean;
}

export interface ScaffoldManifest {
  version: 1;
  projectDir: string;
  components: ScaffoldManifestEntry[];
  generatedAt: string;
}
