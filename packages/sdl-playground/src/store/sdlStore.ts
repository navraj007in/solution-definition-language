import { create } from 'zustand'
import { compile, migrate } from '@arch0/sdl'
import type { CompileResult, MigrateResult } from '@arch0/sdl'
import { stringify as yamlStringify } from 'yaml'
import { generateAll, type AllArtifacts } from '../lib/generators'
import { STARTER_YAML } from '../data/starter'
import type { TabId } from '../types/tabs'

// ─── URL hash state ───

function encodeYaml(yaml: string): string {
  try { return btoa(encodeURIComponent(yaml)) } catch { return '' }
}

function decodeYaml(hash: string): string | null {
  try { return decodeURIComponent(atob(hash.replace(/^#/, ''))) } catch { return null }
}

function readHashYaml(): string | null {
  const hash = window.location.hash
  if (!hash || hash === '#') return null
  return decodeYaml(hash)
}

function writeHashYaml(yaml: string) {
  const encoded = encodeYaml(yaml)
  if (encoded) {
    window.history.replaceState(null, '', `#${encoded}`)
  }
}

// ─── Pipeline ───

function runPipeline(yaml: string): { compileResult: CompileResult; artifacts: AllArtifacts | null } {
  const compileResult = compile(yaml)
  if (!compileResult.success || !compileResult.document) {
    return { compileResult, artifacts: null }
  }
  const artifacts = generateAll(compileResult.document)
  return { compileResult, artifacts }
}

// ─── Store ───

interface SDLStore {
  yaml: string
  compileResult: CompileResult | null
  artifacts: AllArtifacts | null
  activeTab: TabId
  isInferencesOpen: boolean
  migrateResult: MigrateResult | null
  isMigrateDismissed: boolean

  setYaml: (yaml: string) => void
  setActiveTab: (tab: TabId) => void
  toggleInferences: () => void
  applyMigration: () => void
  dismissMigrate: () => void
}

const initialYaml = readHashYaml() ?? STARTER_YAML
const initial = runPipeline(initialYaml)

// Compute migrate suggestion for initial yaml if it failed
const initialMigrate = !initial.compileResult.success
  ? (() => { try { return migrate(initialYaml) } catch { return null } })()
  : null

export const useSDLStore = create<SDLStore>((set, get) => ({
  yaml: initialYaml,
  compileResult: initial.compileResult,
  artifacts: initial.artifacts,
  activeTab: 'architecture',
  isInferencesOpen: false,
  migrateResult: initialMigrate?.compilesClean ? initialMigrate : null,
  isMigrateDismissed: false,

  setYaml: (yaml) => {
    writeHashYaml(yaml)
    const { compileResult, artifacts } = runPipeline(yaml)

    // If compile fails, check if migrate can fix it
    let migrateResult: MigrateResult | null = null
    if (!compileResult.success) {
      try {
        const m = migrate(yaml)
        if (m.compilesClean && m.changes.length > 0) migrateResult = m
      } catch { /* ignore */ }
    }

    set({ yaml, compileResult, artifacts, migrateResult, isMigrateDismissed: false })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleInferences: () => set((s) => ({ isInferencesOpen: !s.isInferencesOpen })),

  applyMigration: () => {
    const { migrateResult } = get()
    if (!migrateResult) return
    try {
      const yaml = yamlStringify(migrateResult.document, { indent: 2 })
      get().setYaml(yaml)
    } catch { /* ignore */ }
  },

  dismissMigrate: () => set({ isMigrateDismissed: true }),
}))

