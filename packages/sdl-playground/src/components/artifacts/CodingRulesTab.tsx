import { useState } from 'react'
import { useSDLStore } from '../../store/sdlStore'
import { CodeBlock } from '../shared/CodeBlock'
import { TierBadge } from '../shared/TierBadge'

const FILE_TABS = [
  { label: 'CLAUDE.md', suffix: 'CLAUDE.md' },
  { label: '.cursorrules', suffix: 'architecture.mdc' },
  { label: 'Copilot', suffix: 'copilot-instructions.md' },
  { label: 'Aider', suffix: 'conventions.md' },
]

export function CodingRulesTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['coding-rules']
  const [activeFile, setActiveFile] = useState(0)

  const metadata = result?.metadata as any
  const ruleCount: number = metadata?.ruleCount ?? 0
  const targetTools: string[] = metadata?.targetTools ?? []

  const getContent = (suffix: string) => {
    if (!result) return null
    // Try root-level files first (not per-component)
    const rootFile = result.files.find(f =>
      f.path.endsWith(suffix) && !f.path.includes('/')
      || (f.path === suffix)
      || (f.path.split('/').length <= 3 && f.path.endsWith(suffix))
    )
    return rootFile?.content ?? result.files.find(f => f.path.endsWith(suffix))?.content ?? null
  }

  const activeContent = getContent(FILE_TABS[activeFile].suffix)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Coding Rules</h2>
        <div className="flex items-center gap-2">
          {ruleCount > 0 && <span className="text-xs text-slate-500">{ruleCount} rules</span>}
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Explanation */}
      <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-900/20 border border-blue-700/30 rounded px-3 py-2">
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        These files tell AI coding tools your architecture decisions. Place them in your repo root — Claude Code, Cursor, Copilot, and Aider will pick them up automatically.
      </div>

      {/* Target tools */}
      {targetTools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {targetTools.map(t => (
            <span key={t} className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700/50">{t}</span>
          ))}
        </div>
      )}

      {/* File sub-tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {FILE_TABS.map((ft, i) => {
          const has = !!getContent(ft.suffix)
          return (
            <button
              key={ft.label}
              onClick={() => setActiveFile(i)}
              disabled={!has}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                activeFile === i && has
                  ? 'bg-slate-700 text-slate-100'
                  : has
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              {ft.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeContent ? (
        <CodeBlock content={activeContent} language="markdown" maxHeight="500px" />
      ) : (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700/50">
          {compileResult?.success ? 'Generating…' : 'Fix errors to see coding rules'}
        </div>
      )}
    </div>
  )
}
