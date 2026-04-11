import Link from 'next/link'
import { PLAYGROUND_URL, GITHUB_URL } from '@/lib/constants'

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-100">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs">S</div>
          <span>sdlang.com</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link href="/spec" className="px-3 py-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors">
            Spec
          </Link>
          <Link href="/examples" className="px-3 py-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors">
            Examples
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
          >
            GitHub
          </a>
          <a
            href={PLAYGROUND_URL}
            target="_blank" rel="noopener noreferrer"
            className="ml-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors"
          >
            Try Playground →
          </a>
        </div>
      </div>
    </nav>
  )
}
