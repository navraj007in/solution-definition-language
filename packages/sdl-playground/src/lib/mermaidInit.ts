import mermaid from 'mermaid'

let initialized = false

export function initMermaid() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      background: '#0f1117',
      primaryColor: '#1e3a5f',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#334155',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      edgeLabelBackground: '#1e293b',
      nodeTextColor: '#e2e8f0',
      clusterBkg: '#1a1f2e',
      clusterBorder: '#334155',
      titleColor: '#94a3b8',
    },
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
  })
  initialized = true
}

let idCounter = 0

/**
 * Strip %%{init: ...}%% front-matter — we set theme via mermaid.initialize().
 * This prevents conflicts when generators include their own init blocks.
 */
function stripInitBlock(content: string): string {
  return content.replace(/^%%\{[\s\S]*?\}%%\s*\n?/m, '').trim()
}

export async function renderMermaid(content: string): Promise<string> {
  initMermaid()
  const cleaned = stripInitBlock(content)
  const id = `mermaid-render-${++idCounter}`
  const { svg } = await mermaid.render(id, cleaned)
  return svg
}
