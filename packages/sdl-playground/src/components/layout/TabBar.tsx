import { useSDLStore } from '../../store/sdlStore'
import { TABS } from '../../types/tabs'
import type { TabId } from '../../types/tabs'

export function TabBar() {
  const { activeTab, setActiveTab, artifacts } = useSDLStore()

  const getTierDot = (artifactType: string) => {
    const result = artifacts?.[artifactType as keyof typeof artifacts]
    if (!result) return null
    const colors = { deterministic: 'bg-green-400', inferred: 'bg-amber-400', advisory: 'bg-red-400' }
    return colors[result.tier as keyof typeof colors]
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 bg-slate-900 border-b border-slate-700/80 overflow-x-auto shrink-0">
      {TABS.map((tab) => {
        const dot = getTierDot(tab.artifactType)
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {dot && (
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
