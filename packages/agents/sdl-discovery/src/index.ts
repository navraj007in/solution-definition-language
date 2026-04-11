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
 * ⚠️ INTENTIONAL STUB — Discovery is implemented as a Claude agent, not a function.
 *
 * Why? Discovery requires interactive reasoning, human decisions, and contextual
 * inference that are better suited to a conversational agent than a sync function.
 * See .claude/agents/sdl-discovery.md (Steps 1-6) for the full workflow.
 *
 * Use the Claude Code CLI to run discovery:
 *   claude-code --agent sdl-discovery-agent --repos ./repo --output ./output
 *
 * This package provides supporting utilities for agents and consumers:
 * - Types: DiscoveryResult, ComplexityResult, Component, Dependency, etc.
 * - Heuristics: signal detection for components, complexity scoring
 * - calculateComplexity(): all 6 dimensions with scoring and reduction plan
 *
 * @param options Scan configuration
 * @returns Never — throws with clear error directing to agent
 * @throws Always throws with instructions to use the agent instead
 */
export async function discoverArchitecture(
  options: DiscoveryConfig
): Promise<DiscoveryResult> {
  throw new Error(
    'discoverArchitecture() is an intentional stub.\n\n' +
    'Discovery is implemented as a Claude agent (see .claude/agents/sdl-discovery.md),\n' +
    'not as a function, because it requires interactive reasoning and human decisions.\n\n' +
    'Use the Claude Code CLI:\n' +
    '  claude-code --agent sdl-discovery-agent --repos ./repo --output ./output\n\n' +
    'This package provides supporting types and utilities (heuristics, complexity calculation).'
  );
}

import { computeComplexity } from './complexity-calculator.js';
export { generateComplexityReport } from './complexity-report.js';
export { generateComplexityYaml } from './complexity-yaml.js';

/**
 * Calculate complexity scores from a completed discovery result
 *
 * Computes all 6 complexity dimensions (Structural, Dynamic, Integration, Technology,
 * Delivery Burden, Organizational) and generates reduction plan and risk assessment.
 *
 * @param input Discovery result and optional profile override (startup | enterprise | platform)
 * @returns Complexity assessment with both indices, reduction plan, and risks
 */
export async function calculateComplexity(input: ComplexityInput): Promise<ComplexityResult> {
  return computeComplexity(input);
}

// Re-export all types and heuristics
export * from './types.js';
export * from './heuristics.js';
