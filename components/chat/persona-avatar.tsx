import { cn } from "@/lib/utils"
import type { Persona } from "@/lib/personas"

// Monogram avatar tinted with the persona's own accent — no external images,
// no licensing concerns.
export function PersonaAvatar({
  persona,
  size = 40,
  active = true,
  className,
}: {
  persona: Persona
  size?: number
  active?: boolean
  className?: string
}) {
  return (
    <span
      data-persona={persona.id}
      aria-hidden
      className={cn(
        "font-display inline-grid shrink-0 place-items-center rounded-full font-semibold select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        color: active ? "#14110e" : "var(--accent-persona)",
        background: active
          ? "linear-gradient(150deg, var(--accent-persona), var(--accent-deep))"
          : "color-mix(in srgb, var(--accent-persona) 14%, transparent)",
        boxShadow: active
          ? "0 6px 20px -8px var(--accent-persona)"
          : "inset 0 0 0 1px color-mix(in srgb, var(--accent-persona) 35%, transparent)",
      }}
    >
      {persona.initials}
    </span>
  )
}
