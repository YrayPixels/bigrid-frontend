# Storefront Template Creation Guide

Use this checklist whenever you add a new storefront template to StoreHause. A complete template usually touches three repos:

- `storehause` - merchant storefront UI, template renderer, previews, mocks.
- `storehausebackend` - template catalog, validation, generation defaults, admin APIs.
- `storehouseadmin` - platform admin UI for activating/deactivating templates.

Replace examples like `beauty`, `Beauty`, and `beauty-shell.tsx` with the new template id/name.

## 1. Choose Template Identity

Define the template id first and keep it consistent everywhere.

- Use a stable lowercase id, for example `beauty`, `luxury_home`, or `streetwear`.
- Use the id in API payloads, database rows, frontend unions, theme resolution, and generated storefront content.
- Decide whether this is a full custom template or only a theme variant.

Recommended naming:

- Template id: `beauty`
- Display label: `Beauty`
- Shell component: `BeautyShell`
- Home component: `BeautyHome`
- Defaults file: `beauty-defaults.ts`

## 2. Merchant App: Register The Template

Repo: `storehause`

Update `src/lib/api/types.ts`:

- Add the id to `StorefrontTemplateId`.
- Add a row to `STOREFRONT_TEMPLATE_OPTIONS`.
- Add or reuse a `StorefrontTemplatePreview` value.
- Include strong `label`, `description`, and `bestFor` copy.

Update `src/lib/storefront/template.ts`:

- Add shell id to `StorefrontTheme["shell"]` if the template has a custom shell.
- Add a `case` in `getStorefrontTheme()`.
- Add a `case` in `getDefaultStorefrontPalette()`.
- Add the template to `STOREFRONT_THEME_PRESETS`.

## 3. Merchant App: Add Template Defaults

Create `src/lib/storefront/<template-id>-defaults.ts`.

Include:

- Category labels.
- Template imagery URLs.
- Product fallback data.
- Product categories that match the design.
- Copy that supports the template’s industry.

Wire it in `src/lib/storefront/product-plugs.ts`:

- Import fallback products.
- Add a branch in `getThemeProducts(templateId)`.

## 4. Merchant App: Add Shell

Create `src/components/storefront/shell/<template-id>-shell.tsx`.

The shell controls:

- Header/nav.
- Logo placement.
- Cart/search/menu affordances.
- Mobile nav.
- Footer.
- Overall page wrapper colors.

Wire it in `src/components/storefront/store-shell.tsx`:

- Import the shell.
- Add `if (theme.shell === "<template-id>") return <TemplateShell />`.

## 5. Merchant App: Add Home Page

Create `src/components/storefront/pages/home/<template-id>-home.tsx`.

The home page should include:

- Hero.
- CTA.
- Product/category sections.
- About/story section.
- Trust/value props.
- FAQ section if appropriate.
- Editable image/text paths where merchants should customize content.

Wire it in `src/components/storefront/pages/home-page.tsx`:

- Import the home component.
- Add `if (theme.id === "<template-id>") return <TemplateHome />`.

## 6. Merchant App: Add All Page Branches

Do not stop at the homepage. Full templates should branch across all important storefront pages.

Update these files:

- `src/components/storefront/pages/products-page-view.tsx`
- `src/components/storefront/pages/product-detail-page-view.tsx`
- `src/components/storefront/pages/cart-page-view.tsx`
- `src/components/storefront/pages/checkout-page-view.tsx`
- `src/components/storefront/pages/content-page-view.tsx`
- `src/components/storefront/pages/faq-page-view.tsx`
- `src/components/storefront/pages/storefront-faq-section.tsx`
- `src/app/s/[slug]/about/page.tsx`
- `src/app/s/[slug]/contact/page.tsx` if contact needs a custom layout.
- `src/app/s/[slug]/privacy-policy/page.tsx` if legal pages need a custom layout.
- `src/app/s/[slug]/checkout/success/page.tsx`

Minimum full-template coverage:

- Products listing should match the template’s catalog style.
- Product detail should match the template’s product storytelling.
- Cart should match the template’s checkout tone.
- Checkout should match the template’s form/card style.
- Success page should match the template’s confirmation style.
- About/contact/FAQ should not fall back to a visually unrelated generic page.

## 7. Merchant App: Add Template Preview UI

Update template picker previews:

- `src/app/admin/onboarding/page.tsx`
- `src/components/admin/website-editor-page.tsx`
- `src/components/storefront/editor/visual-storefront-editor.tsx`

Checklist:

- Add preview variant drawing if needed.
- Make sure active templates are fetched from `api.getStorefrontTemplates()`.
- Keep static `STOREFRONT_TEMPLATE_OPTIONS` as a fallback for mocks/dev.
- Ensure deactivated templates are hidden from new selections.

## 8. Merchant App: Update Mock API

Update `src/lib/api/mocks.ts`:

- Add the template to mock active templates if needed.
- Update `resolveTemplateId()` for relevant industries.
- Update `synthesizeStorefront()` copy, value props, and sample products.
- Ensure mock-generated storefronts use the new template id.

## 9. Backend: Add Catalog Support

Repo: `storehausebackend`

If the template catalog table exists:

- Add a seed row in `database/seeders/StorefrontTemplateSeeder.php`.
- Include `id`, `label`, `description`, `best_for`, `preview`, `sort_order`, `is_active`, and `default_palette`.

If no catalog table exists yet:

- Create a `storefront_templates` table.
- Create `App\Models\StorefrontTemplate`.
- Add active-template APIs.

Expected APIs:

- `GET /storehause/storefront-templates` - active templates for merchant app.
- `GET /admin/storefront-templates` - all templates for platform admin.
- `PATCH /admin/storefront-templates/{id}/status` - activate/deactivate.

## 10. Backend: Validation And AI Selection

Update `app/Http/Controllers/StorehauseController.php` or equivalent service:

- Add the template id to known concrete ids.
- Ensure create/generate/update endpoints validate against active ids for new merchant selections.
- Allow existing saved storefront content to keep rendering known ids, even if inactive.
- Update `resolveStorefrontTemplate()` so relevant industries can AI-pick the new template.
- Provide fallback behavior if the template is inactive.
- Add a palette in `defaultStorefrontPalette()`.
- Update `synthesizeStorefront()` so generated copy/products match the template.

Important policy:

- Deactivated templates should be hidden from selection.
- Existing stores already using a deactivated template should usually keep rendering unless there is an explicit migration plan.

## 11. Platform Admin: Manage Activation

Repo: `storehouseadmin`

Add or update:

- `src/services/api/templates.ts`
- `src/services/api.ts` export
- `src/pages/StorefrontTemplates.tsx`
- `src/App.tsx` route
- `src/layouts/DashboardLayout.tsx` nav item

Admin page should show:

- Template name.
- Description.
- Best-for label.
- Preview key.
- Active/inactive badge.
- Switch or button to activate/deactivate.

Optional support improvement:

- Show `storefront_template_id` on merchant detail store rows.

## 12. Design Quality Checklist

Before calling a template complete, compare it against the reference/design target:

- Typography matches the reference.
- Header/navigation matches the reference.
- Hero layout matches the reference.
- Product cards match the reference.
- Category/collection sections match the reference.
- About/story section matches the reference.
- Product detail, cart, checkout, and success pages feel like the same brand.
- Mobile layout is usable.
- Empty states match the template style.
- Fallback product data matches the industry.
- Generated AI/mock copy does not conflict with the design.

## 13. Verification

Run focused checks after changes.

Merchant app:

```bash
npx eslint "src/components/storefront/pages/home/<template-id>-home.tsx" "src/components/storefront/shell/<template-id>-shell.tsx"
```

Admin app:

```bash
npx eslint "src/pages/StorefrontTemplates.tsx" "src/services/api/templates.ts"
```

Backend:

```bash
php -l app/Http/Controllers/StorehauseController.php
php -l app/Http/Controllers/AdminStorefrontTemplateController.php
php -l app/Models/StorefrontTemplate.php
php -l database/seeders/StorefrontTemplateSeeder.php
```

Manual QA:

- Create a new store using the template.
- Generate storefront content.
- Visit home, products, product detail, cart, checkout, success, about, contact, FAQ, and privacy.
- Toggle the template inactive in admin.
- Confirm it disappears from merchant pickers.
- Confirm existing stores using it still render.

## 14. Common Misses

- Adding only the homepage and forgetting product/detail/cart/checkout pages.
- Adding frontend id but forgetting backend validation.
- Adding backend id but forgetting seed/admin activation.
- Using generic products/copy that do not match the template industry.
- Forgetting template previews in onboarding/editor.
- Hiding inactive templates but breaking existing stores.
- Reusing a shell that visually conflicts with the new design.
- Forgetting mock API behavior, causing local dev to differ from backend behavior.
