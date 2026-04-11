/**
 * Generates Mermaid sequence diagrams from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Produces diagrams for:
 *   - Each core flow (if defined) with its steps
 *   - Auth flow (login/register) when auth is configured
 *   - Default CRUD flow per persona goal when no core flows exist
 */
export function generateSequenceDiagrams(doc) {
    const diagrams = [];
    // Auth flow
    if (doc.auth && doc.auth.strategy !== 'none') {
        diagrams.push(buildAuthFlow(doc));
    }
    // Core flows (explicit)
    if (doc.product.coreFlows && doc.product.coreFlows.length > 0) {
        for (const flow of doc.product.coreFlows) {
            diagrams.push(buildCoreFlow(doc, flow));
        }
    }
    else {
        // Infer flows from persona goals
        for (const persona of doc.product.personas) {
            for (const goal of persona.goals) {
                const flow = buildGoalFlow(doc, persona.name, goal);
                if (flow)
                    diagrams.push(flow);
            }
        }
    }
    const files = diagrams.map((d) => ({
        path: `artifacts/sequences/${d.slug}.mmd`,
        content: d.content,
    }));
    return {
        artifactType: 'sequence-diagrams',
        files,
        metadata: {
            solutionName: doc.solution.name,
            diagramCount: diagrams.length,
            diagrams: diagrams.map((d) => d.name),
        },
    };
}
// ─── Flow Builders ───
function buildAuthFlow(doc) {
    const auth = doc.auth;
    const providerLabel = displayName(auth.provider || 'custom');
    const frontends = doc.architecture.projects.frontend || [];
    const backends = doc.architecture.projects.backend || [];
    const clientLabel = frontends.length > 0 ? `${frontends[0].name} (Frontend)` : 'Client';
    const apiLabel = backends.length > 0 ? `${backends[0].name} (API)` : 'API';
    const lines = [];
    lines.push('sequenceDiagram');
    lines.push(`    actor User`);
    lines.push(`    participant ${sanitize(clientLabel)} as ${clientLabel}`);
    lines.push(`    participant ${sanitize(apiLabel)} as ${apiLabel}`);
    if (auth.provider) {
        lines.push(`    participant ${sanitize(providerLabel)} as ${providerLabel}`);
    }
    lines.push('');
    lines.push('    Note over User: Registration / Login');
    lines.push(`    User->>+${sanitize(clientLabel)}: Enter credentials`);
    if (auth.provider && (auth.strategy === 'oidc' || auth.strategy === 'magic-link')) {
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(providerLabel)}: Redirect to ${providerLabel}`);
        lines.push(`    User->>+${sanitize(providerLabel)}: Authenticate`);
        lines.push(`    ${sanitize(providerLabel)}-->>-${sanitize(clientLabel)}: Auth code / token`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: Exchange token`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(providerLabel)}: Verify token`);
        lines.push(`    ${sanitize(providerLabel)}-->>-${sanitize(apiLabel)}: User info`);
    }
    else {
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: POST /auth/login`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(apiLabel)}: Validate credentials`);
    }
    lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: JWT access token`);
    lines.push(`    ${sanitize(clientLabel)}-->>-User: Logged in`);
    if (auth.sessions?.refreshToken) {
        lines.push('');
        lines.push('    Note over User: Token Refresh');
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: POST /auth/refresh`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: New access token`);
    }
    return {
        name: 'Authentication Flow',
        slug: 'auth-flow',
        content: lines.join('\n'),
    };
}
function buildCoreFlow(doc, flow) {
    const frontends = doc.architecture.projects.frontend || [];
    const backends = doc.architecture.projects.backend || [];
    const clientLabel = frontends.length > 0 ? `${frontends[0].name} (Frontend)` : 'Client';
    const apiLabel = backends.length > 0 ? `${backends[0].name} (API)` : 'API';
    const dbLabel = `${displayName(doc.data.primaryDatabase.type)} (DB)`;
    const lines = [];
    lines.push('sequenceDiagram');
    lines.push(`    actor User`);
    lines.push(`    participant ${sanitize(clientLabel)} as ${clientLabel}`);
    lines.push(`    participant ${sanitize(apiLabel)} as ${apiLabel}`);
    lines.push(`    participant ${sanitize(dbLabel)} as ${dbLabel}`);
    lines.push('');
    lines.push(`    Note over User: ${flow.name}`);
    if (flow.steps && flow.steps.length > 0) {
        for (let i = 0; i < flow.steps.length; i++) {
            const step = flow.steps[i];
            const stepAction = classifyStep(step);
            if (stepAction.type === 'user-input') {
                lines.push(`    User->>+${sanitize(clientLabel)}: ${step}`);
            }
            else if (stepAction.type === 'api-call') {
                lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: ${step}`);
                lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: Query / Mutate`);
                lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Result`);
                lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: Response`);
            }
            else if (stepAction.type === 'display') {
                lines.push(`    ${sanitize(clientLabel)}-->>-User: ${step}`);
            }
            else {
                // Generic step — model as user → frontend → API round-trip
                lines.push(`    User->>+${sanitize(clientLabel)}: ${step}`);
                lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: Process: ${step}`);
                lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: Done`);
                lines.push(`    ${sanitize(clientLabel)}-->>-User: Updated`);
            }
        }
    }
    else {
        // No steps defined — generate a generic request/response
        lines.push(`    User->>+${sanitize(clientLabel)}: Initiate ${flow.name}`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: Process request`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: Read / Write`);
        lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Result`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: Response`);
        lines.push(`    ${sanitize(clientLabel)}-->>-User: ${flow.name} complete`);
    }
    return {
        name: flow.name,
        slug: slugify(flow.name),
        content: lines.join('\n'),
    };
}
function buildGoalFlow(doc, personaName, goal) {
    const frontends = doc.architecture.projects.frontend || [];
    const backends = doc.architecture.projects.backend || [];
    const clientLabel = frontends.length > 0 ? `${frontends[0].name} (Frontend)` : 'Client';
    const apiLabel = backends.length > 0 ? `${backends[0].name} (API)` : 'API';
    const dbLabel = `${displayName(doc.data.primaryDatabase.type)} (DB)`;
    const entity = extractEntity(goal);
    if (!entity)
        return null;
    const action = extractAction(goal);
    const flowName = `${personaName}: ${goal}`;
    const lines = [];
    lines.push('sequenceDiagram');
    lines.push(`    actor ${sanitize(personaName)} as ${personaName}`);
    lines.push(`    participant ${sanitize(clientLabel)} as ${clientLabel}`);
    lines.push(`    participant ${sanitize(apiLabel)} as ${apiLabel}`);
    lines.push(`    participant ${sanitize(dbLabel)} as ${dbLabel}`);
    lines.push('');
    lines.push(`    Note over ${sanitize(personaName)}: ${goal}`);
    if (action === 'create') {
        lines.push(`    ${sanitize(personaName)}->>+${sanitize(clientLabel)}: Fill ${entity} form`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: POST /${pluralize(entity.toLowerCase())}`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: INSERT ${entity}`);
        lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Created`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: 201 ${entity}`);
        lines.push(`    ${sanitize(clientLabel)}-->>-${sanitize(personaName)}: ${entity} created`);
    }
    else if (action === 'list' || action === 'view' || action === 'browse') {
        lines.push(`    ${sanitize(personaName)}->>+${sanitize(clientLabel)}: Navigate to ${pluralize(entity.toLowerCase())}`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: GET /${pluralize(entity.toLowerCase())}`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: SELECT ${pluralize(entity)}`);
        lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Results`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: 200 ${pluralize(entity)} list`);
        lines.push(`    ${sanitize(clientLabel)}-->>-${sanitize(personaName)}: Display ${pluralize(entity.toLowerCase())}`);
    }
    else if (action === 'update' || action === 'edit' || action === 'mark') {
        lines.push(`    ${sanitize(personaName)}->>+${sanitize(clientLabel)}: Update ${entity}`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: PATCH /${pluralize(entity.toLowerCase())}/{id}`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: UPDATE ${entity}`);
        lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Updated`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: 200 ${entity}`);
        lines.push(`    ${sanitize(clientLabel)}-->>-${sanitize(personaName)}: ${entity} updated`);
    }
    else if (action === 'delete' || action === 'remove') {
        lines.push(`    ${sanitize(personaName)}->>+${sanitize(clientLabel)}: Delete ${entity}`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: DELETE /${pluralize(entity.toLowerCase())}/{id}`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: DELETE ${entity}`);
        lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Deleted`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: 204`);
        lines.push(`    ${sanitize(clientLabel)}-->>-${sanitize(personaName)}: ${entity} removed`);
    }
    else {
        lines.push(`    ${sanitize(personaName)}->>+${sanitize(clientLabel)}: ${goal}`);
        lines.push(`    ${sanitize(clientLabel)}->>+${sanitize(apiLabel)}: Process request`);
        lines.push(`    ${sanitize(apiLabel)}->>+${sanitize(dbLabel)}: Query`);
        lines.push(`    ${sanitize(dbLabel)}-->>-${sanitize(apiLabel)}: Result`);
        lines.push(`    ${sanitize(apiLabel)}-->>-${sanitize(clientLabel)}: Response`);
        lines.push(`    ${sanitize(clientLabel)}-->>-${sanitize(personaName)}: Done`);
    }
    return {
        name: flowName,
        slug: slugify(flowName),
        content: lines.join('\n'),
    };
}
// ─── Helpers ───
function classifyStep(step) {
    const lower = step.toLowerCase();
    if (/^(enter|fill|type|input|select|choose|click|submit|upload)/.test(lower))
        return { type: 'user-input' };
    if (/^(send|post|get|fetch|save|create|update|delete|call|request)/.test(lower))
        return { type: 'api-call' };
    if (/^(display|show|render|redirect|navigate|view|see)/.test(lower))
        return { type: 'display' };
    return { type: 'generic' };
}
function extractEntity(goal) {
    const match = goal.match(/^(?:create|add|manage|view|edit|update|delete|remove|list|browse|search|submit|assign|track|mark|set|toggle)\s+(.+?)(?:\s+(?:as|to|complete|done|active|inactive).*)?$/i);
    if (match)
        return singularize(capitalize(match[1].trim()));
    return null;
}
function extractAction(goal) {
    const match = goal.match(/^(\w+)\s/i);
    return match ? match[1].toLowerCase() : 'view';
}
function sanitize(s) {
    return s.replace(/[^a-zA-Z0-9_]/g, '_');
}
function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function displayName(s) {
    const labels = {
        postgres: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', sqlserver: 'SQL Server',
        dynamodb: 'DynamoDB', cockroachdb: 'CockroachDB', planetscale: 'PlanetScale',
        auth0: 'Auth0', cognito: 'Cognito', firebase: 'Firebase', clerk: 'Clerk',
        supabase: 'Supabase', custom: 'Custom Auth',
    };
    return labels[s] || s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function singularize(s) {
    if (s.endsWith('ies'))
        return s.slice(0, -3) + 'y';
    if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes'))
        return s.slice(0, -2);
    if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us'))
        return s.slice(0, -1);
    return s;
}
function pluralize(s) {
    if (s.endsWith('y') && !/[aeiou]y$/i.test(s))
        return s.slice(0, -1) + 'ies';
    if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('sh') || s.endsWith('ch'))
        return s + 'es';
    return s + 's';
}
