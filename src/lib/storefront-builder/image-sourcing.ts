import type { BuilderMediaTarget, Industry, StorefrontContent } from "@/lib/api/types";
import { ensureHomeBlocksOnStorefront } from "@/lib/storefront/blocks/sync-legacy";
import { migrateHomeBlocks } from "@/lib/storefront/blocks/migrate-home";
import { migrateAboutBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import type { StorefrontBlock } from "@/lib/storefront/blocks/types";
import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "@/lib/storefront-builder/agents/openaiChat";
import {
  buildImageSearchLinks,
  catalogEntriesBySection,
  catalogEntriesForIndustry,
  catalogEntryById,
  catalogForAiPrompt,
  WEBSITE_IMAGE_CATALOG,
} from "@/lib/storefront-builder/image-catalog";
import { applyMediaToStorefront } from "@/lib/storefront-builder/local-ai";
import {
  fetchTemplatePlanFromUnsplash,
  formatUnsplashPhotoUrl,
  inferUnsplashSearchPlanWithAi,
  searchUnsplashPhotos,
} from "@/lib/storefront-builder/unsplash-client";
import { resolveCategoryShowcaseProps, showcaseItemsMissingImages } from "@/lib/storefront/blocks/category-showcase-utils";
import { ensureMerchantHomepageProducts } from "@/lib/storefront/product-plugs";
import type { ImageReplaceScope } from "@/lib/storefront-builder/section-scope";
import { describeImageScope } from "@/lib/storefront-builder/section-scope";

export type SourcedImageRecommendation = {
  target: BuilderMediaTarget | "template_block" | "product";
  url: string;
  label: string;
  reason: string;
  catalog_id?: string;
  path?: string;
};

export type ImageSourceContext = {
  business_name?: string | null;
  industry?: Industry | string | null;
  description?: string | null;
  tone?: string[];
};

export type ImageSourceResult = {
  recommendations: SourcedImageRecommendation[];
  search_terms: string[];
  source_links: Array<{ label: string; href: string }>;
  summary: string;
};

export type TemplateImagePlan = {
  hero_url: string;
  about_url: string;
  promo_url: string;
  spotlight_url: string;
  product_urls: string[];
};

function fallbackPlan(industry?: Industry | string | null): TemplateImagePlan {
  const pool = catalogEntriesForIndustry(industry);
  const hero = pool.find((entry) => entry.section === "hero") ?? catalogEntryById("minimal-hero-product")!;
  const about = pool.find((entry) => entry.section === "about") ?? catalogEntryById("minimal-about-interior")!;
  const promo = pool.find((entry) => entry.section === "lifestyle") ?? pool.find((entry) => entry.section === "product") ?? hero;
  const spotlight = pool.find((entry) => entry.section === "about" && entry.id !== about.id) ?? about;
  const products = catalogEntriesBySection("product")
    .filter((entry) => !industry || entry.industries.includes(industry as Industry))
    .slice(0, 6)
    .map((entry) => entry.url);

  return {
    hero_url: hero.url,
    about_url: about.url,
    promo_url: promo.url,
    spotlight_url: spotlight.url,
    product_urls: products.length ? products : [hero.url, about.url, promo.url],
  };
}

function idsToUrls(ids: unknown, fallback: string[]): string[] {
  if (!Array.isArray(ids)) return fallback;
  const urls = ids
    .map((id) => (typeof id === "string" ? catalogEntryById(id)?.url : null))
    .filter((url): url is string => typeof url === "string");
  return urls.length ? urls : fallback;
}

function buildSearchTerms(context: ImageSourceContext, intent?: string): string[] {
  const industry = context.industry?.toString().replace(/_/g, " ") ?? "shop";
  const parts = [context.description, intent, industry]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  return parts.length ? parts.slice(0, 4) : ["small business", industry];
}

async function resolveTemplateImagePlan(
  intent: string,
  context: ImageSourceContext = {},
): Promise<{ plan: TemplateImagePlan; summary: string; search_terms: string[]; source: "unsplash" | "catalog" }> {
  const fallback = fallbackPlan(context.industry);

  const unsplashPlan = await fetchTemplatePlanFromUnsplash(
    {
      industry: context.industry,
      description: context.description,
      tone: context.tone,
    },
    intent,
  );
  if (unsplashPlan) {
    console.info("[image-sourcing] using live Unsplash photos");
    return {
      plan: unsplashPlan,
      search_terms: unsplashPlan.search_terms.length
        ? unsplashPlan.search_terms
        : buildSearchTerms(context, intent),
      summary: unsplashPlan.summary ?? "I found fresh Unsplash photos that match your brand.",
      source: "unsplash",
    };
  }

  console.info("[image-sourcing] falling back to curated catalog");

  const catalog = catalogForAiPrompt();

  try {
    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You pick cohesive stock photos for an entire small-business website template.\n" +
            "Choose catalog ids that match the merchant business, industry, and vibe.\n" +
            "Return ONLY valid JSON with keys:\n" +
            '- "hero_image_id": string — homepage header\n' +
            '- "about_image_id": string — about section / brand story\n' +
            '- "promo_image_id": string — promo banner or secondary hero accent\n' +
            '- "spotlight_image_id": string — about spotlight / rich text image on homepage\n' +
            '- "product_image_ids": array of 3-6 catalog ids — product grid photos\n' +
            '- "search_terms": array of 3-5 strings for finding more photos on Unsplash/Pexels\n' +
            '- "summary": string — one warm sentence about the photo direction\n' +
            "All ids must exist in the catalog. Pick a cohesive set — not random mismatches.",
        },
        {
          role: "user",
          content: JSON.stringify({
            merchant_request: intent,
            business_name: context.business_name ?? null,
            industry: context.industry ?? null,
            description: context.description ?? null,
            tone: context.tone ?? [],
            image_catalog: catalog,
          }),
        },
      ],
    });

    const parsed = parseJsonObject<{
      hero_image_id?: string;
      about_image_id?: string;
      promo_image_id?: string;
      spotlight_image_id?: string;
      product_image_ids?: unknown;
      search_terms?: unknown;
      summary?: string;
    }>(getAssistantMessageContent(data), {});

    const hero = typeof parsed.hero_image_id === "string" ? catalogEntryById(parsed.hero_image_id) : null;
    const about = typeof parsed.about_image_id === "string" ? catalogEntryById(parsed.about_image_id) : null;
    const promo = typeof parsed.promo_image_id === "string" ? catalogEntryById(parsed.promo_image_id) : null;
    const spotlight =
      typeof parsed.spotlight_image_id === "string" ? catalogEntryById(parsed.spotlight_image_id) : null;

    const searchTerms = Array.isArray(parsed.search_terms)
      ? parsed.search_terms
          .filter((term): term is string => typeof term === "string" && term.trim().length > 0)
          .map((term) => term.trim())
      : [];

    const plan: TemplateImagePlan = {
      hero_url: hero?.url ?? fallback.hero_url,
      about_url: about?.url ?? fallback.about_url,
      promo_url: promo?.url ?? spotlight?.url ?? fallback.promo_url,
      spotlight_url: spotlight?.url ?? about?.url ?? fallback.spotlight_url,
      product_urls: idsToUrls(parsed.product_image_ids, fallback.product_urls),
    };

    return {
      plan,
      search_terms: searchTerms.length ? searchTerms : buildSearchTerms(context, intent),
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "I picked on-brand photos for your homepage, about section, and products.",
      source: "catalog",
    };
  } catch {
    return {
      plan: fallback,
      search_terms: buildSearchTerms(context, intent),
      summary: "I picked starter photos that fit your industry.",
      source: "catalog",
    };
  }
}

function patchBlockImage(
  block: StorefrontBlock,
  url: string,
  options?: { force?: boolean },
): StorefrontBlock {
  const props = (block.props ?? {}) as Record<string, unknown>;
  if (!options?.force && !("image_url" in props)) return block;
  return { ...block, props: { ...props, image_url: url } };
}

function patchCategoryShowcaseBlocks(blocks: StorefrontBlock[], plan: TemplateImagePlan): StorefrontBlock[] {
  return blocks.map((block) => {
    if (block.type !== "category_showcase" && block.id !== "category-showcase") return block;

    const props = (block.props ?? {}) as { items?: Array<{ label?: string; image_url?: string | null }> };
    const items = Array.isArray(props.items) ? props.items : [];
    if (!items.length || !plan.product_urls.length) return block;

    return {
      ...block,
      props: {
        ...props,
        items: items.map((item, index) => ({
          ...item,
          // Fill gaps only — keep merchant/custom collection photos.
          image_url:
            item.image_url && String(item.image_url).trim()
              ? item.image_url
              : plan.product_urls[index % plan.product_urls.length] ?? item.image_url,
        })),
      },
    };
  });
}

function patchHomeBlocks(blocks: StorefrontBlock[], plan: TemplateImagePlan): StorefrontBlock[] {
  let ctaIndex = 0;
  const ctaUrls = [plan.promo_url, plan.spotlight_url, plan.about_url, plan.hero_url].filter(Boolean);

  return patchCategoryShowcaseBlocks(
    blocks.map((block) => {
      if (block.type === "hero") return patchBlockImage(block, plan.hero_url, { force: true });
      if (block.id === "about-spotlight" || (block.type === "rich_text" && block.id !== "about-main")) {
        return patchBlockImage(block, plan.spotlight_url, { force: true });
      }
      if (block.type === "cta_banner") {
        const url = ctaUrls[ctaIndex % ctaUrls.length] ?? plan.promo_url;
        ctaIndex += 1;
        return patchBlockImage(block, url, { force: true });
      }
      if (block.type === "feature_grid") {
        return patchBlockImage(block, plan.spotlight_url || plan.about_url, { force: true });
      }
      return block;
    }),
    plan,
  );
}

function patchAboutBlocks(blocks: StorefrontBlock[], plan: TemplateImagePlan): StorefrontBlock[] {
  return blocks.map((block) => {
    if (block.id === "about-main" || block.type === "rich_text") {
      return patchBlockImage(block, plan.about_url);
    }
    return block;
  });
}

export function applyTemplateImagesAcrossStorefront(
  storefront: StorefrontContent,
  plan: TemplateImagePlan,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const ensured = ensureMerchantHomepageProducts(storefront);
  let next = structuredClone(ensured.storefront);
  const changedPaths = new Set<string>();

  ensureHomeBlocksOnStorefront(next);

  next.media = {
    ...next.media,
    hero_image_url: plan.hero_url,
    about_image_url: plan.about_url,
  };
  changedPaths.add("media.hero_image_url");
  changedPaths.add("media.about_image_url");

  const homeBlocks = patchHomeBlocks(migrateHomeBlocks(next), plan);
  next.pages = {
    ...next.pages,
    home: { blocks: homeBlocks },
  };
  for (const block of homeBlocks) {
    const props = block.props as { image_url?: string; items?: Array<{ image_url?: string | null }> };
    if (props.image_url) changedPaths.add(`pages.home.blocks.${block.id}.props.image_url`);
    if (block.type === "category_showcase" || block.id === "category-showcase") {
      props.items?.forEach((_, index) => {
        changedPaths.add(`pages.home.blocks.${block.id}.props.items.${index}.image_url`);
      });
    }
  }

  const aboutBlocks = patchAboutBlocks(migrateAboutBlocks(next), plan);
  next.pages = {
    ...next.pages,
    about: {
      ...next.pages!.about!,
      blocks: aboutBlocks,
    },
  };
  for (const block of aboutBlocks) {
    const props = block.props as { image_url?: string };
    if (props.image_url) changedPaths.add(`pages.about.blocks.${block.id}.props.image_url`);
  }

  if (next.products?.length && plan.product_urls.length) {
    next.products = next.products.map((product, index) => ({
      ...product,
      image_url: plan.product_urls[index % plan.product_urls.length] ?? product.image_url,
    }));
    next.products.forEach((_, index) => changedPaths.add(`products.${index}.image_url`));
  }

  next.data_plugs = {
    ...next.data_plugs,
    home_products_source: "merchant_products",
  };

  ensureHomeBlocksOnStorefront(next);

  return { storefront: next, changed_paths: [...changedPaths] };
}

async function fetchImageUrlsForQueries(queries: string[], max: number): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (urls.length >= max) break;
    const results = await searchUnsplashPhotos(query, 3);
    for (const photo of results) {
      const url = formatUnsplashPhotoUrl(photo, 1080);
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
        break;
      }
    }
  }

  return urls;
}

function fallbackCategoryShowcaseUrls(
  intent: string,
  context: ImageSourceContext,
  count: number,
): string[] {
  const lower = `${intent} ${context.description ?? ""} ${context.business_name ?? ""}`.toLowerCase();
  const jewelry = /\b(jewelry|jewellery|ring|necklace|bracelet|earring|gold|silver|luxury)\b/.test(lower);
  const entries = jewelry
    ? WEBSITE_IMAGE_CATALOG.filter((entry) => entry.tags.some((tag) => /jewelry|luxury|gold|premium|accessories/.test(tag)))
    : catalogEntriesForIndustry(context.industry);

  const urls = entries.map((entry) => entry.url);
  if (!urls.length) {
    return WEBSITE_IMAGE_CATALOG.slice(0, count).map((entry) => entry.url);
  }

  return Array.from({ length: count }, (_, index) => urls[index % urls.length]);
}

function applyHeroImagesOnly(
  storefront: StorefrontContent,
  plan: TemplateImagePlan,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const next = structuredClone(storefront);
  const changedPaths = new Set<string>();
  ensureHomeBlocksOnStorefront(next);

  next.media = { ...next.media, hero_image_url: plan.hero_url };
  changedPaths.add("media.hero_image_url");

  const homeBlocks = migrateHomeBlocks(next).map((block) =>
    block.type === "hero" ? patchBlockImage(block, plan.hero_url) : block,
  );
  next.pages = { ...next.pages, home: { blocks: homeBlocks } };
  for (const block of homeBlocks) {
    if (block.type === "hero") {
      changedPaths.add(`pages.home.blocks.${block.id}.props.image_url`);
    }
  }

  ensureHomeBlocksOnStorefront(next);
  return { storefront: next, changed_paths: [...changedPaths] };
}

function applyAboutImagesOnly(
  storefront: StorefrontContent,
  plan: TemplateImagePlan,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const next = structuredClone(storefront);
  const changedPaths = new Set<string>();
  ensureHomeBlocksOnStorefront(next);

  next.media = { ...next.media, about_image_url: plan.about_url };
  changedPaths.add("media.about_image_url");

  const aboutBlocks = patchAboutBlocks(migrateAboutBlocks(next), plan);
  next.pages = {
    ...next.pages,
    about: {
      ...next.pages!.about!,
      blocks: aboutBlocks,
    },
  };
  for (const block of aboutBlocks) {
    const props = block.props as { image_url?: string };
    if (props.image_url) changedPaths.add(`pages.about.blocks.${block.id}.props.image_url`);
  }

  ensureHomeBlocksOnStorefront(next);
  return { storefront: next, changed_paths: [...changedPaths] };
}

function applyProductImagesOnly(
  storefront: StorefrontContent,
  plan: TemplateImagePlan,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const ensured = ensureMerchantHomepageProducts(storefront);
  const next = structuredClone(ensured.storefront);
  const changedPaths: string[] = [];

  if (!next.products?.length || !plan.product_urls.length) {
    return { storefront: next, changed_paths: changedPaths };
  }

  next.products = next.products.map((product, index) => ({
    ...product,
    image_url: plan.product_urls[index % plan.product_urls.length] ?? product.image_url,
  }));
  next.products.forEach((_, index) => changedPaths.push(`products.${index}.image_url`));
  next.data_plugs = {
    ...next.data_plugs,
    home_products_source: "merchant_products",
  };

  return { storefront: next, changed_paths: changedPaths };
}

export async function applyCategoryShowcaseImagesOnly(
  storefront: StorefrontContent,
  intent: string,
  context: ImageSourceContext = {},
): Promise<{ storefront: StorefrontContent; changed_paths: string[]; search_terms: string[]; summary: string }> {
  const next = structuredClone(storefront);
  ensureHomeBlocksOnStorefront(next);

  const homeBlocks = migrateHomeBlocks(next);
  const changedPaths: string[] = [];
  const searchTerms: string[] = [];

  const updatedBlocks = [];
  for (const block of homeBlocks) {
    if (block.type !== "category_showcase" && block.id !== "category-showcase") {
      updatedBlocks.push(block);
      continue;
    }

    const currentItems = resolveCategoryShowcaseProps(next, block.id).items;
    const missingIndexes = showcaseItemsMissingImages(currentItems);
    const items = [...currentItems];

    // Prefer per-tile Unsplash queries from the collection label when images are missing.
    for (const index of missingIndexes) {
      const label = items[index]?.label?.trim() || intent || context.description || "product collection";
      searchTerms.push(label);
      const urls = await fetchImageUrlsForQueries([label], 1);
      const fallback =
        urls[0] ??
        fallbackCategoryShowcaseUrls(label, context, 1)[0] ??
        null;
      if (fallback) {
        items[index] = { ...items[index], image_url: fallback };
        changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.image_url`);
      }
    }

    // AI already chose category_showcase scope — fill gaps, or refresh all when every tile already has a photo.
    if (!missingIndexes.length) {
      const queries = currentItems.map(
        (item) => item.label?.trim() || intent || context.description || "product collection",
      );
      searchTerms.push(...queries);
      const urls = await fetchImageUrlsForQueries(queries, Math.max(queries.length, 4));
      const resolvedUrls =
        urls.length > 0 ? urls : fallbackCategoryShowcaseUrls(intent, context, Math.max(queries.length, 4));
      for (let index = 0; index < items.length; index += 1) {
        const imageUrl = resolvedUrls[index % Math.max(resolvedUrls.length, 1)];
        if (!imageUrl) continue;
        items[index] = { ...items[index], image_url: imageUrl };
        changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.image_url`);
      }
    }

    updatedBlocks.push({
      ...block,
      props: { ...(block.props as Record<string, unknown>), items },
    });
  }

  next.pages = { ...next.pages, home: { blocks: updatedBlocks } };
  ensureHomeBlocksOnStorefront(next);

  const filled = changedPaths.length;
  return {
    storefront: next,
    changed_paths: changedPaths,
    search_terms: [...new Set(searchTerms)],
    summary:
      filled > 0
        ? `I updated ${filled} collection photo${filled === 1 ? "" : "s"} across your Essentials / collections sections.`
        : `Your ${describeImageScope("category_showcase")} already had photos — tell me if you want them refreshed.`,
  };
}

export async function replaceScopedStorefrontImages(args: {
  intent: string;
  storefront: StorefrontContent;
  scope: ImageReplaceScope;
  context?: ImageSourceContext;
}): Promise<{
  storefront: StorefrontContent;
  changed_paths: string[];
  result: ImageSourceResult;
}> {
  if (args.scope === "full_site") {
    return replaceTemplateImagesForStorefront(args);
  }

  if (args.scope === "category_showcase") {
    const applied = await applyCategoryShowcaseImagesOnly(args.storefront, args.intent, args.context ?? {});
    const showcaseItems =
      resolveCategoryShowcaseProps(applied.storefront).items?.map((item, index) => ({
        target: "template_block" as const,
        url: item.image_url?.trim() || "",
        label: item.label?.trim() || `Category image ${index + 1}`,
        reason: describeImageScope("category_showcase"),
        path: `pages.home.blocks.category-showcase.props.items.${index}.image_url`,
      })) ?? [];

    return {
      storefront: applied.storefront,
      changed_paths: applied.changed_paths,
      result: {
        recommendations: showcaseItems.filter((item) => item.url),
        search_terms: applied.search_terms,
        source_links: buildImageSearchLinks(applied.search_terms),
        summary: applied.summary,
      },
    };
  }

  const { plan, summary, search_terms } = await resolveTemplateImagePlan(args.intent, args.context ?? {});
  const applied =
    args.scope === "hero"
      ? applyHeroImagesOnly(args.storefront, plan)
      : args.scope === "about"
        ? applyAboutImagesOnly(args.storefront, plan)
        : applyProductImagesOnly(args.storefront, plan);

  return {
    storefront: applied.storefront,
    changed_paths: applied.changed_paths,
    result: {
      recommendations: [],
      search_terms,
      source_links: buildImageSearchLinks(search_terms),
      summary: summary.replace(/homepage, about section, and products/i, describeImageScope(args.scope)),
    },
  };
}

function planToRecommendations(plan: TemplateImagePlan): SourcedImageRecommendation[] {
  const recommendations: SourcedImageRecommendation[] = [
    {
      target: "media.hero_image_url",
      url: plan.hero_url,
      label: "Homepage header",
      reason: "Primary hero image",
    },
    {
      target: "media.about_image_url",
      url: plan.about_url,
      label: "About section",
      reason: "Brand story image",
    },
    {
      target: "template_block",
      url: plan.promo_url,
      label: "Promo banner",
      reason: "Homepage promo accent",
      path: "pages.home.blocks.serum-promo.props.image_url",
    },
  ];

  plan.product_urls.slice(0, 3).forEach((url, index) => {
    recommendations.push({
      target: "product",
      url,
      label: `Product photo ${index + 1}`,
      reason: "Product grid image",
      path: `products.${index}.image_url`,
    });
  });

  return recommendations;
}

export async function sourceWebsiteImagesWithAi(
  intent: string,
  context: ImageSourceContext = {},
): Promise<ImageSourceResult> {
  const { plan, summary, search_terms } = await resolveTemplateImagePlan(intent, context);
  const recommendations = planToRecommendations(plan).slice(0, 2);

  return {
    recommendations,
    search_terms,
    source_links: buildImageSearchLinks(search_terms),
    summary,
  };
}

export function applySourcedImagesToStorefront(
  storefront: StorefrontContent,
  recommendations: SourcedImageRecommendation[],
): { storefront: StorefrontContent; changed_paths: string[] } {
  const updates: Partial<Record<BuilderMediaTarget, string>> = {};
  for (const recommendation of recommendations) {
    if (recommendation.target === "media.hero_image_url" || recommendation.target === "media.about_image_url") {
      updates[recommendation.target] = recommendation.url;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { storefront, changed_paths: [] };
  }

  return applyMediaToStorefront(storefront, updates);
}

export function imageSourceSuggestedActions(
  result: ImageSourceResult,
): import("@/lib/api/types").BuilderSuggestedAction[] {
  const actions: import("@/lib/api/types").BuilderSuggestedAction[] = result.recommendations
    .filter(
      (entry): entry is SourcedImageRecommendation & { target: BuilderMediaTarget } =>
        entry.target === "media.hero_image_url" || entry.target === "media.about_image_url",
    )
    .map((entry) => ({
      type: "image" as const,
      label: entry.target === "media.hero_image_url" ? `Use header: ${entry.label}` : `Use about: ${entry.label}`,
      target: entry.target,
      url: entry.url,
    }));

  actions.push(
    { type: "upload", label: "Upload your own photo", target: "media.hero_image_url" },
    ...result.source_links.slice(0, 2).map((link) => ({
      type: "link" as const,
      label: link.label,
      href: link.href,
    })),
  );

  return actions;
}

export async function replaceTemplateImagesForStorefront(args: {
  intent: string;
  storefront: StorefrontContent;
  context?: ImageSourceContext;
}): Promise<{
  storefront: StorefrontContent;
  changed_paths: string[];
  result: ImageSourceResult;
}> {
  const { plan, summary, search_terms } = await resolveTemplateImagePlan(args.intent, args.context ?? {});
  const applied = applyTemplateImagesAcrossStorefront(args.storefront, plan);
  const result: ImageSourceResult = {
    recommendations: planToRecommendations(plan),
    search_terms,
    source_links: buildImageSearchLinks(search_terms),
    summary,
  };

  return {
    storefront: applied.storefront,
    changed_paths: applied.changed_paths,
    result,
  };
}

export async function sourceAndApplyWebsiteImages(args: {
  intent: string;
  storefront: StorefrontContent;
  store: { business_name: string; industry: Industry; description: string; tone?: string[] };
  applyToPreview: boolean;
}): Promise<{
  result: ImageSourceResult;
  storefront: StorefrontContent;
  changed_paths: string[];
}> {
  if (!args.applyToPreview) {
    const result = await sourceWebsiteImagesWithAi(args.intent, {
      business_name: args.store.business_name,
      industry: args.store.industry,
      description: args.store.description,
      tone: args.store.tone,
    });
    return { result, storefront: args.storefront, changed_paths: [] };
  }

  const replaced = await replaceTemplateImagesForStorefront({
    intent: args.intent,
    storefront: args.storefront,
    context: {
      business_name: args.store.business_name,
      industry: args.store.industry,
      description: args.store.description,
      tone: args.store.tone,
    },
  });

  return {
    result: replaced.result,
    storefront: replaced.storefront,
    changed_paths: replaced.changed_paths,
  };
}
