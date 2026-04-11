import mermaid from 'mermaid'

let initialized = false

export function initMermaid() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      background: '#1e2330',
      primaryColor: '#3b82f6',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#334155',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      edgeLabelBackground: '#1e293b',
      nodeTextColor: '#e2e8f0',
    },
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
  })
  initialized = true
}

let idCounter = 0

export async function renderMermaid(content: string): Promise<string> {
  initMermaid()
  const id = `mermaid-${++idCounter}`
  try {
    const { svg } = await mermaid.render(id, content)
    return svg
  } catch {
    throw new Error('Failed to render diagram')
  }
}
