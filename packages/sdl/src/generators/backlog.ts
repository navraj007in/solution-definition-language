import type { SDLDocument } from '../types';
import type { GeneratorResult } from './types';

/**
 * Generates a product backlog (user stories + tasks) from an SDL document.
 * Deterministic — same input always produces identical output.
 *
 * Produces:
 *   - Epic per persona
 *   - User stories from persona goals + core flows
 *   - Technical setup stories (auth, database, deployment, CI/CD)
 *   - Prioritized with MoSCoW (Must/Should/Could/Won't)
 */
export function generateBacklog(doc: SDLDocument): GeneratorResult {
  const epics: Epic[] = [];
  let storyCounter = 1;

  // 1. Setup epic (always)
  epics.push(buildSetupEpic(doc, storyCounter));
  storyCounter += epics[0].stories.length;

  // 2. Auth epic (if auth exists)
  if (doc.auth && doc.auth.strategy !== 'none') {
    const authEpic = buildAuthEpic(doc, storyCounter);
    epics.push(authEpic);
    storyCounter += authEpic.stories.length;
  }

  // 3. Per-persona epics (from goals + core flows)
  for (const persona of doc.product.personas) {
    const personaEpic = buildPersonaEpic(doc, persona, storyCounter);
    epics.push(personaEpic);
    storyCounter += personaEpic.stories.length;
  }

  // 4. Infrastructure / deployment epic
  const infraEpic = buildInfraEpic(doc, storyCounter);
  epics.push(infraEpic);
  storyCounter += infraEpic.stories.length;

  const totalStories = epics.reduce((sum, e) => sum + e.stories.length, 0);
  const markdown = renderBacklogMarkdown(doc, epics, totalStories);

  const files = [
    {
      path: 'artifacts/backlog/backlog.md',
      content: markdown,
    },
  ];

  return {
    artifactType: 'backlog',
    files,
    metadata: {
      solutionName: doc.solution.name,
      epicCount: epics.length,
      totalStories,
      epics: epics.map((e) => ({ name: e.name, storyCount: e.stories.length })),
    },
  };
}

// ─── Types ───

interface Epic {
  name: string;
  stories: Story[];
}

interface Story {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  priority: 'Must' | 'Should' | 'Could';
  points: number;
  tasks: string[];
}

// ─── Epic Builders ───

function buildSetupEpic(doc: SDLDocument, startId: number): Epic {
  const backends = doc.architecture.projects.backend || [];
  const frontends = doc.architecture.projects.frontend || [];
  const stories: Story[] = [];
  let id = startId;

  // Project scaffolding
  for (const be of backends) {
    stories.push({
      id: storyId(id++),
      title: `Set up ${be.name} backend project`,
      asA: 'developer',
      iWant: `a ${frameworkLabel(be.framework)} project with ${be.orm ? displayName(be.orm) : 'standard'} data access`,
      soThat: 'I can start building API endpoints',
      priority: 'Must',
      points: 3,
      tasks: [
        `Initialize ${frameworkLabel(be.framework)} project`,
        'Configure TypeScript / linting',
        be.orm ? `Set up ${displayName(be.orm)} with ${displayName(doc.data.primaryDatabase.type)}` : `Configure ${displayName(doc.data.primaryDatabase.type)} connection`,
        'Create health check endpoint',
        'Add environment configuration',
      ],
    });
  }

  for (const fe of frontends) {
    stories.push({
      id: storyId(id++),
      title: `Set up ${fe.name} frontend project`,
      asA: 'developer',
      iWant: `a ${frameworkLabel(fe.framework)} project with ${fe.styling || 'default'} styling`,
      soThat: 'I can start building UI components',
      priority: 'Must',
      points: 2,
      tasks: [
        `Initialize ${frameworkLabel(fe.framework)} project`,
        fe.styling ? `Configure ${fe.styling}` : 'Set up CSS',
        'Create layout component',
        'Set up routing',
      ],
    });
  }

  // Database setup
  stories.push({
    id: storyId(id++),
    title: `Set up ${displayName(doc.data.primaryDatabase.type)} database`,
    asA: 'developer',
    iWant: `a ${doc.data.primaryDatabase.hosting} ${displayName(doc.data.primaryDatabase.type)} instance`,
    soThat: 'the application has persistent storage',
    priority: 'Must',
    points: 2,
    tasks: [
      `Provision ${doc.data.primaryDatabase.hosting} ${displayName(doc.data.primaryDatabase.type)}`,
      'Create initial schema / migrations',
      'Configure connection pooling',
      'Set up seed data',
    ],
  });

  return { name: 'Project Setup', stories };
}

function buildAuthEpic(doc: SDLDocument, startId: number): Epic {
  const auth = doc.auth!;
  const providerLabel = displayName(auth.provider || 'custom');
  const stories: Story[] = [];
  let id = startId;

  stories.push({
    id: storyId(id++),
    title: `Implement ${auth.strategy.toUpperCase()} authentication`,
    asA: 'user',
    iWant: `to register and log in via ${providerLabel}`,
    soThat: 'my data is secure and personalized',
    priority: 'Must',
    points: 5,
    tasks: [
      `Integrate ${providerLabel} SDK`,
      'Build login / register API endpoints',
      'Implement JWT token generation & validation',
      'Create auth middleware',
      'Build login / register UI',
    ],
  });

  if (auth.roles && auth.roles.length > 1) {
    stories.push({
      id: storyId(id++),
      title: 'Implement role-based access control',
      asA: 'admin',
      iWant: `to restrict features by role (${auth.roles.join(', ')})`,
      soThat: 'users only see what they are authorized to see',
      priority: 'Must',
      points: 3,
      tasks: [
        'Define role permissions matrix',
        'Add role check middleware',
        'Implement role-based UI rendering',
        'Add role management API (admin)',
      ],
    });
  }

  if (auth.mfa) {
    stories.push({
      id: storyId(id++),
      title: 'Enable multi-factor authentication',
      asA: 'user',
      iWant: 'to add a second factor to my login',
      soThat: 'my account is more secure',
      priority: 'Should',
      points: 3,
      tasks: [
        `Configure MFA in ${providerLabel}`,
        'Build MFA enrollment UI',
        'Handle MFA challenge flow',
      ],
    });
  }

  if (auth.socialProviders && auth.socialProviders.length > 0) {
    stories.push({
      id: storyId(id++),
      title: `Add social login (${auth.socialProviders.join(', ')})`,
      asA: 'user',
      iWant: `to log in with my ${auth.socialProviders[0]} account`,
      soThat: 'I can register faster without creating a new password',
      priority: 'Should',
      points: 3,
      tasks: auth.socialProviders.map((p) => `Configure ${p} OAuth integration`),
    });
  }

  return { name: 'Authentication', stories };
}

function buildPersonaEpic(
  doc: SDLDocument,
  persona: { name: string; goals: string[]; accessLevel?: string },
  startId: number,
): Epic {
  const stories: Story[] = [];
  let id = startId;

  // Stories from persona goals
  for (const goal of persona.goals) {
    const entity = extractEntity(goal);
    const action = extractAction(goal);

    if (entity && action === 'create') {
      stories.push({
        id: storyId(id++),
        title: `Create ${entity.toLowerCase()}`,
        asA: persona.name.toLowerCase(),
        iWant: `to create a new ${entity.toLowerCase()}`,
        soThat: `I can ${goal.toLowerCase()}`,
        priority: 'Must',
        points: 3,
        tasks: [
          `Build ${entity} creation API endpoint`,
          `Create ${entity} form UI`,
          'Add input validation',
          `Write ${entity} creation tests`,
        ],
      });

      // Implicitly add list/view for created entities
      stories.push({
        id: storyId(id++),
        title: `List and view ${pluralize(entity.toLowerCase())}`,
        asA: persona.name.toLowerCase(),
        iWant: `to see all my ${pluralize(entity.toLowerCase())}`,
        soThat: 'I can find and manage them',
        priority: 'Must',
        points: 2,
        tasks: [
          `Build ${entity} list API endpoint with pagination`,
          `Build ${entity} detail API endpoint`,
          `Create ${entity} list UI`,
          `Create ${entity} detail UI`,
        ],
      });
    } else if (entity && (action === 'mark' || action === 'update' || action === 'edit')) {
      stories.push({
        id: storyId(id++),
        title: capitalize(goal),
        asA: persona.name.toLowerCase(),
        iWant: `to ${goal.toLowerCase()}`,
        soThat: `I can track progress`,
        priority: 'Must',
        points: 2,
        tasks: [
          `Build ${entity} update API endpoint`,
          `Add status toggle UI`,
          `Write ${entity} update tests`,
        ],
      });
    } else if (entity) {
      stories.push({
        id: storyId(id++),
        title: capitalize(goal),
        asA: persona.name.toLowerCase(),
        iWant: `to ${goal.toLowerCase()}`,
        soThat: 'I can accomplish my objectives',
        priority: 'Should',
        points: 3,
        tasks: [
          `Design ${entity} feature`,
          `Build API endpoint`,
          `Create UI`,
          'Write tests',
        ],
      });
    }
  }

  // Stories from core flows associated with this persona
  if (doc.product.coreFlows) {
    for (const flow of doc.product.coreFlows) {
      // Only add if not already covered by goals
      const coveredByGoal = persona.goals.some((g) => {
        const e = extractEntity(g);
        return e && flow.name.toLowerCase().includes(e.toLowerCase());
      });
      if (!coveredByGoal) {
        stories.push({
          id: storyId(id++),
          title: flow.name,
          asA: persona.name.toLowerCase(),
          iWant: `to complete the ${flow.name.toLowerCase()} flow`,
          soThat: 'I can accomplish my goals',
          priority: flow.priority === 'critical' ? 'Must' : flow.priority === 'high' ? 'Must' : 'Should',
          points: flow.steps ? Math.max(2, flow.steps.length) : 3,
          tasks: flow.steps || [`Implement ${flow.name} flow`],
        });
      }
    }
  }

  return { name: `${persona.name} Features`, stories };
}

function buildInfraEpic(doc: SDLDocument, startId: number): Epic {
  const stories: Story[] = [];
  let id = startId;

  // CI/CD
  stories.push({
    id: storyId(id++),
    title: 'Set up CI/CD pipeline',
    asA: 'developer',
    iWant: 'automated build, test, and deploy pipelines',
    soThat: 'code changes are validated and deployed automatically',
    priority: 'Must',
    points: 3,
    tasks: [
      `Configure ${doc.deployment.ciCd?.provider ? ciCdLabel(doc.deployment.ciCd.provider) : 'CI/CD'} workflow`,
      'Add lint + test steps',
      'Add build step',
      `Configure deployment to ${cloudLabel(doc.deployment.cloud)}`,
    ],
  });

  // Monitoring
  if (doc.integrations?.monitoring) {
    stories.push({
      id: storyId(id++),
      title: `Set up ${displayName(doc.integrations.monitoring.provider || 'monitoring')}`,
      asA: 'developer',
      iWant: 'application monitoring and alerting',
      soThat: 'I can detect and respond to issues quickly',
      priority: 'Should',
      points: 2,
      tasks: [
        `Integrate ${displayName(doc.integrations.monitoring.provider || 'monitoring')} SDK`,
        'Configure error tracking',
        'Set up performance monitoring',
        'Create alert rules',
      ],
    });
  }

  // Deployment
  stories.push({
    id: storyId(id++),
    title: `Deploy to ${cloudLabel(doc.deployment.cloud)}`,
    asA: 'developer',
    iWant: `the application deployed to ${cloudLabel(doc.deployment.cloud)}`,
    soThat: 'users can access it in production',
    priority: 'Must',
    points: 3,
    tasks: [
      `Configure ${cloudLabel(doc.deployment.cloud)} project`,
      'Set up environment variables',
      'Configure domain / SSL',
      'Deploy and verify',
    ],
  });

  return { name: 'Infrastructure & DevOps', stories };
}

// ─── Markdown Renderer ───

function renderBacklogMarkdown(doc: SDLDocument, epics: Epic[], totalStories: number): string {
  const lines: string[] = [];

  lines.push(`# ${doc.solution.name} — Product Backlog`);
  lines.push('');
  lines.push(`> Stage: ${doc.solution.stage} | Generated from SDL`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Epics | ${epics.length} |`);
  lines.push(`| Total Stories | ${totalStories} |`);
  lines.push(`| Must Have | ${countByPriority(epics, 'Must')} |`);
  lines.push(`| Should Have | ${countByPriority(epics, 'Should')} |`);
  lines.push(`| Could Have | ${countByPriority(epics, 'Could')} |`);
  lines.push(`| Total Points | ${totalPoints(epics)} |`);
  lines.push('');

  for (const epic of epics) {
    lines.push(`## Epic: ${epic.name}`);
    lines.push('');
    lines.push(`| ID | Story | Priority | Points |`);
    lines.push(`|---|---|---|---|`);
    for (const story of epic.stories) {
      lines.push(`| ${story.id} | ${story.title} | ${story.priority} | ${story.points} |`);
    }
    lines.push('');

    for (const story of epic.stories) {
      lines.push(`### ${story.id}: ${story.title}`);
      lines.push('');
      lines.push(`**As a** ${story.asA}, **I want** ${story.iWant}, **so that** ${story.soThat}.`);
      lines.push('');
      lines.push(`**Priority:** ${story.priority} | **Points:** ${story.points}`);
      lines.push('');
      lines.push('**Tasks:**');
      for (const task of story.tasks) {
        lines.push(`- [ ] ${task}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Helpers ───

function storyId(n: number): string {
  return `US-${String(n).padStart(3, '0')}`;
}

function countByPriority(epics: Epic[], priority: string): number {
  return epics.reduce((sum, e) => sum + e.stories.filter((s) => s.priority === priority).length, 0);
}

function totalPoints(epics: Epic[]): number {
  return epics.reduce((sum, e) => sum + e.stories.reduce((s2, s) => s2 + s.points, 0), 0);
}

function extractEntity(goal: string): string | null {
  const match = goal.match(/^(?:create|add|manage|view|edit|update|delete|remove|list|browse|search|submit|assign|track|mark|set|toggle)\s+(.+?)(?:\s+(?:as|to|complete|done|active|inactive).*)?$/i);
  if (match) return singularize(capitalize(match[1].trim()));
  return null;
}

function extractAction(goal: string): string {
  const match = goal.match(/^(\w+)\s/i);
  return match ? match[1].toLowerCase() : 'view';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function singularize(s: string): string {
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us')) return s.slice(0, -1);
  return s;
}

function pluralize(s: string): string {
  if (s.endsWith('y') && !/[aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ies';
  if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('sh') || s.endsWith('ch')) return s + 'es';
  return s + 's';
}

function displayName(s: string): string {
  const labels: Record<string, string> = {
    postgres: 'PostgreSQL', mysql: 'MySQL', mongodb: 'MongoDB', auth0: 'Auth0',
    cognito: 'Cognito', clerk: 'Clerk', firebase: 'Firebase', prisma: 'Prisma',
    typeorm: 'TypeORM', sequelize: 'Sequelize',
  };
  return labels[s] || s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function frameworkLabel(fw: string): string {
  const labels: Record<string, string> = {
    nextjs: 'Next.js', react: 'React', vue: 'Vue.js', angular: 'Angular', svelte: 'Svelte',
    nodejs: 'Node.js (Express)', 'dotnet-8': '.NET 8', 'python-fastapi': 'FastAPI', go: 'Go',
    'java-spring': 'Spring Boot', 'ruby-rails': 'Rails', 'php-laravel': 'Laravel',
  };
  return labels[fw] || fw;
}

function cloudLabel(cloud: string): string {
  const labels: Record<string, string> = {
    aws: 'AWS', gcp: 'Google Cloud', azure: 'Azure', vercel: 'Vercel',
    railway: 'Railway', render: 'Render', 'fly-io': 'Fly.io', cloudflare: 'Cloudflare',
  };
  return labels[cloud] || cloud;
}

function ciCdLabel(provider: string): string {
  const labels: Record<string, string> = {
    'github-actions': 'GitHub Actions', 'gitlab-ci': 'GitLab CI', 'azure-devops': 'Azure DevOps',
    circleci: 'CircleCI', jenkins: 'Jenkins',
  };
  return labels[provider] || provider;
}
