import { useState } from 'react'
import { useSDLStore } from '../../store/sdlStore'
import { CodeBlock } from '../shared/CodeBlock'
import { TierBadge } from '../shared/TierBadge'
import type { GeneratedFile } from '@arch0/sdl'

function buildTree(files: GeneratedFile[]): Map<string, GeneratedFile[]> {
  const dirs = new Map<string, GeneratedFile[]>()
  for (const file of files) {
    const parts = file.path.split('/')
    const dir = parts.slice(0, -1).join('/') || '.'
    if (!dirs.has(dir)) dirs.set(dir, [])
    dirs.get(dir)!.push(file)
  }
  return dirs
}

function langFromPath(path: string): string {
  const ext = path.split('.').pop() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown',
    py: 'python', cs: 'csharp', go: 'go', java: 'java',
    sh: 'bash', dockerfile: 'dockerfile', toml: 'toml',
  }
  return map[ext.toLowerCase()] ?? 'plaintext'
}

export function ScaffoldTab() {
  const { artifacts, compileResult } = useSDLStore()
  const result = artifacts?.['repo-scaffold']
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)

  const files = result?.files ?? []
  const metadata = result?.metadata as any
  const projectCount: number = metadata?.projectCount ?? 0

  const tree = buildTree(files)
  const dirs = Array.from(tree.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (!selectedFile && files.length > 0) {
    // Auto-select first file
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* File tree */}
      <div className="w-56 shrink-0 border-r border-slate-700/50 overflow-y-auto bg-slate-900/50">
        <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">{files.length} files</span>
          {result && <TierBadge tier={result.tier} />}
        </div>

        {dirs.map(([dir, dirFiles]) => (
          <div key={dir}>
            <div className="px-3 py-1.5 text-xs text-slate-500 font-mono bg-slate-800/30 border-b border-slate-700/30 truncate">
              {dir === '.' ? '/' : dir.replace('artifacts/repos/', '')}
            </div>
            {dirFiles.map(file => {
              const name = file.path.split('/').pop() ?? file.path
              const isSelected = selectedFile?.path === file.path
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-4 py-1 text-xs font-mono truncate transition-colors ${
                    isSelected
                      ? 'bg-blue-900/40 text-blue-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title={file.path}
                >
                  {name}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* File viewer */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {selectedFile ? (
          <>
            <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/50 flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 truncate">{selectedFile.path}</span>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <CodeBlock
                content={selectedFile.content}
                language={langFromPath(selectedFile.path)}
                maxHeight="100%"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
            {files.length === 0 ? (
              compileResult?.success ? 'Generating…' : 'Fix errors to see scaffold'
            ) : (
              <>
                <span>Select a file to view</span>
                <span className="text-xs text-slate-600">{projectCount} project{projectCount !== 1 ? 's' : ''} scaffolded</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
