import type { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PLAYGROUND_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Specification',
  description: 'SDL v1.1 language specification — sections, schemas, generators, and canonical reference.',
}

function getSpec(): string {
  const specPath = join(process.cwd(), '..', 'sdl', 'spec', 'SDL-v1.1.md')
    .replace('/packages/sdlang-site', '')
  try {
    return readFileSync(join(process.cwd(), '../../spec/SDL-v1.1.md'), 'utf-8')
  } catch {
    try {
      return readFileSync(join(process.cwd(), '../../../spec/SDL-v1.1.md'), 'utf-8')
    } catch {
      return '# SDL v1.1 Specification\n\nSpecification file not found at build time.'
    }
  }
}

export default function SpecPage() {
  const spec = getSpec()

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 rounded-full bg-blue-900/40 border border-blue-700/40 text-blue-400 text-xs font-mono">SDL v1.1</span>
          <span className="text-slate-500 text-sm">Active specification</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-3">SDL Specification</h1>
        <p className="text-slate-400 mb-6">
          The normative reference for SDL v1.1 — sections, field shapes, valid enum values, generator outputs, and section support levels.
        </p>
        <a
          href={PLAYGROUND_URL}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Try in Playground →
        </a>
      </div>

      <div className="prose-sdl">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {spec}
        </ReactMarkdown>
      </div>
    </div>
  )
}
