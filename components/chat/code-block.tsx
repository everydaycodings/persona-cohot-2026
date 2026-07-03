"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "@phosphor-icons/react"
import { codeToHtml } from "shiki"

// Syntax-highlighted code block with a copy button. Highlighting runs async via
// shiki; until it resolves we show a plain (still readable) fallback.
export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    codeToHtml(code, { lang: lang || "text", theme: "vesper" })
      .then((out) => alive && setHtml(out))
      .catch(() => {
        // Unknown language → retry as plain text.
        codeToHtml(code, { lang: "text", theme: "vesper" })
          .then((out) => alive && setHtml(out))
          .catch(() => alive && setHtml(null))
      })
    return () => {
      alive = false
    }
  }, [code, lang])

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group/code relative my-3">
      <div className="text-muted-foreground bg-card/80 flex items-center justify-between rounded-t-xl border border-b-0 border-[var(--border)] px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase">
        <span>{lang || "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {html ? (
        <div
          className="[&>pre]:rounded-t-none [&>pre]:border-t-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 border-[var(--border)] bg-[#0f0d0b] p-4 font-mono text-[0.82rem]">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
