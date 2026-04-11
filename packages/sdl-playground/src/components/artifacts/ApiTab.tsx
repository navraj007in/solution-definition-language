import { useSDLStore } from '../../store/sdlStore'
import { CodeBlock } from '../shared/CodeBlock'
import { TierBadge } from '../shared/TierBadge'
import { getFileContent } from '../../lib/generators'

export function ApiTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['openapi']
  const doc = compileResult?.document

  const content = getFileContent(result, 'openapi.yaml')
  const contracts = doc?.contracts?.apis ?? []
  const endpointCount = (result?.metadata as any)?.endpointCount
  const schemaCount = (result?.metadata as any)?.schemaCount
  const entityList: string[] = (result?.metadata as any)?.entities ?? []

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">OpenAPI Spec</h2>
        <div className="flex items-center gap-2">
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Stats */}
      {result && (
        <div className="grid grid-cols-3 gap-3">
          {endpointCount !== undefined && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
              <div className="text-2xl font-bold text-slate-100">{endpointCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">endpoints</div>
            </div>
          )}
          {schemaCount !== undefined && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
              <div className="text-2xl font-bold text-slate-100">{schemaCount}</div>
              <div className="text-xs text-slate-500 mt-0.5">schemas</div>
            </div>
          )}
          {entityList.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
              <div className="text-2xl font-bold text-slate-100">{entityList.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">resources</div>
            </div>
          )}
        </div>
      )}

      {/* Declared contracts */}
      {contracts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Declared Contracts</h3>
          <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Type</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.name} className="border-b border-slate-800 last:border-0">
                    <td className="px-3 py-2 font-mono text-slate-200">{c.name}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono">{c.type ?? 'rest'}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{c.owner ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OpenAPI YAML */}
      {content ? (
        <CodeBlock content={content} language="yaml" maxHeight="500px" />
      ) : (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700/50">
          {compileResult?.success ? 'Generating…' : 'Fix errors to see OpenAPI spec'}
        </div>
      )}
    </div>
  )
}
