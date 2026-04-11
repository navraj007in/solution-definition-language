import Link from 'next/link'
import { GITHUB_URL, PLAYGROUND_URL } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white text-xs">S</div>
            <span className="font-semibold text-slate-200">SDL</span>
          </div>
          <p className="text-sm text-slate-500 max-w-xs">
            Solution Design Language — a YAML-based specification for software systems.
          </p>
        </div>

        <div className="flex gap-12 text-sm">
          <div className="space-y-2">
            <p className="text-slate-400 font-medium mb-3">Language</p>
            <Link href="/spec" className="block text-slate-500 hover:text-slate-300">Specification</Link>
            <Link href="/examples" className="block text-slate-500 hover:text-slate-300">Examples</Link>
            <a href={PLAYGROUND_URL} className="block text-slate-500 hover:text-slate-300">Playground</a>
          </div>
          <div className="space-y-2">
            <p className="text-slate-400 font-medium mb-3">Reference</p>
            <Link href="/spec#canonical-contract" className="block text-slate-500 hover:text-slate-300">Canonical Contract</Link>
            <Link href="/spec#generators" className="block text-slate-500 hover:text-slate-300">Generators</Link>
            <Link href="/spec#section-support" className="block text-slate-500 hover:text-slate-300">Section Support</Link>
          </div>
          <div className="space-y-2">
            <p className="text-slate-400 font-medium mb-3">Project</p>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="block text-slate-500 hover:text-slate-300">GitHub</a>
            <a href={`${GITHUB_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noopener noreferrer" className="block text-slate-500 hover:text-slate-300">Changelog</a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/50 py-4 text-center text-xs text-slate-600">
        SDL v1.1 · Apache-2.0
      </div>
    </footer>
  )
}
