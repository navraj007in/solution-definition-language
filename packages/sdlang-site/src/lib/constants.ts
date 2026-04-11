export const PLAYGROUND_URL = 'https://play.sdlang.com'
export const GITHUB_URL = 'https://github.com/navraj007in/solution-definition-language'

export const GENERATORS = [
  { name: 'Architecture Diagram', type: 'architecture-diagram', tier: 'deterministic', description: 'Mermaid flowchart of your system topology', icon: '⬡' },
  { name: 'OpenAPI Spec',         type: 'openapi',              tier: 'deterministic', description: 'OpenAPI 3.1 spec from your architecture and auth', icon: '⟨/⟩' },
  { name: 'Data Model',           type: 'data-model',           tier: 'deterministic', description: 'ERD diagram and ORM schema', icon: '⬡' },
  { name: 'Repo Scaffold',        type: 'repo-scaffold',        tier: 'deterministic', description: 'Starter file structure per project', icon: '⌫' },
  { name: 'IaC Skeleton',         type: 'iac-skeleton',         tier: 'deterministic', description: 'CI/CD pipeline for your deployment config', icon: '⚙' },
  { name: 'Sequence Diagrams',    type: 'sequence-diagrams',    tier: 'deterministic', description: 'Mermaid sequence diagrams from core flows', icon: '↔' },
  { name: 'Coding Rules',         type: 'coding-rules',         tier: 'inferred',      description: 'CLAUDE.md, Cursor, Copilot, Aider rules', icon: '✦' },
  { name: 'Coding Enforcement',   type: 'coding-rules-enforcement', tier: 'inferred', description: 'ESLint, arch tests, CI gates from your stack', icon: '⊡' },
  { name: 'ADRs',                 type: 'adr',                  tier: 'advisory',      description: 'Architecture decision record drafts', icon: '✎' },
  { name: 'Backlog',              type: 'backlog',               tier: 'advisory',      description: 'User stories from personas and flows', icon: '☰' },
  { name: 'Deployment Guide',     type: 'deployment-guide',     tier: 'advisory',      description: 'Step-by-step deployment instructions', icon: '⬆' },
  { name: 'Cost Estimate',        type: 'cost-estimate',        tier: 'advisory',      description: 'Monthly infrastructure cost breakdown', icon: '$' },
  { name: 'Compliance Checklist', type: 'compliance-checklist', tier: 'advisory',      description: 'Per-framework compliance checklist', icon: '✓' },
] as const

export const STARTER_SDL = `sdlVersion: "1.1"

solution:
  name: "TaskFlow"
  description: "Task management for small teams"
  stage: "MVP"

architecture:
  style: "modular-monolith"
  projects:
    frontend:
      - name: "web"
        framework: "nextjs"
    backend:
      - name: "api"
        framework: "nodejs"

auth:
  strategy: "oidc"
  provider: "auth0"

data:
  primaryDatabase:
    type: "postgres"
    hosting: "managed"

deployment:
  cloud: "vercel"

artifacts:
  generate:
    - "architecture-diagram"
    - "openapi"
    - "data-model"
    - "repo-scaffold"`

export const STACKS = {
  frontend:  ['Next.js', 'React', 'Vue.js', 'Angular', 'Svelte'],
  backend:   ['Node.js', 'Python / FastAPI', '.NET 8', 'Go', 'Java Spring', 'Ruby on Rails'],
  cloud:     ['AWS', 'GCP', 'Azure', 'Vercel', 'Railway', 'Fly.io'],
  auth:      ['OIDC', 'Auth0', 'Clerk', 'Cognito', 'Firebase', 'Supabase'],
  database:  ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB', 'CockroachDB'],
}
