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

export function App() {
  return (
    <div className="flex flex-col h-full bg-slate-950">
      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Editor */}
        <div className="flex flex-col w-[42%] min-w-0 border-r border-slate-700/80">
          <MigrateBanner />
          <div className="flex-1 min-h-0 overflow-hidden">
            <SDLEditor />
          </div>
          <StatusBar />
        </div>

        {/* Right: Artifacts */}
        <div className="flex flex-col flex-1 min-w-0 relative">
          <TabBar />
          <ArtifactPanel />
          <InferencesDrawer />
        </div>
      </div>
    </div>
  )
}
