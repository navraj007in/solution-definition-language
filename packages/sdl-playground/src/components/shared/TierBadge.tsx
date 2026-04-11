import type { GeneratorTier } from '@arch0/sdl'

const TIER_CONFIG: Record<GeneratorTier, { label: string; color: string; dot: string; tooltip: string }> = {
  deterministic: {
    label: 'deterministic',
    color: 'bg-green-900/40 text-green-400 border-green-700/50',
    dot: 'bg-green-400',
    tooltip: 'Correct by construction — safe to use directly in CI',
  },
  inferred: {
    label: 'inferred',
    color: 'bg-amber-900/40 text-amber-400 border-amber-700/50',
    dot: 'bg-amber-400',
    tooltip: 'Derived via heuristics — review conventions before committing',
  },
  advisory: {
    label: 'advisory',
    color: 'bg-red-900/40 text-red-400 border-red-700/50',
    dot: 'bg-red-400',
    tooltip: 'Starting point only — always review and edit before use',
  },
}

export function TierBadge({ tier }: { tier: GeneratorTier }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border ${cfg.color}`}
      title={cfg.tooltip}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
