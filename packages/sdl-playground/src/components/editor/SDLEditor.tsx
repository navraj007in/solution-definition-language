import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { lintGutter } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { useCallback, useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { useSDLStore } from '../../store/sdlStore'
import { sdlLinter } from './sdlLinter'

export function SDLEditor() {
  const { yaml: yamlContent, setYaml } = useSDLStore()
  const viewRef = useRef<EditorView | null>(null)

  // Listen for jump-to-line events from status bar
  useEffect(() => {
    const handler = (e: Event) => {
      const { line } = (e as CustomEvent<{ line: number }>).detail
      const view = viewRef.current
      if (!view) return
      const doc = view.state.doc
      if (line >= doc.lines) return
      const pos = doc.line(line + 1).from
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      })
      view.focus()
    }
    window.addEventListener('sdl:jump-to-line', handler)
    return () => window.removeEventListener('sdl:jump-to-line', handler)
  }, [])

  const onChange = useCallback(
    (val: string) => setYaml(val),
    [setYaml],
  )

  return (
    <div className="h-full overflow-hidden">
      <CodeMirror
        value={yamlContent}
        height="100%"
        theme={oneDark}
        extensions={[yaml(), lintGutter(), sdlLinter]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: false,
          foldKeymap: true,
          completionKeymap: false,
          lintKeymap: true,
        }}
        style={{ height: '100%', fontSize: '13px' }}
        onCreateEditor={(view) => { viewRef.current = view }}
      />
    </div>
  )
}
