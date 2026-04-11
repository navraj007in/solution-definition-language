export type TabId = 'architecture' | 'data' | 'api' | 'cost'

export interface Tab {
  id: TabId
  label: string
  artifactType: string
}

export const TABS: Tab[] = [
  { id: 'architecture', label: 'Architecture', artifactType: 'architecture-diagram' },
  { id: 'data', label: 'Data Model', artifactType: 'data-model' },
  { id: 'api', label: 'API', artifactType: 'openapi' },
  { id: 'cost', label: 'Cost', artifactType: 'cost-estimate' },
]
