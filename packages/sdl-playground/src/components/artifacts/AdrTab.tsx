import { useState } from 'react'
import { useSDLStore } from '../../store/sdlStore'
import { MarkdownRenderer } from '../shared/MarkdownRenderer'
import { TierBadge } from '../shared/TierBadge'

export function AdrTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['adr']
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const adrs = result?.files ?? []
  const metadata = result?.metadata as any
  const adrCount: number = metadata?.adrCount ?? adrs.length

  function extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m)
    return match?.[1]?.replace(/^ADR-\d+:\s*/i, '') ?? 'Architecture Decision'
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Architecture Decision Records</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{adrCount} ADR{adrCount !== 1 ? 's' : ''}</span>
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Advisory note */}
      <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded px-3 py-2">
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Draft ADRs — decisions are captured from SDL, but consequences, alternatives, and team context require human authoring before committing.
      </div>

      {adrs.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700/50">
          {compileResult?.success ? 'Generating…' : 'Fix errors to see ADRs'}
        </div>
      ) : (
        <div className="space-y-2">
          {adrs.map((file, i) => {
            const title = extractTitle(file.content)
            const isOpen = openIdx === i
            return (
              <div key={i} className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 shrink-0">ADR-{String(i + 1).padStart(3, '0')}</span>
                    <span className="text-sm font-medium text-slate-200">{title}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-700/50">
                    <MarkdownRenderer content={file.content} className="mt-3" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
