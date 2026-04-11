import { linter, type Diagnostic } from '@codemirror/lint'
import { compile } from '@arch0/sdl'

function pathToLineNumber(doc: string, path: string): number {
  if (!path) return 0
  // Try to find the last segment of the path in the YAML source
  const parts = path.split('.')
  for (let i = parts.length - 1; i >= 0; i--) {
    const key = parts[i].replace(/\[\d+\]$/, '') // strip array index
    const regex = new RegExp(`^\\s*${key}\\s*:`, 'm')
    const match = doc.match(regex)
    if (match && match.index !== undefined) {
      return doc.slice(0, match.index).split('\n').length - 1
    }
  }
  return 0
}

function lineToOffset(doc: string, line: number): { from: number; to: number } {
  const lines = doc.split('\n')
  let from = 0
  for (let i = 0; i < line && i < lines.length; i++) {
    from += lines[i].length + 1
  }
  const to = from + (lines[line]?.length ?? 0)
  return { from, to: Math.max(from, to) }
}

export const sdlLinter = linter((view) => {
  const docString = view.state.doc.toString()
  if (!docString.trim()) return []

  try {
    const result = compile(docString)
    const diagnostics: Diagnostic[] = []

    for (const error of result.errors) {
      const line = pathToLineNumber(docString, error.path)
      const { from, to } = lineToOffset(docString, line)
      diagnostics.push({
        from,
        to: Math.max(from + 1, to),
        severity: 'error',
        message: error.message + (error.fix ? `\n\nFix: ${error.fix}` : ''),
        source: 'SDL',
      })
    }

    for (const warning of result.warnings) {
      const line = pathToLineNumber(docString, warning.path)
      const { from, to } = lineToOffset(docString, line)
      diagnostics.push({
        from,
        to: Math.max(from + 1, to),
        severity: 'warning',
        message: warning.message + (warning.recommendation ? `\n\nRecommendation: ${warning.recommendation}` : ''),
        source: 'SDL',
      })
    }

    return diagnostics
  } catch {
    return []
  }
})
