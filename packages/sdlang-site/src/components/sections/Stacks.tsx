import { STACKS } from '@/lib/constants'

const STACK_LABELS: Record<keyof typeof STACKS, string> = {
  frontend: 'Frontend',
  backend:  'Backend',
  cloud:    'Cloud',
  auth:     'Auth',
  database: 'Database',
}

export function Stacks() {
  return (
    <section className="py-20 px-6 border-t border-slate-800/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-100 mb-3">Works with your stack</h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            SDL knows your frameworks, clouds, and tools — generators produce stack-appropriate output automatically.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {(Object.entries(STACKS) as [keyof typeof STACKS, string[]][]).map(([key, items]) => (
            <div key={key}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{STACK_LABELS[key]}</p>
              <div className="space-y-1.5">
                {items.map(item => (
                  <div key={item} className="px-2.5 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/40 text-sm text-slate-300">
                    {item}
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
