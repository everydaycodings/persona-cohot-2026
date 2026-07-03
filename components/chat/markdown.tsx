import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { CodeBlock } from "@/components/chat/code-block"

// Renders assistant markdown: paragraphs, lists, links, and fenced code blocks
// (via shiki). Inline code stays inline; multi-line/tagged code becomes a
// highlighted CodeBlock.
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-chat text-[0.95rem] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 ml-1 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-1 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="text-foreground font-semibold">{children}</strong>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-persona)] underline underline-offset-2"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h3 className="font-display mt-4 mb-2 text-lg font-semibold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-display mt-4 mb-2 text-base font-semibold">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="font-display mt-3 mb-1.5 text-base font-semibold">{children}</h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[var(--accent-persona)] pl-3 text-[var(--muted-foreground)] italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const text = String(children ?? "")
            const match = /language-(\w+)/.exec(className || "")
            const isBlock = Boolean(match) || text.includes("\n")
            if (isBlock) {
              return <CodeBlock code={text.replace(/\n$/, "")} lang={match?.[1] ?? "text"} />
            }
            return <code>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
