import type { SDLDocument, FrontendProject, BackendProject, MobileProject } from '../types';
import type { GeneratorResult, GeneratedFile } from './types';

/**
 * Generates repository scaffolds (virtual file maps) for each project in the SDL.
 * Deterministic — same input always produces identical output.
 */
export function generateRepoScaffold(doc: SDLDocument): GeneratorResult {
  const files: GeneratedFile[] = [];

  for (const fe of doc.architecture.projects.frontend || []) {
    files.push(...generateFrontendScaffold(fe, doc));
  }

  for (const be of doc.architecture.projects.backend || []) {
    files.push(...generateBackendScaffold(be, doc));
  }

  for (const mob of doc.architecture.projects.mobile || []) {
    files.push(...generateMobileScaffold(mob, doc));
  }

  return {
    artifactType: 'repo-scaffold',
    files,
    metadata: {
      solutionName: doc.solution.name,
      projectCount:
        (doc.architecture.projects.frontend || []).length +
        (doc.architecture.projects.backend || []).length +
        (doc.architecture.projects.mobile || []).length,
    },
  };
}

// ─── Frontend Scaffolds ───

function generateFrontendScaffold(fe: FrontendProject, doc: SDLDocument): GeneratedFile[] {
  const base = `artifacts/repos/frontend-${fe.name}`;
  const files: GeneratedFile[] = [];

  // package.json
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  switch (fe.framework) {
    case 'nextjs':
      deps['next'] = '14.2.0';
      deps['react'] = '18.3.0';
      deps['react-dom'] = '18.3.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['@types/react'] = '18.3.0';
      devDeps['@types/node'] = '20.12.0';
      break;
    case 'react':
      deps['react'] = '18.3.0';
      deps['react-dom'] = '18.3.0';
      deps['react-router-dom'] = '6.23.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['vite'] = '5.2.0';
      devDeps['@vitejs/plugin-react'] = '4.3.0';
      break;
    case 'vue':
      deps['vue'] = '3.4.0';
      deps['vue-router'] = '4.3.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['vite'] = '5.2.0';
      devDeps['@vitejs/plugin-vue'] = '5.0.0';
      break;
    case 'angular':
      deps['@angular/core'] = '17.3.0';
      deps['@angular/common'] = '17.3.0';
      deps['@angular/router'] = '17.3.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['@angular/cli'] = '17.3.0';
      break;
    case 'svelte':
      deps['svelte'] = '4.2.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['vite'] = '5.2.0';
      devDeps['@sveltejs/vite-plugin-svelte'] = '3.1.0';
      break;
    default:
      deps['react'] = '18.3.0';
      deps['react-dom'] = '18.3.0';
      devDeps['typescript'] = '5.4.0';
  }

  // Styling
  if (fe.styling === 'tailwind') {
    devDeps['tailwindcss'] = '3.4.0';
    devDeps['postcss'] = '8.4.0';
    devDeps['autoprefixer'] = '10.4.0';
  }

  // Auth SDK
  if (doc.auth?.provider === 'auth0') deps['@auth0/nextjs-auth0'] = '3.5.0';
  if (doc.auth?.provider === 'clerk') deps['@clerk/nextjs'] = '5.0.0';
  if (doc.auth?.provider === 'supabase') deps['@supabase/supabase-js'] = '2.43.0';
  if (doc.auth?.provider === 'firebase') deps['firebase'] = '10.12.0';

  const pkg = {
    name: `@${toSnake(doc.solution.name)}/${fe.name}`,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: fe.framework === 'nextjs' ? 'next dev' : 'vite dev',
      build: fe.framework === 'nextjs' ? 'next build' : 'vite build',
      start: fe.framework === 'nextjs' ? 'next start' : 'vite preview',
      lint: 'eslint .',
    },
    dependencies: sortKeys(deps),
    devDependencies: sortKeys(devDeps),
  };

  files.push({ path: `${base}/package.json`, content: JSON.stringify(pkg, null, 2) + '\n' });
  files.push({ path: `${base}/tsconfig.json`, content: tsconfig('frontend') });
  files.push({ path: `${base}/.gitignore`, content: gitignore() });
  files.push({ path: `${base}/.env.example`, content: envExample(doc, 'frontend') });
  files.push({ path: `${base}/README.md`, content: readme(fe.name, fe.framework, doc.solution.name) });

  // Per-environment .env files
  const backends = doc.architecture.projects.backend || [];
  files.push({ path: `${base}/.env.local`, content: envFrontendPerEnv(doc, fe, backends, 'local') });
  files.push({ path: `${base}/.env.staging`, content: envFrontendPerEnv(doc, fe, backends, 'staging') });
  files.push({ path: `${base}/.env.production`, content: envFrontendPerEnv(doc, fe, backends, 'production') });

  // Typed config module
  files.push({ path: `${base}/src/config.ts`, content: frontendConfigModule(fe, backends) });

  // src skeleton
  if (fe.framework === 'nextjs') {
    files.push({ path: `${base}/src/app/layout.tsx`, content: nextLayout(doc.solution.name) });
    files.push({ path: `${base}/src/app/page.tsx`, content: nextPage(doc.solution.name) });
  } else {
    files.push({ path: `${base}/src/main.tsx`, content: `// Entry point for ${fe.name}\n` });
    files.push({ path: `${base}/src/App.tsx`, content: `// Root App component\n` });
  }

  return files;
}

// ─── Backend Scaffolds ───

function generateBackendScaffold(be: BackendProject, doc: SDLDocument): GeneratedFile[] {
  const base = `artifacts/repos/backend-${be.name}`;
  const files: GeneratedFile[] = [];

  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  switch (be.framework) {
    case 'nodejs':
      deps['express'] = '4.19.0';
      deps['cors'] = '2.8.5';
      deps['helmet'] = '7.1.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['tsx'] = '4.10.0';
      devDeps['@types/express'] = '4.17.0';
      devDeps['@types/cors'] = '2.8.17';
      break;
    case 'python-fastapi':
      // Python uses requirements.txt instead
      break;
    case 'dotnet-8':
      // .NET uses .csproj
      break;
    case 'java-spring':
      // Java uses pom.xml or build.gradle
      break;
    default:
      deps['express'] = '4.19.0';
      devDeps['typescript'] = '5.4.0';
      devDeps['tsx'] = '4.10.0';
  }

  // ORM
  if (be.orm === 'prisma') {
    deps['@prisma/client'] = '5.14.0';
    devDeps['prisma'] = '5.14.0';
  } else if (be.orm === 'mongoose') {
    deps['mongoose'] = '8.4.0';
  } else if (be.orm === 'typeorm') {
    deps['typeorm'] = '0.3.20';
    deps['reflect-metadata'] = '0.2.2';
  }

  // Database driver
  const dbType = doc.data.primaryDatabase.type;
  if (dbType === 'postgres' && be.orm !== 'prisma' && be.orm !== 'mongoose') {
    deps['pg'] = '8.11.0';
    devDeps['@types/pg'] = '8.11.0';
  } else if (dbType === 'mysql') {
    deps['mysql2'] = '3.10.0';
  } else if (dbType === 'mongodb' && be.orm !== 'mongoose') {
    deps['mongodb'] = '6.7.0';
  }

  // Auth
  if (doc.auth?.strategy === 'oidc') {
    deps['jsonwebtoken'] = '9.0.2';
    devDeps['@types/jsonwebtoken'] = '9.0.6';
  }

  if (be.framework === 'python-fastapi') {
    // Python project
    const requirements = [
      'fastapi==0.111.0',
      'uvicorn==0.30.0',
      'pydantic==2.7.0',
      dbType === 'postgres' ? 'asyncpg==0.29.0' : null,
      dbType === 'mongodb' ? 'motor==3.4.0' : null,
      doc.auth?.strategy === 'oidc' ? 'python-jose==3.3.0' : null,
    ].filter(Boolean).join('\n');

    files.push({ path: `${base}/requirements.txt`, content: requirements + '\n' });
    files.push({ path: `${base}/src/main.py`, content: `"""${doc.solution.name} API"""\nfrom fastapi import FastAPI\n\napp = FastAPI(title="${doc.solution.name}")\n` });
    files.push({ path: `${base}/.env.example`, content: envExample(doc, 'backend') });
    files.push({ path: `${base}/.gitignore`, content: gitignorePython() });
    files.push({ path: `${base}/README.md`, content: readme(be.name, be.framework, doc.solution.name) });
  } else {
    // Node.js / default project
    const pkg = {
      name: `@${toSnake(doc.solution.name)}/${be.name}`,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'tsx watch src/server.ts',
        build: 'tsc',
        start: 'node dist/server.js',
        lint: 'eslint .',
        ...(be.orm === 'prisma' ? { 'db:generate': 'prisma generate', 'db:migrate': 'prisma migrate dev' } : {}),
      },
      dependencies: sortKeys(deps),
      devDependencies: sortKeys(devDeps),
    };

    files.push({ path: `${base}/package.json`, content: JSON.stringify(pkg, null, 2) + '\n' });
    files.push({ path: `${base}/tsconfig.json`, content: tsconfig('backend') });
    files.push({ path: `${base}/.gitignore`, content: gitignore() });
    files.push({ path: `${base}/.env.example`, content: envExample(doc, 'backend') });
    files.push({ path: `${base}/README.md`, content: readme(be.name, be.framework, doc.solution.name) });

    // Per-environment .env files
    const otherBackends = (doc.architecture.projects.backend || []).filter(b => b.name !== be.name);
    const services = doc.architecture.services || [];
    files.push({ path: `${base}/.env.local`, content: envBackendPerEnv(doc, be, otherBackends, services, 'local') });
    files.push({ path: `${base}/.env.staging`, content: envBackendPerEnv(doc, be, otherBackends, services, 'staging') });
    files.push({ path: `${base}/.env.production`, content: envBackendPerEnv(doc, be, otherBackends, services, 'production') });

    // src skeleton
    files.push({
      path: `${base}/src/server.ts`,
      content: nodeServerStub(doc, be.name),
    });
    // Typed config module with env validation and service discovery
    files.push({ path: `${base}/src/config.ts`, content: backendConfigModule(doc, be, otherBackends, services) });

    // Generate route files from persona goals
    const entities = deriveEntities(doc);
    if (entities.length > 0) {
      for (const entity of entities) {
        files.push({ path: `${base}/src/routes/${entity.slug}.ts`, content: routeStub(entity) });
      }
    } else {
      files.push({ path: `${base}/src/routes/index.ts`, content: `// Route definitions\n` });
    }

    // Prisma schema
    if (be.orm === 'prisma') {
      files.push({
        path: `${base}/prisma/schema.prisma`,
        content: prismaSchema(doc),
      });
    }
  }

  return files;
}

// ─── Mobile Scaffolds ───

function generateMobileScaffold(mob: MobileProject, doc: SDLDocument): GeneratedFile[] {
  const base = `artifacts/repos/mobile-${mob.name}`;
  const files: GeneratedFile[] = [];

  if (mob.framework === 'react-native') {
    const pkg = {
      name: `@${toSnake(doc.solution.name)}/${mob.name}`,
      version: '0.1.0',
      private: true,
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
      },
      dependencies: {
        expo: '51.0.0',
        react: '18.3.0',
        'react-native': '0.74.0',
      },
      devDependencies: {
        typescript: '5.4.0',
        '@types/react': '18.3.0',
      },
    };
    files.push({ path: `${base}/package.json`, content: JSON.stringify(pkg, null, 2) + '\n' });
    files.push({ path: `${base}/tsconfig.json`, content: tsconfig('mobile') });
    files.push({ path: `${base}/App.tsx`, content: `// Root App component for ${mob.name}\n` });
  } else if (mob.framework === 'flutter') {
    files.push({
      path: `${base}/pubspec.yaml`,
      content: `name: ${toSnake(mob.name)}\ndescription: ${doc.solution.name} mobile app\nversion: 0.1.0\n\nenvironment:\n  sdk: ">=3.4.0 <4.0.0"\n\ndependencies:\n  flutter:\n    sdk: flutter\n`,
    });
    files.push({ path: `${base}/lib/main.dart`, content: `// Entry point for ${mob.name}\n` });
  }

  files.push({ path: `${base}/.gitignore`, content: gitignore() });
  files.push({ path: `${base}/README.md`, content: readme(mob.name, mob.framework, doc.solution.name) });

  return files;
}

// ─── Templates ───

function tsconfig(target: 'frontend' | 'backend' | 'mobile'): string {
  const base = {
    compilerOptions: {
      target: target === 'backend' ? 'ES2022' : 'ES2021',
      module: target === 'backend' ? 'commonjs' : 'esnext',
      moduleResolution: target === 'backend' ? 'node' : 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      ...(target === 'backend' ? { outDir: './dist', rootDir: './src' } : {}),
      ...(target !== 'backend' ? { jsx: 'react-jsx' } : {}),
    },
    include: ['src'],
    exclude: ['node_modules', 'dist'],
  };
  return JSON.stringify(base, null, 2) + '\n';
}

function gitignore(): string {
  return `node_modules/\ndist/\n.env\n.env.local\n*.log\n.DS_Store\ncoverage/\n`;
}

function gitignorePython(): string {
  return `__pycache__/\n*.pyc\n.env\nvenv/\n.venv/\n*.egg-info/\ndist/\n.DS_Store\n`;
}

function envExample(doc: SDLDocument, layer: 'frontend' | 'backend'): string {
  const lines: string[] = [];
  lines.push(`# ${doc.solution.name} — ${layer} environment variables`);
  lines.push('');

  if (layer === 'backend') {
    lines.push('NODE_ENV=development');
    lines.push('PORT=3000');
    lines.push('');

    // Database
    const db = doc.data.primaryDatabase;
    if (db.type === 'postgres') lines.push('DATABASE_URL=postgresql://user:password@localhost:5432/db');
    else if (db.type === 'mysql') lines.push('DATABASE_URL=mysql://user:password@localhost:3306/db');
    else if (db.type === 'mongodb') lines.push('DATABASE_URL=mongodb://localhost:27017/db');
    else lines.push(`DATABASE_URL=<${db.type} connection string>`);
    lines.push('');

    // Auth
    if (doc.auth) {
      if (doc.auth.provider === 'auth0') {
        lines.push('AUTH0_DOMAIN=');
        lines.push('AUTH0_CLIENT_ID=');
        lines.push('AUTH0_CLIENT_SECRET=');
        lines.push('AUTH0_AUDIENCE=');
      } else if (doc.auth.provider === 'clerk') {
        lines.push('CLERK_SECRET_KEY=');
      } else if (doc.auth.provider === 'supabase') {
        lines.push('SUPABASE_URL=');
        lines.push('SUPABASE_SERVICE_KEY=');
      } else if (doc.auth.strategy === 'oidc') {
        lines.push('OIDC_ISSUER_URL=');
        lines.push('OIDC_CLIENT_ID=');
        lines.push('OIDC_CLIENT_SECRET=');
      }
      lines.push('JWT_SECRET=<random-secret>');
      lines.push('');
    }

    // Cache
    if (doc.data.cache) {
      lines.push(`REDIS_URL=redis://localhost:6379`);
      lines.push('');
    }
  }

  if (layer === 'frontend') {
    if (doc.auth?.provider === 'auth0') {
      lines.push('NEXT_PUBLIC_AUTH0_DOMAIN=');
      lines.push('NEXT_PUBLIC_AUTH0_CLIENT_ID=');
    } else if (doc.auth?.provider === 'clerk') {
      lines.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=');
    } else if (doc.auth?.provider === 'supabase') {
      lines.push('NEXT_PUBLIC_SUPABASE_URL=');
      lines.push('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
    }
    lines.push('NEXT_PUBLIC_API_URL=http://localhost:3000');
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

function readme(projectName: string, framework: string, solutionName: string): string {
  return `# ${projectName}

Part of **${solutionName}**.

## Tech Stack

- Framework: ${framework}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment Variables

Copy \`.env.example\` to \`.env\` and fill in the values.
`;
}

function nextLayout(name: string): string {
  return `export const metadata = { title: '${name}', description: '${name}' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function nextPage(name: string): string {
  return `export default function Home() {
  return (
    <main>
      <h1>${name}</h1>
    </main>
  );
}
`;
}

function nodeServerStub(doc: SDLDocument, projectName: string): string {
  const solutionName = doc.solution.name;
  const entities = deriveEntities(doc);

  const routeImports = entities.length > 0
    ? '\n' + entities.map((e) => `import ${e.camel}Router from './routes/${e.slug}';`).join('\n')
    : '';
  const routeMounts = entities.length > 0
    ? entities.map((e) => `app.use('/api/${e.plural}', ${e.camel}Router);`).join('\n')
    : '// Add your routes here';

  return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
${routeImports}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: '${projectName}' });
});

${routeMounts}

app.listen(PORT, () => {
  console.log(\`${solutionName} ${projectName} listening on port \${PORT}\`);
});
`;
}

function routeStub(entity: DerivedEntity): string {
  return `import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: [], message: 'List ${entity.plural}' });
});

router.get('/:id', (req, res) => {
  res.json({ data: null, message: 'Get ${entity.singular} by id: ' + req.params.id });
});

router.post('/', (req, res) => {
  res.status(201).json({ data: req.body, message: '${entity.singular} created' });
});

router.put('/:id', (req, res) => {
  res.json({ data: req.body, message: '${entity.singular} updated: ' + req.params.id });
});

router.delete('/:id', (req, res) => {
  res.status(204).send();
});

export default router;
`;
}

function prismaSchema(doc: SDLDocument): string {
  const db = doc.data.primaryDatabase;
  const provider = db.type === 'postgres' ? 'postgresql' : db.type === 'mysql' ? 'mysql' : db.type === 'mongodb' ? 'mongodb' : 'postgresql';
  const entities = deriveEntities(doc);
  const idType = db.type === 'mongodb' ? 'String @id @default(auto()) @map("_id") @db.ObjectId' : 'Int @id @default(autoincrement())';

  const models = entities.map((e) => {
    return `model ${e.name} {
  id        ${idType}
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
  });

  const hasAuth = !!doc.auth;
  if (hasAuth && !entities.some((e) => e.slug === 'user')) {
    const userModel = `model User {
  id        ${idType}
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
    models.unshift(userModel);
  }

  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

${models.length > 0 ? models.join('\n\n') + '\n' : '// Define your data models here\n'}`;
}

// ─── Entity Derivation ───

interface DerivedEntity {
  name: string;       // PascalCase — e.g. "Task"
  singular: string;   // lowercase — e.g. "task"
  plural: string;     // lowercase — e.g. "tasks"
  slug: string;       // kebab-case — e.g. "task"
  camel: string;      // camelCase — e.g. "task"
}

function deriveEntities(doc: SDLDocument): DerivedEntity[] {
  const seen = new Set<string>();
  const entities: DerivedEntity[] = [];

  // Extract entity nouns from persona goals (e.g. "Manage tasks" → "Task")
  for (const persona of doc.product.personas) {
    for (const goal of persona.goals) {
      const noun = extractNoun(goal);
      if (noun && !seen.has(noun.toLowerCase())) {
        seen.add(noun.toLowerCase());
        const singular = noun.toLowerCase();
        const plural = pluralize(singular);
        entities.push({
          name: noun.charAt(0).toUpperCase() + noun.slice(1),
          singular,
          plural,
          slug: singular.replace(/[^a-z0-9]+/g, '-'),
          camel: singular.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
        });
      }
    }
  }

  // Also derive from core flows
  for (const flow of doc.product.coreFlows || []) {
    const noun = extractNoun(flow.name);
    if (noun && !seen.has(noun.toLowerCase())) {
      seen.add(noun.toLowerCase());
      const singular = noun.toLowerCase();
      const plural = pluralize(singular);
      entities.push({
        name: noun.charAt(0).toUpperCase() + noun.slice(1),
        singular,
        plural,
        slug: singular.replace(/[^a-z0-9]+/g, '-'),
        camel: singular.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
      });
    }
  }

  return entities;
}

function extractNoun(phrase: string): string | null {
  // Remove common verb prefixes to get the domain noun
  const cleaned = phrase
    .replace(/^(manage|create|view|edit|update|delete|list|search|browse|track|monitor|handle|process|submit|review|approve|assign|configure|set up|schedule|send|receive|generate|export|import)\s+/i, '')
    .trim();
  if (!cleaned || cleaned === phrase) return null;
  // Take the first word as the entity noun, strip trailing 's' for plural
  const first = cleaned.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
  if (first.length < 2) return null;
  // Remove trailing 's' to singularize
  return first.endsWith('s') && first.length > 3 ? first.slice(0, -1) : first;
}

function pluralize(s: string): string {
  if (s.endsWith('y') && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + 'ies';
  if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('sh') || s.endsWith('ch')) return s + 'es';
  return s + 's';
}

// ─── Helpers ───

function toSnake(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// ─── Multi-Environment Config ───

type EnvName = 'local' | 'staging' | 'production';

function envVarPrefix(fe: FrontendProject): string {
  if (fe.framework === 'nextjs') return 'NEXT_PUBLIC_';
  if (fe.framework === 'angular') return 'NG_APP_';
  return 'VITE_'; // react, vue, svelte, solid
}

function backendPort(framework: string): number {
  switch (framework) {
    case 'python-fastapi': return 8000;
    case 'go': return 8080;
    case 'dotnet-8': return 5000;
    case 'java-spring': return 8080;
    default: return 3000;
  }
}

function toEnvKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function envFrontendPerEnv(
  doc: SDLDocument,
  fe: FrontendProject,
  backends: BackendProject[],
  env: EnvName,
): string {
  const prefix = envVarPrefix(fe);
  const lines: string[] = [];
  lines.push(`# ${doc.solution.name} — ${fe.name} (${env})`);
  lines.push(`${prefix}ENV=${env}`);
  lines.push('');

  // API URLs — one per backend service
  if (backends.length === 0) {
    lines.push(`${prefix}API_URL=${env === 'local' ? 'http://localhost:3000' : `https://api.example.com`}`);
  } else if (backends.length === 1) {
    const port = backendPort(backends[0].framework);
    lines.push(`${prefix}API_URL=${envUrl(backends[0].name, port, env)}`);
  } else {
    // Multiple backends — each gets its own URL var
    for (const be of backends) {
      const port = backendPort(be.framework);
      const key = `${prefix}${toEnvKey(be.name)}_URL`;
      lines.push(`${key}=${envUrl(be.name, port, env)}`);
    }
  }
  lines.push('');

  // Auth public keys
  if (doc.auth?.provider === 'auth0') {
    lines.push(`${prefix}AUTH0_DOMAIN=`);
    lines.push(`${prefix}AUTH0_CLIENT_ID=`);
    lines.push(`${prefix}AUTH0_REDIRECT_URI=${appUrl(fe.name, env)}/callback`);
  } else if (doc.auth?.provider === 'clerk') {
    lines.push(`${prefix}CLERK_PUBLISHABLE_KEY=`);
    lines.push(`${prefix}CLERK_SIGN_IN_URL=/sign-in`);
    lines.push(`${prefix}CLERK_AFTER_SIGN_IN_URL=/dashboard`);
  } else if (doc.auth?.provider === 'supabase') {
    lines.push(`${prefix}SUPABASE_URL=`);
    lines.push(`${prefix}SUPABASE_ANON_KEY=`);
  } else if (doc.auth?.provider === 'firebase') {
    lines.push(`${prefix}FIREBASE_API_KEY=`);
    lines.push(`${prefix}FIREBASE_AUTH_DOMAIN=`);
    lines.push(`${prefix}FIREBASE_PROJECT_ID=`);
  }
  if (doc.auth) lines.push('');

  // Feature flags
  lines.push(`${prefix}ENABLE_DEBUG=${env === 'local' ? 'true' : 'false'}`);
  lines.push('');

  return lines.join('\n') + '\n';
}

function envUrl(serviceName: string, port: number, env: EnvName): string {
  switch (env) {
    case 'local': return `http://localhost:${port}`;
    case 'staging': return `https://${serviceName}.staging.example.com`;
    case 'production': return `https://${serviceName}.example.com`;
  }
}

function appUrl(projectName: string, env: EnvName): string {
  switch (env) {
    case 'local': return 'http://localhost:5173';
    case 'staging': return `https://${projectName}.staging.example.com`;
    case 'production': return `https://${projectName}.example.com`;
  }
}

function frontendConfigModule(fe: FrontendProject, backends: BackendProject[]): string {
  const prefix = envVarPrefix(fe);
  const accessor = fe.framework === 'nextjs'
    ? `process.env`
    : `import.meta.env`;

  const lines: string[] = [];
  lines.push(`// Auto-generated environment config — edit .env.* files to change values`);
  lines.push('');

  if (backends.length <= 1) {
    lines.push(`export const config = {`);
    lines.push(`  env: ${accessor}.${prefix}ENV || 'local',`);
    lines.push(`  apiUrl: ${accessor}.${prefix}API_URL || 'http://localhost:3000',`);
    lines.push(`  debug: ${accessor}.${prefix}ENABLE_DEBUG === 'true',`);
    lines.push(`} as const;`);
  } else {
    lines.push(`export const config = {`);
    lines.push(`  env: ${accessor}.${prefix}ENV || 'local',`);
    lines.push(`  debug: ${accessor}.${prefix}ENABLE_DEBUG === 'true',`);
    lines.push(`  services: {`);
    for (const be of backends) {
      const key = toEnvKey(be.name);
      const camel = be.name.replace(/[- ]([a-z])/g, (_, c) => c.toUpperCase());
      const port = backendPort(be.framework);
      lines.push(`    ${camel}: ${accessor}.${prefix}${key}_URL || 'http://localhost:${port}',`);
    }
    lines.push(`  },`);
    lines.push(`} as const;`);
  }

  lines.push('');
  lines.push(`export type Environment = typeof config.env;`);
  lines.push('');
  return lines.join('\n') + '\n';
}

function envBackendPerEnv(
  doc: SDLDocument,
  be: BackendProject,
  otherBackends: BackendProject[],
  services: Array<{ name: string; kind?: string }>,
  env: EnvName,
): string {
  const frontends = doc.architecture.projects.frontend || [];
  const frontendName = frontends[0]?.name || 'app';

  const lines: string[] = [];
  lines.push(`# ${doc.solution.name} — ${be.name} (${env})`);
  lines.push(`NODE_ENV=${env === 'local' ? 'development' : env}`);
  lines.push(`PORT=${backendPort(be.framework)}`);
  lines.push(`LOG_LEVEL=${env === 'local' ? 'debug' : env === 'staging' ? 'info' : 'warn'}`);
  lines.push('');

  // App & CORS
  lines.push('# ── App & CORS ──');
  lines.push(`APP_URL=${appUrl(frontendName, env)}`);
  lines.push(`CORS_ORIGINS=${appUrl(frontendName, env)}`);
  lines.push(`COOKIE_DOMAIN=${env === 'local' ? 'localhost' : `.example.com`}`);
  lines.push(`COOKIE_SECURE=${env === 'local' ? 'false' : 'true'}`);
  lines.push('');

  // Database
  lines.push('# ── Database ──');
  const db = doc.data.primaryDatabase;
  const sslSuffix = env !== 'local' ? '?sslmode=require' : '';
  if (db.type === 'postgres') {
    lines.push(`DATABASE_URL=${env === 'local' ? 'postgresql://user:password@localhost:5432/db' : `postgresql://user:password@db-host:5432/db${sslSuffix}`}`);
  } else if (db.type === 'mysql') {
    lines.push(`DATABASE_URL=${env === 'local' ? 'mysql://user:password@localhost:3306/db' : 'mysql://user:password@db-host:3306/db?ssl=true'}`);
  } else if (db.type === 'mongodb') {
    lines.push(`DATABASE_URL=${env === 'local' ? 'mongodb://localhost:27017/db' : 'mongodb+srv://user:password@cluster.mongodb.net/db?retryWrites=true&w=majority'}`);
  } else {
    lines.push(`DATABASE_URL=<${db.type} connection string>`);
  }
  lines.push('');

  // Cache
  if (doc.data.cache?.type === 'redis') {
    lines.push('# ── Cache ──');
    lines.push(`REDIS_URL=${env === 'local' ? 'redis://localhost:6379' : 'redis://redis-host:6379'}`);
    lines.push('');
  }

  // Object storage
  const blobs = doc.data.storage?.blobs;
  const files = doc.data.storage?.files;
  const storageProvider = blobs?.provider || files?.provider;
  if (storageProvider) {
    lines.push('# ── Object Storage ──');
    if (storageProvider === 's3') {
      lines.push(`AWS_S3_BUCKET=${env === 'local' ? 'local-uploads' : `${doc.solution.name.toLowerCase().replace(/\s+/g, '-')}-${env}-uploads`}`);
      lines.push(`AWS_S3_REGION=${env === 'local' ? 'us-east-1' : 'us-east-1'}`);
      lines.push(`AWS_ACCESS_KEY_ID=`);
      lines.push(`AWS_SECRET_ACCESS_KEY=`);
    } else if (storageProvider === 'gcs') {
      lines.push(`GCS_BUCKET=${env === 'local' ? 'local-uploads' : `${doc.solution.name.toLowerCase().replace(/\s+/g, '-')}-${env}-uploads`}`);
      lines.push(`GCS_PROJECT_ID=`);
      lines.push(`GCS_KEY_FILE=`);
    } else if (storageProvider === 'azure-blob') {
      lines.push(`AZURE_STORAGE_ACCOUNT=`);
      lines.push(`AZURE_STORAGE_KEY=`);
      lines.push(`AZURE_STORAGE_CONTAINER=${env === 'local' ? 'local-uploads' : `${env}-uploads`}`);
    } else if (storageProvider === 'cloudflare-r2') {
      lines.push(`R2_ACCOUNT_ID=`);
      lines.push(`R2_ACCESS_KEY_ID=`);
      lines.push(`R2_SECRET_ACCESS_KEY=`);
      lines.push(`R2_BUCKET=${env === 'local' ? 'local-uploads' : `${env}-uploads`}`);
    }
    lines.push('');
  }

  // Queues
  const queues = doc.data.queues;
  if (queues?.provider) {
    lines.push('# ── Queues ──');
    if (queues.provider === 'rabbitmq') {
      lines.push(`RABBITMQ_URL=${env === 'local' ? 'amqp://guest:guest@localhost:5672' : 'amqp://user:password@rabbitmq-host:5672'}`);
    } else if (queues.provider === 'sqs') {
      lines.push(`AWS_SQS_REGION=${env === 'local' ? 'us-east-1' : 'us-east-1'}`);
      lines.push(`AWS_SQS_QUEUE_URL=${env === 'local' ? 'http://localhost:4566/000000000000/local-queue' : `https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/${env}-queue`}`);
    } else if (queues.provider === 'kafka') {
      lines.push(`KAFKA_BROKERS=${env === 'local' ? 'localhost:9092' : 'kafka-host:9092'}`);
      lines.push(`KAFKA_CLIENT_ID=${be.name}`);
      lines.push(`KAFKA_GROUP_ID=${be.name}-group`);
    } else if (queues.provider === 'azure-service-bus') {
      lines.push(`AZURE_SERVICE_BUS_CONNECTION_STRING=`);
      lines.push(`AZURE_SERVICE_BUS_QUEUE=${env === 'local' ? 'local-queue' : `${env}-queue`}`);
    } else if (queues.provider === 'redis') {
      lines.push(`QUEUE_REDIS_URL=${env === 'local' ? 'redis://localhost:6379/1' : 'redis://redis-host:6379/1'}`);
    }
    lines.push('');
  }

  // Search
  const search = doc.data.search;
  if (search?.provider) {
    lines.push('# ── Search ──');
    if (search.provider === 'elasticsearch') {
      lines.push(`ELASTICSEARCH_URL=${env === 'local' ? 'http://localhost:9200' : 'https://elasticsearch-host:9200'}`);
      lines.push(`ELASTICSEARCH_INDEX=${env === 'local' ? 'local' : env}`);
    } else if (search.provider === 'algolia') {
      lines.push(`ALGOLIA_APP_ID=`);
      lines.push(`ALGOLIA_API_KEY=`);
      lines.push(`ALGOLIA_INDEX=${env === 'local' ? `${doc.solution.name.toLowerCase().replace(/\s+/g, '_')}_local` : `${doc.solution.name.toLowerCase().replace(/\s+/g, '_')}_${env}`}`);
    } else if (search.provider === 'typesense') {
      lines.push(`TYPESENSE_URL=${env === 'local' ? 'http://localhost:8108' : 'https://typesense-host:8108'}`);
      lines.push(`TYPESENSE_API_KEY=`);
    } else if (search.provider === 'meilisearch') {
      lines.push(`MEILISEARCH_URL=${env === 'local' ? 'http://localhost:7700' : 'https://meilisearch-host:7700'}`);
      lines.push(`MEILISEARCH_API_KEY=`);
    } else if (search.provider === 'azure-search') {
      lines.push(`AZURE_SEARCH_ENDPOINT=`);
      lines.push(`AZURE_SEARCH_API_KEY=`);
      lines.push(`AZURE_SEARCH_INDEX=${env === 'local' ? 'local' : env}`);
    } else if (search.provider === 'pinecone' || search.provider === 'qdrant' || search.provider === 'weaviate') {
      lines.push(`VECTOR_DB_URL=${env === 'local' ? 'http://localhost:6333' : `https://${search.provider}-host`}`);
      lines.push(`VECTOR_DB_API_KEY=`);
    }
    lines.push('');
  }

  // Auth secrets
  if (doc.auth) {
    lines.push('# ── Auth ──');
    lines.push('JWT_SECRET=<random-secret>');
    if (doc.auth.provider === 'auth0') {
      lines.push('AUTH0_DOMAIN=');
      lines.push('AUTH0_CLIENT_ID=');
      lines.push('AUTH0_CLIENT_SECRET=');
      lines.push(`AUTH0_CALLBACK_URL=${envUrl(be.name, backendPort(be.framework), env)}/auth/callback`);
    } else if (doc.auth.provider === 'clerk') {
      lines.push('CLERK_SECRET_KEY=');
    } else if (doc.auth.provider === 'supabase') {
      lines.push('SUPABASE_URL=');
      lines.push('SUPABASE_SERVICE_KEY=');
    } else if (doc.auth.provider === 'firebase') {
      lines.push('FIREBASE_PROJECT_ID=');
      lines.push('FIREBASE_PRIVATE_KEY=');
      lines.push('FIREBASE_CLIENT_EMAIL=');
    } else if (doc.auth.strategy === 'oidc') {
      lines.push('OIDC_ISSUER_URL=');
      lines.push('OIDC_CLIENT_ID=');
      lines.push('OIDC_CLIENT_SECRET=');
      lines.push(`OIDC_REDIRECT_URI=${envUrl(be.name, backendPort(be.framework), env)}/auth/callback`);
    }
    lines.push('');
  }

  // Integrations (payments, email, etc.)
  const integrations = doc.integrations;
  if (integrations) {
    const hasAny = integrations.payments || integrations.email || integrations.sms || integrations.analytics || integrations.monitoring;
    if (hasAny) {
      lines.push('# ── Integrations ──');
      if (integrations.payments?.provider === 'stripe') {
        lines.push(`STRIPE_SECRET_KEY=${env === 'local' ? 'sk_test_...' : 'sk_live_...'}`);
        lines.push(`STRIPE_WEBHOOK_SECRET=whsec_...`);
        lines.push(`STRIPE_WEBHOOK_URL=${envUrl(be.name, backendPort(be.framework), env)}/webhooks/stripe`);
      }
      if (integrations.email?.provider) {
        const emailProvider = integrations.email.provider;
        if (emailProvider === 'sendgrid') lines.push('SENDGRID_API_KEY=');
        else if (emailProvider === 'ses') lines.push('AWS_SES_REGION=');
        else if (emailProvider === 'resend') lines.push('RESEND_API_KEY=');
        else if (emailProvider === 'postmark') lines.push('POSTMARK_API_KEY=');
        lines.push(`EMAIL_FROM=noreply@${env === 'local' ? 'localhost' : 'example.com'}`);
      }
      if (integrations.sms?.provider) {
        if (integrations.sms.provider === 'twilio') {
          lines.push('TWILIO_ACCOUNT_SID=');
          lines.push('TWILIO_AUTH_TOKEN=');
          lines.push('TWILIO_PHONE_NUMBER=');
        }
      }
      if (integrations.analytics?.provider) {
        lines.push(`ANALYTICS_PROVIDER=${integrations.analytics.provider}`);
      }
      if (integrations.monitoring?.provider) {
        const mon = integrations.monitoring.provider;
        if (mon === 'sentry') lines.push('SENTRY_DSN=');
        else if (mon === 'datadog') lines.push('DD_API_KEY=');
        else if (mon === 'newrelic') lines.push('NEW_RELIC_LICENSE_KEY=');
      }
      lines.push('');
    }
  }

  // Inter-service URLs (microservices or multiple backends)
  const isMicroservices = doc.architecture.style === 'microservices';
  if (isMicroservices || otherBackends.length > 0 || services.length > 0) {
    lines.push('# ── Service Discovery ──');

    // Other backend projects
    for (const other of otherBackends) {
      const key = `URL_${toEnvKey(other.name)}_SERVICE`;
      const port = backendPort(other.framework);
      lines.push(`${key}=${envUrl(other.name, port, env)}`);
    }

    // Explicit services from architecture.services
    for (const svc of services) {
      const key = `URL_${toEnvKey(svc.name)}_SERVICE`;
      if (!otherBackends.some(b => toEnvKey(b.name) === toEnvKey(svc.name))) {
        lines.push(`${key}=${envUrl(svc.name, 3000, env)}`);
      }
    }

    // Service mode flags (local vs remote)
    if (isMicroservices) {
      for (const other of otherBackends) {
        lines.push(`SERVICE_${toEnvKey(other.name)}=${env === 'local' ? 'local' : 'remote'}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

function backendConfigModule(
  doc: SDLDocument,
  _be: BackendProject,
  otherBackends: BackendProject[],
  services: Array<{ name: string; kind?: string }>,
): string {
  const lines: string[] = [];
  lines.push(`// Auto-generated environment config — edit .env.* files to change values`);
  lines.push('');

  // Required env var helper
  lines.push(`function required(key: string): string {`);
  lines.push(`  const val = process.env[key];`);
  lines.push(`  if (!val) throw new Error(\`Missing required env var: \${key}\`);`);
  lines.push(`  return val;`);
  lines.push(`}`);
  lines.push('');

  lines.push(`export const config = {`);
  lines.push(`  env: process.env.NODE_ENV || 'development',`);
  lines.push(`  port: parseInt(process.env.PORT || '3000', 10),`);
  lines.push(`  logLevel: process.env.LOG_LEVEL || 'info',`);
  lines.push(`  appUrl: process.env.APP_URL || 'http://localhost:5173',`);
  lines.push(`  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),`);
  lines.push(`  cookie: {`);
  lines.push(`    domain: process.env.COOKIE_DOMAIN || 'localhost',`);
  lines.push(`    secure: process.env.COOKIE_SECURE === 'true',`);
  lines.push(`  },`);
  lines.push(`  databaseUrl: required('DATABASE_URL'),`);

  if (doc.data.cache?.type === 'redis') {
    lines.push(`  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',`);
  }

  const storageProvider = doc.data.storage?.blobs?.provider || doc.data.storage?.files?.provider;
  if (storageProvider === 's3') {
    lines.push(`  s3: {`);
    lines.push(`    bucket: required('AWS_S3_BUCKET'),`);
    lines.push(`    region: process.env.AWS_S3_REGION || 'us-east-1',`);
    lines.push(`  },`);
  } else if (storageProvider === 'gcs') {
    lines.push(`  gcs: {`);
    lines.push(`    bucket: required('GCS_BUCKET'),`);
    lines.push(`    projectId: required('GCS_PROJECT_ID'),`);
    lines.push(`  },`);
  } else if (storageProvider === 'azure-blob') {
    lines.push(`  azureStorage: {`);
    lines.push(`    account: required('AZURE_STORAGE_ACCOUNT'),`);
    lines.push(`    container: required('AZURE_STORAGE_CONTAINER'),`);
    lines.push(`  },`);
  } else if (storageProvider === 'cloudflare-r2') {
    lines.push(`  r2: {`);
    lines.push(`    accountId: required('R2_ACCOUNT_ID'),`);
    lines.push(`    bucket: required('R2_BUCKET'),`);
    lines.push(`  },`);
  }

  if (doc.data.queues?.provider) {
    const qp = doc.data.queues.provider;
    if (qp === 'rabbitmq') {
      lines.push(`  rabbitmqUrl: required('RABBITMQ_URL'),`);
    } else if (qp === 'sqs') {
      lines.push(`  sqsQueueUrl: required('AWS_SQS_QUEUE_URL'),`);
    } else if (qp === 'kafka') {
      lines.push(`  kafka: {`);
      lines.push(`    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),`);
      lines.push(`    clientId: process.env.KAFKA_CLIENT_ID || 'app',`);
      lines.push(`    groupId: process.env.KAFKA_GROUP_ID || 'app-group',`);
      lines.push(`  },`);
    } else if (qp === 'azure-service-bus') {
      lines.push(`  serviceBusConnectionString: required('AZURE_SERVICE_BUS_CONNECTION_STRING'),`);
    } else if (qp === 'redis') {
      lines.push(`  queueRedisUrl: process.env.QUEUE_REDIS_URL || 'redis://localhost:6379/1',`);
    }
  }

  if (doc.data.search?.provider) {
    const sp = doc.data.search.provider;
    if (sp === 'elasticsearch') {
      lines.push(`  elasticsearch: {`);
      lines.push(`    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',`);
      lines.push(`    index: process.env.ELASTICSEARCH_INDEX || 'local',`);
      lines.push(`  },`);
    } else if (sp === 'algolia') {
      lines.push(`  algolia: {`);
      lines.push(`    appId: required('ALGOLIA_APP_ID'),`);
      lines.push(`    apiKey: required('ALGOLIA_API_KEY'),`);
      lines.push(`    index: required('ALGOLIA_INDEX'),`);
      lines.push(`  },`);
    } else if (sp === 'typesense') {
      lines.push(`  typesense: {`);
      lines.push(`    url: process.env.TYPESENSE_URL || 'http://localhost:8108',`);
      lines.push(`    apiKey: required('TYPESENSE_API_KEY'),`);
      lines.push(`  },`);
    } else if (sp === 'meilisearch') {
      lines.push(`  meilisearch: {`);
      lines.push(`    url: process.env.MEILISEARCH_URL || 'http://localhost:7700',`);
      lines.push(`    apiKey: process.env.MEILISEARCH_API_KEY || '',`);
      lines.push(`  },`);
    } else if (sp === 'azure-search') {
      lines.push(`  azureSearch: {`);
      lines.push(`    endpoint: required('AZURE_SEARCH_ENDPOINT'),`);
      lines.push(`    apiKey: required('AZURE_SEARCH_API_KEY'),`);
      lines.push(`    index: process.env.AZURE_SEARCH_INDEX || 'local',`);
      lines.push(`  },`);
    } else if (sp === 'pinecone' || sp === 'qdrant' || sp === 'weaviate') {
      lines.push(`  vectorDb: {`);
      lines.push(`    url: required('VECTOR_DB_URL'),`);
      lines.push(`    apiKey: process.env.VECTOR_DB_API_KEY || '',`);
      lines.push(`  },`);
    }
  }

  if (doc.auth) {
    lines.push(`  jwtSecret: required('JWT_SECRET'),`);
  }

  // Service URLs
  const isMicroservices = doc.architecture.style === 'microservices';
  const allServices = [
    ...otherBackends.map(b => ({ name: b.name, port: backendPort(b.framework) })),
    ...services
      .filter(s => !otherBackends.some(b => toEnvKey(b.name) === toEnvKey(s.name)))
      .map(s => ({ name: s.name, port: 3000 })),
  ];

  if (allServices.length > 0) {
    lines.push(`  services: {`);
    for (const svc of allServices) {
      const camel = svc.name.replace(/[- ]([a-z])/g, (_, c: string) => c.toUpperCase());
      const envKey = `URL_${toEnvKey(svc.name)}_SERVICE`;
      lines.push(`    ${camel}: process.env.${envKey} || 'http://localhost:${svc.port}',`);
    }
    lines.push(`  },`);

    if (isMicroservices) {
      lines.push(`  serviceMode: {`);
      for (const svc of allServices) {
        const camel = svc.name.replace(/[- ]([a-z])/g, (_, c: string) => c.toUpperCase());
        lines.push(`    ${camel}: (process.env.SERVICE_${toEnvKey(svc.name)} || 'local') as 'local' | 'remote',`);
      }
      lines.push(`  },`);
    }
  }

  lines.push(`} as const;`);
  lines.push('');
  return lines.join('\n') + '\n';
}
