# StoreHause Technical Architecture Specification

Version: 1.1

Status: Living Engineering Blueprint

Last reviewed: June 2026

---

# Repositories (Current)

| Repo | Stack | Role |
|------|-------|------|
| `storehause/` | Next.js 15, React 19 | Merchant app, AI builder UI, public storefronts |
| `storehausebackend/` | Laravel 11, Sanctum, MySQL | REST API, AI generation, admin endpoints |
| `storehouseadmin/` | Vite, React 18 | Internal ops dashboard (merchants, templates, admins) |

Legacy products (SchoolOS, HeySolana, Jumia) were removed from the backend and admin apps in June 2026. The codebase is StoreHause-only.

---

# System Overview

StoreHause consists of four primary systems:

1. Merchant Platform
2. AI Store Builder
3. Storefront Runtime
4. Admin Platform

Architecture:

```text
                    ┌───────────────────┐
                    │     Frontend      │
                    │     Next.js       │
                    └─────────┬─────────┘
                              │
                              │ HTTPS
                              │
                    ┌─────────▼─────────┐
                    │   API Gateway     │
                    │     Laravel       │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼

   Merchant Service     AI Builder Service    Store Service

          │                   │                   │

          └───────────┬───────┴───────────┬──────┘
                      │                   │
                      ▼                   ▼

                  MySQL            Queue Workers
                                     OpenAI

```

---

# Repository Structure

## Frontend

```text
storehause/

src/

app/
components/
features/
hooks/
services/
types/
lib/
```

---

# Feature-Based Structure

```text
src/features

auth/
dashboard/
products/
orders/
analytics/
builder/
storefront/
settings/
customers/
billing/
```

---

# Backend Structure

```text
app/

Modules/

Auth/
Merchants/
Stores/
Products/
Orders/
Analytics/
Builder/
Payments/
Domains/
```

---

# Core Services

## Merchant Service

Purpose:

Manage merchant lifecycle.

Responsibilities:

* Registration
* Authentication
* Subscription
* Profile

Tables:

```sql
merchants
users
subscriptions
```

Endpoints:

```http
POST /auth/register

POST /auth/login

GET /auth/me

POST /auth/logout
```

---

# Store Service

Purpose:

Manage merchant stores.

Responsibilities:

* Create Store
* Update Store
* Publish Store
* Domains

Tables:

```sql
stores
store_domains
store_templates
```

Endpoints:

```http
GET /stores

POST /stores

PATCH /stores/{id}

POST /stores/{id}/publish
```

---

# Product Service

Purpose:

Manage products.

Tables:

```sql
products
product_images
categories
inventory
```

Endpoints:

```http
GET /products

POST /products

PATCH /products/{id}

DELETE /products/{id}
```

---

# Order Service

Purpose:

Order management.

Tables:

```sql
orders
order_items
payments
customers
```

Endpoints:

```http
GET /orders

GET /orders/{id}

PATCH /orders/{id}/status
```

---

# Analytics Service

Purpose:

Store intelligence.

Tables:

```sql
store_visits
events
analytics_snapshots
```

Events:

```text
Page Viewed
Product Viewed
Added To Cart
Checkout Started
Purchase Completed
```

---

# AI Builder Service

Purpose:

Generate storefronts.

---

# Builder Flow

```text
Merchant Prompt

      │

      ▼

Interpreter Agent

      │

      ▼

Planner Agent

      │

      ▼

Generator Agent

      │

      ▼

Store JSON

      │

      ▼

Critic Agent

      │

      ▼

Recommendations
```

---

# AI Session Model

```sql
builder_sessions

id
merchant_id
status
created_at
```

```sql
builder_messages

id
session_id
role
content
```

---

# Builder API

```http
POST /builder/session

POST /builder/chat

POST /builder/generate

POST /builder/regenerate

GET /builder/session/{id}
```

---

# Store Generation Pipeline

Step 1

Merchant prompt:

```text
I run a luxury fashion store
targeting women between 20 and 35
```

---

Step 2

Interpreter creates:

```json
{
  "industry": "fashion",
  "audience": "women",
  "style": "luxury"
}
```

---

Step 3

Planner creates:

```json
{
  "template": "fashion_lookbook",
  "sections": [
    "hero",
    "products",
    "testimonials"
  ]
}
```

---

Step 4

Generator creates:

```json
{
  "theme": {},
  "branding": {},
  "pages": []
}
```

---

Step 5

Critic validates.

Checks:

* Missing sections
* Weak copy
* Poor CTA
* Missing trust indicators

---

# Store JSON Engine

Storefronts are generated from JSON.

Database:

```sql
stores

id
merchant_id
slug
store_json
published_json
```

---

Store JSON Structure

```json
{
  "theme": {},
  "branding": {},
  "navigation": [],
  "pages": [],
  "products": []
}
```

---

# Storefront Rendering Engine

Frontend receives:

```json
{
  "store": {}
}
```

Renderer maps JSON to components.

```text
Store JSON

     │

     ▼

Theme Engine

     │

     ▼

Component Resolver

     │

     ▼

React Components
```

---

# Component Registry

```typescript
const registry = {
  hero: HeroSection,
  about: AboutSection,
  faq: FAQSection,
  products: ProductGrid,
  testimonials: TestimonialsSection,
};
```

AI only outputs component configuration.

Never React code.

Full phased plan for block-based generation and editing: **[modular-storefront-roadmap.md](./modular-storefront-roadmap.md)**.

---

# Visual Editor

Purpose:

Allow non-technical merchants to edit stores.

---

Editor Features

## Inline Text Editing

Click text.

Edit.

Save.

---

## Image Editing

Replace images.

Upload.

Crop.

Save.

---

## Section Editing

Hide Section

Duplicate Section

Delete Section

Move Section

---

# Product Import Engine

Supported Sources

## CSV

Upload CSV

System maps columns.

Imports products.

---

## Images

Upload images.

AI extracts:

* Product name
* Description
* Category

---

## Future

WhatsApp Catalog Import

Instagram Import

TikTok Shop Import

---

# Payment Architecture

Providers

Phase 1

* Paystack
* Flutterwave

---

Tables

```sql
payments

id
order_id
provider
reference
status
```

---

Flow

```text
Checkout

   │

   ▼

Payment Provider

   │

   ▼

Webhook

   │

   ▼

Update Order

   │

   ▼

Confirmation
```

---

# Domain Management

Store URL

```text
merchant.storehause.com
```

Custom Domain

```text
merchant.com
```

Tables

```sql
domains

id
store_id
hostname
verified
```

---

# Dashboard Pages

## Dashboard

KPIs

* Revenue
* Orders
* Visitors
* Conversion

---

## Builder

AI chat

Store generation

Regeneration

---

## Products

CRUD

Bulk Upload

Inventory

---

## Orders

Order Management

Status Updates

Refunds

---

## Customers

Customer Profiles

History

LTV

---

## Analytics

Traffic

Sales

Funnels

Products

---

## Marketing

Email

SMS

WhatsApp

Future

---

## Settings

Store

Domain

Payments

Shipping

Taxes

Team Members

---

# Queue Architecture

Use Laravel Queues.

Workers process:

* AI generation
* Product imports
* Email sending
* Analytics aggregation

Queue:

```text
builder

imports

notifications

analytics
```

---

# Infrastructure

Phase 1

Frontend

* Next.js
* Vercel

Backend

* Laravel
* Railway

Database

* MySQL

Storage

* Cloudflare R2

Queue

* Redis

AI

* OpenAI

---

# Security

Authentication

* Sanctum

Authorization

* Policies

Roles

```text
Owner

Manager

Staff
```

---

# Observability

Logging

* Laravel Logs

Monitoring

* Sentry

Analytics

* PostHog

---

# Admin Platform

Purpose:

Internal ops console for StoreHause staff — not the merchant dashboard.

Repo: `storehouseadmin/`

API prefix: `/api/admin/*` and admin auth routes on Laravel.

---

## Admin Responsibilities

* Merchant lifecycle oversight (list, detail, activate, suspend)
* Storefront template catalog management
* Platform admin user management
* Cross-merchant order oversight (planned)
* Subscription and billing admin (planned)
* AI builder session monitoring (planned)
* Platform analytics (planned)
* Domain verification admin (planned)

---

## Admin Routes (Current)

```text
/                    Sign in (email + OTP)
/dashboard           Platform overview
/merchants           Merchant list + filters
/merchants/:id       Merchant detail + stores
/storefront-templates  Template catalog
/admins              Admin user management
/profile             Admin profile
```

---

## Admin API (Current)

```http
POST /login-admin
POST /verify-admin
POST /create-admin
POST /fetch-admins
POST /reset-admin-password

GET  /admin/merchants
GET  /admin/merchants/stats
GET  /admin/merchants/{id}
PATCH /admin/merchants/{id}/status

GET  /admin/storefront-templates
PATCH /admin/storefront-templates/{id}
PATCH /admin/storefront-templates/{id}/status
```

---

# Implementation Status

Snapshot of what exists in code today vs this blueprint.

Legend: **Built** · **Partial** · **Not started**

---

## Service Status

| Service | Status | Notes |
|---------|--------|-------|
| Merchant Service | **Partial** | Register, login, me, logout work. Subscription fields on `merchants` row only — no billing API. |
| Store Service | **Partial** | Create/read/update store. Subdomain via `primary_domain`. No publish endpoint, no custom domains. |
| AI Builder Service | **Partial** | Sessions exist; generation split between Laravel and Next.js; not reliable end-to-end |
| Product Service | **Partial** | Products in JSON blob only — no CRUD API; conflicts with storefront updates |
| Order Service | **Partial** | `store_orders` with JSON line items. Public place order + merchant list/status. No customers, no refunds. |
| Analytics Service | **Partial** | `store_visits` + dashboard KPIs. No event pipeline or funnels. |
| Payments Service | **Deferred** | Checkout UI exists; integrate after core creation loop works |
| Domains Service | **Not started** | Path + subdomain routing only. No custom domain verification. |
| Admin Platform | **Partial** | Merchants, templates, admin users. No orders/billing/analytics admin. |

---

## Frontend Status (`storehause/`)

| Area | Status | Location |
|------|--------|----------|
| Auth (login, signup) | **Built** | `app/login`, `app/signup`, `lib/auth-context.tsx` |
| Onboarding | **Built** | `app/admin/onboarding/` |
| Merchant dashboard | **Built** | `app/admin/page.tsx` |
| AI builder | **Partial** | Chat + preview exist; generation unreliable; dual Next.js/Laravel paths |
| Website editor | **Partial** | `app/admin/website/` — inline text/image edit; no section reorder/hide |
| Products admin | **Partial** | CRUD via full storefront PATCH; products may not appear on live storefront |
| Orders admin | **Partial** | `app/admin/orders/` — list + status only |
| Settings | **Partial** | `app/admin/settings/` — UI with placeholders |
| Public storefront | **Built** | `app/s/[slug]/`, 7 templates, cart, checkout |
| Subdomain routing | **Built** | `middleware.ts`, `lib/store-host.ts` |
| Component registry | **Not started** | Template routing via switch maps — needs central registry |
| Feature modules | **Not started** | Spec uses `src/features/` — code uses `app/` + `components/` + `lib/` |

---

## Backend Status (`storehausebackend/`)

| Area | Status | Notes |
|------|--------|-------|
| StoreHause API | **Built** | `/api/storehause/*` — auth, stores, builder, orders, public storefront |
| AI agents | **Partial** | Laravel services exist but frontend also runs local synthesis via Next.js API route |
| Database tables | **Partial** | `merchants`, `stores`, `store_orders`, `store_visits`, `storefront_templates`, `storefront_builder_sessions/messages` |
| Queue workers | **Not started** | `jobs` table exists; AI runs inline in HTTP handlers |
| Modular structure | **Not started** | Flat monolith — spec's `app/Modules/` not adopted |
| Payments webhooks | **Not started** | — |
| Product tables | **Not started** | — |

---

## Known Architecture Gaps

These block a working merchant experience today. Fix before payments or publish flow.

1. **Products fight over storefront JSON** — Products, AI builder, and website editor all read/write the same `stores.storefront_content` blob via full PATCH. Saving products can overwrite AI-generated copy (or vice versa) when cache is stale.
2. **Dual AI builder paths** — Laravel (`/storefront-builder/*`) and Next.js (`/api/storefront-builder/ai`) both generate content. Frontend runs local synthesis then posts to backend; output can diverge.
3. **No dedicated product API** — Products page saves via `PATCH /ai/storefront/{id}` with the entire storefront. No validation, no partial update.
4. **AI generation not reliably end-to-end** — Chat can stall before draft generation; "build my website" depends on OpenAI on the Next.js side while backend has separate logic.
5. **Mock-first API client** — Frontend defaults to mocks when `NEXT_PUBLIC_API_BASE_URL` is unset, hiding integration bugs.
6. **Draft vs published** — Implemented (B1): `draft_json` / `published_json` + publish endpoint. **Draft versioning / undo** deferred (B6).

---

# MVP Build Order

Progress against the original sprint plan.

---

## Sprint 1 — Authentication, Merchant, Store

Status: **Built**

* Authentication
* Merchant Creation
* Store Creation

---

## Sprint 2 — AI Builder

Status: **Partial**

* AI Builder — **Partial** (dual paths; generation unreliable)
* Session Storage — **Built**
* Store JSON — **Built**

---

## Sprint 3 — Storefront Renderer

Status: **Partial**

* Storefront Renderer — **Built**
* Templates — **Built** (7 templates)
* Publish Flow — **Not started**

---

## Sprint 4 — Products

Status: **Partial**

* Products — **Partial** (JSON-embedded, no relational model)
* Product Upload — **Partial** (XLSX import in frontend)

---

## Sprint 5 — Orders & Payments

Status: **Partial**

* Orders — **Partial** (basic flow, no customer entity)
* Payments — **Not started**

---

## Sprint 6 — Analytics & Dashboard

Status: **Partial**

* Analytics — **Partial** (page visits only)
* Dashboard — **Built** (merchant KPIs)

---

## Sprint 7 — Visual Editor

Status: **Partial**

* Inline text/image editing — **Built**
* Section hide/duplicate/reorder — **Not started**

---

## Sprint 8 — Domains & Hardening

Status: **Not started**

* Custom domains
* Production hardening (Sentry, PostHog, queue workers)

---

# Prioritized Build Backlog

**Current focus:** perfect AI website generation and product catalog before payments.

Build Phase A top-down. Phases B–D wait until merchants can generate a store and add products reliably.

---

## Phase A — Core Creation Loop (Current Focus)

Make sign up → describe business → generate website → add products → see them on the live storefront work reliably.

| # | Task | Repos | Fixes |
|---|------|-------|-------|
| A1 | **Dedicated products API** — `GET/POST/PATCH/DELETE /storehause/products`; stop saving products via full storefront PATCH | backend, storehause | Products save without wiping storefront content |
| A2 | **Merge products at read time** — public + preview APIs combine storefront JSON + products so home page shows merchant catalog | backend, storehause | Products appear on generated website |
| A3 | **Consolidate AI builder on backend** — remove Next.js `/api/storefront-builder/ai` as generation source; Laravel owns OpenAI + synthesis | backend, storehause | One reliable generation path |
| A4 | **Fix builder generate flow** — explicit generate action, loading/error states, draft persists to `storefront_content` | storehause, backend | "Build my website" produces a preview |
| A5 | **Wire frontend to real API** — require `NEXT_PUBLIC_API_BASE_URL`; mocks opt-in only | storehause | Catch integration issues early |
| A6 | **Product ↔ storefront sync** — `home_products_source: merchant_products`; hide theme placeholders when merchant has catalog | storehause | Real products, not template fillers |

### Phase A acceptance criteria

A merchant can:

1. Complete the AI builder chat and generate a website that previews correctly
2. Add a product (name, price, image) and see it persist after refresh
3. Open the live storefront and see their products on home and products pages
4. Edit the website without losing their product catalog

---

## Phase B — Polish the Store Experience

| # | Task | Repos | Unblocks |
|---|------|-------|----------|
| B1 | Publish flow (`draft_json` / `published_json`, `POST /stores/{id}/publish`) | backend, storehause | Safe preview before go-live ✅ |
| B2 | Product import improvements (CSV validation, error reporting) | storehause, backend | Bulk catalog setup |
| B3 | AI starter products during generation | backend | Faster time-to-first-product |
| B4 | Visual editor section controls | storehause | Sprint 7 completion |
| B5 | Component registry | storehause | Faster template additions |
| B6 | **Deferred** — Draft versioning & undo/redo (in-session Ctrl+Z, server draft revisions, revert to last published) | storehause, backend | Safer AI + manual editing; after B1 + editor polish |

See [modular-storefront-roadmap.md — Deferred versioning](./modular-storefront-roadmap.md#deferred--draft-versioning--undoredo).

---

## Phase C — Commerce & Payments (After core loop works)

| # | Task | Repos | Unblocks |
|---|------|-------|----------|
| C1 | Paystack integration | backend, storehause | Paid orders |
| C2 | Merchant payment settings UI | storehause | Connect Paystack keys |
| C3 | Flutterwave | backend | Payment redundancy |
| C4 | `customers` table | backend | Customer profiles |

---

## Phase D — Platform & Scale

| # | Task | Repos | Unblocks |
|---|------|-------|----------|
| D1 | Queue AI generation | backend | Non-blocking generation |
| D2 | Analytics events | backend, storehause | Funnels |
| D3 | Custom domains | backend, storehause | Custom domains |
| D4 | Admin ops tooling | storehouseadmin, backend | Ops at scale |
| D5 | Sentry + PostHog | all | Observability |
| D6 | RBAC | backend, storehause | Team stores |

---

# Success Criteria

A merchant can:

| Step | Criterion | Status |
|------|-----------|--------|
| 1 | Register | **Done** |
| 2 | Describe business | **Partial** (chat works; profile extraction inconsistent) |
| 3 | Generate store | **Partial** (dual AI paths; generation not reliably end-to-end) |
| 4 | Upload products | **Partial** (saves via full storefront PATCH; may not show on live store) |
| 5 | Connect payments | **Deferred** — after core loop works |
| 6 | Publish store | **Deferred** — after core loop works |
| 7 | Receive orders | **Partial** (orders captured; payments deferred) |

Target: complete steps 1–4 reliably first, then commerce features.

That is the primary product objective of StoreHause.

**Next build target:** Phase A — dedicated products API, backend-owned AI generation, products visible on storefront.
