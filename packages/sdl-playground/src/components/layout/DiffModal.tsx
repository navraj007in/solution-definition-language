import { useState } from 'react'
import { compile, diff } from '@arch0/sdl'
import type { SDLDiffEntry } from '@arch0/sdl'
import { useSDLStore } from '../../store/sdlStore'

interface Props {
  onClose: () => void
}

const TYPE_COLORS: Record<string, string> = {
  added:   'text-green-400 bg-green-900/20 border-green-700/30',
  removed: 'text-red-400 bg-red-900/20 border-red-700/30',
  changed: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
}

const TYPE_ICONS: Record<string, string> = {
  added: '+', removed: '−', changed: '~',
}

export function DiffModal({ onClose }: Props) {
  const { yaml: currentYaml } = useSDLStore()
  const [beforeYaml, setBeforeYaml] = useState('')
  const [afterYaml, setAfterYaml]   = useState(currentYaml)
  const [changes, setChanges]       = useState<SDLDiffEntry[] | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [identical, setIdentical]   = useState<boolean | null>(null)

  const runDiff = () => {
    setError(null)
    setChanges(null)
    setIdentical(null)

    const a = compile(beforeYaml)
    const b = compile(afterYaml)

    if (!a.success || !a.document) {
      setError(`Before YAML: ${a.errors[0]?.message ?? 'invalid'}`)
      return
    }
    if (!b.success || !b.document) {
      setError(`After YAML: ${b.errors[0]?.message ?? 'invalid'}`)
      return
    }

    const result = diff(a.document, b.document)
    setChanges(result.changes)
    setIdentical(result.identical)
  }

  const loadCurrent = () => setAfterYaml(currentYaml)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-100">SDL Diff</h2>
            <p className="text-xs text-slate-500 mt-0.5">Compare two SDL documents structurally</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* YAML inputs */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-slate-700">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Before</label>
            <textarea
              value={beforeYaml}
              onChange={e => setBeforeYaml(e.target.value)}
              placeholder="Paste the old SDL YAML here…"
              className="w-full h-36 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 resize-none focus:outline-none focus:border-slate-500 placeholder-slate-600"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 font-medium">After</label>
              <button
                onClick={loadCurrent}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Use current editor
              </button>
            </div>
            <textarea
              value={afterYaml}
              onChange={e => setAfterYaml(e.target.value)}
              placeholder="Paste the new SDL YAML here…"
              className="w-full h-36 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 resize-none focus:outline-none focus:border-slate-500 placeholder-slate-600"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700">
          <button
            onClick={runDiff}
            disabled={!beforeYaml.trim() || !afterYaml.trim()}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Compare
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
          {identical === true && <span className="text-xs text-green-400">✓ Documents are identical</span>}
          {changes !== null && changes.length > 0 && (
            <span className="text-xs text-slate-400">
              {changes.filter(c => c.type === 'added').length} added ·{' '}
              {changes.filter(c => c.type === 'removed').length} removed ·{' '}
              {changes.filter(c => c.type === 'changed').length} changed
            </span>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {changes === null || changes.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
              {changes === null ? 'Paste two SDL documents and click Compare' : 'No differences found'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {changes.map((change, i) => (
                <div key={i} className={`flex items-start gap-3 px-3 py-2 rounded-lg border text-xs ${TYPE_COLORS[change.type]}`}>
                  <span className="font-bold shrink-0 w-4 text-center">{TYPE_ICONS[change.type]}</span>
                  <code className="font-mono text-slate-300 shrink-0 min-w-48">{change.path}</code>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {change.oldValue !== undefined && (
                      <span className="text-red-400 truncate">{JSON.stringify(change.oldValue)}</span>
                    )}
                    {change.oldValue !== undefined && change.newValue !== undefined && (
                      <span className="text-slate-600">→</span>
                    )}
                    {change.newValue !== undefined && (
                      <span className="text-green-400 truncate">{JSON.stringify(change.newValue)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
