/**
 * Generates a Mermaid C4 container diagram from an SDL document.
 * Deterministic — same input always produces identical output.
 */
export function generateArchitectureDiagram(doc) {
    const lines = [];
    lines.push('%%{init: {"theme":"base"}}%%');
    lines.push('graph TB');
    const frontends = doc.architecture.projects.frontend || [];
    const backends = doc.architecture.projects.backend || [];
    const mobiles = doc.architecture.projects.mobile || [];
    // Client Tier
    if (frontends.length > 0 || mobiles.length > 0) {
        lines.push('    subgraph "Client Tier"');
        for (const fe of frontends) {
            const id = sanitize(fe.name);
            lines.push(`        ${id}["${displayName(fe.name)}<br/>${frameworkLabel(fe.framework)}"]`);
        }
        for (const mob of mobiles) {
            const id = sanitize(mob.name);
            lines.push(`        ${id}["${displayName(mob.name)}<br/>${frameworkLabel(mob.framework)}"]`);
        }
        lines.push('    end');
    }
    // Authentication
    if (doc.auth && doc.auth.provider) {
        lines.push('    subgraph "Authentication"');
        lines.push(`        auth_provider["${displayName(doc.auth.provider)}<br/>${doc.auth.strategy.toUpperCase()}"]`);
        lines.push('    end');
    }
    // Application Backend
    if (backends.length > 0) {
        lines.push('    subgraph "Application Backend"');
        for (const be of backends) {
            const id = sanitize(be.name);
            const ormLabel = be.orm ? ` + ${displayName(be.orm)}` : '';
            lines.push(`        ${id}["${displayName(be.name)}<br/>${frameworkLabel(be.framework)}${ormLabel}"]`);
        }
        lines.push('    end');
    }
    // Data Storage
    const db = doc.data.primaryDatabase;
    const secondaries = doc.data.secondaryDatabases || [];
    lines.push('    subgraph "Data Storage"');
    const managedLabel = db.hosting === 'managed' ? ' (Managed)' : '';
    const dbNameLabel = db.name ? `<br/>${db.name}` : '';
    lines.push(`        primary_db[("${displayName(db.type)}${managedLabel}${dbNameLabel}")]`);
    for (const sdb of secondaries) {
        const sid = sanitize(sdb.name ?? sdb.type);
        const roleLabel = sdb.role ? `<br/>${sdb.role}` : '';
        lines.push(`        ${sid}[("${displayName(sdb.type)}${roleLabel}")]`);
    }
    // Cache
    if (doc.data.cache) {
        lines.push(`        cache[("${displayName(doc.data.cache.type || 'redis')}<br/>Cache")]`);
    }
    lines.push('    end');
    // Connections: Frontend → Backend
    for (const fe of frontends) {
        for (const be of backends) {
            lines.push(`    ${sanitize(fe.name)} -->|"HTTPS"| ${sanitize(be.name)}`);
        }
    }
    // Connections: Mobile → Backend
    for (const mob of mobiles) {
        for (const be of backends) {
            lines.push(`    ${sanitize(mob.name)} -->|"HTTPS"| ${sanitize(be.name)}`);
        }
    }
    // Connections: Frontend/Mobile → Auth
    if (doc.auth?.provider) {
        for (const fe of frontends) {
            lines.push(`    ${sanitize(fe.name)} -->|"Login/Signup"| auth_provider`);
        }
        for (const mob of mobiles) {
            lines.push(`    ${sanitize(mob.name)} -->|"Login/Signup"| auth_provider`);
        }
        // Backend → Auth (verify)
        for (const be of backends) {
            lines.push(`    ${sanitize(be.name)} -->|"Verify Token"| auth_provider`);
        }
    }
    // Connections: Backend → Database
    for (const be of backends) {
        lines.push(`    ${sanitize(be.name)} -->|"Queries"| primary_db`);
        if (doc.data.cache) {
            lines.push(`    ${sanitize(be.name)} -->|"Cache"| cache`);
        }
    }
    // Styling
    for (const fe of frontends) {
        lines.push(`    style ${sanitize(fe.name)} fill:#e1f5ff,stroke:#333,stroke-width:2px`);
    }
    for (const mob of mobiles) {
        lines.push(`    style ${sanitize(mob.name)} fill:#e1f5ff,stroke:#333,stroke-width:2px`);
    }
    for (const be of backends) {
        lines.push(`    style ${sanitize(be.name)} fill:#fff4e1,stroke:#333,stroke-width:2px`);
    }
    lines.push('    style primary_db fill:#f0f0f0,stroke:#333,stroke-width:2px');
    if (doc.auth?.provider) {
        lines.push('    style auth_provider fill:#e8f5e9,stroke:#333,stroke-width:2px');
    }
    const mermaidCode = lines.join('\n');
    return {
        artifactType: 'architecture-diagram',
        files: [
            {
                path: 'artifacts/architecture/c4-container.mmd',
                content: mermaidCode,
            },
        ],
        metadata: {
            solutionName: doc.solution.name,
            diagramType: 'c4-container',
            mermaidCode,
        },
    };
}
function sanitize(s) {
    return s.replace(/[^a-zA-Z0-9_]/g, '_');
}
function displayName(s) {
    return s
        .split(/[-_ ]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
function frameworkLabel(fw) {
    const labels = {
        nextjs: 'Next.js',
        react: 'React',
        vue: 'Vue.js',
        angular: 'Angular',
        svelte: 'Svelte',
        solid: 'SolidJS',
        nodejs: 'Node.js',
        'dotnet-8': '.NET 8',
        'python-fastapi': 'FastAPI',
        go: 'Go',
        'java-spring': 'Spring Boot',
        'ruby-rails': 'Ruby on Rails',
        'php-laravel': 'Laravel',
        'react-native': 'React Native',
        flutter: 'Flutter',
        swift: 'Swift',
        kotlin: 'Kotlin',
        ionic: 'Ionic',
    };
    return labels[fw] || fw;
}
