import { useSDLStore } from '../../store/sdlStore'

export function StatusBar() {
  const { compileResult, artifacts, toggleInferences } = useSDLStore()

  if (!compileResult) return null

  const errorCount = compileResult.errors.length
  const warningCount = compileResult.warnings.length
  const inferenceCount = compileResult.inferences?.length ?? 0
  const advisoryCount = artifacts
    ? Object.values(artifacts).filter((r) => r?.tier === 'advisory').length
    : 0

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900/80 border-t border-slate-700/50 text-xs shrink-0">
      {compileResult.success ? (
        <span className="flex items-center gap-1.5 text-green-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Valid
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-red-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {errorCount} error{errorCount !== 1 ? 's' : ''}
        </span>
      )}

      {warningCount > 0 && (
        <span className="text-amber-400">
          {warningCount} warning{warningCount !== 1 ? 's' : ''}
        </span>
      )}

      <span className="text-slate-600">·</span>

      {inferenceCount > 0 ? (
        <button
          onClick={toggleInferences}
          className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
        >
          {inferenceCount} inferred field{inferenceCount !== 1 ? 's' : ''}
        </button>
      ) : (
        <span className="text-slate-500">0 inferences</span>
      )}

      {advisoryCount > 0 && (
        <>
          <span className="text-slate-600">·</span>
          <span className="text-amber-500">
            {advisoryCount} advisory output{advisoryCount !== 1 ? 's' : ''} — review before use
          </span>
        </>
      )}

      <span className="ml-auto flex items-center gap-3 text-slate-600">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          deterministic
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          inferred
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          advisory
        </span>
      </span>
    </div>
  )
}
