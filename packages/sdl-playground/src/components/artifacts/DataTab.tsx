import { useSDLStore } from '../../store/sdlStore'
import { MermaidDiagram } from '../shared/MermaidDiagram'
import { CodeBlock } from '../shared/CodeBlock'
import { TierBadge } from '../shared/TierBadge'
import { getFileContent } from '../../lib/generators'
import { useState } from 'react'

export function DataTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['data-model']
  const doc = compileResult?.document
  const [view, setView] = useState<'erd' | 'orm'>('erd')

  const mmd = getFileContent(result, 'erd.mmd')
  const ormFiles = result?.files.filter(f => !f.path.endsWith('erd.mmd')) ?? []
  const ormContent = ormFiles[0]?.content ?? null
  const ormPath = ormFiles[0]?.path ?? ''

  const dbType = doc?.data?.primaryDatabase?.type
  const dbHosting = doc?.data?.primaryDatabase?.hosting
  const cacheType = doc?.data?.cache?.type
  const entities = doc?.domain?.entities ?? []

  const ormLang: Record<string, string> = {
    'schema.prisma': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.cs': 'csharp',
    '.go': 'go',
    '.java': 'java',
  }
  const lang = Object.entries(ormLang).find(([ext]) => ormPath.includes(ext))?.[1] ?? 'yaml'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Data Model</h2>
        <div className="flex items-center gap-2">
          {dbType && (
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">{dbType}</span>
          )}
          {dbHosting && (
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-700/50 text-slate-400">{dbHosting}</span>
          )}
          {cacheType && cacheType !== 'none' && (
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-900/40 text-red-300">{cacheType}</span>
          )}
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Source note */}
      {entities.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/20 border border-blue-700/30 rounded px-3 py-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Generated from {entities.length} declared domain entities (domain.entities[])
        </div>
      )}

      {/* View toggle */}
      {ormContent && (
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('erd')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${view === 'erd' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ERD
          </button>
          <button
            onClick={() => setView('orm')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${view === 'orm' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ORM Schema
          </button>
        </div>
      )}

      {/* ERD / ORM */}
      {view === 'erd' ? (
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4 min-h-48">
          <MermaidDiagram content={mmd} />
        </div>
      ) : (
        ormContent && <CodeBlock content={ormContent} language={lang} maxHeight="480px" />
      )}

      {/* Entity summary */}
      {entities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Entities ({entities.length})</h3>
          <div className="grid gap-2">
            {entities.map((entity) => (
              <div key={entity.name} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200 font-mono">{entity.name}</span>
                  <span className="text-xs text-slate-500">{entity.fields?.length ?? 0} fields</span>
                </div>
                {entity.fields && entity.fields.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entity.fields.slice(0, 6).map((f) => (
                      <span key={f.name} className="text-xs font-mono text-slate-400">
                        {f.name}: <span className="text-blue-400">{f.type}</span>
                        {(f as any).primaryKey && <span className="text-amber-400"> PK</span>}
                        {(f as any).required !== false && !(f as any).nullable && !(f as any).primaryKey && <span className="text-slate-600">!</span>}
                      </span>
                    ))}
                    {entity.fields.length > 6 && (
                      <span className="text-xs text-slate-600">+{entity.fields.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
