# AI Storefront Builder Flow

This document describes the StoreHause AI storefront-builder experience: how merchants create a store through chat, how the platform selects templates, how content is generated, how products are uploaded, and what we are building across the storefront, admin, and backend systems.

## Product Vision

StoreHause should let a merchant create a polished ecommerce storefront by describing their business in a chat-style interface.

The user should be able to say something like:

> I want to create a skincare storefront for organic products. The brand should feel premium, clean, and natural.

From that conversation, the platform should:

- Understand the business type, brand direction, customer, and product style.
- Recommend the best templates as selectable visual widgets.
- Ask for the minimum missing business information.
- Generate professional storefront copy and page content.
- Apply the selected template, palette, imagery, and content.
- Generate new reusable templates when the existing catalog does not fit the merchant's goal.
- Help the merchant upload, clean up, categorize, and publish products.
- Keep everything editable through chat, inline editing, and structured controls.

The important principle is that AI should generate structured storefront data, not random page markup. Templates remain the source of layout and design quality. AI fills the right content slots.

## Core Experience

### 1. Chat-Based Store Creation

The merchant starts with a conversational prompt:

- "Create a clothing storefront for streetwear."
- "I sell handmade candles and need a simple online shop."
- "Build me a luxury skincare website."
- "I need a storefront for food delivery and packaged meals."

The assistant should identify:

- Industry.
- Product type.
- Target customer.
- Brand tone.
- Location and currency.
- Visual preference.
- Whether the user already has products.
- Whether the user has a logo, brand colors, or product photos.

The assistant should not ask for too much upfront. It should collect only the minimum needed to produce a useful first draft, then allow refinement.

### 2. Template Recommendations

After understanding the request, the platform should show 2-4 recommended templates as widgets.

Each widget should include:

- Template preview image or mini render.
- Template name.
- Best-for description.
- Industry fit.
- Tone tags, for example `minimal`, `luxury`, `bold`, `natural`, `editorial`.
- Why the AI recommended it.

The user can:

- Select one template.
- Ask to see more options.
- Ask for a different style.
- Let AI choose automatically.

Template choice should be saved as:

- `merchant_selected` when the user picks the template.
- `ai_selected` when the user asks the assistant to decide.

### 3. Business Details Collection

Once a template is selected, the platform should collect essential business details:

- Business name.
- Business description.
- Industry.
- Logo.
- Brand color or color preference.
- Contact email and phone.
- Location, if needed.
- Currency.
- Social links, if available.
- Product availability status.

Some fields can be optional at draft time. For example, a store can be generated without a logo and use a text logo until the merchant uploads one.

### 4. AI Content Generation

The assistant should generate complete storefront content that maps into the `StorefrontContent` model:

- Hero headline.
- Hero subheadline.
- CTA label.
- About title and body.
- Value propositions.
- FAQ items.
- Contact page copy.
- Privacy policy starter copy.
- SEO title.
- SEO description.
- Product category labels.
- Template-specific sections.

The generated copy should match:

- Selected template.
- Industry.
- Brand tone.
- Product type.
- Customer profile.
- Merchant-provided business details.

For example, a cosmetics storefront should produce language around skin routines, ingredients, glow, formulas, and product benefits. A fashion storefront should use language around collections, fit, drops, styling, and lookbooks.

### 5. Live Preview And Editing

After generation, the merchant sees a live storefront preview.

They should be able to edit in three ways:

- Chat editing: "Make this sound more premium" or "Rewrite the hero for Gen Z customers."
- Inline editing: click text or images and edit directly.
- Section regeneration: regenerate only the hero, FAQ, about section, or product descriptions.

AI edits should update structured paths, for example:

- `hero.headline`
- `hero.subheadline`
- `about.body`
- `pages.faq.items`
- `media.hero_image_url`
- `products[0].description`

If a merchant manually edits a field, the system should track that field as user-edited so later AI regeneration does not overwrite it unless the merchant explicitly asks.

### 6. Product Upload And AI Product Cleanup

The merchant should be able to add products through:

- Manual product form.
- Bulk CSV upload.
- Product images with AI-assisted extraction.
- Chat instructions, for example "Add a product called Glow Repair Serum for 24000 naira."

AI should help normalize products into the `StoreProduct` shape:

- Product name.
- Slug.
- Short description.
- Long description, if supported later.
- Price.
- Currency.
- Category.
- Image URL.
- SKU.
- Stock quantity.
- Status.
- Variants.
- Perks or highlights.

AI can also:

- Rewrite weak descriptions.
- Generate SEO-friendly product copy.
- Categorize products.
- Suggest missing fields.
- Detect duplicate products.
- Format uploaded CSV data.
- Extract likely product names from image filenames.
- Recommend which products should be featured on the homepage.

Product upload should produce a review step before publishing. AI can prepare products, but the merchant should confirm the final catalog.

### 7. AI Template Generation

The platform should eventually be able to generate new templates, not only select from existing ones.

If the user asks for a storefront that does not fit the current template catalog, the AI should be able to propose and generate a new template using `StorefrontTemplateCreation.md` as the implementation checklist.

Examples:

- "Create a luxury furniture storefront."
- "I want a digital products storefront for selling Notion templates."
- "Build a restaurant storefront with menu sections and delivery CTAs."
- "Make a sportswear storefront like our fashion template but more energetic."

The AI should use existing templates as foundations:

- Start from the closest existing template.
- Reuse proven shell, page, product card, cart, checkout, and editor patterns.
- Adapt layout, palette, typography, imagery, and copy slots for the new industry.
- Add the new template to the platform catalog so future merchants can use it.
- Generate defaults, fallback products, category labels, and mock/storefront generation behavior.
- Keep all user-facing copy editable through structured content paths.

This should make StoreHause a learning template system. Every high-quality generated template can become part of the reusable template library after review.

AI-generated templates should not go directly into production without checks. The system should create them as draft templates first, then require validation and activation.

Recommended template lifecycle:

- `requested` - a merchant or admin asks for a new template.
- `draft_generated` - AI creates the template implementation and metadata.
- `preview_ready` - the template can be previewed with generated content.
- `review_required` - platform/admin review is needed.
- `active` - the template is available to merchants.
- `inactive` - hidden from new selection but existing stores can still render.

When generating a template, AI should follow the same coverage expectations as hand-built templates:

- Template identity and metadata.
- Frontend type registration.
- Template defaults.
- Shell.
- Homepage.
- Products page.
- Product detail page.
- Cart.
- Checkout.
- Success page.
- About, contact, FAQ, and privacy pages when needed.
- Preview UI.
- Mock API behavior.
- Backend catalog support.
- Backend AI selection.
- Admin activation controls.

The generated template should also include a short implementation note explaining:

- Which existing template it was based on.
- What industries and tones it targets.
- Which content slots it supports.
- What still needs human review.
- What tests or manual QA were run.

## Data Model Direction

The current `StorefrontContent` structure is a good foundation:

```ts
type StorefrontContent = {
  template?: {
    id: StorefrontTemplateId;
    source: "merchant_selected" | "ai_selected";
  };
  palette?: StorefrontColorPalette;
  data_plugs?: {
    home_products_source?: "merchant_products" | "theme_products";
  };
  media?: {
    hero_image_url?: string | null;
    about_image_url?: string | null;
    category_images?: (string | null)[];
  };
  hero: { headline: string; subheadline: string; cta_label: string };
  about: { title: string; body: string };
  value_props: { title: string; body: string }[];
  pages?: StorefrontPages;
  products?: StoreProduct[];
  seo: { title: string; description: string };
};
```

The next improvement is to support richer template-specific sections without hardcoding visible copy inside React components.

Suggested future shape:

```ts
type StorefrontContent = {
  template?: StorefrontTemplateSelection;
  palette?: StorefrontColorPalette;
  media?: StorefrontMedia;
  hero: StorefrontHeroContent;
  about: StorefrontAboutContent;
  value_props: StorefrontValueProp[];
  sections?: Record<string, StorefrontSectionContent>;
  pages?: StorefrontPages;
  products?: StoreProduct[];
  seo: StorefrontSeoContent;
  edit_metadata?: StorefrontEditMetadata;
};
```

Template-specific sections could look like:

```ts
sections: {
  cleanserFeature: {
    title: "Best Skin Cleanser",
    body: "A gentle daily cleanser made for balanced, glowing skin.",
    image_url: "...",
    cta_label: "Shop Cleansers"
  },
  routineFeature: {
    title: "Build Your Daily Ritual",
    body: "Cleanse, treat, and hydrate with a routine made for consistency."
  }
}
```

This lets templates stay visually custom while the content remains editable and AI-friendly.

## Template Metadata

Each template should have metadata that helps AI recommend it.

Suggested metadata:

```ts
type StorefrontTemplateMetadata = {
  id: StorefrontTemplateId;
  label: string;
  description: string;
  best_for: string[];
  industries: Industry[];
  tone_tags: string[];
  visual_tags: string[];
  product_types: string[];
  preview: string;
  default_palette: StorefrontColorPalette;
  required_content_slots: string[];
  optional_content_slots: string[];
  origin: "platform" | "ai_generated" | "admin_created";
  base_template_id?: StorefrontTemplateId;
  generation_status?: "requested" | "draft_generated" | "preview_ready" | "review_required" | "active" | "inactive";
  is_active: boolean;
};
```

Example:

```ts
{
  id: "cosmetics",
  label: "Cosmetics",
  description: "A clean, premium storefront for skincare and beauty products.",
  best_for: ["skincare brands", "beauty products", "routine-based catalogs"],
  industries: ["beauty_and_skincare"],
  tone_tags: ["natural", "premium", "clean", "soft"],
  visual_tags: ["editorial", "product-focused", "minimal"],
  product_types: ["physical"],
  required_content_slots: ["hero", "about", "value_props", "faq", "products"],
  optional_content_slots: ["routineFeature", "ingredientFeature"]
}
```

## AI Responsibilities

AI should be responsible for:

- Understanding merchant intent.
- Asking useful follow-up questions.
- Ranking templates.
- Explaining template recommendations.
- Generating structured storefront content.
- Generating draft templates when the current catalog is not enough.
- Using `StorefrontTemplateCreation.md` as the checklist for generated templates.
- Learning from existing template patterns and adapting them into new reusable templates.
- Rewriting and improving copy.
- Generating page-level content.
- Normalizing products.
- Suggesting product categories.
- Creating draft SEO metadata.
- Helping users edit the site conversationally.

AI should not be responsible for:

- Generating arbitrary frontend code for a merchant storefront.
- Activating new generated templates without review.
- Publishing without merchant confirmation.
- Overwriting user-edited content silently.
- Inventing stock, pricing, or legal claims without user input.
- Making medical, financial, or regulated product claims without guardrails.

## System Responsibilities

### Merchant App

The merchant app should provide:

- Chat-based creation flow.
- Template recommendation widgets.
- Template generation request flow when no existing template is a strong fit.
- Store draft preview.
- Inline editable storefront preview.
- Product upload and review UI.
- Publish controls.
- Manual override controls for template, palette, copy, images, and products.

### Backend

The backend should provide:

- Active template catalog.
- Template metadata.
- AI template-generation endpoint.
- Draft template preview endpoint.
- AI template-selection endpoint.
- Storefront generation endpoint.
- Storefront update endpoint.
- Product normalization endpoint.
- Product import endpoint.
- Draft and publish workflow.
- Validation for generated content.
- Audit trail of AI changes.

### Platform Admin

The admin app should provide:

- Template activation and deactivation.
- Template metadata management.
- AI-generated template review queue.
- Visibility into which templates are used by stores.
- Ability to update template descriptions and best-for labels.
- Optional review tools for AI-generated output quality.

## Suggested API Flow

### Start Builder Session

```http
POST /storehause/storefront-builder/sessions
```

Creates a draft builder session from the merchant's first prompt.

### Recommend Templates

```http
POST /storehause/storefront-builder/recommend-templates
```

Input:

```json
{
  "prompt": "I want a premium organic skincare store",
  "industry": "beauty_and_skincare",
  "tone": ["premium", "natural", "clean"]
}
```

Output:

```json
{
  "recommendations": [
    {
      "template_id": "cosmetics",
      "score": 0.94,
      "reason": "Best fit for skincare products, natural copy, and product routine storytelling."
    }
  ]
}
```

### Generate Storefront Draft

```http
POST /storehause/storefront-builder/generate
```

Generates structured `StorefrontContent` and saves it as a draft.

### Apply Chat Edit

```http
POST /storehause/storefront-builder/edit
```

Examples:

- "Make the homepage more luxury."
- "Rewrite the FAQ section."
- "Change the CTA to Shop the Collection."
- "Use a warmer tone."

The response should include a patch of changed content paths rather than replacing the whole storefront blindly.

### Normalize Products

```http
POST /storehause/products/normalize
```

Turns raw uploaded product data into clean product drafts.

### Request Generated Template

```http
POST /admin/storefront-templates/generate
```

Creates a draft generated template from a prompt, selected base template, and target industry.

Input:

```json
{
  "prompt": "Create a premium furniture storefront with editorial product storytelling.",
  "base_template_id": "minimalistic",
  "industry": "home_and_living",
  "tone": ["premium", "warm", "editorial"]
}
```

Output:

```json
{
  "template_id": "premium_furniture",
  "status": "draft_generated",
  "base_template_id": "minimalistic",
  "review_notes": [
    "Generated from the minimalistic template foundation.",
    "Needs product detail and checkout visual QA before activation."
  ]
}
```

Generated templates should follow `StorefrontTemplateCreation.md` and remain inactive until reviewed.

### Publish Storefront

```http
POST /storehause/storefront-builder/publish
```

Publishes the approved draft storefront and products.

## Draft And Publish Model

The builder should separate draft state from published state.

Recommended states:

- `collecting_requirements`
- `template_recommendation`
- `content_generated`
- `products_pending`
- `review_ready`
- `published`

This prevents half-generated stores from going live and gives the merchant a clear review step.

## Editing Guardrails

The system should track:

- AI-generated fields.
- User-edited fields.
- Last generated timestamp.
- Source prompt.
- Template used.
- AI model or provider used.
- Content paths changed by each edit.

Example:

```ts
type StorefrontEditMetadata = {
  locked_paths?: string[];
  user_edited_paths?: string[];
  ai_generated_paths?: string[];
  last_generation_prompt?: string;
  last_generated_at?: string;
};
```

When the user says "regenerate the homepage," the system should avoid overwriting paths in `user_edited_paths` unless the user confirms.

## Build Phases

### Phase 1: Structured AI Store Drafts

- Add richer template metadata.
- Add AI template recommendation.
- Generate `StorefrontContent` JSON from business details.
- Render generated content in existing templates.
- Keep publishing manual.

### Phase 2: Builder UI

- Add chat-style storefront builder.
- Add template recommendation widgets.
- Add draft preview.
- Add basic chat edits for hero, about, FAQ, and SEO.
- Add field-level source tracking.

### Phase 3: Product Assistant

- Add CSV product upload.
- Add product normalization.
- Add AI product description generation.
- Add product review before import.
- Support homepage featured product selection.

### Phase 4: Advanced Editing

- Add section-level regeneration.
- Add inline editing for all important template content.
- Add image replacement guidance.
- Add palette suggestions.
- Add user-edited field protection.

### Phase 5: Admin And Quality Controls

- Add template metadata management in platform admin.
- Add active/inactive controls.
- Add template usage analytics.
- Add AI output review tooling.
- Add guardrails for regulated or sensitive industries.

### Phase 6: AI Template Generation

- Add draft template generation from prompts.
- Use existing templates as base patterns.
- Generate template metadata, defaults, shell, page branches, previews, and backend catalog entries.
- Add generated template preview mode.
- Add admin review and activation workflow.
- Track generated template origin, base template, status, and quality notes.
- Promote approved generated templates into the reusable catalog.

## Quality Checklist

Before the AI storefront builder is considered ready:

- AI returns valid structured content.
- Templates render generated content without layout issues.
- Recommended templates match the user's industry and tone.
- User can choose a different template.
- Generated copy matches the selected template.
- Merchant can edit content manually.
- Chat edits update only relevant fields.
- User-edited fields are not overwritten silently.
- Product uploads can be reviewed before publishing.
- Empty product states still look polished.
- Draft stores are not published accidentally.
- Existing stores keep rendering if a template is deactivated.
- AI-generated templates follow `StorefrontTemplateCreation.md`.
- AI-generated templates are reviewed before activation.
- Generated templates can be reused by future stores after approval.

## Guiding Principle

StoreHause should feel like ChatGPT for creating an ecommerce website, but the implementation should stay structured:

- Chat is the interface.
- Templates are the design system.
- Generated templates expand the design system.
- `StorefrontContent` is the source of truth.
- AI generates and edits content slots.
- AI can generate draft templates, but activation requires quality control.
- Merchants always review before publishing.

