import type { SDLDocument } from '../types';
import type { RawGeneratorResult } from './types';

/**
 * Generates a Mermaid flowchart architecture diagram from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Uses plain single-line labels compatible with Mermaid 11 strict mode —
 * no HTML, no init blocks.
 */
export function generateArchitectureDiagram(doc: SDLDocument): RawGeneratorResult {
  const lines: string[] = [];
  lines.push('flowchart TB');

  const frontends = doc.architecture.projects.frontend || [];
  const backends  = doc.architecture.projects.backend  || [];
  const mobiles   = doc.architecture.projects.mobile   || [];

  // Client Tier
  if (frontends.length > 0 || mobiles.length > 0) {
    lines.push('    subgraph ClientTier["Client Tier"]');
    for (const fe of frontends) {
      const id = sanitize(fe.name);
      lines.push(`        ${id}["${displayName(fe.name)} / ${frameworkLabel(fe.framework)}"]`);
    }
    for (const mob of mobiles) {
      const id = sanitize(mob.name);
      lines.push(`        ${id}["${displayName(mob.name)} / ${frameworkLabel(mob.framework)}"]`);
    }
    lines.push('    end');
  }

  // Authentication
  if (doc.auth && doc.auth.provider) {
    lines.push('    subgraph AuthTier["Authentication"]');
    lines.push(`        auth_provider["${displayName(doc.auth.provider)} / ${doc.auth.strategy.toUpperCase()}"]`);
    lines.push('    end');
  }

  // Application Backend
  if (backends.length > 0) {
    lines.push('    subgraph BackendTier["Application Backend"]');
    for (const be of backends) {
      const id = sanitize(be.name);
      const ormLabel = be.orm ? ` + ${displayName(be.orm)}` : '';
      lines.push(`        ${id}["${displayName(be.name)} / ${frameworkLabel(be.framework)}${ormLabel}"]`);
    }
    lines.push('    end');
  }

  // Data Storage
  const db = doc.data.primaryDatabase;
  const secondaries = doc.data.secondaryDatabases || [];
  lines.push('    subgraph DataTier["Data Storage"]');
  const managedLabel = db.hosting === 'managed' ? ' managed' : '';
  const dbLabel = db.name ? `${displayName(db.type)}${managedLabel} / ${db.name}` : `${displayName(db.type)}${managedLabel}`;
  lines.push(`        primary_db[("${dbLabel}")]`);
  for (const sdb of secondaries) {
    const sid = sanitize(sdb.name ?? sdb.type);
    const roleLabel = sdb.role ? ` / ${sdb.role}` : '';
    lines.push(`        ${sid}[("${displayName(sdb.type)}${roleLabel}")]`);
  }
  if (doc.data.cache && doc.data.cache.type && doc.data.cache.type !== 'none') {
    lines.push(`        cache[("${displayName(doc.data.cache.type)} cache")]`);
  }
  lines.push('    end');

  // Connections: Frontend / Mobile → Backend
  for (const fe of frontends) {
    for (const be of backends) {
      lines.push(`    ${sanitize(fe.name)} -->|HTTPS| ${sanitize(be.name)}`);
    }
  }
  for (const mob of mobiles) {
    for (const be of backends) {
      lines.push(`    ${sanitize(mob.name)} -->|HTTPS| ${sanitize(be.name)}`);
    }
  }

  // Connections: Frontend / Mobile → Auth
  if (doc.auth?.provider) {
    for (const fe of frontends) {
      lines.push(`    ${sanitize(fe.name)} -->|"Login/Signup"| auth_provider`);
    }
    for (const mob of mobiles) {
      lines.push(`    ${sanitize(mob.name)} -->|"Login/Signup"| auth_provider`);
    }
    for (const be of backends) {
      lines.push(`    ${sanitize(be.name)} -->|"Verify Token"| auth_provider`);
    }
  }

  // Connections: Backend → Data
  for (const be of backends) {
    lines.push(`    ${sanitize(be.name)} -->|"Queries"| primary_db`);
    if (doc.data.cache && doc.data.cache.type !== 'none') {
      lines.push(`    ${sanitize(be.name)} -->|"Cache"| cache`);
    }
  }

  // Styling
  lines.push('    classDef frontend fill:#1e3a5f,stroke:#3b82f6,color:#e2e8f0');
  lines.push('    classDef backend  fill:#1e3d2f,stroke:#34d399,color:#e2e8f0');
  lines.push('    classDef auth     fill:#2d2060,stroke:#a78bfa,color:#e2e8f0');
  lines.push('    classDef data     fill:#3d2a10,stroke:#f59e0b,color:#e2e8f0');

  for (const fe of frontends) lines.push(`    class ${sanitize(fe.name)} frontend`);
  for (const mob of mobiles)  lines.push(`    class ${sanitize(mob.name)} frontend`);
  for (const be of backends)  lines.push(`    class ${sanitize(be.name)} backend`);
  if (doc.auth?.provider) lines.push('    class auth_provider auth');
  lines.push('    class primary_db data');
  if (doc.data.cache && doc.data.cache.type !== 'none') lines.push('    class cache data');

  const mermaidCode = lines.join('\n');

  return {
    artifactType: 'architecture-diagram',
    files: [{ path: 'artifacts/architecture/c4-container.mmd', content: mermaidCode }],
    metadata: { solutionName: doc.solution.name, diagramType: 'c4-container', mermaidCode },
  };
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '_');
}

function displayName(s: string): string {
  return s.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function frameworkLabel(fw: string): string {
  const map: Record<string, string> = {
    nextjs: 'Next.js', react: 'React', vue: 'Vue.js', angular: 'Angular',
    svelte: 'Svelte', solid: 'SolidJS', nodejs: 'Node.js',
    'python-fastapi': 'FastAPI', 'dotnet-8': '.NET 8', go: 'Go',
    'java-spring': 'Spring', 'ruby-rails': 'Rails', 'php-laravel': 'Laravel',
    'react-native': 'React Native', flutter: 'Flutter', swift: 'Swift',
    kotlin: 'Kotlin', ionic: 'Ionic',
  };
  return map[fw] ?? displayName(fw);
}
