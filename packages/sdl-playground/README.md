# SDL Playground

Interactive React web app for exploring and demonstrating the Solution Design Language.

## Setup

Build the SDL package first (required — the playground depends on its compiled output):

```bash
cd ../sdl && npm run build
```

Then install and run the playground:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## What it does

- **Edit** SDL YAML with inline validation errors and warnings
- **Architecture tab** — live Mermaid architecture diagram, service cards, auth and SLO badges
- **Data tab** — ERD diagram + ORM schema, entity field summary
- **API tab** — OpenAPI 3.1 spec with endpoint and schema counts
- **Cost tab** — infrastructure cost estimate with monthly total
- **Templates** — 10 starter templates loaded in one click
- **Inferences drawer** — every field the normalizer filled in, with reasons
- **Status bar** — compile state, inference count, tier legend

## Phase 2 (planned)

Sequence diagrams, backlog, ADRs, scaffold file tree, coding rules, compliance checklist, migrate banner, URL state for shareable links.
