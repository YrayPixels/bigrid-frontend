# Store Management System

**Audience:** Engineering, product  
**Version:** 1.1  
**Status:** Active spec · partial implementation  
**Last updated:** June 2026

**Related:** [arch.md](./arch.md) (platform backlog), [modular-storefront-roadmap.md](./modular-storefront-roadmap.md) (storefront blocks + publish), [doc.md](./doc.md) (merchant story)

---

## Overview

The Store Management System is the operational backbone of StoreHause.

The AI Builder creates storefronts; store management is how merchants run the business day to day — products, orders, analytics, payments, and settings.

This document has two layers:

1. **Implementation snapshot** — what exists in code today  
2. **Target specification** — full vision for modules not yet built  

---

## Implementation snapshot

| Module | Status | Admin route | Backend | Notes |
|--------|--------|-------------|---------|-------|
| **Overview / dashboard** | **Built** | `/admin` | `GET /storehause/dashboard` | Sales, visits, conversion, 14-day chart, recent orders |
| **Website builder** | **Built** | `/admin/builder` | `storefront-builder/*` | AI chat, generate, refine, block ops |
| **Store design** | **Partial** | `/admin/website` | `GET/PATCH /ai/storefront/{id}`, `POST /stores/{id}/publish` | Visual block editor, draft vs published, publish flow (B1) |
| **Products** | **Partial** | `/admin/products` | `GET/POST/PATCH/DELETE /storehause/products`, `POST /products/{id}/duplicate`, `POST /products/import` | CRUD, duplicate, archive, low-stock badges, stock check at checkout; CSV/XLSX import |
| **Orders** | **Partial** | `/admin/orders`, `/admin/orders/[id]` | `GET /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status` | List, detail page, status updates; no payments yet |
| **Settings** | **Partial** | `/admin/settings` | `PATCH /stores/me` (name, description, contact, brand color) | Billing, SMS, shipping, payments — placeholder with "Coming soon" |
| **Categories** | **Planned** | — | — | Free-text `category` on product only |
| **Collections** | **Planned** | — | — | — |
| **Customers** | **Planned** | — | — | Customer data lives on orders only |
| **Analytics (deep)** | **Partial** | Overview only | Visits + order aggregates | No product-view / cart / checkout funnel events |
| **Payments** | **Deferred** | Settings tab (UI) | — | After core loop; see Phase C in [arch.md](./arch.md) |
| **Shipping** | **Deferred** | Settings tab (UI) | — | — |
| **Domains** | **Deferred** | — | — | Subdomain via `slug.platform_domain` today |
| **Team / RBAC** | **Deferred** | — | — | Phase D in [arch.md](./arch.md) |
| **Marketing** | **Deferred** | — | — | Phase 2 in target spec below |

### Current admin navigation

```text
Merchant dashboard (storehause)

├── Overview          /admin
├── Website Builder   /admin/builder
├── Website           /admin/website      ← draft edit + publish
├── Products          /admin/products
├── Orders            /admin/orders
└── Settings          /admin/settings     ← mostly UI preview
```

### Implemented API surface (merchant)

Prefix: `/api/storehause` (Sanctum auth unless noted)

| Area | Endpoints |
|------|-----------|
| Store | `GET/PATCH /stores/me`, `POST /stores/{id}/publish`, `POST /stores/{id}/images` |
| Storefront draft | `GET/PATCH /ai/storefront/{id}`, `POST /ai/storefront/generate` |
| Products | `GET/POST /products`, `PATCH/DELETE /products/{id}`, `POST /products/import` |
| Orders | `GET /orders`, `PATCH /orders/{id}/status` |
| Dashboard | `GET /dashboard` |
| Builder | `/storefront-builder/sessions/*` |

Public storefront: `GET /public/storefronts/{slug}` (published content only), orders, contact, visits.

---

## Build priority (updated)

Aligned with [arch.md — Phase A–D](./arch.md#prioritized-build-backlog).

### Now — complete the operational core

| # | Task | Unblocks |
|---|------|----------|
| M1 | **Products polish** — duplicate, archive UX, low-stock display, out-of-stock at checkout | Trustworthy catalog | **Done** |
| M2 | **Orders detail page** — single order view, timeline, customer block | Fulfillment workflow | **Done** |
| M3 | **Dashboard ↔ publish** — show draft/live status, disable “View live” when unpublished | Matches B1 publish flow | **Done** |
| M4 | **Settings: real store fields** — name, description, contact email/phone persisted | Settings tab not placeholder | **Done** |
| M5 | **Product import validation** — row errors, partial success report (B2) | Bulk onboarding | **Done** |

### Next — commerce readiness

| # | Task | Unblocks |
|---|------|----------|
| M6 | **Categories** — `store_categories` table + admin CRUD | Catalog organization |
| M7 | **Customers** — derive from orders; customer list + detail | CRM basics |
| M8 | **Analytics events** — product viewed, add to cart, checkout started | Funnel metrics |
| M9 | **Payments** — Paystack keys, webhooks, paid status (Phase C) | Revenue collection |

### Later

| # | Task |
|---|------|
| M10 | Collections (manual + rules) |
| M11 | Shipping zones / rates |
| M12 | Custom domains |
| M13 | Team roles & permissions |
| M14 | Marketing (discounts, campaigns) |
| M15 | **Deferred** — [draft versioning & undo/redo](./modular-storefront-roadmap.md#deferred--draft-versioning--undoredo) |

---

## Success criteria

| Step | Criterion | Status |
|------|-----------|--------|
| 1 | Merchant sees business KPIs on dashboard | **Done** |
| 2 | Merchant manages products in dedicated catalog (not storefront JSON) | **Done** |
| 3 | Merchant receives and updates orders | **Partial** (list + detail + status; no payments) |
| 4 | Merchant edits website in draft and publishes to go live | **Done** |
| 5 | Merchant configures payments and gets paid orders | **Deferred** |
| 6 | Merchant organizes catalog with categories/collections | **Planned** |
| 7 | Merchant views customer history and marketing tools | **Planned** |

---

# Target specification

The sections below describe the **full vision**. Where they exceed current implementation, treat them as design targets — not shipped behavior.

---

# Dashboard Home

**Status:** Partial — overview KPIs and sales chart built; top products and traffic funnel widgets not yet.

### Purpose

High-level business performance at a glance.

### KPIs (target)

- Revenue, orders, visitors, conversion rate, average order value, returning customers

**Today:** total sales, orders, visits, conversion, AOV, products count, 14-day sales chart, recent orders.

### Dashboard widgets (target)

| Widget | Status |
|--------|--------|
| Revenue overview (daily / weekly / monthly) | Partial (14-day series) |
| Recent orders | **Built** |
| Top products | Planned |
| Traffic summary (views, checkout starts) | Planned |

---

# Product Management

**Status:** Partial — v1 catalog live.

### Purpose

Create and manage products shown on the storefront (`product_grid` reads live catalog).

### Product entity — implemented (v1)

```typescript
// Matches store_products + StoreProductService.format()
interface StoreProduct {
  id: string;              // uuid
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;        // default NGN
  image_url: string | null;
  sku?: string;
  category?: string;       // free text, not categoryId FK yet
  stock_quantity?: number;
  status: "active" | "draft";
  variants?: { name: string; options: string[] }[];
  perks?: string[];
}
```

**Backend:** `store_products` table · **API:** `/storehause/products/*`

### Product entity — target (full)

```typescript
interface Product {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  categoryId?: string;
  status: ProductStatus;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  seo: ProductSEO;
  createdAt: string;
  updatedAt: string;
}

enum ProductStatus {
  DRAFT,
  ACTIVE,
  ARCHIVED,
}
```

### Product features

| Feature | Status |
|---------|--------|
| Create / edit product | **Built** |
| CSV / XLSX import | **Built** (row validation + partial success report) |
| Duplicate product | Planned |
| Archive product | Partial (`draft` status; no archived state) |
| Delete product | **Built** |
| Multiple images, reorder, cover | Planned (single `image_url` today) |
| Variant SKUs with per-variant stock/price | Partial (options JSON only) |

---

# Inventory Management

**Status:** Partial — `stock_quantity` on product; no alerts or checkout enforcement yet.

### Target features

- Stock tracking — **Partial** (field exists)
- Low stock alerts — Planned
- Out of stock protection at checkout — Planned
- Inventory adjustments (restock, bulk) — Planned

---

# Categories

**Status:** Planned — use `category` string on product until `store_categories` exists.

### Target

Hierarchical categories with slug and optional `parentId`.

---

# Collections

**Status:** Planned — manual and rule-based collections for merchandising.

---

# Order Management

**Status:** Partial.

### Order lifecycle (target)

```text
Pending → Paid → Processing → Shipped → Delivered
          ↘ Cancelled / Refunded
```

**Today:** `pending`, `processing`, `fulfilled`, `cancelled`, `refunded` — payment status separate (`payment_status: pending`); no Paystack yet.

### Implemented

- Public checkout creates order with line items from live product catalog
- Merchant order list with search and pagination
- Status updates from admin

### Planned

- Order detail page with timeline
- Paid / shipped states tied to payment + shipping providers
- Refund flow via payment provider

---

# Customer Management

**Status:** Planned — customer fields stored on each order; no `customers` table.

### Target entity

```typescript
{
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
}
```

---

# Analytics System

**Status:** Partial.

### Events (target)

```text
Store Viewed · Product Viewed · Add To Cart · Checkout Started · Purchase Completed
```

**Today:** `store_visits` (page visits), order aggregates on dashboard. No product-view or cart events.

---

# Store Design

**Status:** Partial — strong on AI + blocks; publish flow complete.

### Implemented

- AI builder (generate, refine, block ops on all pages)
- Visual website editor (block reorder, section props, template + palette)
- **Draft vs published** — edits go to `draft_json`; `POST /stores/{id}/publish` promotes to live
- Contact form block + inquiries table

### Target (theme editor)

- Fine-grained theme tokens (fonts, buttons, layout width) beyond palette
- Homepage modules beyond current block catalog

See [modular-storefront-roadmap.md](./modular-storefront-roadmap.md) for block pipeline status.

---

# Payments

**Status:** Deferred (Phase C).

### Target providers

- Paystack, Flutterwave

### Target features

- Merchant key configuration (secure storage)
- Webhooks, verification, refunds, transaction history

---

# Shipping Management

**Status:** Deferred — settings UI preview only.

### Target

- Shipping zones (e.g. Lagos / Abuja / Other Nigeria rates)
- Flat rate, free shipping, local pickup

---

# Domain Management

**Status:** Deferred.

**Today:** `{slug}.{platform_domain}` and optional `primary_domain` on store.

### Target

- Custom domain connect + TXT/CNAME verification

---

# Team Management

**Status:** Deferred (Phase D — RBAC).

### Target roles

Owner, Manager, Inventory Manager, Support Agent with granular permissions.

---

# Marketing Module

**Status:** Deferred (Phase 2).

Email campaigns, discount codes, abandoned cart, customer segments.

---

# Database — current vs target

### Implemented tables (store management–related)

```text
stores                 (+ draft_json, published_json, published_at)
store_products
store_orders
store_visits
store_contact_inquiries
merchants
storefront_builder_sessions / messages
```

### Target additional tables

```text
store_categories
store_collections
collection_products
customers
payments
domains
shipping_zones
shipping_rates
team_members
roles
permissions
storefront_draft_revisions   ← deferred versioning
```

---

# Engineering rules

1. **Products never live in storefront JSON** — catalog is `store_products`; merged at read time for preview/live.
2. **Publish is the live boundary** — merchant edits draft; customers see `published_json` only.
3. **Admin UI matches API truth** — avoid placeholder settings that imply backend exists; label “Coming soon” until wired.
4. **Nigeria-first defaults** — NGN currency, local shipping/payment providers in target spec.
5. **Extend before rewrite** — add columns/tables alongside v1 product model; migrate merchants without breaking catalog.

---

This is the operational core of StoreHause. Update the **Implementation snapshot** and **Build priority** sections whenever a module ships.
