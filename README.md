# Bizgrid (merchant app)

AI-powered merchant platform for small businesses: describe a shop in chat, manage products and orders, and publish a live storefront customers can buy from.

This repository is the **merchant dashboard + public storefronts** (Next.js). The API and platform admin live in sibling repos.

**Live:** [bizgrid.shop](https://www.bizgrid.shop) · **Judge demo:** `/demo` (see [Organizer demo](#organizer-demo-no-signup))

## Related repositories

Clone these next to each other. GitHub names differ from the local folder names used in this workspace:

| Local folder | GitHub | Role | Stack |
|--------------|--------|------|-------|
| `storehause/` (this repo) | [YrayPixels/bigrid-frontend](https://github.com/YrayPixels/bigrid-frontend) | Merchant dashboard, AI website builder, hosted storefronts | Next.js 15, React 19, Tailwind |
| `storehausebackend/` | [YrayPixels/bizgrid-backend](https://github.com/YrayPixels/bizgrid-backend) | REST API, auth, AI agents, orders, billing | Laravel 11, Sanctum, MySQL |
| `storehouseadmin/` | [YrayPixels/storehouseadmin](https://github.com/YrayPixels/storehouseadmin) | Internal platform ops (merchants, templates, agent logs) | Vite, React 18 |

For an end-to-end demo, run **backend + this frontend**. The admin app is optional unless you need platform-operator flows.

## Features

- Merchant registration, email verification, Google sign-in, and session auth (Sanctum)
- AI storefront / website builder (chat → generated shop)
- Product, category, and order management
- Public storefront runtime (browse, cart, Paystack checkout)
- AI personal shopper on the storefront (catalog search, looks, optional virtual try-on)
- Platform marketing surfaces (`/`, `/sell`, solutions, etc.)
- Optional Google Places autocomplete for zones and checkout

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | 20+ recommended |
| pnpm | `npm i -g pnpm` (or use `npx pnpm`) |
| PHP | 8.2+ |
| Composer | 2.x |
| MySQL | 5.7+ / 8.x |
| LLM API key | OpenAI, DeepSeek, and/or Gemini, configured on the **backend**. Gemini powers shopper, vision, and marketing when `GEMINI_API_KEY` is set. |

Optional: Redis (`docker compose up -d` in the backend repo), Google Maps key, Paystack / Dodo keys.

## Quick start (judges / local demo)

```bash
git clone https://github.com/YrayPixels/bizgrid-backend.git storehausebackend
git clone https://github.com/YrayPixels/bigrid-frontend.git storehause
git clone https://github.com/YrayPixels/storehouseadmin.git storehouseadmin   # optional
```

### 1. Backend API

```bash
cd storehausebackend
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` (minimum for a local demo):

```env
APP_NAME=Bizgrid
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=storehause
DB_USERNAME=root
DB_PASSWORD=

OPENAI_API_KEY=sk-...
AI_PROVIDER=openai

STOREHAUSE_APP_URL=http://localhost:3000
STOREHAUSE_PLATFORM_DOMAIN=localhost
STOREHAUSE_BRAND_NAME=Bizgrid
STOREHAUSE_ADMIN_APP_URL=http://localhost:5173
STOREHAUSE_ADMIN_EMAIL=admin@storehause.local
STOREHAUSE_ADMIN_PASSWORD=choose-a-strong-password
```

Create the database, then migrate and seed:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS storehause;"
php artisan migrate
php artisan db:seed
php artisan serve
```

API: **http://localhost:8000** (routes under `/api`).

Queue workers (recommended if you exercise AI / async jobs):

```bash
php artisan queue:listen --tries=1
```

Full backend env: [`storehausebackend/.env.example`](https://github.com/YrayPixels/bizgrid-backend/blob/main/.env.example). Setup: [`storehausebackend/README.md`](https://github.com/YrayPixels/bizgrid-backend).

### 2. Merchant app (this repo)

```bash
cd storehause
pnpm install
cp .env.example .env
```

Set at least:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_STORE_PLATFORM_DOMAIN=localhost
```

Run:

```bash
pnpm dev
```

App: **http://localhost:3000**

### 3. Platform admin (optional)

```bash
cd storehouseadmin
pnpm install
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

```bash
pnpm dev
```

Admin UI: **http://localhost:5173**  
Log in with the seeded `STOREHAUSE_ADMIN_EMAIL` / `STOREHAUSE_ADMIN_PASSWORD` from the backend `.env`.

## Organizer demo (no signup)

One-click access for judges: open **`/demo`** on the merchant app (production: `https://www.bizgrid.shop/demo`, local: `http://localhost:3000/demo`).

That route signs you into a seeded **Glow Rituals** merchant with a published storefront, sample products, and sample orders — no account creation.

### Enable on the backend

In `storehausebackend/.env`:

```env
STOREHAUSE_DEMO_LOGIN=true
STOREHAUSE_DEMO_EMAIL=demo@bizgrid.shop
# optional: STOREHAUSE_DEMO_PASSWORD=...
```

Seed (or re-seed to reset shared demo data).

**Production** (same pattern as migrate — uses `DEPLOY_KEY`):

```bash
curl -X POST "https://YOUR-API-DOMAIN/maintenance/cache-clear?key=YOUR_DEPLOY_KEY"
curl -X POST "https://YOUR-API-DOMAIN/maintenance/seed-demo?key=YOUR_DEPLOY_KEY"
```

**Local**:

```bash
cd storehausebackend
php artisan db:seed --class=DemoMerchantSeeder
# or full seed when STOREHAUSE_DEMO_LOGIN=true:
# php artisan db:seed
```

### Enable the login CTA (optional)

In this repo’s `.env`:

```env
NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true
```

Public storefront for the demo shop: `/s/glow-rituals-demo`

> Note: the demo account is **shared**. Treat edits as ephemeral; re-run `DemoMerchantSeeder` to reset.

## Environment variables (this repo)

Copy from [`.env.example`](./.env.example).

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes (real API) | Laravel API root including `/api`, e.g. `http://localhost:8000/api` |
| `NEXT_PUBLIC_STORE_PLATFORM_DOMAIN` | Yes (subdomain routing) | e.g. `localhost` or `bizgrid.shop` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Places autocomplete for zones / checkout |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | No | Shows “Enter the demo” on `/login` when `true` |
| `NEXT_PUBLIC_USE_MOCKS` | No | Set `true` for frontend-only UI exploration (no backend). Do **not** use for judging the full product. |
| `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` | No (this repo) | Server-only; prefer configuring AI on the **backend**. Never prefix secrets with `NEXT_PUBLIC_`. |

## Demo walkthrough

### Fast path (recommended for judges)

1. Open **`/demo`** — you land in the merchant dashboard as the sample Glow Rituals merchant.
2. Explore **Products**, **Orders**, and **Website / Builder**.
3. Open the live storefront at **`/s/glow-rituals-demo`** (browse, cart, checkout).
4. Try the **AI shopper** on the storefront (chat FAB).

### Full signup path

1. Open http://localhost:3000 and register a merchant (or log in).
2. Complete email verification if prompted (local mail may use your SMTP settings; set `MAIL_*` in backend `.env` or use a provider).
3. Create / open a store and run the **AI Website Builder** — describe a business in plain language and generate a storefront.
4. Add products, place a test order from the public storefront, and confirm it appears in merchant orders.
5. (Optional) Open the admin app and inspect merchants, agent logs, and storefront templates.

## Scripts (this repo)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js development server |
| `pnpm build` | Production build (includes PWA stamp helper) |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint |

## Project structure

```text
storehause/
├── .env.example          # Example frontend configuration
├── docs/                 # Architecture and product specs
├── public/               # Static assets
├── scripts/              # Build / PWA helpers
└── src/
    ├── app/              # Next.js App Router (marketing, auth, merchant, storefronts)
    ├── components/       # UI and feature components
    ├── lib/              # API client, utilities, mocks
    ├── hooks/
    └── types/
```

Architecture overview: [`docs/arch.md`](./docs/arch.md).

## API overview (backend)

All routes are prefixed with `/api`. Highlights:

**Merchants**

- `POST /storehause/auth/register` — Register
- `POST /storehause/auth/login` — Login
- `POST /storehause/auth/demo-login` — One-click demo merchant (requires `STOREHAUSE_DEMO_LOGIN`)
- `GET /storehause/public/storefronts/{slug}` — Public storefront
- `POST /storehause/public/storefronts/{slug}/orders` — Place order
- Authenticated routes: dashboard, stores, products, AI builder, orders

**Platform admin**

- `POST /login-admin`, `POST /verify-admin`
- `GET /admin/merchants`
- `GET /admin/storefront-templates`

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Frontend calls fail / CORS | Backend running on `:8000`; `NEXT_PUBLIC_API_BASE_URL` includes `/api` |
| AI generation errors | `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, or `GEMINI_API_KEY` set on **backend**; `AI_PROVIDER` matches the builder; queue worker running if jobs are queued |
| Demo login disabled / 404 | Backend `STOREHAUSE_DEMO_LOGIN=true` and `DemoMerchantSeeder` has run |
| Admin seeder fails | `STOREHAUSE_ADMIN_PASSWORD` must be set and must not be the blocked default |
| Empty UI with no API | Unset `NEXT_PUBLIC_USE_MOCKS` and point at a live API |

## License

Private / source-available for review unless otherwise stated in the repository license file.
