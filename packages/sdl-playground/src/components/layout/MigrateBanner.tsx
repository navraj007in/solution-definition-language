import { useSDLStore } from '../../store/sdlStore'

export function MigrateBanner() {
  const { migrateResult, isMigrateDismissed, applyMigration, dismissMigrate } = useSDLStore()

  if (!migrateResult || isMigrateDismissed) return null
  if (!migrateResult.compilesClean || migrateResult.changes.length === 0) return null

  const count = migrateResult.changes.length

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-950/60 border-b border-amber-700/50 text-sm shrink-0">
      <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>

      <span className="text-amber-300 flex-1">
        <span className="font-medium">Stale vocabulary detected</span>
        <span className="text-amber-400/70 ml-1">
          — {count} fix{count !== 1 ? 'es' : ''} available:
        </span>
        <span className="ml-1 text-amber-400/60 text-xs">
          {migrateResult.changes.slice(0, 3).map(c => `${c.path}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`).join(' · ')}
          {count > 3 && ` · +${count - 3} more`}
        </span>
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={applyMigration}
          className="px-3 py-1 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
        >
          Auto-fix
        </button>
        <button
          onClick={dismissMigrate}
          className="p-1 rounded text-amber-500 hover:text-amber-300 transition-colors"
          title="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
