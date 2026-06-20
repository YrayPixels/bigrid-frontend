# StoreHause Workspace Overview

> Generated overview of the StoreHause product suite and related projects in this workspace.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Repositories](#repositories)
3. [StoreHause (`storehause`)](#storehause-storehause)
4. [Backend API (`storehausebackend`)](#backend-api-storehausebackend)
5. [Platform Admin (`storehouseadmin`)](#platform-admin-storehouseadmin)
6. [Other: `pal`](#other-pal)
7. [Environment & Local Development](#environment--local-development)
8. [Data Model (StoreHause)](#data-model-storehause)
9. [API Reference Summary](#api-reference-summary)
10. [Key Source Directories](#key-source-directories)

---

## Architecture

StoreHause is a multi-repo product: one Laravel API serves two customer-facing Next.js experiences (merchant storefronts + SchoolOS) and a separate Vite admin dashboard for platform operators.

```
┌─────────────────────────────────────────────────────────────────┐
│                        storehausebackend                        │
│                     Laravel 11 · PHP 8.2+ · MySQL               │
│                                                                 │
│  /api/storehause/*   Merchant auth, stores, AI builder, orders  │
│  /api/auth/*         SchoolOS auth                              │
│  /api/schools/*      SchoolOS school management                 │
│  /api/admin/*        Platform admin (merchants, templates, etc.)│
│  Legacy HeySolana    Jumia, Crossmint, wallets, transactions    │
└────────────────────────────▲────────────────────────────────────┘
                             │ REST + Sanctum Bearer tokens
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────┴────────┐ ┌────────┴────────┐ ┌───────┴────────┐
│    storehause   │ │ storehouseadmin │ │  HeySolana app │
│   Next.js 15    │ │  Vite + React   │ │   (mobile)     │
│                 │ │                 │ │                │
│ • Landing       │ │ • Merchants     │ │ Uses legacy    │
│ • Merchant /admin│ │ • Templates    │ │ wallet APIs    │
│ • Storefronts   │ │ • Jumia orders  │ │                │
│   /s/[slug]     │ │ • Bug reports   │ │                │
│ • SchoolOS      │ │ • Analytics     │ │                │
│   /t/[slug]     │ │                 │ │                │
└─────────────────┘ └─────────────────┘ └────────────────┘
```

**Auth tokens are separate per product:**

| Product     | Token name   | Storage key (frontend)   |
|-------------|--------------|--------------------------|
| StoreHause  | `storehause` | `storehaus_auth_token`   |
| SchoolOS    | `schoolos`   | `school-harmony-auth`    |
| Admin       | Sanctum      | Admin auth context       |

---

## Repositories

| Path | Role | Stack |
|------|------|-------|
| `storehause/` | Customer app: marketing, merchant dashboard, public storefronts, SchoolOS tenant UI | Next.js 15, React 19, Tailwind 4, shadcn/ui, TanStack Query |
| `storehausebackend/` | Shared REST API | Laravel, PHP 8.2+, MySQL, Sanctum |
| `storehouseadmin/` | Internal ops dashboard | Vite 5, React 18, React Router, shadcn/ui |
| `pal/` (separate workspace) | Unrelated project (`paddybyorova`) | Next.js, pnpm, port 8080 |

The backend README still references **HeySolana** — the original wallet/e-commerce API. StoreHause and SchoolOS were added on top of that codebase.

---

## StoreHause (`storehause`)

**Package name:** `school-harmony-hub` (internal codename; product brand is **Storehaus**)

### Product focus

**Phase 1 MVP:** AI-powered storefront generator for small businesses. Merchants describe their business; the platform generates homepage copy, product layouts, and a themed storefront in minutes.

**Secondary product:** **SchoolOS** — school management (students, academics, finance, attendance) hosted in the same Next.js app under `/t/[slug]`.

### Route map

| Route prefix | Audience | Purpose |
|--------------|----------|---------|
| `/` | Public | Marketing landing page |
| `/login`, `/signup`, `/onboarding` | Merchants | Auth and store setup |
| `/admin/*` | Merchants | Dashboard, AI builder, products, orders, settings, website editor |
| `/s/[slug]/*` | Shoppers | Public storefront (subdomain or path-based) |
| `/t/[slug]/*` | Schools | SchoolOS tenant portal |
| `/app` | — | App entry / redirect hub |
| `/api/chat`, `/api/storefront-builder/ai` | Internal | Next.js API routes for AI builder (runs agent locally) |

### Public storefront pages (`/s/[slug]`)

- Home, About, Contact, FAQ
- Products listing + product detail (`/products/[productSlug]`)
- Cart, Checkout, Checkout success
- Privacy policy

### Merchant admin pages (`/admin`)

- Dashboard (metrics, link to live storefront)
- AI Builder (`/admin/builder`) — chat-based storefront creation
- Products, Orders, Settings
- Website editor (`/admin/website`)
- Onboarding flow

### SchoolOS tenant pages (`/t/[slug]`)

- Dashboard home
- Students, Employees
- Academics (classes, subjects, sessions, enrollments)
- Attendance, Timetable, Events
- Finance (fees, invoices, payments)
- Messages, Settings

### Subdomain routing

Middleware in `src/middleware.ts` rewrites subdomain requests to path-based routes:

- `{slug}.yrayhostings.com.ng/about` → `/s/{slug}/about`
- `{slug}.localhost:3000` in development

Reserved subdomains (not treated as store slugs): `www`, `app`, `api`, `admin`, `dashboard`, `portal`, `docs`, `help`, `status`, `blog`, `mail`, `static`, `assets`, `cdn`.

Logic lives in `src/lib/store-host.ts`. On Vercel preview domains (`.vercel.app`), subdomains are disabled and storefronts use path URLs instead.

### Storefront templates

Available template IDs (from `src/lib/api/types.ts`):

| Template ID | Theme style |
|-------------|-------------|
| `classic` | Default classic layout |
| `editorial` | Editorial / magazine style |
| `bold_grid` | Bold grid layout |
| `fashion_lookbook` | Fashion lookbook |
| `minimalistic` | Clean minimal |
| `beauty` | Beauty / skincare |
| `cosmetics` | Cosmetics brand |

Each template has matching shell components, home page variants, and default content in `src/lib/storefront/` and `src/components/storefront/`.

### AI storefront builder

Two layers:

1. **Backend builder sessions** — persisted via `/api/storehause/storefront-builder/*` (Laravel `StorefrontBuilderController`)
2. **Next.js agent route** — `/api/storefront-builder/ai` runs a multi-agent pipeline locally:
   - Agents: Interpreter → Planner → Executor → Critic
   - Tools: `capture_business_details`, `design_website`, `generate_website`, `refine_website_copy`, `ask_clarifying_question`
   - Source: `src/lib/storefront-builder/agents/`

The visual editor (`visual-storefront-editor.tsx`) allows inline editing of text and images on the generated storefront.

### Mock mode

If `NEXT_PUBLIC_API_BASE_URL` is unset or `NEXT_PUBLIC_USE_MOCKS=true`, the StoreHause API client falls back to mocks in `src/lib/api/mocks.ts`.

---

## Backend API (`storehausebackend`)

**Stack:** Laravel 11, PHP 8.2+, MySQL, Laravel Sanctum, OpenAI integration

**Default DB name:** `heysolanabackend` (legacy naming)

### StoreHause API (`/api/storehause`)

**Public (no auth):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Merchant registration |
| POST | `/auth/login` | Merchant login |
| GET | `/storefront-templates` | Active templates |
| POST | `/storefront-builder/recommend-templates` | AI template recommendations |
| GET | `/public/storefronts/by-host` | Resolve storefront by hostname |
| GET | `/public/storefronts/{slug}` | Public storefront JSON |
| POST | `/public/storefronts/{slug}/orders` | Place customer order |
| POST | `/public/storefronts/{slug}/visits` | Record page visit |
| GET | `/public/generations/{generationId}` | Poll AI generation status |

**Authenticated (Sanctum Bearer):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Revoke token |
| GET | `/dashboard` | Merchant dashboard stats |
| GET/PATCH | `/orders`, `/orders/{id}/status` | Order management |
| POST/GET/PATCH | `/stores`, `/stores/me` | Store CRUD |
| POST | `/stores/{storeId}/images` | Upload storefront images |
| POST/GET/PATCH | `/ai/storefront/*` | AI storefront generation & updates |
| POST/GET | `/storefront-builder/sessions/*` | Builder chat sessions |

### SchoolOS API (`/api`)

Routes defined in `routes/api-schoolos.php` (included from `routes/api.php`).

**Auth:**

| Method | Endpoint |
|--------|----------|
| POST | `/auth/register` |
| POST | `/auth/login` |
| GET | `/auth/me` (auth) |
| POST | `/auth/logout` (auth) |

**Schools (all auth):**

| Area | Endpoints under `/schools/{school}/` |
|------|----------------------------------------|
| Core | `check-slug`, `mine`, `by-slug`, create school, onboarding import |
| People | students, employees, roles, departments |
| Academics | sessions, classes, subjects, terms, enrollments, class-subjects |
| Operations | events, timetable-periods, messages |
| Attendance | summary, classes, records |
| Finance | summary, fee-categories, fee-templates, fee-assignments, invoices, payments |

### Platform admin API (`/api/admin`)

Used by `storehouseadmin`:

- Merchant list, stats, detail, status updates
- Storefront template management
- Push notifications (preview + send)
- Bug report triage
- Processing fee / treasury settings
- Jumia and Crossmint order management (`/api/admin/jumia/*`, `/api/admin/crossmint/*`)

### Legacy HeySolana features

Still present in the same codebase:

- Address book / user wallet management
- Jumia e-commerce orders and scraping
- Crossmint (Amazon) orders
- Agent wallets, MPC wallets, passkeys
- Exchange rates (NGN/USD)
- OpenAI Realtime / voice AI (`OPENAI_INTEGRATION.md`)
- Twitter bot, cookie manager, waitlist
- Transaction tracking, bug reports from mobile app

### Deployment

- Documented for **Railway** (`RAILWAY.md`)
- GitHub Actions for automated deployment
- CORS middleware on all API routes

---

## Platform Admin (`storehouseadmin`)

Internal dashboard for Yray Labs operators — **not** for merchants or schools.

### Routes

| Path | Page |
|------|------|
| `/` | Sign in |
| `/dashboard` | Overview (merchant counts, store stats) |
| `/merchants`, `/merchants/:id` | Merchant management |
| `/storefront-templates` | Template configuration |
| `/analytics` | Platform analytics |
| `/user-distribution` | User distribution charts |
| `/users` | User list |
| `/orders` | Orders hub |
| `/orders/jumia/:orderId` | Jumia order detail |
| `/orders/crossmint/:orderId` | Crossmint order detail |
| `/transactions` | Transaction history |
| `/bug-reports`, `/bug-reports/:id` | Bug report triage |
| `/push-notifications` | Send push notifications |
| `/admins` | Admin user management |
| `/settings` | Platform settings |
| `/profile` | Admin profile |

### Config

Uses `VITE_API_BASE_URL` pointing at the Laravel backend (same base as StoreHause, different route prefixes).

---

## Other: `pal`

Separate project at `WebProjects/pal`. Package name `paddybyorova`. Next.js app on port 8080. Not part of StoreHause — included in the workspace but unrelated.

---

## Environment & Local Development

### `storehause/.env` (current)

```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.129:8000/api
NEXT_PUBLIC_STORE_PLATFORM_DOMAIN=yrayhostings.com.ng
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Laravel API base (must include `/api`) |
| `NEXT_PUBLIC_STORE_PLATFORM_DOMAIN` | Root domain for subdomain storefronts |
| `NEXT_PUBLIC_USE_MOCKS` | Optional — force mock API when `true` |

### Running locally

**Backend:**

```bash
cd storehausebackend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve   # http://localhost:8000
```

**Frontend:**

```bash
cd storehause
npm install
npm run dev         # http://localhost:3000
```

**Admin:**

```bash
cd storehouseadmin
npm install
npm run dev
```

**Storefront subdomains in dev:** Use `{slug}.localhost:3000` — middleware resolves these automatically.

### Backend key env vars

See `storehausebackend/.env.example` for full list. Notable:

- `DB_*` — MySQL connection
- `OPENAI_API_KEY` — AI storefront builder, voice features
- `VOICE_AI_URL` — ECAPA speaker verification microservice
- Jumia proxy settings for catalog scraping
- Railway production overrides

---

## Data Model (StoreHause)

Core tables (from migrations):

### `merchants`

- Links to `users` via `owner_user_id`
- Fields: `business_name`, `slug`, contact info, `industry`, `status`, subscription plan/status

### `stores`

- Belongs to `merchant`
- Fields: `name`, `slug`, `status`, `primary_domain`, product/order counts, revenue
- Stores generated storefront JSON and template reference

### `store_orders`

- Customer orders placed on public storefronts
- Fields: customer info, delivery address, line items (JSON), totals, payment/status

### `store_visits`

- Analytics: session, path, referrer, user agent, IP hash

### `storefront_templates`

- Platform-managed template definitions with builder metadata

### `storefront_builder_sessions` / `storefront_builder_messages`

- Persisted AI builder chat sessions and message history

---

## API Reference Summary

All routes are prefixed with `/api` by Laravel.

```
/api/storehause/...     → StoreHause merchant & storefront
/api/auth/...           → SchoolOS auth
/api/schools/...        → SchoolOS data
/api/admin/...          → Platform admin (storehouseadmin)
/api/exchange-rate      → NGN/USD rates
/api/open-token         → OpenAI token generation
/api/bug-reports        → Mobile app bug reports
```

Health check: `GET /up`

Connectivity test: `GET /api/test-api`

---

## Key Source Directories

### `storehause/src/`

```
app/
  page.tsx                    Landing
  admin/                      Merchant dashboard
  s/[slug]/                   Public storefronts
  t/[slug]/                   SchoolOS tenant UI
  api/                        Next.js API routes (AI builder)
components/
  admin/builder/              AI builder UI
  storefront/                 Storefront pages, shells, editor, theme
  landing/                    Marketing sections
  ui/                         shadcn components
lib/
  api/                        StoreHause API client + types
  api-client.ts               SchoolOS API client
  storefront/                 Template defaults, cart, theme context
  storefront-builder/         Multi-agent AI builder
  store-host.ts               Subdomain routing helpers
  tenant-host.ts              SchoolOS tenant host parsing
  schoolos-types.ts           SchoolOS TypeScript types
middleware.ts                 Subdomain → /s/[slug] rewrite
```

### `storehausebackend/app/`

```
Http/Controllers/
  StorehauseController.php           StoreHause core
  StorefrontBuilderController.php    Builder sessions
  SchoolOs*.php                      SchoolOS controllers
  Admin*.php                         Platform admin
  AdminJumiaController.php           Jumia orders
  AdminCrossmintController.php       Crossmint orders
Services/
  StorefrontBuilderService.php       AI generation logic
  StorefrontAiAgentService.php       AI agent orchestration
  ExchangeRateService.php
Models/
  Merchant.php, Store.php, StoreOrder.php
  School.php, Student.php, Employee.php, ...
routes/
  api.php                            Main API routes
  api-schoolos.php                   SchoolOS routes
```

### `storehouseadmin/src/`

```
pages/          Route pages (Dashboard, Merchants, Orders, ...)
services/api/   API modules (auth, merchants, templates, ...)
components/     UI + AuthContext
layouts/        DashboardLayout
```

---

## Current State Summary

| Area | Status |
|------|--------|
| StoreHause MVP | AI storefront generator, multi-template support, merchant admin |
| Public storefronts | Products, cart, checkout, subdomain hosting |
| AI builder | Multi-agent chat + visual editor; backend session persistence |
| SchoolOS | Full tenant UI + backend CRUD for schools, academics, finance |
| Platform admin | Merchant/template/order management for operators |
| Legacy HeySolana | Still in backend; mobile wallet integrations |
| Deployment | Railway docs for backend; frontend mentions Cloudflare Workers |

---

*Last updated: June 2026*
