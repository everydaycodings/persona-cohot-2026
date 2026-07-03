"use client"

import { useRef, useState } from "react"
import { PaperPlaneRight } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

// Auto-growing chat input. Enter sends, Shift+Enter makes a newline.
export function Composer({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder: string
}) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  function grow() {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue("")
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto"
    })
  }

  return (
    <div className="bg-card/80 flex items-end gap-2 rounded-2xl border border-[var(--border)] p-2 backdrop-blur focus-within:border-[color-mix(in_srgb,var(--accent-persona)_45%,transparent)]">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value)
          grow()
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[0.95rem] outline-none placeholder:text-[var(--muted-foreground)]"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl transition-all",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent-persona)] focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        style={{
          background: "linear-gradient(150deg, var(--accent-persona), var(--accent-deep))",
          color: "#14110e",
        }}
      >
        <PaperPlaneRight size={17} weight="fill" />
      </button>
    </div>
  )
}
