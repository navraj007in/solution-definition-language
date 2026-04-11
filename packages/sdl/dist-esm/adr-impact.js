/**
 * ADR Impact Classifier — maps SDL diff entries to ADR categories that need attention.
 *
 * Pure function, no I/O. Consumes the desktop SdlDiffResult format
 * (component-level + cross-cutting section changes) and produces
 * categorized suggestions with severity, confidence, and rule codes.
 */
// ── Noise filter ──
/** Fields that are never significant on their own. */
const NOISE_FIELDS = new Set(['description', 'purpose', 'path']);
/** Fields that are weak signals — only included as supporting evidence. */
const WEAK_FIELDS = new Set(['port']);
/** Returns true if a component modification has at least one significant field change. */
function hasSignificantChange(changes) {
    return changes.some((f) => !NOISE_FIELDS.has(f) && !WEAK_FIELDS.has(f));
}
/** Classify section-level changes into raw hits. */
function classifySectionChanges(sectionChanges) {
    const hits = [];
    for (const sc of sectionChanges) {
        const section = sc.section;
        // Solution-level: architecture style
        if (section === 'solution') {
            const stageChange = sc.fields.find((f) => f.path === 'stage' || f.path === 'solution.stage');
            if (stageChange) {
                hits.push({
                    category: 'architecture-style',
                    ruleCode: 'ARCH_STYLE_CHANGED',
                    severity: 'medium',
                    confidence: 'high',
                    reason: `Solution stage changed from "${stageChange.before}" to "${stageChange.after}"`,
                    path: `solution.${stageChange.path}`,
                });
            }
        }
        // Auth section
        if (section === 'auth') {
            const significantFields = sc.fields.filter((f) => !f.path.startsWith('x-'));
            if (significantFields.length > 0) {
                const fieldNames = significantFields.map((f) => f.path).join(', ');
                hits.push({
                    category: 'authentication',
                    ruleCode: 'AUTH_CONFIG_CHANGED',
                    severity: 'high',
                    confidence: 'high',
                    reason: `Authentication config changed: ${fieldNames}`,
                    path: 'auth',
                });
            }
        }
        // Data section
        if (section === 'data') {
            // Primary database changes
            const dbFields = sc.fields.filter((f) => f.path.startsWith('primaryDatabase') || f.path.startsWith('primary_database'));
            if (dbFields.length > 0) {
                const fieldNames = dbFields.map((f) => f.path).join(', ');
                hits.push({
                    category: 'primary-database',
                    ruleCode: 'PRIMARY_DB_CHANGED',
                    severity: 'high',
                    confidence: 'high',
                    reason: `Primary database changed: ${fieldNames}`,
                    path: 'data.primaryDatabase',
                });
            }
            // Cache changes
            const cacheFields = sc.fields.filter((f) => f.path.startsWith('cache'));
            if (cacheFields.length > 0) {
                const fieldNames = cacheFields.map((f) => f.path).join(', ');
                hits.push({
                    category: 'cache-strategy',
                    ruleCode: 'CACHE_STRATEGY_CHANGED',
                    severity: 'medium',
                    confidence: 'high',
                    reason: `Cache strategy changed: ${fieldNames}`,
                    path: 'data.cache',
                });
            }
        }
        // Deployment section
        if (section === 'deployment') {
            const cloudFields = sc.fields.filter((f) => f.path === 'cloud' || f.path.startsWith('cloud.') || f.path.startsWith('runtime'));
            if (cloudFields.length > 0) {
                const cloudChange = sc.fields.find((f) => f.path === 'cloud');
                const reason = cloudChange
                    ? `Cloud platform changed from "${cloudChange.before}" to "${cloudChange.after}"`
                    : `Deployment config changed: ${cloudFields.map((f) => f.path).join(', ')}`;
                hits.push({
                    category: 'cloud-platform',
                    ruleCode: 'CLOUD_PLATFORM_CHANGED',
                    severity: 'high',
                    confidence: 'high',
                    reason,
                    path: 'deployment.cloud',
                });
            }
            const ciCdFields = sc.fields.filter((f) => f.path.startsWith('ciCd') || f.path.startsWith('ci_cd'));
            if (ciCdFields.length > 0) {
                hits.push({
                    category: 'deployment-pipeline',
                    ruleCode: 'CICD_CHANGED',
                    severity: 'medium',
                    confidence: 'high',
                    reason: `CI/CD pipeline changed: ${ciCdFields.map((f) => f.path).join(', ')}`,
                    path: 'deployment.ciCd',
                });
            }
        }
        // Infrastructure section — map to cloud-platform or deployment-pipeline
        if (section === 'infrastructure') {
            hits.push({
                category: 'cloud-platform',
                ruleCode: 'CLOUD_PLATFORM_CHANGED',
                severity: 'medium',
                confidence: 'medium',
                reason: `Infrastructure config changed: ${sc.fields.map((f) => f.path).join(', ')}`,
                path: 'infrastructure',
            });
        }
    }
    return hits;
}
/** Classify component-level changes (added/removed/modified) into raw hits. */
function classifyComponentChanges(diff) {
    const hits = [];
    // Components added
    for (const comp of diff.added) {
        hits.push({
            category: 'component-topology',
            ruleCode: 'COMPONENT_ADDED',
            severity: 'medium',
            confidence: 'low',
            reason: `Component "${comp.name}" (${comp.type}) added`,
            path: `components.${comp.name}`,
            component: comp.name,
        });
    }
    // Components removed
    for (const comp of diff.removed) {
        hits.push({
            category: 'component-topology',
            ruleCode: 'COMPONENT_REMOVED',
            severity: 'medium',
            confidence: 'low',
            reason: `Component "${comp.name}" (${comp.type}) removed`,
            path: `components.${comp.name}`,
            component: comp.name,
        });
    }
    // Components modified — check for significant field changes
    for (const comp of diff.modified) {
        if (!hasSignificantChange(comp.changes))
            continue;
        if (comp.changes.includes('framework')) {
            hits.push({
                category: 'component-framework',
                ruleCode: 'COMPONENT_FRAMEWORK_CHANGED',
                severity: 'high',
                confidence: 'high',
                reason: `Component "${comp.name}" framework changed`,
                path: `components.${comp.name}.framework`,
                component: comp.name,
            });
        }
        if (comp.changes.includes('runtime')) {
            hits.push({
                category: 'component-runtime',
                ruleCode: 'COMPONENT_RUNTIME_CHANGED',
                severity: 'high',
                confidence: 'high',
                reason: `Component "${comp.name}" runtime changed`,
                path: `components.${comp.name}.runtime`,
                component: comp.name,
            });
        }
        if (comp.changes.includes('language')) {
            hits.push({
                category: 'component-language',
                ruleCode: 'COMPONENT_LANGUAGE_CHANGED',
                severity: 'medium',
                confidence: 'high',
                reason: `Component "${comp.name}" language changed`,
                path: `components.${comp.name}.language`,
                component: comp.name,
            });
        }
    }
    return hits;
}
/** Check for architecture.style changes in section changes. */
function classifyArchitectureStyle(sectionChanges) {
    const hits = [];
    for (const sc of sectionChanges) {
        if (sc.section === 'solution') {
            // architecture.style is often under solution-level changes
            const styleField = sc.fields.find((f) => f.path === 'architecture.style' || f.path === 'style');
            if (styleField) {
                hits.push({
                    category: 'architecture-style',
                    ruleCode: 'ARCH_STYLE_CHANGED',
                    severity: 'high',
                    confidence: 'high',
                    reason: `Architecture style changed from "${styleField.before}" to "${styleField.after}"`,
                    path: 'architecture.style',
                });
            }
        }
    }
    return hits;
}
// ── Aggregation ──
/** Merge multiple raw hits into one suggestion per category, deduplicating. */
function aggregate(hits) {
    const byCategory = new Map();
    for (const hit of hits) {
        const existing = byCategory.get(hit.category) || [];
        existing.push(hit);
        byCategory.set(hit.category, existing);
    }
    const suggestions = [];
    for (const [category, categoryHits] of byCategory) {
        // Take highest severity and confidence across all hits
        const severity = pickHighest(categoryHits.map((h) => h.severity));
        const confidence = pickHighest(categoryHits.map((h) => h.confidence));
        // Deduplicate reason codes and paths
        const reasonCodes = [...new Set(categoryHits.map((h) => h.ruleCode))];
        const reasons = [...new Set(categoryHits.map((h) => h.reason))];
        const affectedPaths = [...new Set(categoryHits.map((h) => h.path))];
        const affectedComponents = [
            ...new Set(categoryHits.map((h) => h.component).filter(Boolean)),
        ];
        suggestions.push({
            category,
            severity,
            confidence,
            reasons,
            reasonCodes,
            affectedPaths,
            affectedComponents,
        });
    }
    // Sort: high severity first, then high confidence
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => {
        const sDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (sDiff !== 0)
            return sDiff;
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
    return suggestions;
}
function pickHighest(levels) {
    if (levels.includes('high'))
        return 'high';
    if (levels.includes('medium'))
        return 'medium';
    return 'low';
}
const COMPOUND_RULES = [
    {
        trigger: 'PLATFORM_MIGRATION',
        requiredCategories: ['cloud-platform', 'deployment-pipeline', 'authentication'],
        minMatch: 2,
        label: 'Platform Migration — multiple infrastructure decisions changing together',
        boostSeverity: 'high',
    },
    {
        trigger: 'TECH_STACK_OVERHAUL',
        requiredCategories: ['component-runtime', 'component-framework', 'component-language'],
        minMatch: 2,
        label: 'Tech Stack Overhaul — multiple technology choices changing together',
        boostSeverity: 'high',
    },
    {
        trigger: 'DATA_LAYER_REDESIGN',
        requiredCategories: ['primary-database', 'cache-strategy'],
        minMatch: 2,
        label: 'Data Layer Redesign — database and caching strategy changing together',
        boostSeverity: 'high',
    },
];
/** Detect compound triggers and boost severity on affected suggestions. */
function applyCompoundTriggers(suggestions) {
    const presentCategories = new Set(suggestions.map((s) => s.category));
    const fired = [];
    for (const rule of COMPOUND_RULES) {
        const matches = rule.requiredCategories.filter((c) => presentCategories.has(c));
        if (matches.length >= rule.minMatch) {
            fired.push(rule.trigger);
            // Boost severity on all matched suggestions and append compound reason
            for (const s of suggestions) {
                if (matches.includes(s.category)) {
                    if (severityOrder[rule.boostSeverity] > severityOrder[s.severity]) {
                        s.severity = rule.boostSeverity;
                    }
                    s.reasons.push(rule.label);
                }
            }
        }
    }
    return fired;
}
const severityOrder = { high: 3, medium: 2, low: 1 };
// ── Public API ──
/**
 * Classifies an SDL diff result into ADR impact suggestions.
 *
 * Takes the desktop SdlDiffResult format (component-level added/removed/modified
 * + cross-cutting sectionChanges with field-level before/after values).
 *
 * Returns aggregated, deduplicated suggestions sorted by severity then confidence.
 * Applies compound trigger detection to boost severity when multiple related
 * decisions change together.
 */
export function classifyDiffForAdr(diff) {
    if (!diff.hasChanges) {
        return {
            suggestions: [],
            summary: { totalSuggestions: 0, highestSeverity: null, hasHighSignalChanges: false, compoundTriggers: [] },
        };
    }
    // Collect all raw hits from different classifiers
    const allHits = [
        ...classifyArchitectureStyle(diff.sectionChanges),
        ...classifySectionChanges(diff.sectionChanges),
        ...classifyComponentChanges(diff),
    ];
    // Aggregate into per-category suggestions
    const suggestions = aggregate(allHits);
    // Detect compound triggers and boost severity
    const compoundTriggers = applyCompoundTriggers(suggestions);
    // Re-sort after potential severity boosts
    const confidenceOrd = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => {
        const sDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (sDiff !== 0)
            return sDiff;
        return confidenceOrd[b.confidence] - confidenceOrd[a.confidence];
    });
    const highestSeverity = suggestions.length > 0 ? suggestions[0].severity : null;
    const hasHighSignalChanges = suggestions.some((s) => s.severity === 'high' && s.confidence === 'high');
    return {
        suggestions,
        summary: {
            totalSuggestions: suggestions.length,
            highestSeverity,
            hasHighSignalChanges,
            compoundTriggers,
        },
    };
}
