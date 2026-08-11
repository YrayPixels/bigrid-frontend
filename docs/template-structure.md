# Storefront Template Structure

**Audience:** Engineering  
**Purpose:** Shared contract for homepage heroes and template shells so every template supports the same merchant-editable header media (image + video).  
**Last updated:** August 2026

Use this when adding a new template or upgrading an older bespoke home so it stays compatible with the builder and `media.hero_*` fields.

---

## Quick checklist (every home template)

A homepage hero is complete when it has all of the following:

1. Reads `storefront.media?.hero_image_url` and `storefront.media?.hero_video_url`
2. Renders `EditableHeroMedia` (not `EditableImage`) for the header/campaign layer
3. Uses `imagePath="media.hero_image_url"` and `videoPath="media.hero_video_url"`
4. Places media as a full-bleed background (`absolute inset-0`) inside a `relative` / `isolate` hero section
5. Adds a readability overlay (gradient or scrim) between media and copy
6. Keeps eyebrow / headline / subheadline / CTA on a higher `z-index` layer
7. Falls back to the template’s default hero image when `hero_image_url` is empty

Reference implementations:

- `src/components/storefront/pages/home/minimalistic-home.tsx`
- `src/components/storefront/pages/home/fashion-lookbook-home.tsx`

Shared media control:

- `src/components/storefront/theme/editable-hero-media.tsx`

---

## Content model

### Required hero copy (flat paths)

| Path | Role |
|------|------|
| `hero.headline` | Primary H1 |
| `hero.subheadline` | Supporting sentence |
| `hero.cta_label` | Primary CTA label |
| `hero.eyebrow` | Optional badge / kicker (some templates) |

### Required hero media

| Path | Role |
|------|------|
| `media.hero_image_url` | Poster / still background |
| `media.hero_video_url` | Looping muted autoplay background (preferred when set) |

Upload / edit behavior (already wired):

- Setting an image clears `hero_video_url`
- Setting a video keeps the existing image as the video poster
- In edit mode, merchants double-click the hero media to upload image or video (`image/*`, `video/mp4`, `video/webm`, `video/quicktime`)

Do **not** introduce template-specific media paths for the homepage header. Always use `media.hero_image_url` / `media.hero_video_url` so the builder, path editor, and public storefront stay in sync.

---

## Required hero layout pattern

```tsx
const heroImageUrl = storefront.media?.hero_image_url ?? templateDefaults.hero;
const heroVideoUrl = storefront.media?.hero_video_url ?? null;

<section className="relative isolate min-h-[…%] overflow-hidden …">
  <EditableHeroMedia
    imagePath="media.hero_image_url"
    videoPath="media.hero_video_url"
    imageSrc={heroImageUrl}
    videoSrc={heroVideoUrl}
    alt={`${store.business_name} banner`}
    className="absolute inset-0 -z-10"
    mediaClassName="object-cover object-center"
  />
  <div
    className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/40 to-black/55"
    aria-hidden
  />
  <div className="relative z-10 …">
    {/* eyebrow, headline, subheadline, CTA */}
  </div>
</section>
```

### Layout rules

| Rule | Why |
|------|-----|
| Hero media is background, not a side cutout | Video and lifestyle images need an edge-to-edge plane |
| Overlay sits above media, below copy | Text stays readable on any upload |
| `object-cover` on media | Avoid letterboxing when aspect ratios differ |
| One interactive upload target | Avoid two `EditableImage` / `EditableHeroMedia` controls bound to the same path |
| Preserve template typography/CTA styling | Only the media mounting pattern is shared |

Side/cutout product packs are fine in *lower* sections. They must not be the only place `media.hero_*` is rendered.

---

## Template file map

| Template ID | Home component | Shell / chrome | Notes |
|-------------|----------------|----------------|-------|
| `minimalistic` | `pages/home/minimalistic-home.tsx` | `shell/minimalistic-shell.tsx` | Reference full-bleed hero |
| `fashion_lookbook` | `pages/home/fashion-lookbook-home.tsx` | `shell/fashion-shell.tsx` | Reference full-bleed hero |
| `beauty` | `pages/home/beauty-home.tsx` | `shell/beauty-shell.tsx` | Full-bleed hero + editorial type |
| `hair-and-fashion` | `pages/home/hair-and-fashion-home.tsx` | `shell/hair-fashion-shell.tsx` | Hero includes inline top nav |
| `cosmetics` | `pages/home/cosmetics-home.tsx` | `shell/cosmetics-shell.tsx` | Full-bleed hero; product packs stay in lower sections |
| `furniture-hardware` | `pages/home/furniture-hardware-home.tsx` | `shell/furniture-*.tsx` | Rounded full-bleed hero card |
| `classic` / `editorial` / `bold_grid` | `pages/home/classic-home.tsx` | `shell/default-shell.tsx` | Soft scrim over media |

Router: `src/components/storefront/pages/home-page.tsx` switches on `theme.id`.

Catalog: `STOREFRONT_TEMPLATE_OPTIONS` in `src/lib/api/types.ts`.

---

## What belongs in a template vs shared code

### Shared (do not fork)

- `EditableHeroMedia`, `EditableImage`, `EditableText`, `StorefrontLink`
- Media paths in `editable-paths.ts` / backend `StorefrontPathEditor`
- Hero copy fields on `StorefrontContent.hero`
- Theme palette + fonts from `useStorefrontTheme()`

### Per-template (ok to customize)

- Section order after the hero (collections, value props, FAQ, etc.)
- Typography scale, spacing, border radius, decorative accents
- Default stock images in `*-defaults.ts`
- Product card treatment
- Shell navigation / footer presentation

---

## Anti-patterns

1. **`EditableImage` for the homepage header** — blocks video uploads and ignores `hero_video_url`.
2. **Hero media as a portrait cutout only** — merchants set “background” media and it never fills the viewport.
3. **Duplicate upload targets** on the same `media.hero_*` path (for example background + product pack both editable).
4. **Template-local media keys** (`props.banner_video`, etc.) without syncing back to `media.hero_video_url`.
5. **Hard-coded `<img>` / `<video>`** without the editable wrapper — breaks in-canvas editing.

---

## Upgrade recipe for an older template

1. Import `EditableHeroMedia`.
2. Add `const heroVideoUrl = storefront.media?.hero_video_url ?? null`.
3. Replace the hero `EditableImage` (or static media) with the pattern in [Required hero layout pattern](#required-hero-layout-pattern).
4. Convert any side-image/cutout hero into full-bleed background + overlay; keep the existing headline/CTA styles.
5. Smoke-test in builder edit mode:
   - Double-click hero → upload image
   - Double-click hero → upload mp4/webm
   - Confirm video plays muted/looped and image is used as poster
   - Confirm published storefront shows the same media
6. Keep lower-section imagery on their own paths (`media.about_image_url`, block `image_url`, product images).

---

## Related files

- Theme / editable controls: `src/components/storefront/theme/`
- Home router: `src/components/storefront/pages/home-page.tsx`
- Editable path writers: `src/lib/storefront-builder/editable-paths.ts`
- Canvas upload routing: `src/components/storefront/editor/storefront-editor-canvas.tsx`
- Backend path allowlist: `storehausebackend/app/Services/StorefrontPathEditor.php`
- Broader modular roadmap: [modular-storefront-roadmap.md](./modular-storefront-roadmap.md)
