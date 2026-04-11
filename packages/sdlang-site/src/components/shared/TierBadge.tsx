const cfg = {
  deterministic: { label: 'deterministic', classes: 'bg-green-900/40 text-green-400 border-green-700/40', dot: 'bg-green-400' },
  inferred:      { label: 'inferred',      classes: 'bg-amber-900/40 text-amber-400 border-amber-700/40', dot: 'bg-amber-400' },
  advisory:      { label: 'advisory',      classes: 'bg-red-900/40   text-red-400   border-red-700/40',   dot: 'bg-red-400'   },
} as const

export function TierBadge({ tier }: { tier: keyof typeof cfg }) {
  const c = cfg[tier]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border ${c.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
