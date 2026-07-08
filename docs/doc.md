# StoreHause Website Builder — User Story

**Audience:** Small business owners with little or no web design experience  
**Goal:** Launch a professional online shop in minutes by chatting, not configuring  
**Last updated:** June 2026

---

## Who is this for?

A shop owner who sells candles, clothes, skincare, food, or services. They want:

- A website that looks good on phone and desktop
- Clear words that explain what they sell
- A place customers can browse and buy
- No need to learn themes, page builders, or code

They are busy. They think in plain language: *“I sell handmade candles to people who want cozy gifts.”* They do not think in *“hero sections,” “CTAs,”* or *“template IDs.”*

---

## What the merchant actually wants

| They say | What they mean |
|----------|----------------|
| “I need a website” | A real shop online, not a blank page |
| “Make it warm and simple” | Colors, words, and layout that feel right for their brand |
| “I sell to busy moms / young professionals” | The site should speak to those people |
| “Build my website” | Stop asking questions — show me something I can use |
| “Change the headline” | Fix one thing without breaking everything else |
| “Can I see it on my phone?” | Preview before going live |

**Success looks like:** sign up → describe the business → see a live preview → tweak with chat → add products → publish.

Target time: **5–10 minutes** to a usable draft.

---

## The journey in four steps

The progress bar in the builder mirrors what the merchant experiences:

```text
1. Your business  →  2. Designing  →  3. Building  →  4. Preview
```

### Step 1 — Your business

The merchant opens **AI Website Builder** and describes their shop in everyday language.

**Example prompts they might use:**

- “I sell handmade soy candles in Lagos. Warm, cozy, gift-friendly.”
- “Men’s streetwear brand for people who like bold colors.”
- “Skincare for busy professionals — clean, premium, not flashy.”

The AI listens for:

- Business name (or enough to infer one)
- What they sell
- Who it is for
- The vibe (warm, luxury, playful, minimal, etc.)

It does **not** ask for technical setup. No “pick a theme” or “configure your DNS.”

### Step 2 — Designing

Once the AI understands the basics, it picks a design direction that fits the business — quietly, in the background. The merchant never has to choose from a technical template list unless they want to.

The AI confirms in simple terms: *“Got it — I’ll build something warm and simple for your candle shop.”*

### Step 3 — Building

When the merchant is ready (often by saying **“build my website”**), the AI generates:

- Homepage headline and intro
- About section
- FAQs
- SEO title and description
- Starter product placeholders
- Navigation (Home, Shop, About, Contact)

The preview updates on the right as the site is built.

### Step 4 — Preview and refine

The merchant sees their site in the preview panel. They refine it by chatting:

- “Make the homepage more premium.”
- “Change the button to Shop the Collection.”
- “Rewrite the about section — we’re a family business.”

Each change updates the preview. When they are happy, they move on to products and publishing.

---

## How the AI should talk

### Tone

- Warm, confident, and short
- Like a helpful shop consultant, not a developer
- One question at a time when something is missing
- Celebrate progress: *“Your website draft is ready — take a look on the right.”*

### Do

- Use the merchant’s words back to them (“cozy candle shop,” “bold streetwear”)
- Explain the next step clearly (“Tell me your business name and what you sell” → later: “Say build my website when you’re ready”)
- Show progress in human terms (“Designing your website,” “Building your website”)
- Offer example phrases they can copy (“Try: Make the headline more premium”)

### Do not

- Mention templates, themes, JSON, agents, or tools
- Overwhelm with options (“Choose from 12 layouts…”)
- Ask for information the platform can infer (industry, tone from their description)
- Use jargon: hero, CTA, conversion funnel, storefront snapshot

### Example conversation

```text
AI:    Hi! Tell me about your business — what you sell, who it’s for,
       and the vibe you want. I’ll design and build your website.

User:  I sell handmade candles. Warm and simple. Mostly gifts.

AI:    Perfect — a warm, gift-friendly candle shop. What’s the name
       of your business?

User:  Glow & Wick

AI:    Love it. Say “build my website” whenever you’re ready and I’ll
       create your first draft.

User:  build my website

AI:    Your website draft is ready. Check the preview — tell me anything
       you’d like to change.

User:  Change the button to Shop Gifts

AI:    Done — the button now says Shop Gifts.
```

---

## What the AI does behind the scenes (simple view)

The merchant only sees chat + preview. Under the hood, a small team of helpers works in order:

```text
Merchant message
      │
      ▼
┌─────────────┐
│ Interpreter │  “What do they want?”
└──────┬──────┘
       ▼
┌─────────────┐
│   Planner   │  “What steps and tools do we need?”
└──────┬──────┘
       ▼
┌─────────────┐
│  Executor   │  Calls tools (capture details, design, generate, refine)
└──────┬──────┘
       ▼
┌─────────────┐
│   Critic    │  “Are we done, or do we need the merchant?”
└──────┬──────┘
       ▼
Reply + updated preview
```

The merchant sees friendly **Progress** cards in chat (e.g. “Designing your website ✓”), not tool names.

---

## Tools the AI can call

These are the actions the AI uses. Each maps to something the merchant understands.

| Tool | When the AI uses it | What the merchant sees |
|------|---------------------|-------------------------|
| **`capture_business_details`** | First messages; whenever they share name, products, industry, colors, or tone | “Learning about your business” |
| **`ask_clarifying_question`** | Something important is missing (usually business name or what they sell) | A single, simple question in chat |
| **`design_website`** | Enough business context exists; AI picks the best visual direction | “Designing your website” |
| **`generate_website`** | Merchant says build / go ahead / create my site | “Building your website” + preview appears |
| **`refine_website_copy`** | Site already exists; merchant asks to change headline, about text, CTA, SEO, etc. | “Refining website copy” + preview updates |

### Tool flow for a new merchant

```text
1. capture_business_details     ← from their first description
2. ask_clarifying_question      ← only if name or offer is still unclear
3. design_website               ← pick look & feel (hidden from merchant)
4. generate_website             ← when they say “build my website”
```

### Tool flow after the site exists

```text
refine_website_copy             ← “Change the headline to …”
```

The AI should **not** call `generate_website` again unless the merchant explicitly asks to rebuild from scratch.

---

## Decision rules (keep it simple for the AI)

| Situation | AI behavior |
|-----------|-------------|
| Greeting or small talk (“hi”, “thanks”) | Reply warmly; remind them what to share next |
| Vague first message | Ask **one** clarifying question |
| Clear business description | Capture details; invite them to say “build my website” |
| “Build my website” / “go ahead” / “create it” | Design (if needed) → generate → show preview |
| Site already built + change request | Refine copy; confirm what changed |
| Missing business name or description | Do **not** generate yet — ask first |

**Minimum before building:**

- Business name
- Short description of what they sell (at least a sentence)

---

## What gets created

When `generate_website` runs, the platform produces a **store JSON** — the single source of truth for the live site. It includes:

| Area | Examples |
|------|----------|
| **Brand** | Primary color, typography feel |
| **Homepage** | Headline, subheadline, button label, value props |
| **About** | Brand story |
| **FAQs** | Shipping, returns, common questions |
| **SEO** | Page title and meta description |
| **Products** | Starter items (names, prices, placeholders) |
| **Navigation** | Home, Shop, About, Contact |

The preview panel renders this JSON. Chat edits update the same JSON — no duplicate “website” somewhere else.

---

## After the website draft

The builder is step one. The full merchant journey continues:

1. **Review preview** — mobile and desktop
2. **Add real products** — manual entry, CSV, or images (future: WhatsApp catalog)
3. **Connect payments** — when ready to sell
4. **Publish** — go live on their StoreHause URL or custom domain

The AI builder focuses on **steps 1–2 of creation** (business + website). Products and payments are separate screens, but the tone stays the same: plain language, no jargon.

---

## Principles for small businesses

1. **Chat is the interface** — if they can text a friend, they can build a site.
2. **Preview is the proof** — every build and edit should show up immediately on the right.
3. **One thing at a time** — one question, one change, one clear next step.
4. **Hide the machinery** — no templates, tools, or agents in merchant-facing copy.
5. **Safe to experiment** — clear chat, try again, refine until it feels right.
6. **Fast first win** — first draft in one session; polish over time.

---

## Summary

A small business owner wants a website that looks professional and matches their brand, without learning web design. They describe their business in chat; the AI captures details, designs quietly, builds the site when asked, and refines it from follow-up messages. Five tools handle the work; four agent stages keep the flow reliable; the merchant only sees friendly progress and a live preview.

**Their mental model:** *“I told the AI about my shop, it built my website, I asked for tweaks, and it updated.”*

That is the experience StoreHause should deliver.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [website-builder-inventory.md](./website-builder-inventory.md) | Full file inventory for manual review (~230 files across repos) |
| [builder-ai-acceptance-criteria.md](./builder-ai-acceptance-criteria.md) | Testable checklist for AI voice, tools, and golden-path QA |
| [modular-storefront-roadmap.md](./modular-storefront-roadmap.md) | Phased plan for block-based AI generation and editing (About, Contact, forms, homepage sections) |
| `src/lib/storefront-builder/copy.ts` | Merchant-facing onboarding copy used in the builder UI |
| `src/lib/storefront-builder/prompts.ts` | Shared AI voice and tool rules for agent system prompts |
