import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { useState } from 'react'

interface Props {
  content: string
  language?: string
  maxHeight?: string
}

export function CodeBlock({ content, language = 'yaml', maxHeight = '100%' }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-slate-700/50">
      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div style={{ maxHeight, overflow: 'auto' }}>
        <SyntaxHighlighter
          language={language}
          style={atomOneDark}
          customStyle={{ margin: 0, background: '#0d1117', fontSize: '0.8rem', lineHeight: '1.5' }}
          showLineNumbers
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
