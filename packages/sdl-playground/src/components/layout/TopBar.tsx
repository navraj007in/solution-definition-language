import { useSDLStore } from '../../store/sdlStore'
import { TemplatePicker } from '../templates/TemplatePicker'

const STAGE_COLORS: Record<string, string> = {
  MVP: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  Growth: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
  Enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
}

export function TopBar() {
  const { compileResult } = useSDLStore()
  const doc = compileResult?.document
  const solutionName = doc?.solution?.name
  const stage = doc?.solution?.stage

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700/80 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="font-semibold text-slate-100 text-sm">SDL Playground</span>
        </div>

        {solutionName && (
          <>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 text-sm">{solutionName}</span>
            {stage && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${STAGE_COLORS[stage] ?? 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                {stage}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TemplatePicker />
        <a
          href="https://github.com/navraj007in/solution-definition-language"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="SDL on GitHub"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </a>
      </div>
    </div>
  )
}
