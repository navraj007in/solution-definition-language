import { PLAYGROUND_URL, GITHUB_URL } from '@/lib/constants'

export function CTA() {
  return (
    <section className="py-20 px-6 border-t border-slate-800/60">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-slate-100 mb-4">
          Start with one YAML file
        </h2>
        <p className="text-slate-400 mb-8 text-lg">
          Load a template in the playground and see your system come to life in seconds.
          No account required.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={PLAYGROUND_URL}
            target="_blank" rel="noopener noreferrer"
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-lg transition-colors"
          >
            Open the Playground →
          </a>
          <a
            href={`${GITHUB_URL}/tree/main/packages/sdl`}
            target="_blank" rel="noopener noreferrer"
            className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-lg border border-slate-700 transition-colors"
          >
            npm install @arch0/sdl
          </a>
        </div>
      </div>
    </section>
  )
}
