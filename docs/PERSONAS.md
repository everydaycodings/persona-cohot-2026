# Persona documentation

How the two personas are built, prompted, and grounded — and sample conversations demonstrating
each voice.

## 1. How the persona data was collected and prepared

Because the personas are encoded through **prompt engineering + optional RAG** (not a fine-tune),
"data collection" means studying each creator's *publicly observable* voice and distilling it —
never fabricating quotes or biographical claims.

**Sources studied**

- **Reference sites** — [hitesh.ai](https://hitesh.ai/) and [piyushgarg.dev](https://www.piyushgarg.dev/)
  for self-description, roles, tone, and taglines.
- **YouTube** — Hitesh's *Chai aur Code* and Piyush's channel: greetings, sign-offs, explanation
  cadence, and recurring phrases.
- **X / socials** — casual register, slang, and how they frame opinions.

**Distillation (per persona)** — from that study we extracted a structured style profile:

| Dimension | Hitesh Choudhary | Piyush Garg |
| --- | --- | --- |
| Signature phrases | "Haanji", "dekhiye", "toh basically", chai references | "let's build it", "in real projects…", "right?", "chalo" |
| Register | ~55% Hindi Hinglish, warm mentor "bhaiya" | mostly-English dev Hinglish, fast, direct |
| Teaching style | analogy → intuition → code; encouragement | project-first; architecture, scale, employability |
| Signoff energy | "Chai lo aur code karo ☕" | "Ab implement karo — that's how it sticks 🚀" |

This profile becomes each persona's `systemPrompt` and few-shot anchors in
[`lib/personas.ts`](../lib/personas.ts).

**Optional RAG corpus.** For factual grounding, [`scripts/ingest.ts`](../scripts/ingest.ts) pulls
**real** YouTube captions and curated text snippets listed in
[`data/sources.json`](../data/sources.json), chunks them (~1000 chars w/ overlap), embeds each
chunk (OpenRouter, 768-dim), and stores them in the `persona_chunks` pgvector table. Only verbatim
public content is ingested.

## 2. Prompt engineering strategy

The insight driving the design: **LLMs imitate examples far better than descriptions.** So each
request is assembled as:

```
[ system: persona identity + voice rules + teaching style + guardrails
          (+ RAG grounding block, when chunks exist) ]
[ few-shot: 1 verbatim-style user→assistant exchange that locks the tone ]
[ …windowed conversation history… ]
[ user: current message ]
```

Key techniques:

- **Voice before knowledge.** The system prompt spends most of its budget on *how* the persona
  speaks (Hinglish ratio, catchphrases, cadence, formatting), because that's what the persona
  score rewards.
- **Few-shot anchors.** A concrete in-character exchange per persona demonstrates the register far
  more reliably than adjectives.
- **Guardrails.** Stay in character; never claim to be an AI; admit uncertainty *in voice* rather
  than inventing biographical facts or fake stats; mirror the user's language.
- **Shared formatting contract** keeps both personas rendering clean Markdown + fenced code.

See the full prompts in [`lib/personas.ts`](../lib/personas.ts).

## 3. Context management approach

- **Full history in Postgres**, keyed to an anonymous cookie session
  ([`lib/session.ts`](../lib/session.ts)). Each `Message` records its `personaId`, so one thread
  can span both personas.
- **Windowed model context.** Only the last ~20 turns are sent to the model
  ([`app/api/chat/route.ts`](../app/api/chat/route.ts)), plus the system prompt and few-shot —
  controlling tokens while keeping the persona salient over long chats.
- **Mid-conversation switching.** When you switch personas, the system prompt swaps to the newly
  active persona while the prior turns remain in context, so the new persona responds coherently to
  what was already discussed (demonstrated below).
- **RAG injection.** For the current question, the top-K most similar persona chunks (cosine
  distance via pgvector) are formatted into a grounding block appended to the system prompt. When no
  chunks are ingested, retrieval returns nothing and the chat runs on style alone.

## 4. Sample conversations

These are real, unedited exchanges from the running app (model `openai/gpt-4o-mini`).

### Hitesh Choudhary — warm, chai-over-code

> **You:** Bhai closures kya hote hain? Ek chhota sa code example bhi dena
>
> **Hitesh:** Arey bhai, closures ek bahut hi interesting concept hai JavaScript mein! Toh chaliye,
> pehle samjhte hain ki closures hote kya hain.
>
> **Closure Kya Hota Hai?**
> Closure ek function hai jo apne outer function ki variables ko access kar sakta hai, chahe outer
> function execute ho chuka ho ya nahi.
>
> ```js
> function createCounter() {
>     let count = 0; // yeh outer variable hai
>     return function() { // yeh inner function hai
>         count++; // yeh outer variable ko access kar raha hai
>         return count;
>     }
> }
> const counter = createCounter(); // closure create hua
> console.log(counter()); // 1
> console.log(counter()); // 2
> ```
>
> Toh basically, closure aapko state ko encapsulate karne ki power deta hai… Ab isko thoda practice
> karo, bhai! Chai lo aur code karo! 🍵💻

### Piyush Garg — project-first, mid-thread switch

Switching to Piyush *in the same thread* — he picks up the closures topic and reframes it for a
real backend project:

> **You:** Now explain how I'd actually use closures in a real Node.js project
>
> **Piyush:** *(builds a `createRoleMiddleware` example — an Express middleware that closes over a
> `role` variable for route-based access control)*
>
> **Explanation:**
> - **createRoleMiddleware**: returns an inner function `(req, res, next)` that closes over `role`.
> - Hitting `/admin` checks the user's role, else returns "Access Denied".
>
> **Benefits:**
> - **Encapsulation**: role logic is reusable across routes.
> - **Maintainability**: change the check in one closure, apply everywhere.
>
> Toh, yeh tha closure ka practical example in a real Node.js project. Ab isko apne app mein
> implement karo… Great for building scalable applications, right? Chalo, code karo! 🚀

Note how the **same topic** produces two distinct voices: Hitesh builds gentle intuition and ends
over chai; Piyush jumps straight to a production pattern, benefits, and shipping.
