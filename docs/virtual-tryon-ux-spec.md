# Virtual Try-On — UX & Merchant Enablement Spec

Lightweight product spec for PerfectCorp YCE **bag** (`/task/bag`) and **clothes** (`/task/cloth-v4`) on StoreHause public storefronts.

This is **AI photo try-on** (async image generation), not live camera AR. Shopper-facing copy must say **“See it on you”** / **“Try it on”** — never “AR” unless we later ship a real camera overlay.

---

## Goals

1. Reduce “will this suit me?” friction on fashion / accessory PDPs.
2. Work for **any merchant who opts in** — never bleed into ineligible catalogs.
3. Keep **purchase primary**: Buy now / Add to cart remain available; try-on earns the click as a confidence step.
4. One shared shopper UI for bag + clothes; mode differs by product config + photo rules.

## Non-goals (v1)

- Live camera / WebAR overlay
- Multi-item outfit builder / wardrobe collage
- Guest account system beyond local “saved look” photo
- Merchant-branded style studios beyond PerfectCorp bag presets
- Automatic enablement for all products or all stores

---

## Merchant enablement

### Store-level (required gate)

Off by default. Merchant turns on **Virtual try-on** in admin (Settings or Products → Try-on).

When off:

- No PDP CTA
- No public try-on APIs accept jobs for that store

When on:

- Merchant accepts a short notice: shopper photos are processed by a third-party AI provider; StoreHause stores try-on results as needed for delivery/history.
- Optional: monthly / per-try usage limit (platform billing later; stub quota field).

### Product-level

Each product gets:

| Field | Values | Notes |
| --- | --- | --- |
| `try_on.enabled` | `true` / `false` | Default `false` even if store is on |
| `try_on.mode` | `bag` \| `clothes` \| `auto` | `auto` only if we confidently infer from category |
| `try_on.garment_category` | `auto` \| `full_body` \| `upper_body` \| `lower_body` \| `outerwear` \| `shoes` | Clothes only; map to cloth-v4 |
| `try_on.ref_image_url` | URL \| null | Optional override; else use cover / first gallery image that passes checks |
| `try_on.bag_gender_default` | `female` \| `male` \| `ask` | Bags only; `ask` = prompt in sheet |
| `try_on.bag_style` | preset id \| `random` | Bags only |

**CTA visibility rule (all must pass):**

1. Store try-on enabled
2. Product `try_on.enabled`
3. Product has a **try-on-ready reference image**
4. Product status is active

If any fail → no try-on control on PDP (don’t show a disabled “coming soon” stub).

### Admin UX

**Store settings — Virtual try-on**

- Toggle on/off
- Short “what shoppers see” preview + photo guidelines link
- Status: provider connected / not configured (platform ops)

**Product edit — Try-on section**

- Enable for this product
- Mode: Bag / Clothes / Off
- Clothes: garment category select (default Auto)
- Bags: default gender + style (or Ask / Random)
- Reference image: “Use cover” or pick from gallery / upload try-on shot
- Readiness checklist (inline, soft):
  - Single product / person in frame
  - Front-facing
  - Enough resolution
  - Clothes lower-body: worn outfit preferred over flat lay when API requires it

**Bulk (later):** “Enable for all products in category X” with mode preset.

### Category inference (optional helper)

Suggest mode when category name/slug matches heuristically:

| Hint | Suggested mode |
| --- | --- |
| bag, handbag, purse, tote, clutch | `bag` |
| dress, top, shirt, jacket, pants, shoes, apparel | `clothes` + garment category |

Never auto-enable; only pre-fill fields when merchant turns try-on on for that product.

---

## Shopper experience

### Placement (PDP)

**Primary try-on CTA** in the purchase block, above or as the first action in the CTA stack:

```
[ Try it on ]          ← primary visual weight when eligible
[ Buy now ] [ Add to cart ]
```

Template variants (fashion, beauty, cosmetics, minimalistic, etc.) all use the same interaction model; styling follows each template’s button language.

Purchase CTAs must **never** be removed or demoted to tertiary when try-on is on. If layout is tight (mobile), order:

1. Try it on  
2. Buy now  
3. Add to cart  

### Entry → Fitting sheet

Opens a **full-viewport sheet / modal** (mobile: nearly full screen; desktop: centered panel ~max 480–560px wide or split preview).

**Steps**

1. **Photo**
   - Upload photo or camera capture
   - “Use my saved look” if a prior shopper look exists for this browser/device
   - Mode-specific tip:
     - Bags: clear face + upper body, head to chest
     - Clothes: standing, face visible, body forward; full/half body per garment rules
2. **Options** (only when needed)
   - Bags: gender (if `ask`) + style chips (Parisian / Urban / Mediterranean / Art Deco / Surprise me)
   - Clothes: usually no extra options; garment category is merchant-set
3. **Generating**
   - Product thumbnail + progress copy (“Creating your look… usually under a minute”)
   - Cancel stops polling on client; server job may still finish (v1: no cancel API required)
4. **Result**
   - Large result image
   - Actions: **Add to cart**, **Buy now**, **Try again**, **Save look** (keeps shopper photo + optionally result)
   - Soft disclaimer: “AI preview — color and fit may vary”

### Saved look

- Store shopper source photo (and last result URL) in **local storage** keyed by store slug for v1
- Later: account-linked “My looks” if auth exists on storefront

### Errors (shopper language)

| Provider / validation | Shopper copy |
| --- | --- |
| No face / pose | “We need a clearer photo facing the camera” |
| Bad ref / apply mismatch | “This product photo isn’t try-on ready — try another item” (rare; prefer blocking CTA) |
| NSFW / inference | “Couldn’t create this look — try a different photo” |
| Timeout / poll expired | “Still working — refresh or try again in a moment” |
| Quota | “Try-on is temporarily unavailable for this store” |

Never expose PerfectCorp error codes raw.

### Privacy

In-sheet microcopy near upload:

> Your photo is used only to create this try-on preview.

Link to store privacy policy if present.

---

## Image readiness (merchant + shopper)

Aligned with PerfectCorp specs (see `bag-virtualtryon.md`, `virtual-tryon-clothes.md`).

### Reference (product)

**Bags**

- Product shot preferred; single bag; ≥ ~25% of frame height; min ~512×512
- Or worn bag with clear, unobstructed product

**Clothes**

- Single garment, front-facing product shot **or** worn reference that fully covers the apply region
- No composites (top + bottom in one flat image)
- Lower body / some categories may require worn refs — surface in admin checklist

### Source (shopper)

**Bags:** selfie / upper body, face fully visible, single person  
**Clothes:** standing forward, face visible, enough body for garment category

Client-side soft checks before submit: file type/size, min dimension, single obvious subject tip (no need for client ML in v1).

---

## Data model (proposed)

Extend product payload (JSON today; migrate with dedicated products API when ready):

```ts
try_on?: {
  enabled: boolean;
  mode: "bag" | "clothes";
  garment_category?: "auto" | "full_body" | "upper_body" | "lower_body" | "outerwear" | "shoes";
  ref_image_url?: string | null;
  bag_gender_default?: "female" | "male" | "ask";
  bag_style?: string; // preset id or "random"
};
```

Store-level (store settings / storefront config):

```ts
features?: {
  virtual_try_on?: {
    enabled: boolean;
    // platform-managed; merchants don't set API keys
  };
};
```

Try-on job (backend owned; not in storefront JSON):

- `id`, `store_id`, `product_id`, `mode`, `provider_task_id`, `status`, `result_url` (copied to our storage), `error_code`, timestamps

---

## Platform / API boundary (for implementers)

Shopper never talks to PerfectCorp.

```
Storefront → StoreHause backend → PerfectCorp YCE
                ↑ webhook or poll
                ↓ persist result URL
```

Suggested public/merchant-safe endpoints (names TBD):

- `POST /storehause/stores/{slug}/try-on/sessions` — create job (product id, mode, shopper image upload or URL)
- `GET  /storehause/stores/{slug}/try-on/sessions/{id}` — status + result
- Admin: store feature toggle + product `try_on` fields via existing product PATCH paths

Rules:

- Bearer / PerfectCorp key only on backend
- Prefer provider webhooks when available; else poll within documented window so jobs don’t expire unpaid
- Copy result from PerfectCorp TTL URL into StoreHause storage before returning to client for share/history
- Rate-limit per IP + per store

---

## Phased rollout

| Phase | Scope | Success signal |
| --- | --- | --- |
| **0** | Provider key in backend, internal playground / admin-only test store | Stable bag + cloth job round-trip |
| **1** | Bag try-on + store toggle + product enable + PDP CTA + sheet | Fashion merchants can demo bags on live PDP |
| **2** | Clothes cloth-v4 + garment category + stricter ref checklist | Apparel PDPs show credible try-ons |
| **3** | Saved looks, result gallery, usage metering / soft caps | Repeat tries without re-upload; cost control |

Ship Phase 1 first: lighter photo burden, clearer “wow” for accessories, shared sheet shell reused for clothes.

---

## Analytics (minimal)

Events:

- `tryon_cta_view` / `tryon_cta_click`
- `tryon_upload` / `tryon_submit`
- `tryon_success` / `tryon_error` (reason bucket)
- `tryon_add_to_cart` / `tryon_buy_now` (from result step)

Compare conversion on eligible PDPs with vs without try-on engagement.

---

## Open decisions

1. **CTA weight:** Confirm Try it on as first button vs equal grid with Buy now (current templates use Buy now + Add to cart grid).
2. **Guest photo retention:** local-only v1 vs optional account later.
3. **Who pays:** included in StoreHause plan vs metered try quota for merchants.
4. **Template coverage:** all templates day-one vs fashion (+ beauty) first.

---

## References

- [Bag API notes](./bag-virtualtryon.md)
- [Clothes API notes](./virtual-tryon-clothes.md)
- PDP purchase CTAs: `src/components/storefront/pages/product-detail-page-view.tsx`
- Product shape: `StoreProduct` in `src/lib/api/types.ts`
