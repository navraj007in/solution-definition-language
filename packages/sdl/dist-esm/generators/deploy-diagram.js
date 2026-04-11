/**
 * Generate a Mermaid deployment topology diagram from a deployment plan.
 * Pure function — no side effects.
 */
export function generateDeployDiagram(input) {
    const lines = ['graph TB'];
    // Group services by platform
    const platformGroups = new Map();
    for (const svc of input.services) {
        const platform = svc.platform;
        if (!platformGroups.has(platform))
            platformGroups.set(platform, []);
        platformGroups.get(platform).push(svc);
    }
    // Generate subgraphs for each platform
    let subgraphIndex = 0;
    const nodeIds = [];
    const frontendNodes = [];
    const backendNodes = [];
    const dataNodes = [];
    for (const [platform, services] of platformGroups) {
        const sgId = `SG${subgraphIndex++}`;
        const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
        lines.push(`    subgraph ${sgId}["${platformLabel}"]`);
        for (const svc of services) {
            const nodeId = sanitizeId(svc.name);
            const costLabel = svc.estimatedCost > 0 ? `<br/>$${svc.estimatedCost}/mo` : '';
            const tierLabel = svc.tier ? ` (${svc.tier})` : '';
            const category = categorizeService(svc.name);
            if (category === 'data') {
                lines.push(`        ${nodeId}[("${svc.name}${tierLabel}${costLabel}")]`);
                dataNodes.push(nodeId);
            }
            else {
                lines.push(`        ${nodeId}["${svc.name}${tierLabel}${costLabel}"]`);
                if (category === 'frontend')
                    frontendNodes.push(nodeId);
                else
                    backendNodes.push(nodeId);
            }
            nodeIds.push(nodeId);
        }
        lines.push('    end');
    }
    // Add user node and connections
    lines.push('    User(["User"])');
    // User → frontend (or first backend if no frontend)
    if (frontendNodes.length > 0) {
        for (const fe of frontendNodes) {
            lines.push(`    User --> ${fe}`);
        }
        // Frontend → backend
        for (const fe of frontendNodes) {
            for (const be of backendNodes) {
                lines.push(`    ${fe} --> ${be}`);
            }
        }
    }
    else if (backendNodes.length > 0) {
        lines.push(`    User --> ${backendNodes[0]}`);
    }
    // Backend → data
    for (const be of backendNodes) {
        for (const db of dataNodes) {
            lines.push(`    ${be} --> ${db}`);
        }
    }
    // Styling
    for (const fe of frontendNodes) {
        lines.push(`    style ${fe} fill:#00d4ff15,stroke:#00d4ff,color:#e0f7ff`);
    }
    for (const be of backendNodes) {
        lines.push(`    style ${be} fill:#7c3aed15,stroke:#7c3aed,color:#e8d5ff`);
    }
    for (const db of dataNodes) {
        lines.push(`    style ${db} fill:#f59e0b15,stroke:#f59e0b,color:#fef3c7`);
    }
    lines.push('    style User fill:#10b98115,stroke:#10b981,color:#d1fae5');
    const mermaid = lines.join('\n');
    return {
        artifactType: 'deployment-guide',
        files: [
            { path: 'diagrams/deployment-topology.mmd', content: mermaid },
        ],
        metadata: {
            strategy: input.strategy,
            serviceCount: input.services.length,
            totalCost: input.services.reduce((sum, s) => sum + s.estimatedCost, 0),
        },
    };
}
function sanitizeId(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
}
function categorizeService(name) {
    const lower = name.toLowerCase();
    if (['frontend', 'web', 'app', 'client', 'ui', 'cdn', 'static'].some(k => lower.includes(k))) {
        return 'frontend';
    }
    if (['database', 'db', 'postgres', 'mysql', 'mongo', 'redis', 'cache', 'storage', 'search', 'elastic'].some(k => lower.includes(k))) {
        return 'data';
    }
    return 'backend';
}
