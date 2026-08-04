# Bizgrid 90-Day SEO Growth Plan

Tailored to the current Next.js App Router codebase in `storehause` (Metadata API, `src/app/sitemap.ts`, `src/app/robots.ts`, subdomain storefronts, JSON storefront content).

## Where we start (Day 0 baseline)

**Already shipping after this engineering pass:**

| Area | Status |
|------|--------|
| Root metadata + OG/Twitter | Done (`src/app/layout.tsx`) |
| `robots.ts` / `sitemap.ts` | Done; sitemap now includes SEO landing URLs |
| Organization / WebSite / SoftwareApplication JSON-LD | Done (root layout) |
| Intent, industry, city, compare, academy, discover pages | Done (dynamic routes + `src/lib/seo/pages.ts`) |
| Product / LocalBusiness / FAQ / Breadcrumb schema on storefronts | Done (home, FAQ, product) |
| Internal linking on marketing chrome + landing footer | Done |

**Still thin / follow-up:**

- Long-form copy depth (many pages are scaffold-length; expand to 1.5k–2.5k words)
- Discover pages list all published stores (not yet filtered by industry/city — needs API fields)
- Reviews / AggregateRating depend on live review data
- Core Web Vitals measurement not instrumented in-repo
- Off-site backlinks & GSC/GA4/Bing setup (ops, not code)

---

## North-star KPIs (measure weekly)

1. **Indexed pages** (GSC) — target growth from marketing + storefront/product URLs  
2. **Non-brand clicks** — solutions / industries / academy / compare  
3. **Signup conversion** from organic landing pages (UTM `utm_medium=organic`)  
4. **Storefront impressions** for `/s/[slug]` and subdomain URLs  
5. **CWV** — LCP < 2.5s, INP < 200ms, CLS < 0.1 on home + top landing pages  
6. **AI answer presence** — monthly spot-checks in ChatGPT / Perplexity / AI Overviews for 10 head terms

---

## Days 1–30 — Foundation & indexation

### Engineering (weeks 1–2)

| Task | Owner hint | Repo touchpoints |
|------|------------|------------------|
| Verify production `NEXT_PUBLIC_SITE_URL` + HTTPS canonical host | Eng | `src/lib/site-seo.ts` |
| Submit `sitemap.xml` in GSC + Bing Webmaster | Ops | `/sitemap.xml`, `/robots.txt` |
| Validate JSON-LD with Rich Results Test on `/`, `/solutions/ai-website-builder`, one product URL | Eng | `src/lib/seo/schema.ts` |
| Add GA4 + GSC property; confirm `hreflang` not needed yet (EN-only) | Ops | layout / analytics tags |
| Expand `PublishedStorefrontIndexEntry` with `industry` + city when API ready | Eng + API | backend + `discover` pages |
| Fix storefront `generateMetadata` to call API without swallowing real 404s incorrectly | Eng | `load-storefront.ts` usage |

### Content (weeks 1–4)

| Week | Ship |
|------|------|
| 1 | Expand `/solutions/ai-website-builder` and `/solutions/website-builder-for-nigeria` to 1.5k+ words |
| 2 | Expand `/compare/bizgrid-vs-shopify` + `/solutions/shopify-alternative-africa` |
| 3 | Expand `/academy/how-to-start-an-online-business-in-nigeria` + Paystack guide |
| 4 | Enrich top 3 industry pages (fashion, restaurants, beauty) |

### Ops

- Set up Search Console, GA4, Bing Webmaster  
- Create keyword sheet: primary term → URL → status  
- Screenshot CWV (PageSpeed Insights) for home + 2 landings → backlog

**Month 1 exit criteria:** all new routes in sitemap; no critical crawl errors; ≥4 expanded long-form pages live; analytics receiving traffic.

---

## Days 31–60 — Programmatic scale & storefront quality

### Engineering

| Task | Notes |
|------|-------|
| Filter `/discover/[industry]/[city]` by real industry/geo | Requires API enrichment |
| Auto-generate product SEO titles when merchants leave defaults empty | Hook: storefront builder / publish |
| Add FAQ schema builder suggestion in AI storefront prompts | `src/lib/storefront-builder/prompts.ts` |
| Related products module + internal links on product pages | Storefront UX + crawl depth |
| Image `alt` + Next/Image audit on marketing pages | CWV + accessibility |
| Dynamic sitemap chunking if URL count blows past limits | `sitemap.ts` → `sitemap/[id].ts` if needed |

### Content

- 1 Academy guide per week (inventory, pricing, retention, email, accounting)  
- Localize 2 industries × 3 cities with unique paragraphs (not template-only)  
- Add trust block: store count, processed volume, case study snippets (when metrics exist)

### Distribution (backlinks)

Aim for **10 quality placements**, not spam:

- Product Hunt launch notes  
- 2 African startup blogs (TechCabal / Techpoint guest or founder essay)  
- Indie Hackers + Dev.to narrative posts linking to Academy  
- Directory submissions (selective)

**Month 2 exit criteria:** discover pages map to real subsets of stores; ≥8 Academy URLs; first backlinks live; product schema passes with ratings where reviews exist.

---

## Days 61–90 — Authority, AI search, conversion

### Engineering

| Task | Notes |
|------|-------|
| Add `llms.txt` (optional) summarizing Bizgrid for AI crawlers | Public static file |
| Comparison table components (structured, scrape-friendly) | `/compare/*` |
| A/B test CTAs on top 5 organic landings | Signup rate |
| Prefetch / dynamic import polish on heavy admin not affecting marketing CWV | Performance |
| Programmatic “best [category] in [city]” content blocks from real catalog signals | Ranking quality |

### Content

- Refresh month-1 pages with examples, screenshots, FAQs  
- Publish founder story + security/trust page  
- 2 customer success stories with measurable outcomes  
- Answer-cluster pages: keep FAQs unique per URL (avoid duplicate FAQ spam)

### AI overview / LLM visibility checklist

For each head term (`AI website builder Africa`, `Paystack store builder`, `Shopify alternative Nigeria`):

1. Page has clear H1 + direct answer in first 100 words  
2. FAQPage schema present  
3. Internal links to Academy + Compare + Signup  
4. Cite concrete product facts (plans, Paystack, WhatsApp) — no vague claims  
5. Unique evidence (screenshots, city examples, store counts)

**Month 3 exit criteria:** measurable organic signup attribution; top 10 keywords tracked; CWV green on marketing templates; content calendar running weekly without eng blockers.

---

## Weekly rhythm (ongoing)

| Day | Cadence |
|-----|---------|
| Mon | Eng SEO tickets (schema, sitemap bugs, metadata) |
| Tue | Expand / ship 1 long-form URL from `src/lib/seo/pages.ts` |
| Wed | Internal link pass + related modules |
| Thu | GSC: coverage, queries, CWV regress |
| Fri | Backlink / partner outreach (2 touches) |

---

## Suggested engineering backlog order

1. API: published store index includes `industry`, `city`, `logo_url`  
2. Discover + Stores directory consume those filters  
3. Merchant-side SEO fields UI (title/description) with previews  
4. Default product title templates using city from shipping locations  
5. Sitemap splitting + lastmod from content publish dates  
6. Marketing page MDX or CMS later — **keep TypeScript content module until volume forces CMS**

---

## Out of scope for the Next.js app (track separately)

- Guest posts and PR  
- Paid search / social amplification of organic URLs  
- Legal review of comparison claims  
- Multilingual (Yoruba/Swahili/French) — revisit after EN topical authority is solid

---

## File map (implementation reference)

```
src/lib/seo/schema.ts          JSON-LD builders
src/lib/seo/pages.ts           Intent / industry / city / compare / academy content
src/lib/seo/platform-faqs.ts   Shared FAQs
src/lib/seo/storefront-meta.ts Product title/description helpers
src/components/seo/*           Marketing chrome + longform layout
src/app/solutions/[slug]       Search-intent landings
src/app/industries/...         Vertical + city landings
src/app/discover/...           Programmatic store directories
src/app/compare/[slug]         Comparison pages
src/app/academy/...            AI Business Academy
src/app/sitemap.ts             Includes allMarketingSeoPaths()
```
