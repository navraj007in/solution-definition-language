/**
 * Markdown report generator for complexity assessment
 */

import type { ComplexityResult } from './types.js';

/**
 * Generate a human-readable markdown complexity report
 */
export function generateComplexityReport(
  result: ComplexityResult,
  solutionName: string,
  date: string = new Date().toISOString().split('T')[0]
): string {
  const archIdx = result.architectureIndex;
  const delivIdx = result.deliveryIndex;
  const summary = result.executiveSummary;

  // Build the report sections
  let report = '';

  // Header
  report += `# Complexity Report: ${solutionName}\n\n`;
  report += `**Generated:** ${date} | **Profile:** ${result.profile}\n\n`;

  // Complexity Indices Table
  report += `## Complexity Indices\n\n`;
  report += `| Index | Score | Level |\n`;
  report += `|---|---|---|\n`;
  report += `| **Architecture Complexity Index** | **${summary.architectureIndex.toFixed(2)} / 10** | **${scoreLevelLabel(summary.architectureIndex)}** |\n`;
  report += `| **Delivery Burden Index** | **${summary.deliveryIndex.toFixed(2)} / 10** | **${scoreLevelLabel(summary.deliveryIndex)}** |\n`;
  report += `| **Unified Score** | **${summary.unifiedScore.toFixed(2)} / 10** | **${summary.level}** |\n\n`;

  // Why This System Is Hard
  report += `## Why This System Is Hard\n\n`;
  report += generateNarrative(result);
  report += '\n\n';

  // Detailed Dimension Analysis
  report += `## Detailed Complexity Breakdown\n\n`;

  report += `### Architecture Complexity (${archIdx.subtotal.toFixed(2)} / 10)\n\n`;
  report += generateDimensionSection('Structural', archIdx.structural, 'Service interconnectedness and topology complexity');
  report += generateDimensionSection('Dynamic', archIdx.dynamic, 'Runtime patterns and asynchronous behavior');
  report += generateDimensionSection('Integration', archIdx.integration, 'External dependency risk and failure isolation');
  report += generateDimensionSection('Technology', archIdx.technology, 'Language, framework, and database diversity');

  report += `### Delivery Burden (${delivIdx.subtotal.toFixed(2)} / 10)\n\n`;
  report += generateDimensionSection('Delivery Burden', delivIdx.deliveryBurden, 'CI/CD maturity, observability, and operational tooling');
  report += `**Organizational Complexity:** ${delivIdx.organizational.score.toFixed(2)} / 10\n`;
  report += `- Estimated teams: ${(delivIdx.organizational.score - 2).toFixed(0)}\n`;
  report += `- ⚠️ This is an **auto-discovered estimate with LOW confidence** — requires validation from your team leads.\n`;
  report += `- Recommendation: Review and override with actual organizational structure if different.\n\n`;

  // Reduction Plan
  report += `## Prioritized Reduction Plan\n\n`;
  report += `Act on these items in priority order to reduce complexity:\n\n`;
  report += `| Rank | Action | Target | Current | Goal | Effort | Timeline | Est. Cost |\n`;
  report += `|---|---|---|---|---|---|---|---|\n`;

  result.reductionPlan.forEach((item) => {
    report += `| ${item.rank} | ${item.title} | ${item.targetDimension} | ${item.currentScore.toFixed(1)} | ${item.targetScore.toFixed(1)} | ${item.effort} | ${item.timeline} | ${item.estimatedCost} |\n`;
  });
  report += '\n';

  // Risk Assessment
  report += `## Risk Assessment\n\n`;

  if (result.risks.critical.length > 0) {
    report += `### Critical Risks ⚠️\n\n`;
    result.risks.critical.forEach((risk) => {
      report += `**${risk.title}**\n`;
      report += `- Dimension: ${risk.dimension}\n`;
      report += `- Impact: ${risk.impact}\n`;
      report += `- Mitigation: ${risk.mitigation}\n`;
      if (risk.probability) report += `- Probability: ${risk.probability}\n`;
      report += '\n';
    });
  }

  if (result.risks.high.length > 0) {
    report += `### High Impact Risks\n\n`;
    result.risks.high.forEach((risk) => {
      report += `**${risk.title}**\n`;
      report += `- Dimension: ${risk.dimension}\n`;
      report += `- Impact: ${risk.impact}\n`;
      report += `- Mitigation: ${risk.mitigation}\n`;
      if (risk.probability) report += `- Probability: ${risk.probability}\n`;
      report += '\n';
    });
  }

  if (result.risks.critical.length === 0 && result.risks.high.length === 0) {
    report += `No critical or high-impact risks identified. Continue monitoring as complexity evolves.\n\n`;
  }

  // Confidence & Caveats
  report += `## Confidence Notes\n\n`;
  report += `- **Structural, Dynamic, Technology:** HIGH confidence — directly observable from code and config\n`;
  report += `- **Integration:** HIGH confidence for count/criticality; MEDIUM for blast radius (requires code inspection)\n`;
  report += `- **Delivery Burden:** MEDIUM confidence — based on detected tooling; depth/maturity may vary\n`;
  report += `- **Organizational:** ⚠️ **LOW confidence** — auto-estimated from service count\n`;
  report += `  - Formula: teams ≈ ceil(services / 3.5)\n`;
  report += `  - **Action required:** Validate against actual team structure, ownership, and coordination patterns\n`;
  report += `  - Use the override section below with real data\n\n`;

  // Next Steps
  report += `## Next Steps\n\n`;
  report += `1. **Review this report** with architecture team and stakeholders\n`;
  report += `2. **Validate organizational structure** — override the auto-estimate with real team data\n`;
  report += `3. **Prioritize reduction plan** — consensus on which dimension to tackle first\n`;
  report += `4. **Establish baselines** — add to your architecture decision log for tracking over time\n`;
  report += `5. **Re-run quarterly** — complexity should trend downward with focused effort\n\n`;

  // Footer
  report += `---\n\n`;
  report += `Generated by SDL Discovery Agent v1.2.0  \n`;
  report += `Scoring specification: [Complexity Scoring v1.0](https://github.com/...)\n`;

  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateNarrative(result: ComplexityResult): string {
  const { architectureIndex: arch, deliveryIndex: deliv, executiveSummary: summary } = result;

  const drivers: string[] = [];

  if (arch.structural.score >= 7) {
    drivers.push(`high service interconnectedness (${arch.structural.breakdown.totalNodes} nodes, coupling density ${arch.structural.breakdown.couplingDensity.toFixed(2)})`);
  }
  if (arch.dynamic.score >= 7) {
    drivers.push(`heavy asynchronous patterns and distributed state management`);
  }
  if (arch.integration.score >= 7) {
    drivers.push(`${arch.integration.integrations.total} external integrations with limited failure isolation`);
  }
  if (arch.technology.score >= 7) {
    drivers.push(`diverse technology stack (${arch.technology.breakdown.languages} languages, ${arch.technology.breakdown.frameworks} frameworks)`);
  }
  if (deliv.deliveryBurden.score >= 7) {
    drivers.push(`immature deployment and observability tooling`);
  }
  if (deliv.organizational.score >= 7) {
    drivers.push(`estimated ~${Math.ceil(deliv.organizational.score - 1)} teams with cross-team dependencies`);
  }

  let narrative = '';
  if (drivers.length > 0) {
    narrative += `This system exhibits **${summary.level}** complexity, primarily driven by:\n\n`;
    drivers.forEach((d) => {
      narrative += `- ${d}\n`;
    });
  } else {
    narrative += `This system is **${summary.level}**, indicating moderate organizational and operational challenges. Focus areas:\n\n`;
    narrative += `- Expand observability across all services\n`;
    narrative += `- Document and validate team ownership model\n`;
    narrative += `- Invest in deployment automation\n`;
  }

  return narrative;
}

function generateDimensionSection(name: string, dimension: any, description: string): string {
  let section = `**${name}:** ${dimension.score.toFixed(2)} / 10\n`;
  section += `*${description}*\n\n`;
  section += `Evidence:\n`;
  dimension.evidence.forEach((e: string) => {
    section += `- ${e}\n`;
  });

  if (dimension.breakdown) {
    section += `\nBreakdown:\n`;
    Object.entries(dimension.breakdown).forEach(([key, value]) => {
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
      section += `- ${formattedKey}: ${value}\n`;
    });
  }

  section += '\n';
  return section;
}

function scoreLevelLabel(score: number): string {
  if (score < 3) return 'Simple';
  if (score < 5) return 'Moderate';
  if (score < 7) return 'Complex';
  if (score < 8.5) return 'Very Complex';
  return 'Extreme';
}
