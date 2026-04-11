import { create } from 'zustand'
import { compile } from '@arch0/sdl'
import type { CompileResult } from '@arch0/sdl'
import { generateAll, type AllArtifacts } from '../lib/generators'
import { STARTER_YAML } from '../data/starter'
import type { TabId } from '../types/tabs'

interface SDLStore {
  yaml: string
  compileResult: CompileResult | null
  artifacts: AllArtifacts | null
  activeTab: TabId
  isInferencesOpen: boolean

  setYaml: (yaml: string) => void
  setActiveTab: (tab: TabId) => void
  toggleInferences: () => void
}

function runPipeline(yaml: string): { compileResult: CompileResult; artifacts: AllArtifacts | null } {
  const compileResult = compile(yaml)
  if (!compileResult.success || !compileResult.document) {
    return { compileResult, artifacts: null }
  }
  const artifacts = generateAll(compileResult.document)
  return { compileResult, artifacts }
}

const initial = runPipeline(STARTER_YAML)

export const useSDLStore = create<SDLStore>((set) => ({
  yaml: STARTER_YAML,
  compileResult: initial.compileResult,
  artifacts: initial.artifacts,
  activeTab: 'architecture',
  isInferencesOpen: false,

  setYaml: (yaml) => {
    const { compileResult, artifacts } = runPipeline(yaml)
    set({ yaml, compileResult, artifacts })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleInferences: () => set((s) => ({ isInferencesOpen: !s.isInferencesOpen })),
}))
