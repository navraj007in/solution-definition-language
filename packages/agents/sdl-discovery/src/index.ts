/**
 * SDL Discovery Agent
 *
 * Reverse-engineer architecture from code repositories and generate draft SDL specifications.
 */

// Import canonical types from types.ts
import type { DiscoveryConfig, DiscoveryResult, ComplexityInput, ComplexityResult } from './types.js';

/**
 * Quick discovery result for backward compatibility
 * (use DiscoveryResult from types.ts for canonical version)
 */
export interface ComponentDiscovery {
  id: string;
  type: 'service' | 'frontend' | 'worker' | 'library' | 'infra-module' | 'contract-package';
  name: string;
  description?: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  repo?: string;
  language?: string;
  framework?: string;
}

/**
 * Scan repositories and generate SDL discovery
 *
 * @param options Scan configuration
 * @returns Discovery result with components and metadata
 */
export async function discoverArchitecture(
  options: DiscoveryConfig
): Promise<DiscoveryResult> {
  // Stub: implementation is performed by the SDL Discovery Agent (v1.2)
  // See: .claude/agents/sdl-discovery.md for the full workflow
  throw new Error(
    'Not yet implemented. Use claude-code CLI to invoke the SDL Discovery Agent. ' +
    'See .claude/agents/sdl-discovery.md for the specification.'
  );
}

/**
 * Calculate complexity scores from a completed discovery result
 *
 * Full implementation is performed by the SDL Discovery Agent (Step 7).
 * This stub documents the expected interface.
 *
 * @param input Discovery result and optional profile override
 * @returns Complexity assessment with both indices, reduction plan, and risks
 */
export async function calculateComplexity(input: ComplexityInput): Promise<ComplexityResult> {
  // Stub: implementation is performed by the SDL Discovery Agent (Step 7)
  // See: .claude/agents/sdl-discovery.md Step 7 for the full specification
  throw new Error(
    'Not yet implemented. Complexity scoring is performed by the SDL Discovery Agent (Step 7). ' +
    'Use claude-code to invoke the agent; complexity output will be in sdl/complexity.sdl.yaml. ' +
    'See reference/complexity-scoring.md for the scoring specification.'
  );
}

// Re-export all types and heuristics
export * from './types.js';
export * from './heuristics.js';
