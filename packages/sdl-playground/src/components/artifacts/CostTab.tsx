import { useSDLStore } from '../../store/sdlStore'
import { MarkdownRenderer } from '../shared/MarkdownRenderer'
import { TierBadge } from '../shared/TierBadge'

export function CostTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['cost-estimate']
  const doc = compileResult?.document

  const content = result?.files[0]?.content ?? null
  const totalMonthly = (result?.metadata as any)?.totalMonthly as number | undefined
  const cloud = doc?.deployment?.cloud
  const stage = doc?.solution?.stage
  const budget = doc?.constraints?.budget

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Cost Estimate</h2>
        <div className="flex items-center gap-2">
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Advisory callout */}
      <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded px-3 py-2">
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Advisory estimate only. Actual costs depend on traffic, reserved capacity, and negotiated rates.
      </div>

      {/* Cost summary card */}
      {totalMonthly !== undefined && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Estimated monthly cost</p>
              <p className="text-3xl font-bold text-slate-100">${totalMonthly.toFixed(0)}<span className="text-lg text-slate-400">/mo</span></p>
            </div>
            <div className="text-right space-y-1">
              {cloud && <p className="text-xs text-blue-400 font-mono">{cloud}</p>}
              {stage && <p className="text-xs text-slate-500">{stage} stage</p>}
              {budget && <p className="text-xs text-slate-500">{budget} budget tier</p>}
            </div>
          </div>
        </div>
      )}

      {/* Markdown content */}
      {content ? (
        <MarkdownRenderer content={content} />
      ) : (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700/50">
          {compileResult?.success ? 'Generating…' : 'Fix errors to see cost estimate'}
        </div>
      )}
    </div>
  )
}
