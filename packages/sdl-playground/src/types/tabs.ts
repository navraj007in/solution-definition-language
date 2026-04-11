export type TabId =
  | 'architecture'
  | 'data'
  | 'api'
  | 'sequences'
  | 'backlog'
  | 'adr'
  | 'scaffold'
  | 'coding-rules'
  | 'compliance'
  | 'cost'

export interface Tab {
  id: TabId
  label: string
  artifactType: string
}

export const TABS: Tab[] = [
  { id: 'architecture',  label: 'Architecture',  artifactType: 'architecture-diagram' },
  { id: 'data',          label: 'Data',           artifactType: 'data-model' },
  { id: 'api',           label: 'API',            artifactType: 'openapi' },
  { id: 'sequences',     label: 'Sequences',      artifactType: 'sequence-diagrams' },
  { id: 'backlog',       label: 'Backlog',        artifactType: 'backlog' },
  { id: 'adr',           label: 'ADRs',           artifactType: 'adr' },
  { id: 'scaffold',      label: 'Scaffold',       artifactType: 'repo-scaffold' },
  { id: 'coding-rules',  label: 'Coding Rules',   artifactType: 'coding-rules' },
  { id: 'compliance',    label: 'Compliance',     artifactType: 'compliance-checklist' },
  { id: 'cost',          label: 'Cost',           artifactType: 'cost-estimate' },
]
