/**
 * YAML serialization for complexity assessment results
 */

import { stringify } from 'yaml';
import type { ComplexityResult } from './types.js';

/**
 * Generate YAML representation of complexity assessment
 * Serializes ComplexityResult to complexity.sdl.yaml format
 */
export function generateComplexityYaml(result: ComplexityResult): string {
  const yamlObj = {
    complexity: {
      profile: result.profile,

      architecture_index: {
        structural: {
          score: result.architectureIndex.structural.score,
          confidence: result.architectureIndex.structural.confidence,
          evidence: result.architectureIndex.structural.evidence,
          breakdown: {
            services: result.architectureIndex.structural.breakdown.services,
            frontends: result.architectureIndex.structural.breakdown.frontends,
            workers: result.architectureIndex.structural.breakdown.workers,
            libraries: result.architectureIndex.structural.breakdown.libraries,
            total_nodes: result.architectureIndex.structural.breakdown.totalNodes,
            sync_interactions: result.architectureIndex.structural.breakdown.syncInteractions,
            async_interactions: result.architectureIndex.structural.breakdown.asyncInteractions,
            implicit_dependencies: result.architectureIndex.structural.breakdown.implicitDependencies,
            nasa_scm: result.architectureIndex.structural.breakdown.nasaScm,
            coupling_density: result.architectureIndex.structural.breakdown.couplingDensity,
            critical_path_depth: result.architectureIndex.structural.breakdown.criticalPathDepth,
            max_fan_in: result.architectureIndex.structural.breakdown.maxFanIn,
            max_fan_out: result.architectureIndex.structural.breakdown.maxFanOut,
          },
        },

        dynamic: {
          score: result.architectureIndex.dynamic.score,
          confidence: result.architectureIndex.dynamic.confidence,
          evidence: result.architectureIndex.dynamic.evidence,
          temporal: {
            score: result.architectureIndex.dynamic.temporal.score,
            evidence: result.architectureIndex.dynamic.temporal.evidence,
          },
          state: {
            score: result.architectureIndex.dynamic.state.score,
            evidence: result.architectureIndex.dynamic.state.evidence,
          },
          consistency_model: {
            score: result.architectureIndex.dynamic.consistencyModel.score,
            model: result.architectureIndex.dynamic.consistencyModel.model,
            evidence: result.architectureIndex.dynamic.consistencyModel.evidence,
          },
        },

        integration: {
          score: result.architectureIndex.integration.score,
          confidence: result.architectureIndex.integration.confidence,
          evidence: result.architectureIndex.integration.evidence,
          failure_isolation: {
            score: result.architectureIndex.integration.failureIsolation.score,
            confidence: result.architectureIndex.integration.failureIsolation.confidence,
            evidence: result.architectureIndex.integration.failureIsolation.evidence,
          },
          integrations: {
            total: result.architectureIndex.integration.integrations.total,
            critical: result.architectureIndex.integration.integrations.critical.map((c) => ({
              name: c.name,
              type: c.type,
              blast_radius: c.blastRadius,
              fallback: c.fallback,
              circuit_breaker: c.circuitBreaker,
            })),
            non_critical: result.architectureIndex.integration.integrations.nonCritical,
          },
        },

        technology: {
          score: result.architectureIndex.technology.score,
          confidence: result.architectureIndex.technology.confidence,
          evidence: result.architectureIndex.technology.evidence,
          breakdown: {
            languages: result.architectureIndex.technology.breakdown.languages,
            frameworks: result.architectureIndex.technology.breakdown.frameworks,
            db_types: result.architectureIndex.technology.breakdown.dbTypes,
            version_drift: result.architectureIndex.technology.breakdown.versionDrift,
          },
        },

        subtotal: result.architectureIndex.subtotal,
      },

      delivery_index: {
        delivery_burden: {
          score: result.deliveryIndex.deliveryBurden.score,
          confidence: result.deliveryIndex.deliveryBurden.confidence,
          evidence: result.deliveryIndex.deliveryBurden.evidence,
          factors: {
            ci_cd: result.deliveryIndex.deliveryBurden.factors.ciCd,
            infrastructure_as_code: result.deliveryIndex.deliveryBurden.factors.iac,
            observability: {
              logging: result.deliveryIndex.deliveryBurden.factors.observability.logging,
              metrics: result.deliveryIndex.deliveryBurden.factors.observability.metrics,
              tracing: result.deliveryIndex.deliveryBurden.factors.observability.tracing,
            },
            secrets_management: result.deliveryIndex.deliveryBurden.factors.secretsManagement,
            health_checks: result.deliveryIndex.deliveryBurden.factors.healthChecks,
            backup_dr: result.deliveryIndex.deliveryBurden.factors.backupDr,
          },
        },

        organizational: {
          score: result.deliveryIndex.organizational.score,
          confidence: result.deliveryIndex.organizational.confidence,
          evidence: result.deliveryIndex.organizational.evidence,
          auto_discovered: result.deliveryIndex.organizational.autoDiscovered,
          requires_validation: result.deliveryIndex.organizational.requiresValidation,
          estimated_from: result.deliveryIndex.organizational.estimatedFrom,
        },

        subtotal: result.deliveryIndex.subtotal,
      },

      executive_summary: {
        architecture_index: result.executiveSummary.architectureIndex,
        delivery_index: result.executiveSummary.deliveryIndex,
        unified_score: result.executiveSummary.unifiedScore,
        level: result.executiveSummary.level,
        interpretation: result.executiveSummary.interpretation,
      },

      reduction_plan: result.reductionPlan.map((item) => ({
        rank: item.rank,
        title: item.title,
        target_dimension: item.targetDimension,
        current_score: item.currentScore,
        target_score: item.targetScore,
        impact: item.impact,
        timeline: item.timeline,
        effort: item.effort,
        business_value: item.businessValue,
        estimated_cost: item.estimatedCost,
      })),

      risks: {
        critical: result.risks.critical.map((r) => ({
          title: r.title,
          dimension: r.dimension,
          impact: r.impact,
          mitigation: r.mitigation,
          probability: r.probability,
        })),
        high: result.risks.high.map((r) => ({
          title: r.title,
          dimension: r.dimension,
          impact: r.impact,
          mitigation: r.mitigation,
          probability: r.probability,
        })),
      },

      history: result.history.map((h) => ({
        date: h.date,
        architecture_index: h.architectureIndex,
        delivery_index: h.deliveryIndex,
        unified_score: h.unifiedScore,
        source: h.source,
        notes: h.notes,
      })),
    },
  };

  return stringify(yamlObj, { indent: 2 });
}
