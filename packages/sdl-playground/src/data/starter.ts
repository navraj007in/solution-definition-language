export const STARTER_YAML = `sdlVersion: "1.1"

solution:
  name: "TaskFlow"
  description: "Simple task management for small teams"
  stage: "MVP"

product:
  personas:
    - name: "User"
      goals:
        - "Create tasks"
        - "Mark tasks complete"
        - "Assign tasks to team members"

architecture:
  style: "modular-monolith"
  projects:
    frontend:
      - name: "web"
        framework: "nextjs"
        rendering: "ssr"
    backend:
      - name: "api"
        framework: "nodejs"
        apiStyle: "rest"

auth:
  strategy: "oidc"
  provider: "auth0"
  roles:
    - "admin"
    - "member"

data:
  primaryDatabase:
    type: "postgres"
    hosting: "managed"
  cache:
    type: "redis"

domain:
  entities:
    - name: Task
      fields:
        - name: id
          type: uuid
          primaryKey: true
        - name: title
          type: string
          required: true
        - name: status
          type: string
          enum: [todo, in-progress, done]
        - name: assigneeId
          type: uuid
          nullable: true
        - name: createdAt
          type: timestamp
          required: true
    - name: Project
      fields:
        - name: id
          type: uuid
          primaryKey: true
        - name: name
          type: string
          required: true
        - name: ownerId
          type: uuid
          required: true

deployment:
  cloud: "vercel"

constraints:
  budget: "startup"
  team:
    developers: 2
  timeline: "8-weeks"

nonFunctional:
  availability:
    target: "99.9"
  scaling:
    expectedUsersMonth1: 100
    expectedUsersYear1: 2000

slos:
  services:
    - name: api
      availability: "99.9"
      latencyP95: "200ms"

artifacts:
  generate:
    - "architecture-diagram"
    - "openapi"
    - "data-model"
    - "cost-estimate"
`
