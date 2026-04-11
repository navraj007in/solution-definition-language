import {
  generate,
  generateCodingRules,
  generateComplianceChecklist,
} from '@arch0/sdl'
import type { SDLDocument, GeneratorResult } from '@arch0/sdl'

export interface AllArtifacts {
  'architecture-diagram': GeneratorResult | null
  'data-model': GeneratorResult | null
  'openapi': GeneratorResult | null
  'sequence-diagrams': GeneratorResult | null
  'backlog': GeneratorResult | null
  'adr': GeneratorResult | null
  'repo-scaffold': GeneratorResult | null
  'cost-estimate': GeneratorResult | null
  'coding-rules': GeneratorResult | null
  'compliance-checklist': GeneratorResult | null
}

export function generateAll(doc: SDLDocument): AllArtifacts {
  const safe = (fn: () => GeneratorResult | null): GeneratorResult | null => {
    try { return fn() } catch { return null }
  }

  return {
    'architecture-diagram': safe(() => generate(doc, 'architecture-diagram')),
    'data-model':           safe(() => generate(doc, 'data-model')),
    'openapi':              safe(() => generate(doc, 'openapi')),
    'sequence-diagrams':    safe(() => generate(doc, 'sequence-diagrams')),
    'backlog':              safe(() => generate(doc, 'backlog')),
    'adr':                  safe(() => generate(doc, 'adr')),
    'repo-scaffold':        safe(() => generate(doc, 'repo-scaffold')),
    'cost-estimate':        safe(() => generate(doc, 'cost-estimate')),
    'coding-rules':         safe(() => generateCodingRules(doc)),
    'compliance-checklist': safe(() => generateComplianceChecklist(doc)),
  }
}

export function getFileContent(result: GeneratorResult | null | undefined, pathSuffix: string): string | null {
  if (!result) return null
  const file = result.files.find(f => f.path.endsWith(pathSuffix))
  return file?.content ?? null
}

export function getFirstFileContent(result: GeneratorResult | null | undefined): string | null {
  if (!result || result.files.length === 0) return null
  return result.files[0].content
}
