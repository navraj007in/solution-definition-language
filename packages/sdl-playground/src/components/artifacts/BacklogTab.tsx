import { useSDLStore } from '../../store/sdlStore'
import { MarkdownRenderer } from '../shared/MarkdownRenderer'
import { TierBadge } from '../shared/TierBadge'

export function BacklogTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['backlog']
  const doc = compileResult?.document

  const content = result?.files[0]?.content ?? null
  const metadata = result?.metadata as any
  const epicCount: number = metadata?.epicCount ?? 0
  const totalStories: number = metadata?.totalStories ?? 0
  const epics: Array<{ name: string; storyCount: number }> = metadata?.epics ?? []

  const features = doc?.features ?? []

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Backlog</h2>
        <div className="flex items-center gap-2">
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Advisory note */}
      <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded px-3 py-2">
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Draft backlog — stories are inferred from personas and core flows. Refine with your team before committing.
      </div>

      {/* Summary stats */}
      {totalStories > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-slate-100">{totalStories}</div>
            <div className="text-xs text-slate-500 mt-0.5">stories</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-slate-100">{epicCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">epics</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-slate-100">{features.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">features declared</div>
          </div>
        </div>
      )}

      {/* Epic breakdown */}
      {epics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Epics</h3>
          <div className="flex flex-wrap gap-2">
            {epics.map(e => (
              <div key={e.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs">
                <span className="text-slate-300">{e.name}</span>
                <span className="text-slate-500">{e.storyCount} stories</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Declared features */}
      {features.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Declared Features</h3>
          <div className="space-y-1">
            {features.map((f, i) => {
              const priorityColors: Record<string, string> = {
                critical: 'text-red-400',
                high: 'text-amber-400',
                medium: 'text-blue-400',
                low: 'text-slate-400',
              }
              const statusColors: Record<string, string> = {
                done: 'bg-green-900/40 text-green-400',
                'in-progress': 'bg-blue-900/40 text-blue-400',
                planned: 'bg-slate-700 text-slate-400',
                deferred: 'bg-red-900/30 text-red-400',
              }
              return (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded border border-slate-700/30">
                  <span className="text-sm text-slate-200">{f.name}</span>
                  <div className="flex items-center gap-1.5">
                    {f.priority && <span className={`text-xs font-mono ${priorityColors[f.priority] ?? ''}`}>{f.priority}</span>}
                    {(f as any).status && <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[(f as any).status] ?? ''}`}>{(f as any).status}</span>}
                    {(f as any).stage && <span className="text-xs text-slate-500">{(f as any).stage}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Markdown content */}
      {content ? (
        <MarkdownRenderer content={content} />
      ) : (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700/50">
          {compileResult?.success ? 'Generating…' : 'Fix errors to see backlog'}
        </div>
      )}
    </div>
  )
}
