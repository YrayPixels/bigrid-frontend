# StoreHause AI Shop Builder - Product & Technical Specification

Version: 1.1

Owner: StoreHause

Status: Living Spec — Build Phase

Last reviewed: June 2026

See also: [arch.md](./arch.md) for implementation status, build backlog, and admin platform details.

---

# Vision

StoreHause enables any merchant to launch a professional online store in minutes by simply describing their business.

Instead of manually building pages, uploading assets, selecting themes, and configuring layouts, merchants interact with an AI-powered storefront builder that generates:

* Brand identity
* Storefront design
* Homepage copy
* Product catalog structure
* Navigation
* Store settings

The merchant can then edit, publish, and start selling immediately.

---

# Product Goals

## Merchant Goals

A merchant should be able to:

* Create an account
* Describe their business
* Generate a complete storefront
* Upload products
* Connect payments
* Publish

Within 5-10 minutes.

---

## Platform Goals

StoreHause should:

* Increase merchant onboarding completion
* Reduce setup friction
* Improve store launch rates
* Increase merchant retention
* Create a scalable AI-assisted commerce platform

---

# User Journey

## Step 1 - Sign Up

Merchant provides:

* Name
* Email
* Password

System creates:

* User
* Merchant
* Default Store

---

## Step 2 - AI Discovery

AI asks questions.

Examples:

* What business do you run?
* What products do you sell?
* Who are your customers?
* What tone fits your brand?
* Do you have a logo?

Collected information:

```json
{
  "businessName": "",
  "industry": "",
  "targetAudience": "",
  "brandTone": "",
  "primaryProducts": [],
  "location": "",
  "contactInformation": {}
}
```

---

## Step 3 - Store Generation

AI generates:

### Brand

* Colors
* Typography
* Visual style

### Content

* Hero section
* About section
* FAQs
* Policies

### Structure

* Home
* About
* Products
* Contact

### Design

Template recommendation engine selects:

* Classic
* Editorial
* Beauty
* Fashion
* Minimal
* Cosmetics

---

## Step 4 - Preview

Merchant sees:

* Mobile preview
* Desktop preview

Actions:

* Regenerate
* Edit
* Publish

---

## Step 5 - Product Import

Merchant can:

### Option A

Manual entry

### Option B

CSV upload

### Option C

Image upload

AI extracts:

* Product Name
* Description
* Price
* Category
* Inventory

### Option D

WhatsApp Catalog Import

Future feature.

---

# AI Builder Architecture

## Multi-Agent System

### Agent 1 - Interpreter

Purpose:

Understand merchant intent.

Input:

Merchant conversation

Output:

```json
{
  "industry": "Fashion",
  "targetAudience": "Women 18-35",
  "brandTone": "Luxury"
}
```

---

### Agent 2 - Planner

Purpose:

Create generation strategy.

Output:

```json
{
  "template": "fashion_lookbook",
  "sections": [
    "hero",
    "featuredProducts",
    "about",
    "testimonials"
  ]
}
```

---

### Agent 3 - Generator

Creates:

* Store content
* Layout structure
* Branding

Output:

Store JSON

---

### Agent 4 - Critic

Reviews:

* Missing content
* Layout issues
* Brand consistency
* Conversion opportunities

Returns recommendations.

---

# Store JSON Schema

```json
{
  "theme": {},
  "branding": {},
  "pages": [],
  "navigation": [],
  "products": [],
  "settings": {}
}
```

This JSON becomes the source of truth.

Frontend renders from JSON.

Editor updates JSON.

AI updates JSON.

---

# Merchant Dashboard

## Overview

Metrics:

* Orders
* Revenue
* Conversion Rate
* Visitors
* Products

---

## Dashboard Modules

### Dashboard

Cards:

* Revenue
* Orders
* Visitors
* Conversion

Charts:

* Sales
* Traffic
* Product Performance

---

### AI Builder

Purpose:

Generate and improve storefronts.

Features:

* Chat interface
* Regenerate sections
* Rewrite content
* Theme changes

---

### Products

Features:

* Create Product
* Edit Product
* Delete Product
* Bulk Upload
* AI Product Generation

Fields:

* Name
* Price
* Description
* Inventory
* Images

---

### Orders

Features:

* View Orders
* Update Status
* Refunds
* Customer Details

Statuses:

* Pending
* Paid
* Processing
* Shipped
* Delivered
* Cancelled

---

### Customers

Features:

* Customer List
* Purchase History
* Customer Analytics

---

### Analytics

Metrics:

* Store Visits
* Conversion Rate
* Top Products
* Returning Customers

---

### Marketing

Future Module

Features:

* Email Campaigns
* SMS Campaigns
* WhatsApp Campaigns

---

### Website Editor

Visual editing system.

Merchant clicks:

* Text
* Images
* Buttons

And edits inline.

Changes update Store JSON.

---

### Settings

Store Settings

* Domain
* Contact Info
* Shipping
* Taxes
* Payments

---

# AI Features Roadmap

## Phase 1

### AI Store Builder

Generate complete storefront.

### AI Product Writer

Generate product descriptions.

### AI SEO Assistant

Generate:

* Titles
* Meta descriptions
* Keywords

---

## Phase 2

### AI Store Auditor

Analyze:

* Branding
* Content
* UX

Provide recommendations.

---

### AI Sales Coach

Suggest:

* Best-selling products
* Pricing opportunities
* Promotions

---

## Phase 3

### AI Growth Agent

Autonomous agent capable of:

* Running campaigns
* Suggesting promotions
* Generating landing pages

---

# Payments

Supported Providers

## Phase 1

* Paystack
* Flutterwave

## Phase 2

* Stripe
* Lemon Squeezy

---

# Multi-Tenant Architecture

Store URL:

```text
merchant.storehause.com
```

Alternative:

```text
storehause.com/s/merchant
```

Custom Domains:

```text
www.mystore.com
```

---

# Database Entities

## Merchants

```text
id
business_name
industry
subscription
status
```

## Stores

```text
id
merchant_id
slug
template
store_json
```

## Products

```text
id
store_id
name
price
inventory
```

## Orders

```text
id
store_id
customer_id
status
total
```

## Visits

```text
id
store_id
session_id
referrer
```

---

# MVP Success Metrics

## Merchant Metrics

* Store Generated
* Store Published
* Products Added
* First Order

## Business Metrics

* Activation Rate
* Retention Rate
* Monthly Revenue
* Conversion Rate

---

# Definition of Done

A merchant can:

| Step | Criterion | Status |
|------|-----------|--------|
| 1 | Sign up | **Done** |
| 2 | Describe business | **Partial** |
| 3 | Generate store | **Partial** |
| 4 | Add products | **Partial** |
| 5 | Connect payments | **Deferred** |
| 6 | Publish | **Deferred** |
| 7 | Receive orders | **Partial** (orders only; payments deferred) |

Without assistance from StoreHause support.

---

# Implementation Status

High-level snapshot. Full detail, sprint progress, and build backlog are in [arch.md](./arch.md).

---

## Product Journey

| Step | Spec | Built? |
|------|------|--------|
| Sign up + default store | User, Merchant, Store created on registration | Yes |
| AI discovery chat | Business profile extraction via multi-agent flow | Partial — dual Next.js/Laravel paths |
| Store generation | Brand, content, structure, template selection | Partial — not reliably end-to-end |
| Preview (mobile + desktop) | Builder preview + website editor | Built |
| Regenerate / edit | Chat edits + inline editor | Partial |
| Product import (manual) | Admin products page | Partial — saves via full storefront PATCH |
| Product import (CSV) | XLSX upload in frontend | Partial |
| Product visible on storefront | Home + products pages show merchant catalog | **Broken / unreliable** |
| Connect payments | Paystack / Flutterwave | **Deferred** — after core loop works |
| Publish | Explicit publish separates draft from live | **Deferred** |
| Receive paid orders | Webhook confirms payment | **Deferred** |

---

## Dashboard Modules

| Module | Status |
|--------|--------|
| Dashboard (KPIs, charts) | Built |
| AI Builder | **Partial** — chat works; generation unreliable; dual AI paths |
| Products | **Partial** — no dedicated API; may not show on live storefront |
| Orders | Partial — list + status, no refunds |
| Customers | Not started |
| Analytics | Partial — visits only, no funnels |
| Website Editor | Partial — inline edit, no section controls |
| Marketing | Not started (future) |
| Settings | Partial — UI placeholders for payments, domain, shipping |

---

## AI Features Roadmap

| Feature | Phase | Status |
|---------|-------|--------|
| AI Store Builder | 1 | **Partial** — needs reliable end-to-end generation |
| AI Product Writer | 1 | Not started |
| AI SEO Assistant | 1 | Not started |
| AI Store Auditor | 2 | Partial (Critic agent in builder only) |
| AI Sales Coach | 2 | Not started |
| AI Growth Agent | 3 | Not started |

---

## What to Build Next

**Principle:** perfect the creation loop (AI builder + products) before payments.

Priority order (see [arch.md — Phase A](./arch.md#phase-a--core-creation-loop-current-focus)):

1. **Dedicated products API** — stop saving products via full storefront PATCH
2. **Products on storefront** — merge catalog at read time; show merchant products on home/products pages
3. **Consolidate AI builder on backend** — Laravel owns generation; remove Next.js as generation source
4. **Fix generate flow** — "build my website" reliably produces and persists a draft
5. **Real API by default** — mocks opt-in only
6. **Payments** — only after steps 1–5 pass acceptance criteria
