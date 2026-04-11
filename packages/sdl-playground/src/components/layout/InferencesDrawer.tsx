import { useSDLStore } from '../../store/sdlStore'

export function InferencesDrawer() {
  const { isInferencesOpen, toggleInferences, compileResult } = useSDLStore()
  const inferences = compileResult?.inferences ?? []

  if (!isInferencesOpen) return null

  return (
    <div className="absolute inset-0 z-40 flex">
      <div className="flex-1 bg-black/50" onClick={toggleInferences} />
      <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">Inferred Fields</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fields SDL filled in automatically</p>
          </div>
          <button
            onClick={toggleInferences}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {inferences.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              No fields were inferred
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {inferences.map((inf, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <code className="text-xs font-mono text-blue-400 break-all">{inf.path}</code>
                    <code className="text-xs font-mono text-green-400 shrink-0">
                      {JSON.stringify(inf.value)}
                    </code>
                  </div>
                  <p className="text-xs text-slate-500">{inf.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            These values were not in your SDL. They were filled in by the normalizer based on your stack and stage. Explicitly setting them in your SDL overrides the default.
          </p>
        </div>
      </div>
    </div>
  )
}
