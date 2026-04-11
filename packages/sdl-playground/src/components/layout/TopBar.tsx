import { useState } from 'react'
import { useSDLStore } from '../../store/sdlStore'
import { TemplatePicker } from '../templates/TemplatePicker'
import { DiffModal } from './DiffModal'
import { exportArtifactsAsZip } from '../../lib/exportZip'

const STAGE_COLORS: Record<string, string> = {
  MVP:        'bg-blue-900/50 text-blue-300 border-blue-700/50',
  Growth:     'bg-purple-900/50 text-purple-300 border-purple-700/50',
  Enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
}

export function TopBar() {
  const { compileResult, artifacts, yaml } = useSDLStore()
  const doc = compileResult?.document
  const solutionName = doc?.solution?.name
  const stage = doc?.solution?.stage

  const [shareCopied, setShareCopied] = useState(false)
  const [exporting, setExporting]     = useState(false)
  const [diffOpen, setDiffOpen]       = useState(false)

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  const exportZip = async () => {
    if (!artifacts || exporting) return
    setExporting(true)
    try {
      await exportArtifactsAsZip(solutionName ?? 'sdl-export', yaml, artifacts)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700/80 shrink-0">
        {/* Left: brand + solution name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-semibold text-slate-100 text-sm">SDL Playground</span>
          </div>

          {solutionName && (
            <>
              <span className="text-slate-600 shrink-0">/</span>
              <span className="text-slate-300 text-sm truncate">{solutionName}</span>
              {stage && (
                <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${STAGE_COLORS[stage] ?? 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                  {stage}
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <TemplatePicker />

          {/* Diff */}
          <button
            onClick={() => setDiffOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Compare two SDL documents"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="hidden sm:inline">Diff</span>
          </button>

          {/* Share */}
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Copy shareable link"
          >
            {shareCopied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Export zip */}
          <button
            onClick={exportZip}
            disabled={!artifacts || exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download all artifacts as zip"
          >
            {exporting ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* GitHub */}
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

      {diffOpen && <DiffModal onClose={() => setDiffOpen(false)} />}
    </>
  )
}
