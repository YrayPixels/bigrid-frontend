# WebMCP hackathon — submission checklist

**Deadline:** Sep 3, 2026 · **1:00 pm PT**  
**Live URL:** https://www.bizgrid.shop  
**Public repo:** https://github.com/YrayPixels/-bizgrid-openai-frontend  
**Demo outline:** [`docs/webmcp-demo-script.md`](./webmcp-demo-script.md) (keep this — do not delete)

Work top → bottom. Items marked **BLOCKER** will fail eligibility or Stage One.

---

## 1. Repo eligibility (do first)

- [x] **BLOCKER — Add open-source `LICENSE`** at repo root (MIT). Confirm GitHub **About** shows the license badge after push.
- [x] **BLOCKER — Fix README License section** — now points at MIT + WebMCP docs.
- [x] **BLOCKER — Add prior vs new work doc** — [`docs/webmcp-prior-vs-new.md`](./webmcp-prior-vs-new.md).
- [ ] Push LICENSE + docs to **`-bizgrid-openai-frontend`** (`open-ai` remote, `dev` branch).
- [ ] Do **not** push the local mass delete of `docs/*` (especially keep `webmcp-demo-script.md`).

## 2. Live product smoke test (15 min)

- [ ] Open https://www.bizgrid.shop in ChatGPT in-app browser (or Chrome with WebMCP enabled).
- [ ] Confirm **Site tools** lists all 7: `list_stores`, `list_catalog`, `get_store_info`, `search_products`, `get_product`, `add_to_cart`, `get_cart`.
- [ ] Agent can `search_products` (e.g. `"serum"`) and get real results.
- [ ] Agent can `add_to_cart` for a product; human can open cart/checkout URL.
- [ ] `/demo` and `/s/glow-rituals-demo` still load.
- [ ] At least 2 published stores with active products (`/stores`).

## 3. Demo video (BLOCKER if missing)

- [ ] **BLOCKER — Record &lt;3 min video** with **audio**, following `webmcp-demo-script.md`.
- [ ] Show: live site → Site tools → search → add to cart → human finishes on storefront.
- [ ] No third-party trademarks / copyrighted music without permission.
- [ ] **BLOCKER — Upload to YouTube as Public** (or Unlisted if rules allow; prefer Public).
- [ ] Copy the YouTube URL for the Devpost form.

## 4. Submission form text (paste into Devpost)

Draft from the demo script pitch; cover all four required points:

- [ ] **Why WebMCP fit** — structured commerce tools vs scraping HTML / guessing UI.
- [ ] **Better UX** — same browser cart for agent + human; correct merchant checkout.
- [ ] **What people + agents do together** — agent finds/carts across stores; human reviews and pays.
- [ ] **How implemented** — `document.modelContext.registerTool` on page load; platform catalog APIs; tools listed above.

Also prepare:

- [ ] Project title + short tagline
- [ ] Live URL: `https://www.bizgrid.shop`
- [ ] Repo URL: `https://github.com/YrayPixels/-bizgrid-openai-frontend`
- [ ] YouTube URL
- [ ] Auth credentials (only if judges need login; `/demo` may be enough)

## 5. Optional polish (if time)

- [ ] README: short **WebMCP** section (7 tools, how to test Site tools, link to demo script + prior/new doc).
- [ ] Repo description / homepage on GitHub → `https://www.bizgrid.shop`.
- [ ] Rename clarity: submission points at `-bizgrid-openai-frontend` (not private siblings).
- [ ] Confirm backend catalog endpoints stay healthy through judging (Sep 4–21).

## 6. Submit

- [ ] Fill Devpost form with live URL, repo, text, video.
- [ ] Re-open submitted links in a private window (public repo, public video, live site).
- [ ] Screenshot / save confirmation before 1:00 pm PT.

---

## Already done (don’t redo)

- Working WebMCP tool registration (`src/lib/webmcp/`)
- Live deploy includes WebMCP client code
- Public GitHub repo exists
- Demo script + product experience exist
