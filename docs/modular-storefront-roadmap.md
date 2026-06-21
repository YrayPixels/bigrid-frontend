# Modular Storefront Roadmap

**Audience:** Engineering, product  
**Status:** Phase 4 complete (AI block ops + catalog grid) · Home: cosmetics uses blocks; other templates keep bespoke designs  
**Last updated:** June 2026

This doc describes how StoreHause moves from flat copy fields and hard-coded templates to **block-based storefronts** that the AI can generate and edit down to individual sections — including About, Contact (with forms), FAQ, and homepage modules.

See also: [arch.md](./arch.md) (component registry vision), [doc.md](./doc.md) (merchant user story), [builder-ai-acceptance-criteria.md](./builder-ai-acceptance-criteria.md) (QA checklist).

---

## Problem

Generation and chat edits only touch a flat copy model (`hero`, `about`, `seo`, two images). Template shells still hard-code nav, stats, trust blocks, and FAQ fallbacks in React.

`pages.contact`, `pages.faq`, and `value_props` already exist in storefront JSON and are generated on first build — but the builder chat cannot edit them today (`EDITABLE_PATHS` lists 9 paths only).

**Goal:** AI generates and edits storefronts down to modular blocks without writing React.

---

## Current vs target

| Today | Target |
|-------|--------|
| 9 editable dot-paths in chat | Patch operations on a block tree |
| Template-specific page components (`cosmetics-home.tsx`, etc.) | One `PageRenderer` + component registry |
| Contact = plain text page | `contact_form` block with configurable fields |
| Hard-coded nav / stats in shells | `navigation` + `pages[].blocks[]` in JSON |

```text
Merchant chat
     │
     ▼
Generate (full block tree)  /  Edit (patch ops)
     │
     ▼
Validated StorefrontContent (pages[].blocks[])
     │
     ▼
ComponentRegistry[block.type] → React
```

---

## Target schema (v2 direction)

Pages become ordered blocks instead of fixed top-level fields:

```typescript
type StorefrontBlock =
  | { id: string; type: "hero"; props: { headline: string; subheadline: string; cta_label: string; image_url?: string } }
  | { id: string; type: "stats_row"; props: { items: { value: string; label: string }[] } }
  | { id: string; type: "feature_grid"; props: { items: { icon?: string; title: string; body: string }[] } }
  | { id: string; type: "faq"; props: { title: string; items: { question: string; answer: string }[] } }
  | { id: string; type: "rich_text"; props: { title: string; body: string; image_url?: string } }
  | { id: string; type: "contact_form"; props: { title: string; intro: string; fields: FormField[]; submit_label: string } }
  | { id: string; type: "product_grid"; props: { title?: string; limit?: number } };

type StorefrontPage = {
  slug: "home" | "about" | "contact" | "faq" | string;
  title: string;
  blocks: StorefrontBlock[];
};
```

AI edit operations (instead of flat path strings):

```json
{
  "operations": [
    { "op": "update_block", "page": "contact", "block_id": "c1", "props": { "intro": "We reply within 24 hours." } },
    { "op": "add_block", "page": "about", "after": "a1", "block": { "type": "feature_grid", "props": {} } },
    { "op": "reorder_blocks", "page": "home", "order": ["h1", "f1", "p1"] },
    { "op": "remove_block", "page": "home", "block_id": "s1" }
  ]
}
```

Apply ops server-side with validation against a **block catalog** (allowed types, max blocks, required props).

---

## Phase 1 — Unblock editing (1–2 weeks)

**Outcome:** Chat can edit About, Contact, FAQ, and value props using the existing model — no full block rewrite yet.

| # | Task | Repos |
|---|------|-------|
| M1.1 | Expand `EDITABLE_PATHS` to include `pages.contact.*`, `pages.faq.*`, `pages.about.*`, `value_props.*` | backend, storehause |
| M1.2 | Pass full `pages`, `value_props`, and FAQ into `applyChatEdit` AI context (today only `hero`, `about`, `seo`) | backend |
| M1.3 | Keep `about.*` ↔ `pages.about.*` in sync on every edit | backend, storehause |
| M1.4 | Replace hard-coded nav/stats in template shells with data from storefront JSON (or `value_props` as interim) | storehause |
| M1.5 | Update `describeStorefrontEdit` labels for all new paths | backend, storehause |
| M1.6 | Extend builder acceptance criteria for contact/FAQ/value-prop edits | docs |

**Acceptance:** Merchant can say *“Update the contact page intro”* or *“Add a fourth FAQ about returns”* and see the preview change.

**Key files today:**

- `storehausebackend/app/Services/StorefrontBuilderService.php` — `EDITABLE_PATHS`, `synthesizeStorefront`
- `storehausebackend/app/Services/StorefrontAiAgentService.php` — `applyChatEdit` context
- `storehause/src/lib/storefront-builder/local-ai.ts` — frontend editable paths mirror

---

## Phase 2 — Home page blocks (2–4 weeks)

**Outcome:** AI generates and rearranges homepage sections; cosmetics template is the pilot.

| # | Task | Repos |
|---|------|-------|
| M2.1 | Define block types + Zod schema: `hero`, `feature_grid`, `stats_row`, `faq`, `product_grid`, `cta_banner` | storehause |
| M2.2 | Add `pages.home.blocks[]`; dual-read legacy `hero` / `value_props` until migrated | storehause, backend |
| M2.3 | Implement `ComponentRegistry` + `PageRenderer` for home | storehause |
| M2.4 | Refactor `cosmetics-home.tsx` to render from blocks; remove hard-coded stats/reasons | storehause |
| M2.5 | Update `synthesizeStorefront` + AI agent to emit home blocks | backend |
| M2.6 | Builder chat: patch ops for `update_block` / `reorder_blocks` / `add_block` / `remove_block` on home | backend, storehause |

**Acceptance:** Merchant can say *“Move FAQ above products”*, *“Make the trust section more premium”*, *“Add a promo banner above the FAQ”*, or *“Remove the stats section”* on the homepage.

---

## Phase 3 — All pages + forms (3–5 weeks)

**Outcome:** About, Contact, and FAQ are block pages; AI can design contact forms.

| # | Task | Repos |
|---|------|-------|
| M3.1 | Migrate About, Contact, FAQ routes to `PageRenderer` | storehause |
| M3.2 | Add `contact_form` block + `POST /stores/{id}/contact` (or inquiries table) | backend, storehause |
| M3.3 | AI generation produces block trees for all standard pages | backend |
| M3.4 | Builder preview renders all pages from the same block pipeline | storehause |
| M3.5 | Visual editor: click section → edit props; reorder sections | storehause ✅ |
| M3.6 | Migration adapter: flat `hero` / `about` / `value_props` → blocks on read | storehause, backend |

**Acceptance:** Merchant can say *“Add a contact form with name, email, and order number”* and get a working form on the live storefront.

**Forms block shape (example):**

```typescript
{
  type: "contact_form",
  props: {
    title: "Get in touch",
    intro: "Questions about an order or product?",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "message", label: "Message", type: "textarea", required: true }
    ],
    submit_label: "Send message",
    success_message: "Thanks — we'll reply soon."
  }
}
```

---

## Phase 4 — Design intelligence (complete)

**Outcome:** AI can fix, regenerate, and update any section on any page (home, about, contact, FAQ) via block patch operations. Cosmetics homepage uses the block pipeline; beauty, classic, fashion, and minimalistic templates keep their dedicated home designs.

| # | Task | Repos |
|---|------|-------|
| M4.1 | Block layout variants (`hero.split`, `hero.centered`, `hero.image_right`) | storehause ✅ |
| M4.2 | Template = theme tokens + default block recipes (cosmetics home on blocks; other templates keep bespoke React until migrated) | storehause, backend (partial) |
| M4.3 | `regenerate_section` + `update_block` / `reorder_blocks` / `remove_block` on **all pages** | backend, storehause ✅ |
| M4.4 | `edit_metadata` at block level (`ai_generated` vs `merchant_locked`) | backend, storehause ✅ |
| M4.5 | Product grid always reads merchant catalog API, not embedded placeholders | backend, storehause ✅ |

**Acceptance:**
- *“Redesign just the hero”* — homepage hero regenerates without losing products or contact settings.
- *“Fix the about page”* / *“Regenerate the FAQ section”* / *“Make the contact intro more premium”* — target page section updates via block ops; other pages unchanged.
- AI editor receives full `pages.*.blocks` context and may return `operations[]` or flat `updates`.
- `product_grid` blocks show live catalog products (merged at read time); empty catalog shows a placeholder — not theme filler products.

---

## Engineering rules

1. **Schema-first** — TypeScript + Zod (FE) and Laravel validation (BE) for every block type.
2. **Registry is the contract** — AI may only use registered block types; reject unknown types.
3. **Patch ops, not free-form JSON** — prevents structural breakage.
4. **`edit_metadata` per block** — track AI vs merchant edits; respect locked blocks.
5. **Products stay plugged in** — `product_grid` reads merchant products, not long-lived fake catalog rows in storefront JSON.
6. **Migration adapter** — old flat storefronts convert to blocks on read so existing stores do not break.

---

## Relationship to product phases

From [arch.md — Prioritized Build Backlog](./arch.md#prioritized-build-backlog):

| Modular phase | Fits after |
|---------------|------------|
| M Phase 1 | Phase A (core creation loop) — can start in parallel with A4–A6 |
| M Phase 2 | Phase A complete + B4 (visual editor section controls) |
| M Phase 3 | M Phase 2 + B1 (publish flow) |
| M Phase 4 | B5 (component registry) foundation from M Phase 2 |

**Recommended next step:** Phase B from [arch.md](./arch.md) — component registry polish, template migration, and retiring legacy home React trees. Publish flow (B1) is implemented.

---

## Deferred — Draft versioning & undo/redo

**Status:** Planned; not in current scope. Revisit after publish flow and visual editor polish.

Merchants will eventually need to undo manual edits and recover from AI changes without republishing by accident. Intended approach (when we pick this up):

| Layer | Scope | Notes |
|-------|--------|--------|
| **In-session undo/redo** | Visual editor (Ctrl+Z / Ctrl+Shift+Z) | Local snapshot stack; fast; lost on refresh unless saved |
| **Draft revisions (server)** | AI edits, manual saves | `storefront_draft_revisions` table; restore API; snapshot before destructive AI ops |
| **Revert to last published** | One-click safety | Copy `published_json` → `draft_json` (complements publish, no full history required) |

**Rules when implemented:** revisions are **draft-only** — live site changes only on publish; product catalog stays out of revision blobs (same as `draft_json` / `published_json` today).
