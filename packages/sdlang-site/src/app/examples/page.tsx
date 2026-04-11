import type { Metadata } from 'next'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import { PLAYGROUND_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Examples',
  description: 'SDL example documents for SaaS, e-commerce, mobile backends, AI products, and more.',
}

interface Example {
  name: string
  description: string
  stage: string
  style: string
  cloud: string
  frameworks: string[]
  yaml: string
  isMultiFile: boolean
}

function readExamples(): Example[] {
  const examples: Example[] = []
  const base = join(process.cwd(), '../../examples')

  try {
    // Single-file examples
    const singleDir = join(base, 'single-file')
    for (const file of readdirSync(singleDir).filter(f => f.endsWith('.yaml'))) {
      try {
        const yaml = readFileSync(join(singleDir, file), 'utf-8')
        const name = yaml.match(/name:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? file
        const description = yaml.match(/description:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? ''
        const stage = yaml.match(/stage:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? 'MVP'
        const style = yaml.match(/style:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? ''
        const cloud = yaml.match(/cloud:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? ''
        const frameworks = [...yaml.matchAll(/framework:\s*["']?([^"'\n]+)/g)].map(m => m[1].trim())
        examples.push({ name, description, stage, style, cloud, frameworks, yaml, isMultiFile: false })
      } catch { /* skip */ }
    }

    // Multi-file examples — just show the root solution file
    const multiDir = join(base, 'multi-file')
    for (const dir of readdirSync(multiDir)) {
      try {
        const yaml = readFileSync(join(multiDir, dir, 'solution.sdl.yaml'), 'utf-8')
        const name = yaml.match(/name:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? dir
        const description = yaml.match(/description:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? ''
        const stage = yaml.match(/stage:\s*["']?([^"'\n]+)/)?.[1]?.trim() ?? 'MVP'
        examples.push({ name, description, stage, style: 'multi-file', cloud: '', frameworks: [], yaml, isMultiFile: true })
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return examples
}

const STAGE_COLORS: Record<string, string> = {
  MVP: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  Growth: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  Enterprise: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
}

export default function ExamplesPage() {
  const examples = readExamples()

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-100 mb-3">SDL Examples</h1>
        <p className="text-slate-400 text-lg">
          Ready-to-use SDL documents for common architectures. Click any example to open it in the playground.
        </p>
      </div>

      {examples.length === 0 ? (
        <div className="text-slate-500 text-sm">Examples not available at build time.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((ex, i) => {
            const encoded = typeof btoa !== 'undefined'
              ? btoa(encodeURIComponent(ex.yaml))
              : ''
            const playgroundHref = encoded ? `${PLAYGROUND_URL}#${encoded}` : PLAYGROUND_URL

            return (
              <div key={i} className="flex flex-col rounded-xl border border-slate-700/60 bg-slate-900/40 hover:border-slate-600 transition-colors overflow-hidden">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-200">{ex.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${STAGE_COLORS[ex.stage] ?? 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                      {ex.stage}
                    </span>
                  </div>
                  {ex.description && (
                    <p className="text-sm text-slate-400 mb-3">{ex.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {ex.style && ex.style !== 'multi-file' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700/50">{ex.style}</span>
                    )}
                    {ex.isMultiFile && (
                      <span className="px-2 py-0.5 rounded text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/40">multi-file</span>
                    )}
                    {ex.cloud && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700/50">{ex.cloud}</span>
                    )}
                    {ex.frameworks.slice(0, 2).map(fw => (
                      <span key={fw} className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700/50">{fw}</span>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-700/50 p-3 flex gap-2">
                  <a
                    href={playgroundHref}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                  >
                    Open in Playground
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-12 p-6 rounded-xl border border-slate-700/60 bg-slate-900/30 text-center">
        <p className="text-slate-400 mb-4">Want to build from scratch? Start with a template in the playground.</p>
        <a
          href={PLAYGROUND_URL}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          Open Playground with templates →
        </a>
      </div>
    </div>
  )
}
