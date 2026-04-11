import { GENERATORS } from '@/lib/constants'
import { TierBadge } from '@/components/shared/TierBadge'

export function Generators() {
  const deterministic = GENERATORS.filter(g => g.tier === 'deterministic')
  const inferred      = GENERATORS.filter(g => g.tier === 'inferred')
  const advisory      = GENERATORS.filter(g => g.tier === 'advisory')

  return (
    <section className="py-20 px-6 border-t border-slate-800/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-slate-100 mb-3">What SDL generates</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Every output carries a confidence tier so you know exactly what to trust and what to review.
          </p>
        </div>

        {/* Tier legend */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /><strong className="text-green-400">deterministic</strong> — correct by construction, use directly in CI</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /><strong className="text-amber-400">inferred</strong> — heuristic-based, review conventions before committing</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /><strong className="text-red-400">advisory</strong> — starting point, always edit before use</span>
        </div>

        <div className="space-y-3">
          {[
            { tier: 'deterministic' as const, items: deterministic },
            { tier: 'inferred'      as const, items: inferred      },
            { tier: 'advisory'      as const, items: advisory      },
          ].map(({ tier, items }) => (
            <div key={tier}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(g => (
                  <div key={g.type} className="flex items-start gap-3 p-4 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 text-sm shrink-0 font-mono">
                      {g.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-200">{g.name}</span>
                        <TierBadge tier={g.tier} />
                      </div>
                      <p className="text-xs text-slate-500">{g.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
