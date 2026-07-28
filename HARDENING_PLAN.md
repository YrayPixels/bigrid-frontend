# StoreHause Hardening Plan

Cross-repo plan for storehause, storehouseadmin, and storehausebackend.

## Phase 0 — Quick wins
- [ ] Remove gptengineer.js from admin index.html
- [ ] Gitignore + stop tracking .history/ in admin
- [ ] Convert maintenance routes to POST + header auth; remove /tester
- [ ] Remove default admin password from .env.example
- [ ] Align branding (Bizgrid → StoreHause where appropriate)
- [ ] Add .env.example + README for both frontends

## Phase 1 — Lock down AI
- [ ] Require auth:sanctum on AI chat/vision routes
- [ ] Enforce AI credits on generateDraftStream + StorefrontCodeController
- [ ] Harden VisionAgent against SSRF / local file reads
- [ ] Require auth on Next.js /api proxies; no unauthenticated OpenAI fallback in prod
- [ ] Add Pest tests for AI auth + SSRF rejection

## Phase 2 — Uploads & webhooks
- [ ] MIME-derived upload extensions; Storage disk (S3 in prod)
- [ ] TikTok webhook HMAC verification
- [ ] Restrict CORS to known app origins
- [ ] Cap product image_url; reject huge data URLs

## Phase 3 — Auth hardening
- [ ] Validate Google OAuth state before code exchange
- [ ] Short-lived auth/impersonation exchange codes (no tokens in URLs)
- [ ] Middleware protect /admin on merchant app
- [ ] Frontend RBAC on platform admin
- [ ] Uniform admin login errors; random_int for codes
- [ ] /validate-token returns formatUser

## Phase 4 — Checkout & cart
- [ ] Paystack verifyPayment error handling
- [ ] Refresh cart prices from live products
- [ ] Storefront-scoped error boundary

## Phase 5 — DX baseline
- [ ] Shared env config; never auto-mock in production
- [ ] Enable TS strict on admin (incremental)
- [ ] Error boundaries + lazy routes (admin)
- [ ] Unify Sonner toasts; fix doubles
- [ ] Wire Form Requests or remove dead ones
- [ ] Remove is_admin/admin_role from User $fillable
- [ ] CI workflows (lint/test/build)

## Phase 6 — Maintainability (key items)
- [ ] Split oversized API client by domain
- [ ] Next/Image for key storefront images
- [ ] Policies for Store ownership (starter)
