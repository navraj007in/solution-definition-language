import { useState, useRef, useEffect } from 'react'
import { getTemplates } from '@arch0/sdl'
import { useSDLStore } from '../../store/sdlStore'

const STAGE_COLORS: Record<string, string> = {
  MVP: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  Growth: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
  Enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
}

export function TemplatePicker() {
  const [open, setOpen] = useState(false)
  const { setYaml } = useSDLStore()
  const ref = useRef<HTMLDivElement>(null)
  const templates = getTemplates()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const load = (yaml: string) => {
    setYaml(yaml)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
      >
        Templates
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <p className="text-xs text-slate-500 px-2">Load a starter template</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => load(t.yaml)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-slate-200 font-medium">{t.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${STAGE_COLORS[t.stage]}`}>
                    {t.stage}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
