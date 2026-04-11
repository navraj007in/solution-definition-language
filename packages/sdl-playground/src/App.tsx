import { useCallback, useRef, useState } from 'react'
import { useSDLStore } from './store/sdlStore'
import { TopBar } from './components/layout/TopBar'
import { TabBar } from './components/layout/TabBar'
import { StatusBar } from './components/layout/StatusBar'
import { MigrateBanner } from './components/layout/MigrateBanner'
import { InferencesDrawer } from './components/layout/InferencesDrawer'
import { SDLEditor } from './components/editor/SDLEditor'
import { ArchitectureTab } from './components/artifacts/ArchitectureTab'
import { DataTab } from './components/artifacts/DataTab'
import { ApiTab } from './components/artifacts/ApiTab'
import { SequencesTab } from './components/artifacts/SequencesTab'
import { BacklogTab } from './components/artifacts/BacklogTab'
import { AdrTab } from './components/artifacts/AdrTab'
import { ScaffoldTab } from './components/artifacts/ScaffoldTab'
import { CodingRulesTab } from './components/artifacts/CodingRulesTab'
import { ComplianceTab } from './components/artifacts/ComplianceTab'
import { CostTab } from './components/artifacts/CostTab'

function ArtifactPanel() {
  const { activeTab } = useSDLStore()
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      {activeTab === 'architecture'  && <ArchitectureTab />}
      {activeTab === 'data'          && <DataTab />}
      {activeTab === 'api'           && <ApiTab />}
      {activeTab === 'sequences'     && <SequencesTab />}
      {activeTab === 'backlog'       && <BacklogTab />}
      {activeTab === 'adr'           && <AdrTab />}
      {activeTab === 'scaffold'      && <ScaffoldTab />}
      {activeTab === 'coding-rules'  && <CodingRulesTab />}
      {activeTab === 'compliance'    && <ComplianceTab />}
      {activeTab === 'cost'          && <CostTab />}
    </div>
  )
}

// ─── Drag handle for panel resize ───

function DragHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false)
  const lastX    = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onDrag(ev.clientX - lastX.current)
      lastX.current = ev.clientX
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onDrag])

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize bg-slate-700/80 hover:bg-blue-500/60 transition-colors active:bg-blue-400"
    />
  )
}

// ─── Main layout ───

export function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorPct, setEditorPct] = useState(42) // percentage

  const handleDrag = useCallback((dx: number) => {
    setEditorPct(prev => {
      const containerWidth = containerRef.current?.offsetWidth ?? window.innerWidth
      const newPct = prev + (dx / containerWidth) * 100
      return Math.max(20, Math.min(75, newPct))
    })
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <TopBar />

      {/* Desktop: side-by-side · Mobile: stacked */}
      <div
        ref={containerRef}
        className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden"
      >
        {/* Left: Editor */}
        <div
          className="flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-slate-700/80"
          style={{ width: `${editorPct}%`, minWidth: 0 }}
        >
          <MigrateBanner />
          <div className="flex-1 min-h-0 overflow-hidden">
            <SDLEditor />
          </div>
          <StatusBar />
        </div>

        {/* Drag handle (desktop only) */}
        <DragHandle onDrag={handleDrag} />

        {/* Right: Artifacts */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 relative overflow-hidden">
          <TabBar />
          <ArtifactPanel />
          <InferencesDrawer />
        </div>
      </div>
    </div>
  )
}
