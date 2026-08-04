# Bizgrid (StoreHause) — Merchant platform & storefronts

## Setup

```bash
pnpm install
cp .env.example .env
# Set NEXT_PUBLIC_API_BASE_URL to your Laravel API (e.g. http://localhost:8000/api)
pnpm dev
```

## Required env

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | Laravel API root including `/api`. Required in production. |
| `NEXT_PUBLIC_STORE_PLATFORM_DOMAIN` | Platform domain for subdomain routing. |

Server-only secrets (`OPENAI_API_KEY`, `UNSPLASH_ACCESS_KEY`, etc.) must **not** use the `NEXT_PUBLIC_` prefix.

## Scripts

- `pnpm dev` — Next.js development server
- `pnpm build` / `pnpm start` — production
- `pnpm lint` — ESLint

See `HARDENING_PLAN.md` for the security and quality roadmap.
See `SEO_90_DAY_PLAN.md` for the 90-day SEO growth plan (technical, content, programmatic).
