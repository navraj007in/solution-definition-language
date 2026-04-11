import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: Props) {
  // Strip advisory header if present
  const cleaned = content.replace(/^<!--.*?-->\n\n/s, '')

  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-slate-100 mb-3 mt-5 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold text-slate-200 mb-2 mt-4 border-b border-slate-700 pb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-300 mb-1 mt-3">{children}</h3>,
          p: ({ children }) => <p className="text-slate-300 text-sm mb-2">{children}</p>,
          li: ({ children }) => <li className="text-slate-300 text-sm">{children}</li>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            return isBlock
              ? <code className="block bg-slate-900 rounded p-3 text-xs font-mono text-slate-300 overflow-auto mb-2">{children}</code>
              : <code className="bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-blue-300">{children}</code>
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-600 pl-3 text-slate-400 italic text-sm">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="text-left text-slate-400 font-medium px-3 py-1.5 border-b border-slate-700 bg-slate-800/50 text-xs">{children}</th>,
          td: ({ children }) => <td className="text-slate-300 px-3 py-1.5 border-b border-slate-800 text-xs">{children}</td>,
          a: ({ href, children }) => <a href={href} className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          hr: () => <hr className="border-slate-700 my-4" />,
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  )
}
