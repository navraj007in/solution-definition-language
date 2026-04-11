const STEPS = [
  {
    number: '01',
    title: 'Write',
    description: 'Define your solution in YAML — architecture style, projects, auth strategy, data layer, deployment target. One file captures what usually lives in a dozen documents.',
    accent: 'text-blue-400',
    border: 'border-blue-700/40',
    bg: 'bg-blue-900/20',
  },
  {
    number: '02',
    title: 'Compile',
    description: 'The SDL compiler validates, normalizes defaults, and surfaces exactly what it inferred on your behalf — so nothing is hidden. Errors point directly to the offending field.',
    accent: 'text-green-400',
    border: 'border-green-700/40',
    bg: 'bg-green-900/20',
  },
  {
    number: '03',
    title: 'Generate',
    description: 'Every generator output carries a confidence tier — deterministic outputs are correct by construction, inferred outputs use heuristics, advisory outputs are starting points that need review.',
    accent: 'text-purple-400',
    border: 'border-purple-700/40',
    bg: 'bg-purple-900/20',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 px-6 border-t border-slate-800/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-100 mb-3">How it works</h2>
          <p className="text-slate-400 max-w-lg mx-auto">Three stages. One pipeline. Every output traceable back to a field in your SDL document.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map(step => (
            <div key={step.number} className={`rounded-xl border ${step.border} ${step.bg} p-6`}>
              <div className={`text-4xl font-bold font-mono ${step.accent} mb-4 opacity-60`}>{step.number}</div>
              <h3 className={`text-xl font-semibold ${step.accent} mb-3`}>{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
