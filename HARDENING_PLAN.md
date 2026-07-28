# StoreHause Hardening Plan

Cross-repo plan for storehause, storehouseadmin, and storehausebackend.

## Phase 0 — Quick wins ✅
- [x] Remove gptengineer.js from admin index.html
- [x] Gitignore + stop tracking .history/ in admin
- [x] Convert maintenance routes to POST + header auth; remove /tester and /debug-env
- [x] Remove default admin password from .env.example; AdminSeeder requires strong password
- [x] Add .env.example + README for both frontends

## Phase 1 — Lock down AI ✅
- [x] Require auth:sanctum on AI chat/vision/config routes
- [x] Enforce AI credits on generateDraftStream + StorefrontCodeController
- [x] Harden VisionAgent against SSRF / local file reads
- [x] Require auth on Next.js /api proxies; no unauthenticated OpenAI fallback in prod
- [x] Add Pest tests for AI auth + SSRF rejection

## Phase 2 — Uploads & webhooks ✅
- [x] MIME-derived upload extensions
- [x] TikTok webhook HMAC verification
- [x] Restrict CORS to known app origins (+ subdomain patterns)
- [x] Cap product image_url

## Phase 3 — Auth hardening ✅
- [x] Validate Google OAuth state before code exchange (peek + consume on success)
- [x] Short-lived auth/impersonation exchange codes (no tokens in URLs)
- [x] Middleware protect /admin on merchant app (companion cookie)
- [x] Frontend RBAC on platform admin
- [x] Uniform admin login errors; random_int for codes
- [x] /validate-token returns formatUser
- [x] Remove is_admin/admin_role from User $fillable

## Phase 4 — Checkout & cart ✅
- [x] Paystack verifyPayment error handling
- [x] Refresh cart prices from live products
- [x] Storefront-scoped error boundary

## Phase 5 — DX baseline ✅
- [x] Shared env config; never auto-mock in production (explicit USE_MOCKS only)
- [x] Enable TS noImplicitAny + strictNullChecks on admin
- [x] Error boundaries + lazy routes (admin)
- [x] Unify Sonner toasts; fix doubles
- [x] Wire Form Requests (Login/Register)
- [x] CI workflows (lint/test/build)

## Phase 6 — Maintainability (partial) ✅
- [x] StorePolicy registered + used in findOwnedStore
- [ ] Split oversized API client by domain (backlog)
- [ ] Next/Image for key storefront images (backlog)
- [ ] Full httpOnly cookie sessions (optional Phase 3b backlog)
- [ ] Move uploads to S3 disk in production (MIME fix done; cloud disk backlog)
