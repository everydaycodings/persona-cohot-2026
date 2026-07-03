"use client"

import { PERSONA_LIST, type PersonaId } from "@/lib/personas"
import { cn } from "@/lib/utils"
import { PersonaAvatar } from "@/components/chat/persona-avatar"

// The "now speaking" nameplate. Flipping it re-tints the whole room (the accent
// wash is driven by the [data-persona] attribute set on the app root).
export function PersonaSwitcher({
  active,
  onChange,
}: {
  active: PersonaId
  onChange: (id: PersonaId) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Choose who you're talking to"
      className="bg-card/60 flex gap-1 rounded-2xl border border-[var(--border)] p-1 backdrop-blur"
    >
      {PERSONA_LIST.map((p) => {
        const isActive = p.id === active
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(p.id)}
            data-persona={p.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--accent-persona)]",
              isActive
                ? "bg-[color-mix(in_srgb,var(--accent-persona)_14%,transparent)]"
                : "opacity-55 hover:opacity-90",
            )}
            style={
              isActive
                ? { boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent-persona) 40%, transparent)" }
                : undefined
            }
          >
            <PersonaAvatar persona={p} size={34} active={isActive} />
            <span className="hidden min-w-0 sm:block">
              <span className="font-display block truncate text-sm leading-tight font-semibold">
                {p.name}
              </span>
              <span className="block truncate text-[11px] text-[var(--muted-foreground)]">
                {isActive ? p.status : p.title}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
