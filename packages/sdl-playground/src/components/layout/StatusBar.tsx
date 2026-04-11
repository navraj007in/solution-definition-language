import { useSDLStore } from '../../store/sdlStore'

function jumpToPath(path: string, yaml: string) {
  if (!path) return
  // Find approximate line by searching for the last path segment key
  const parts = path.split('.')
  for (let i = parts.length - 1; i >= 0; i--) {
    const key = parts[i].replace(/\[\d+\].*/, '')
    if (!key) continue
    const lines = yaml.split('\n')
    const idx = lines.findIndex(l => new RegExp(`^\\s*${key}\\s*:`).test(l))
    if (idx >= 0) {
      window.dispatchEvent(new CustomEvent('sdl:jump-to-line', { detail: { line: idx } }))
      return
    }
  }
}

export function StatusBar() {
  const { compileResult, artifacts, toggleInferences, yaml } = useSDLStore()

  if (!compileResult) return null

  const errorCount     = compileResult.errors.length
  const warningCount   = compileResult.warnings.length
  const inferenceCount = compileResult.inferences?.length ?? 0
  const advisoryCount  = artifacts
    ? Object.values(artifacts).filter(r => r?.tier === 'advisory').length
    : 0

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/80 border-t border-slate-700/50 text-xs shrink-0 overflow-x-auto">
      {/* Compile state */}
      {compileResult.success ? (
        <span className="flex items-center gap-1.5 text-green-400 shrink-0">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Valid
        </span>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
          {/* Clickable error paths */}
          {compileResult.errors.slice(0, 3).map((e, i) => (
            <button
              key={i}
              onClick={() => jumpToPath(e.path, yaml)}
              className="text-red-500/70 hover:text-red-300 font-mono truncate max-w-32 transition-colors"
              title={`Jump to ${e.path}: ${e.message}`}
            >
              {e.path}
            </button>
          ))}
        </div>
      )}

      {warningCount > 0 && (
        <span className="text-amber-400 shrink-0">
          {warningCount} warning{warningCount !== 1 ? 's' : ''}
        </span>
      )}

      <span className="text-slate-600 shrink-0">·</span>

      {inferenceCount > 0 ? (
        <button
          onClick={toggleInferences}
          className="text-blue-400 hover:text-blue-300 transition-colors shrink-0"
        >
          {inferenceCount} inferred
        </button>
      ) : (
        <span className="text-slate-600 shrink-0">0 inferences</span>
      )}

      {advisoryCount > 0 && (
        <>
          <span className="text-slate-600 shrink-0">·</span>
          <span className="text-amber-500 shrink-0">
            {advisoryCount} advisory — review before use
          </span>
        </>
      )}

      {/* Tier legend */}
      <span className="ml-auto flex items-center gap-3 text-slate-600 shrink-0">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />deterministic
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />inferred
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />advisory
        </span>
      </span>
    </div>
  )
}
