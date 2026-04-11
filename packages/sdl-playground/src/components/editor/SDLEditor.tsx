import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { lintGutter } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { useCallback } from 'react'
import { useSDLStore } from '../../store/sdlStore'
import { sdlLinter } from './sdlLinter'

export function SDLEditor() {
  const { yaml: yamlContent, setYaml } = useSDLStore()

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
      />
    </div>
  )
}
