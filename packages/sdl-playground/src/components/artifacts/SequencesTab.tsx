import { useState } from 'react'
import { useSDLStore } from '../../store/sdlStore'
import { MermaidDiagram } from '../shared/MermaidDiagram'
import { TierBadge } from '../shared/TierBadge'

export function SequencesTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['sequence-diagrams']
  const doc = compileResult?.document
  const [activeIdx, setActiveIdx] = useState(0)

  const diagrams = result?.files.filter(f => f.path.endsWith('.mmd')) ?? []
  const metadata = result?.metadata as any
  const diagramNames: string[] = metadata?.diagrams ?? diagrams.map((_, i) => `Diagram ${i + 1}`)

  const flows = doc?.product?.coreFlows ?? []
  const hasAuth = doc?.auth && doc.auth.strategy !== 'none'

  if (!compileResult?.success) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Fix errors to see sequence diagrams
      </div>
    )
  }

  if (diagrams.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">Sequence Diagrams</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center bg-slate-800/30 rounded-lg border border-slate-700/50">
          <p className="text-slate-400 text-sm">No sequence diagrams generated.</p>
          <p className="text-slate-500 text-xs max-w-xs">
            Add <code className="bg-slate-800 px-1 rounded text-blue-300">product.coreFlows</code> or
            an <code className="bg-slate-800 px-1 rounded text-blue-300">auth</code> section to generate sequence diagrams.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Sequence Diagrams</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{diagrams.length} diagram{diagrams.length !== 1 ? 's' : ''}</span>
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Context chips */}
      <div className="flex flex-wrap gap-1.5">
        {hasAuth && (
          <span className="px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-300 border border-green-700/30">
            Auth flow
          </span>
        )}
        {flows.map(f => (
          <span key={f.name} className="px-2 py-0.5 rounded text-xs bg-blue-900/40 text-blue-300 border border-blue-700/30">
            {f.name}
          </span>
        ))}
      </div>

      {/* Sub-tab selector */}
      {diagrams.length > 1 && (
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit overflow-x-auto">
          {diagrams.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                activeIdx === i ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {diagramNames[i] ?? `Diagram ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Diagram */}
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4 min-h-48">
        <MermaidDiagram content={diagrams[activeIdx]?.content ?? null} />
      </div>
    </div>
  )
}
