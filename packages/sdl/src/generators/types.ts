import type { ArtifactType, SDLDocument } from '../types';

/** A single generated file (virtual — not written to disk) */
export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Confidence tier for a generator output.
 *
 * deterministic — output is a mechanical, repeatable mapping from SDL facts:
 *   the same SDL always produces the same result. This describes the
 *   generation process, not operational correctness — generated CI/IaC/config
 *   can still depend on external assumptions (provider capabilities,
 *   credentials, regions, mutable base images/action versions, current
 *   platform behavior) that SDL does not verify. Determinism means you won't
 *   see drift between runs; it does not mean the output is safe to deploy
 *   unreviewed in a given environment.
 *
 * inferred — output is derived from SDL facts via heuristics; structurally
 *   sound but may contain assumptions worth reviewing before committing.
 *
 * advisory — output is a starting point, not a deliverable; requires human
 *   review and editing before use.
 */
export type GeneratorTier = 'deterministic' | 'inferred' | 'advisory';

/**
 * Result from a single generator.
 * `tier` is always set by the registry — individual generator functions
 * do not set it directly.
 */
export interface GeneratorResult {
  artifactType: ArtifactType;
  tier: GeneratorTier;
  files: GeneratedFile[];
  metadata: Record<string, unknown>;
}

/**
 * Raw output from an individual generator function — tier is injected by
 * the registry wrapper and is not expected from the generator itself.
 */
export type RawGeneratorResult = Omit<GeneratorResult, 'tier'>;

/** Generator function signature */
export type GeneratorFn = (doc: SDLDocument) => RawGeneratorResult;

/** Result from generateAll */
export interface GenerateAllResult {
  results: GeneratorResult[];
  skipped: ArtifactType[];
}
