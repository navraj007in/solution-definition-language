/**
 * ADR Draft Generator — produces pre-filled ADR drafts from SDL + diff context.
 *
 * Pure function, no I/O. Reuses ADR category knowledge from the generators
 * and enriches with diff-specific context (reasons, before/after values).
 */
// ── Category → Draft mapping ──
const CATEGORY_DRAFTS = {
    'architecture-style': (doc, s) => ({
        title: 'Architecture Style',
        context: `${doc.solution?.name || 'This project'} architecture style has changed. ${joinReasons(s)}`,
        decision: doc.architecture?.style
            ? `Adopt a ${formatStyle(doc.architecture.style)} architecture.`
            : 'Architecture style decision pending.',
        consequences: doc.architecture?.style === 'microservices'
            ? 'Independent scaling and deployment per service. Higher operational complexity.'
            : doc.architecture?.style === 'serverless'
                ? 'No server management. Auto-scaling. Vendor lock-in risk.'
                : 'Simpler deployment. Must maintain module boundaries to avoid coupling.',
        alternatives: [
            { option: 'Modular Monolith', pros: 'Simple deployment, faster iteration', cons: 'Harder to scale individually' },
            { option: 'Microservices', pros: 'Independent scaling, tech diversity', cons: 'Distributed complexity' },
            { option: 'Serverless', pros: 'Zero ops, pay-per-use', cons: 'Cold starts, vendor lock-in' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'component-topology': (doc, s) => ({
        title: 'Component Topology Change',
        context: `The system topology has changed. ${joinReasons(s)}${s.affectedComponents.length > 0 ? ` Affected components: ${s.affectedComponents.join(', ')}.` : ''}`,
        decision: `Update the component topology to reflect the current system design.`,
        consequences: 'Service boundaries and dependencies may need to be re-evaluated. Update architecture diagrams.',
        alternatives: [
            { option: 'Keep current topology', pros: 'No disruption', cons: 'May not reflect actual needs' },
            { option: 'Consolidate services', pros: 'Simpler operations', cons: 'Tighter coupling' },
            { option: 'Further decompose', pros: 'Better isolation', cons: 'More operational overhead' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'authentication': (doc, s) => ({
        title: 'Authentication & Authorization',
        context: `Authentication configuration has changed. ${joinReasons(s)}`,
        decision: doc.auth?.provider
            ? `Use ${formatName(doc.auth.provider)} with ${(doc.auth.strategy || 'jwt').toUpperCase()} strategy.${doc.auth.mfa ? ' MFA enabled.' : ''}${doc.auth.socialProviders?.length ? ` Social login: ${doc.auth.socialProviders.join(', ')}.` : ''}`
            : 'Authentication strategy decision pending.',
        consequences: doc.auth?.provider
            ? `Dependent on ${formatName(doc.auth.provider)} for identity management. Must handle token refresh and session lifecycle.`
            : 'Full control over auth flow. Must implement security features manually.',
        alternatives: [
            { option: 'Auth0', pros: 'Feature-rich, social login, MFA', cons: 'Cost at scale' },
            { option: 'Clerk', pros: 'Modern DX, pre-built UI', cons: 'Newer platform' },
            { option: 'Custom JWT', pros: 'Full control', cons: 'Security responsibility' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'primary-database': (doc, s) => ({
        title: 'Primary Database',
        context: `Primary database configuration has changed. ${joinReasons(s)}`,
        decision: doc.data?.primaryDatabase?.type
            ? `Use ${formatName(doc.data.primaryDatabase.type)} as the primary database (${doc.data.primaryDatabase.hosting || 'managed'}).`
            : 'Primary database decision pending.',
        consequences: doc.data?.primaryDatabase?.type
            ? `Must manage ${formatName(doc.data.primaryDatabase.type)} schema migrations and backups. Data model tied to this engine.`
            : 'Database selection affects all data access patterns.',
        alternatives: [
            { option: 'PostgreSQL', pros: 'ACID, rich queries, extensions', cons: 'Vertical scaling limits' },
            { option: 'MongoDB', pros: 'Flexible schema, horizontal scaling', cons: 'No ACID across documents' },
            { option: 'MySQL', pros: 'Widely supported', cons: 'Fewer advanced features' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'cache-strategy': (doc, s) => ({
        title: 'Caching Strategy',
        context: `Cache configuration has changed. ${joinReasons(s)}`,
        decision: doc.data?.cache?.type
            ? `Use ${formatName(doc.data.cache.type)} for caching${doc.data.cache.useCase?.length ? ` (${doc.data.cache.useCase.join(', ')})` : ''}.`
            : 'Caching strategy decision pending.',
        consequences: 'Must handle cache invalidation. Additional infrastructure to manage.',
        alternatives: [
            { option: 'Redis', pros: 'Versatile data structures, pub/sub', cons: 'Memory-bound' },
            { option: 'Memcached', pros: 'Simple, multi-threaded', cons: 'No persistence' },
            { option: 'No cache', pros: 'Simpler architecture', cons: 'Higher latency' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'cloud-platform': (doc, s) => ({
        title: 'Cloud & Hosting Platform',
        context: `Cloud/hosting configuration has changed. ${joinReasons(s)}`,
        decision: doc.deployment?.cloud
            ? `Use ${formatName(doc.deployment.cloud)} as the primary cloud platform.${doc.deployment.runtime?.frontend ? ` Frontend: ${doc.deployment.runtime.frontend}.` : ''}${doc.deployment.runtime?.backend ? ` Backend: ${doc.deployment.runtime.backend}.` : ''}`
            : 'Cloud platform decision pending.',
        consequences: doc.deployment?.cloud
            ? `Committed to ${formatName(doc.deployment.cloud)} ecosystem and pricing.`
            : 'Cloud selection affects all deployment and infrastructure decisions.',
        alternatives: [
            { option: 'AWS', pros: 'Broadest services, global reach', cons: 'Complex pricing' },
            { option: 'Vercel', pros: 'Excellent DX, edge functions', cons: 'Limited backend' },
            { option: 'Railway', pros: 'Simple deploy, great DX', cons: 'Smaller ecosystem' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'deployment-pipeline': (doc, s) => ({
        title: 'CI/CD Pipeline',
        context: `CI/CD pipeline configuration has changed. ${joinReasons(s)}`,
        decision: doc.deployment?.ciCd?.provider
            ? `Use ${formatName(doc.deployment.ciCd.provider)} for CI/CD.${doc.deployment.ciCd.environments?.length ? ` Environments: ${doc.deployment.ciCd.environments.map(e => e.name).join(', ')}.` : ''}`
            : 'CI/CD pipeline decision pending.',
        consequences: 'Pipeline configuration as code. Must maintain CI/CD configs alongside application code.',
        alternatives: [
            { option: 'GitHub Actions', pros: 'GitHub integration, large marketplace', cons: 'GitHub lock-in' },
            { option: 'GitLab CI', pros: 'Built into GitLab, powerful', cons: 'GitLab lock-in' },
            { option: 'CircleCI', pros: 'Fast, good caching', cons: 'Cost at scale' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'component-runtime': (doc, s) => ({
        title: 'Component Runtime',
        context: `Component runtime has changed. ${joinReasons(s)}${s.affectedComponents.length > 0 ? ` Components: ${s.affectedComponents.join(', ')}.` : ''}`,
        decision: `Update runtime for affected components to match the current SDL definition.`,
        consequences: 'Runtime changes may affect deployment, dependencies, and team expertise requirements.',
        alternatives: [
            { option: 'Node.js', pros: 'JavaScript fullstack, large ecosystem', cons: 'Single-threaded' },
            { option: 'Python', pros: 'Great for ML/AI, readable', cons: 'Slower execution' },
            { option: 'Go', pros: 'Fast, compiled, great concurrency', cons: 'Verbose, smaller web ecosystem' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'component-framework': (doc, s) => ({
        title: 'Component Framework',
        context: `Component framework has changed. ${joinReasons(s)}${s.affectedComponents.length > 0 ? ` Components: ${s.affectedComponents.join(', ')}.` : ''}`,
        decision: `Update framework for affected components to match the current SDL definition.`,
        consequences: 'Framework changes require migration effort and may affect team skills, libraries, and patterns.',
        alternatives: [
            { option: 'Next.js', pros: 'SSR/SSG, React ecosystem', cons: 'Vercel-centric' },
            { option: 'Express', pros: 'Minimal, flexible', cons: 'No opinions, more boilerplate' },
            { option: 'FastAPI', pros: 'Async, auto-docs, type hints', cons: 'Python ecosystem' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
    'component-language': (doc, s) => ({
        title: 'Component Language',
        context: `Component language has changed. ${joinReasons(s)}${s.affectedComponents.length > 0 ? ` Components: ${s.affectedComponents.join(', ')}.` : ''}`,
        decision: `Update programming language for affected components to match the current SDL definition.`,
        consequences: 'Language changes affect hiring, tooling, libraries, and all downstream code.',
        alternatives: [
            { option: 'TypeScript', pros: 'Type safety, large ecosystem', cons: 'Build step required' },
            { option: 'Python', pros: 'Readable, ML ecosystem', cons: 'Performance limits' },
            { option: 'Go', pros: 'Fast, simple, great tooling', cons: 'Less expressive' },
        ],
        sourceCategory: s.category,
        sourceReasonCodes: s.reasonCodes,
    }),
};
// ── Public API ──
/**
 * Generate a pre-filled ADR draft from the current SDL state and a classified impact suggestion.
 * The SDL document is treated as a loose shape — missing fields produce minimal but valid drafts.
 */
export function generateAdrDraftFromDiff(sdlDoc, suggestion) {
    const doc = sdlDoc;
    const builder = CATEGORY_DRAFTS[suggestion.category];
    return builder(doc, suggestion);
}
// ── Helpers ──
function joinReasons(s) {
    return s.reasons.join('. ') + (s.reasons.length > 0 ? '.' : '');
}
function formatName(s) {
    const labels = {
        postgres: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB',
        redis: 'Redis', memcached: 'Memcached', auth0: 'Auth0', cognito: 'AWS Cognito',
        clerk: 'Clerk', firebase: 'Firebase', supabase: 'Supabase',
        aws: 'AWS', gcp: 'Google Cloud', azure: 'Azure', vercel: 'Vercel', railway: 'Railway',
        'github-actions': 'GitHub Actions', 'gitlab-ci': 'GitLab CI',
        nextjs: 'Next.js', react: 'React', vue: 'Vue.js', angular: 'Angular',
        nodejs: 'Node.js', 'python-fastapi': 'FastAPI', go: 'Go',
    };
    return labels[s] || s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function formatStyle(s) {
    const labels = {
        'modular-monolith': 'Modular Monolith',
        microservices: 'Microservices',
        serverless: 'Serverless',
    };
    return labels[s] || s;
}
