# Bizgrid (StoreHause)

AI-powered merchant platform for small businesses: invent a shop with chat, manage products and orders, and publish a live storefront customers can buy from.

This repository is the **merchant web app + public storefronts** (Next.js). The API and platform admin live in sibling repos listed below.

## Related repositories

| Repository | Role | Stack |
|------------|------|-------|
| **[storehause](https://github.com/YrayPixels/storehause)** (this repo) | Merchant dashboard, AI website builder, hosted storefronts | Next.js 15, React 19, Tailwind |
| **[storehausebackend](https://github.com/YrayPixels/storehausebackend)** | REST API, auth, AI generation, orders, billing hooks | Laravel 11, Sanctum, MySQL |
| **[storehouseadmin](https://github.com/YrayPixels/storehouseadmin)** | Internal platform ops (merchants, templates, admins) | Vite, React 18 |

For a functional end-to-end demo, run **backend + this frontend**. The admin app is optional for judging unless you need platform-operator flows.

## Features

- Merchant registration, email verification, and session auth (Sanctum)
- AI storefront / website builder (chat → generated shop)
- Product and order management
- Public storefront runtime (browse, cart, checkout)
- Platform marketing surfaces (`/`, `/sell`, solutions, etc.)
- Optional Google Places autocomplete, payments, and channel integrations (see backend env)

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | 20+ recommended |
| pnpm | `npm i -g pnpm` (or use `npx pnpm`) |
| PHP | 8.2+ |
| Composer | 2.x |
| MySQL | 5.7+ / 8.x |
| OpenAI API key | Required for AI storefront generation |

Optional: Redis (`docker compose up -d` in the backend repo), Google Maps key, payment provider keys.

## Quick start (judges / local demo)

Clone the three repos next to each other (names matter only for clarity):

```bash
git clone https://github.com/YrayPixels/storehausebackend.git
git clone https://github.com/YrayPixels/storehause.git
git clone https://github.com/YrayPixels/storehouseadmin.git   # optional
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

Full backend env reference: [`storehausebackend/.env.example`](https://github.com/YrayPixels/storehausebackend/blob/main/.env.example). Deployment notes: [`RAILWAY.md`](https://github.com/YrayPixels/storehausebackend/blob/main/RAILWAY.md).

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

## Environment variables (this repo)

Copy from [`.env.example`](./.env.example).

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes (real API) | Laravel API root including `/api`, e.g. `http://localhost:8000/api` |
| `NEXT_PUBLIC_STORE_PLATFORM_DOMAIN` | Yes (subdomain routing) | e.g. `localhost` or `bizgrid.shop` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Places autocomplete for zones / checkout |
| `NEXT_PUBLIC_USE_MOCKS` | No | Set `true` for frontend-only UI exploration (no backend). Do **not** use for judging the full product. |
| `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` | No (this repo) | Server-only; prefer configuring AI on the **backend**. Never prefix secrets with `NEXT_PUBLIC_`. |

## Demo walkthrough

1. Open http://localhost:3000 and register a merchant (or log in).
2. Complete email verification if prompted (local mail may use your SMTP settings; set `MAIL_*` in backend `.env` or use a provider).
3. Create / open a store and run the **AI Website Builder** — describe a business in plain language and generate a storefront.
4. Add products, place a test order from the public storefront, and confirm it appears in merchant orders.
5. (Optional) Open the admin app and inspect merchants / storefront templates.

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
| AI generation errors | `OPENAI_API_KEY` (or DeepSeek) set on **backend**; queue worker running if jobs are queued |
| Admin seeder fails | `STOREHAUSE_ADMIN_PASSWORD` must be set and must not be the blocked default |
| Empty UI with no API | Unset `NEXT_PUBLIC_USE_MOCKS` and point at a live API |

## License

Private / source-available for review unless otherwise stated in the repository license file.
