import { useMermaid } from '../../hooks/useMermaid'

interface Props {
  content: string | null
  className?: string
}

export function MermaidDiagram({ content, className = '' }: Props) {
  const { svg, error, loading } = useMermaid(content)

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
    <div
      className={`mermaid-container overflow-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg ?? '' }}
    />
  )
}
