# StoreHause Technical Architecture Specification

Version: 1.0

Status: Engineering Blueprint

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

# MVP Build Order

Sprint 1

* Authentication
* Merchant Creation
* Store Creation

Sprint 2

* AI Builder
* Session Storage
* Store JSON

Sprint 3

* Storefront Renderer
* Templates
* Publish Flow

Sprint 4

* Products
* Product Upload

Sprint 5

* Orders
* Payments

Sprint 6

* Analytics
* Dashboard

Sprint 7

* Visual Editor

Sprint 8

* Domains
* Production Hardening

---

# Success Criteria

A merchant can:

1. Register
2. Describe business
3. Generate store
4. Upload products
5. Connect payments
6. Publish store
7. Receive orders

In less than 10 minutes.

That is the primary product objective of StoreHause.
