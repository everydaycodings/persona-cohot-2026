"use client"

import { useEffect, useRef, useState } from "react"
import { Broom } from "@phosphor-icons/react"

import { getPersona, PERSONAS, type PersonaId } from "@/lib/personas"
import { cn } from "@/lib/utils"
import { Composer } from "@/components/chat/composer"
import { Markdown } from "@/components/chat/markdown"
import { PersonaAvatar } from "@/components/chat/persona-avatar"
import { PersonaSwitcher } from "@/components/chat/persona-switcher"

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  personaId: PersonaId
  content: string
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [active, setActive] = useState<PersonaId>("hitesh")
  const [streaming, setStreaming] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Rehydrate the conversation for this anonymous session on load.
  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        const history: ChatMsg[] = (data.messages ?? []).map(
          (m: { id: string; role: string; personaId: string; content: string }) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            personaId: (m.personaId as PersonaId) ?? "hitesh",
            content: m.content,
          }),
        )
        setMessages(history)
        const last = history[history.length - 1]
        if (last) setActive(last.personaId)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, streaming])

  async function send(text: string) {
    if (streaming) return
    const persona = active
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      personaId: persona,
      content: text,
    }
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", personaId: persona, content: "" },
    ])
    setStreaming(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona, message: text }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Kuch gadbad ho gayi. Thodi der baad try karo." }))
        patch(assistantId, data.error ?? "Something went wrong.")
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        patch(assistantId, acc)
      }
    } catch {
      patch(assistantId, "Network issue — ek baar phir try karo.")
    } finally {
      setStreaming(false)
    }
  }

  function patch(id: string, content: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
  }

  async function clearChat() {
    if (streaming) return
    if (!confirm("Clear this conversation? This can't be undone.")) return
    setMessages([])
    await fetch("/api/messages", { method: "DELETE" }).catch(() => {})
  }

  const persona = getPersona(active)
  const isEmpty = loaded && messages.length === 0

  return (
    <div
      data-persona={active}
      className="relative flex h-dvh flex-col overflow-hidden bg-background"
    >
      {/* Ambient accent glow that shifts with the active persona. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-40"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--accent-persona) 22%, transparent), transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold tracking-tight">
            Office Hours
          </span>
          <span className="hidden text-[11px] text-[var(--muted-foreground)] md:inline">
            — chat with your dev teacher
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              disabled={streaming}
              title="Clear conversation"
              className="text-muted-foreground hover:text-foreground ml-1 flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] transition-colors hover:border-[color-mix(in_srgb,var(--accent-persona)_45%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-persona)] focus-visible:outline-none disabled:opacity-40"
            >
              <Broom size={13} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
        <PersonaSwitcher active={active} onChange={setActive} />
      </header>

      {/* Conversation */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          {isEmpty ? (
            <IntroCard personaId={active} onStarter={send} />
          ) : (
            <div className="space-y-5 py-4">
              {messages.map((m) => (
                <MessageRow key={m.id} msg={m} streaming={streaming} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer */}
      <footer className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-2 pb-4">
        <Composer
          onSend={send}
          disabled={streaming}
          placeholder={
            active === "hitesh"
              ? "Haanji, kya seekhna hai aaj? Chai ready hai ☕"
              : "What are we building today? Ask away…"
          }
        />
        <p className="mt-2 text-center text-[10.5px] text-[var(--muted-foreground)]">
          AI impression of {persona.name} for learning — not the real person.
        </p>
      </footer>
    </div>
  )
}

function MessageRow({ msg, streaming }: { msg: ChatMsg; streaming: boolean }) {
  const persona = getPersona(msg.personaId)
  const isUser = msg.role === "user"
  const isThinking = !isUser && msg.content === "" && streaming

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--secondary)] px-4 py-2.5 text-[0.95rem] whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div data-persona={msg.personaId} className="flex gap-3">
      <PersonaAvatar persona={persona} size={34} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold">{persona.name}</span>
          <span className="text-[11px] text-[var(--muted-foreground)]">{persona.handle}</span>
        </div>
        {isThinking ? <TypingDots /> : <Markdown content={msg.content} />}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-[var(--accent-persona)]"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function IntroCard({
  personaId,
  onStarter,
}: {
  personaId: PersonaId
  onStarter: (text: string) => void
}) {
  const persona = PERSONAS[personaId]
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center sm:py-16">
      <PersonaAvatar persona={persona} size={76} />
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {persona.name}
        </h1>
        <p className="text-sm text-[var(--accent-persona)]">{persona.title}</p>
        <p className="mx-auto max-w-md text-sm text-[var(--muted-foreground)]">
          {persona.tagline}
        </p>
      </div>

      <div className="mt-2 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {persona.starters.map((s) => (
          <button
            key={s}
            onClick={() => onStarter(s)}
            className={cn(
              "rounded-xl border border-[var(--border)] px-3.5 py-3 text-left text-sm transition-colors",
              "hover:border-[color-mix(in_srgb,var(--accent-persona)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-persona)_8%,transparent)]",
              "focus-visible:ring-2 focus-visible:ring-[var(--accent-persona)] focus-visible:outline-none",
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
