import { useState, useEffect } from 'react'
import { renderMermaid } from '../lib/mermaidInit'

export function useMermaid(mmdContent: string | null) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mmdContent) {
      setSvg(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    renderMermaid(mmdContent)
      .then((result) => {
        if (!cancelled) {
          setSvg(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [mmdContent])

  return { svg, error, loading }
}
