import { useState } from 'react'
import { useMermaid } from '../../hooks/useMermaid'

interface Props {
  content: string | null
  className?: string
}

export function MermaidDiagram({ content, className = '' }: Props) {
  const { svg, error, loading } = useMermaid(content)
  const [copied, setCopied] = useState(false)

  const copySvg = () => {
    if (!svg) return
    navigator.clipboard.writeText(svg).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const copySource = () => {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No diagram available
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm animate-pulse">
        Rendering diagram…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-red-400 text-sm">
        Diagram error: {error}
      </div>
    )
  }

  return (
    <div className={`relative group mermaid-container overflow-auto ${className}`}>
      {/* Copy actions */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copySource}
          className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          title="Copy Mermaid source"
        >
          {copied ? '✓' : 'Copy .mmd'}
        </button>
        <button
          onClick={copySvg}
          className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          title="Copy SVG markup"
        >
          Copy SVG
        </button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
    </div>
  )
}
