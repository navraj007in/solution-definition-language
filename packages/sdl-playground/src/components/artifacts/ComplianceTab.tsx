import { useSDLStore } from '../../store/sdlStore'
import { MarkdownRenderer } from '../shared/MarkdownRenderer'
import { TierBadge } from '../shared/TierBadge'

const FRAMEWORK_COLORS: Record<string, string> = {
  GDPR: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  HIPAA: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  'SOC2-Type2': 'bg-green-900/40 text-green-300 border-green-700/40',
  'PCI-DSS': 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  ISO27001: 'bg-slate-700 text-slate-300 border-slate-600',
  SOX: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
}

export function ComplianceTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['compliance-checklist']
  const doc = compileResult?.document

  const content = result?.files[0]?.content ?? null
  const metadata = result?.metadata as any
  const frameworkNames: string[] = metadata?.frameworks ?? []
  const frameworks = doc?.compliance?.frameworks ?? []

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Compliance</h2>
        <div className="flex items-center gap-2">
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Advisory note */}
      <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded px-3 py-2">
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Starting point only — not a compliance audit. Review each item with your compliance team.
      </div>

      {/* No compliance section prompt */}
      {frameworks.length === 0 && (
        <div className="flex flex-col gap-2 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <p className="text-sm text-slate-400">No compliance frameworks declared.</p>
          <p className="text-xs text-slate-500">
            Add a <code className="bg-slate-800 px-1 rounded text-blue-300">compliance.frameworks</code> section
            to get a framework-specific checklist.
          </p>
          <pre className="mt-2 text-xs text-slate-400 bg-slate-900 rounded p-3 font-mono">
{`compliance:
  frameworks:
    - name: GDPR
      applicable: true
    - name: SOC2-Type2
      applicable: true`}
          </pre>
        </div>
      )}

      {/* Framework badges */}
      {frameworks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Frameworks</h3>
          <div className="flex flex-wrap gap-2">
            {frameworks.map((fw, i) => {
              const color = FRAMEWORK_COLORS[fw.name] ?? 'bg-slate-700 text-slate-300 border-slate-600'
              const applicable = fw.applicable !== false
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${color} ${!applicable ? 'opacity-40' : ''}`}
                >
                  {!applicable && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {applicable && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {fw.name}
                  {!applicable && <span className="text-xs font-normal opacity-60">N/A</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      {content ? (
        <MarkdownRenderer content={content} />
      ) : (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700/50">
          {compileResult?.success ? 'Generating checklist…' : 'Fix errors to see compliance checklist'}
        </div>
      )}
    </div>
  )
}
