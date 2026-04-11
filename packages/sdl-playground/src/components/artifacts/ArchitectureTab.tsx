import { useSDLStore } from '../../store/sdlStore'
import { MermaidDiagram } from '../shared/MermaidDiagram'
import { TierBadge } from '../shared/TierBadge'
import { getFileContent } from '../../lib/generators'

const FRAMEWORK_COLORS: Record<string, string> = {
  nextjs: 'bg-slate-700 text-slate-200',
  react: 'bg-cyan-900/50 text-cyan-300',
  vue: 'bg-green-900/50 text-green-300',
  nodejs: 'bg-lime-900/50 text-lime-300',
  'python-fastapi': 'bg-teal-900/50 text-teal-300',
  'dotnet-8': 'bg-purple-900/50 text-purple-300',
  go: 'bg-blue-900/50 text-blue-300',
  'java-spring': 'bg-orange-900/50 text-orange-300',
}

function Badge({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${className}`}>{label}</span>
  )
}

export function ArchitectureTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['architecture-diagram']
  const doc = compileResult?.document
  const mmd = getFileContent(result, '.mmd')

  const frontends = doc?.architecture?.projects?.frontend ?? []
  const backends = doc?.architecture?.projects?.backend ?? []
  const mobiles = doc?.architecture?.projects?.mobile ?? []
  const style = doc?.architecture?.style
  const cloud = doc?.deployment?.cloud
  const authStrategy = doc?.auth?.strategy
  const authProvider = doc?.auth?.provider
  const slos = doc?.slos?.services ?? []

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Architecture</h2>
        <div className="flex items-center gap-2">
          {style && <Badge label={style} className="bg-slate-800 text-slate-300" />}
          {cloud && <Badge label={cloud} className="bg-blue-900/40 text-blue-300" />}
          {result && <TierBadge tier={result.tier} />}
        </div>
      </div>

      {/* Diagram */}
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4 min-h-48">
        <MermaidDiagram content={mmd} />
      </div>

      {/* Service cards */}
      {(frontends.length > 0 || backends.length > 0 || mobiles.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400">Projects</h3>
          <div className="grid grid-cols-2 gap-2">
            {frontends.map((fe) => (
              <div key={fe.name} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{fe.name}</span>
                  <Badge label="frontend" className="bg-slate-700/60 text-slate-400 text-xs" />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge label={fe.framework} className={FRAMEWORK_COLORS[fe.framework] ?? 'bg-slate-700 text-slate-300'} />
                  {fe.rendering && <Badge label={fe.rendering} className="bg-slate-700/60 text-slate-400" />}
                </div>
              </div>
            ))}
            {backends.map((be) => (
              <div key={be.name} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{be.name}</span>
                  <Badge label={be.type ?? 'backend'} className="bg-slate-700/60 text-slate-400 text-xs" />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge label={be.framework} className={FRAMEWORK_COLORS[be.framework] ?? 'bg-slate-700 text-slate-300'} />
                  {be.apiStyle && <Badge label={be.apiStyle} className="bg-slate-700/60 text-slate-400" />}
                  {be.orm && <Badge label={be.orm} className="bg-indigo-900/50 text-indigo-300" />}
                </div>
              </div>
            ))}
            {mobiles.map((mo) => (
              <div key={mo.name} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{mo.name}</span>
                  <Badge label="mobile" className="bg-slate-700/60 text-slate-400 text-xs" />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge label={mo.framework} className={FRAMEWORK_COLORS[mo.framework] ?? 'bg-slate-700 text-slate-300'} />
                  <Badge label={mo.platform} className="bg-slate-700/60 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auth + SLOs row */}
      <div className="grid grid-cols-2 gap-3">
        {authStrategy && authStrategy !== 'none' && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1.5">Auth</p>
            <div className="flex flex-wrap gap-1">
              <Badge label={authStrategy} className="bg-green-900/40 text-green-300" />
              {authProvider && <Badge label={authProvider} className="bg-slate-700 text-slate-300" />}
            </div>
          </div>
        )}
        {slos.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1.5">SLOs</p>
            <div className="space-y-1">
              {slos.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">{svc.name}</span>
                  <div className="flex gap-2">
                    {svc.availability && <span className="text-green-400">{svc.availability}%</span>}
                    {svc.latencyP95 && <span className="text-blue-400">p95 {svc.latencyP95}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
