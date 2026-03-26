import type { ArtifactType, SDLDocument } from '../types';

/** A single generated file (virtual — not written to disk) */
export interface GeneratedFile {
  path: string;
  content: string;
}

/** Result from a single generator */
export interface GeneratorResult {
  artifactType: ArtifactType;
  files: GeneratedFile[];
  metadata: Record<string, unknown>;
}

/** Generator function signature — pure, deterministic */
export type GeneratorFn = (doc: SDLDocument) => GeneratorResult;

/** Result from generateAll */
export interface GenerateAllResult {
  results: GeneratorResult[];
  skipped: ArtifactType[];
}
