import { PLAYGROUND_URL, GITHUB_URL, STARTER_SDL } from '@/lib/constants'

export function Hero() {
  return (
    <section className="pt-20 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-700/40 text-blue-400 text-xs font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              SDL v1.1 · 520 tests passing
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-slate-100 leading-tight mb-5">
              One YAML file.<br />
              <span className="text-blue-400">Your entire system.</span>
            </h1>

            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              Define your architecture once — get architecture diagrams, API specs,
              data models, scaffolding, and AI coding rules generated from a single
              validated source of truth.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href={PLAYGROUND_URL}
                target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                Try the Playground →
              </a>
              <a
                href={GITHUB_URL}
                target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium border border-slate-700 transition-colors"
              >
                View on GitHub
              </a>
            </div>

            <div className="flex gap-6 mt-8 text-sm text-slate-500">
              <span>✓ Validates &amp; normalizes</span>
              <span>✓ 13 generators</span>
              <span>✓ AI-ready</span>
            </div>
          </div>

          {/* Right: SDL snippet */}
          <div className="rounded-xl border border-slate-700/60 overflow-hidden bg-slate-900/60 shadow-2xl">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-amber-500/60" />
              <span className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-slate-500 font-mono">solution.sdl.yaml</span>
            </div>
            <pre className="p-5 text-xs font-mono text-slate-300 overflow-auto leading-relaxed">
              <code>{STARTER_SDL}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
