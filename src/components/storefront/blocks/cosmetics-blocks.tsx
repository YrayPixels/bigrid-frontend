"use client";

import { Leaf, Loader2, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Store, StorefrontColorPalette, StorefrontContent } from "@/lib/api/types";
import { ProductCardThemed } from "@/components/storefront/theme/product-card-themed";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { ProductPack } from "@/components/storefront/blocks/shared/product-pack";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import { pageBlockPropPath } from "@/lib/storefront/blocks/sync-page-legacy";
import type {
  ContactFormBlockProps,
  CtaBannerBlockProps,
  FaqBlockProps,
  FeatureGridBlockProps,
  HeroBlockProps,
  ProductGridBlockProps,
  RichTextBlockProps,
  StatsRowBlockProps,
  StorefrontBlock,
  StorefrontContentPageSlug,
} from "@/lib/storefront/blocks/types";
import { storefrontApi } from "@/lib/api/storefront";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const reasonIcons = [Leaf, ShieldCheck, Sparkles];

function blockPropPath(
  page: StorefrontContentPageSlug | undefined,
  blockId: string,
  field: string,
): string {
  if (page && page !== "home") {
    return pageBlockPropPath(page, blockId, field);
  }

  return `pages.home.blocks.${blockId}.props.${field}`;
}

function faqItemPath(
  page: StorefrontContentPageSlug | undefined,
  blockId: string,
  index: number,
  field: "question" | "answer",
): string {
  if (page === "faq") {
    return `pages.faq.items.${index}.${field}`;
  }

  return `pages.faq.items.${index}.${field}`;
}

export function CosmeticsHeroBlock({
  block,
  store,
}: {
  block: StorefrontBlock;
  store: Store;
}) {
  const { theme } = useStorefrontTheme();
  const props = block.props as HeroBlockProps;
  const headline = props.headline || store.business_name;
  const accentBackground = `${theme.palette.accent}66`;
  const layout = props.layout ?? "split";

  if (layout === "centered") {
    return (
      <section className="px-4 pb-10 pt-10 sm:px-6">
        <div
          className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-6 py-16 text-center sm:px-12 lg:px-16"
          style={{ backgroundColor: theme.palette.background }}
        >
          {props.eyebrow ? (
            <p className="text-[12px] tracking-[0.28em]" style={{ color: theme.palette.muted }}>
              {props.eyebrow}
            </p>
          ) : null}
          <EditableText
            path="hero.headline"
            value={headline}
            as="h1"
            className="mx-auto mt-4 max-w-4xl text-6xl font-bold uppercase leading-[0.88] tracking-[-0.07em] sm:text-7xl"
            style={{ color: theme.palette.primary }}
          />
          <EditableText
            path="hero.subheadline"
            value={props.subheadline}
            as="p"
            className="mx-auto mt-6 max-w-xl text-sm leading-7"
            style={{ color: theme.palette.muted }}
            multiline
          />
          <div className="mt-8 flex justify-center">
            <StorefrontLink
              href={props.cta_href ?? "/products"}
              className="inline-flex px-10 py-3 text-[11px] font-bold shadow-[0_18px_35px_rgba(23,32,18,0.18)]"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              {props.cta_label}
            </StorefrontLink>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <ProductPack compact src={props.image_url ?? undefined} />
          </div>
        </div>
      </section>
    );
  }

  if (layout === "image_right") {
    return (
      <section className="px-4 pb-8 pt-6 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden" style={{ backgroundColor: theme.palette.background }}>
          <div className="relative min-h-[620px] overflow-hidden px-6 py-16 sm:px-12 lg:px-16">
            <div
              className="absolute left-0 top-0 h-[410px] w-[48%] rounded-br-[16rem]"
              style={{ backgroundColor: accentBackground }}
            />
            <div className="grid min-h-[520px] items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative z-10">
                <ProductPack src={props.image_url ?? undefined} />
              </div>
              <div className="relative z-10">
                {props.eyebrow ? (
                  <p className="text-[12px] tracking-[0.28em]" style={{ color: theme.palette.muted }}>
                    {props.eyebrow}
                  </p>
                ) : null}
                <EditableText
                  path="hero.headline"
                  value={headline}
                  as="h1"
                  className="mt-4 max-w-xl text-7xl font-bold uppercase leading-[0.82] tracking-[-0.075em] sm:text-8xl lg:text-[9rem]"
                  style={{ color: theme.palette.primary }}
                />
                <EditableText
                  path="hero.subheadline"
                  value={props.subheadline}
                  as="p"
                  className="mt-7 max-w-md text-xs leading-6"
                  style={{ color: theme.palette.muted }}
                  multiline
                />
                <StorefrontLink
                  href={props.cta_href ?? "/products"}
                  className="mt-8 inline-flex px-8 py-3 text-[11px] font-bold shadow-[0_18px_35px_rgba(23,32,18,0.18)]"
                  style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
                >
                  {props.cta_label}
                </StorefrontLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-8 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden" style={{ backgroundColor: theme.palette.background }}>
        <div className="relative min-h-[620px] overflow-hidden px-6 py-16 sm:px-12 lg:px-16">
          <div
            className="absolute right-0 top-0 h-[410px] w-[48%] rounded-bl-[16rem]"
            style={{ backgroundColor: accentBackground }}
          />
          <div className="grid min-h-[520px] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative z-10">
              {props.eyebrow ? (
                <p className="text-[12px] tracking-[0.28em]" style={{ color: theme.palette.muted }}>
                  {props.eyebrow}
                </p>
              ) : null}
              <EditableText
                path="hero.headline"
                value={headline}
                as="h1"
                className="mt-4 max-w-xl text-7xl font-bold uppercase leading-[0.82] tracking-[-0.075em] sm:text-8xl lg:text-[9rem]"
                style={{ color: theme.palette.primary }}
              />
              <EditableText
                path="hero.subheadline"
                value={props.subheadline}
                as="p"
                className="mt-7 max-w-md text-xs leading-6"
                style={{ color: theme.palette.muted }}
                multiline
              />
              <StorefrontLink
                href={props.cta_href ?? "/products"}
                className="mt-8 inline-flex px-8 py-3 text-[11px] font-bold shadow-[0_18px_35px_rgba(23,32,18,0.18)]"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                {props.cta_label}
              </StorefrontLink>
            </div>
            <div className="relative z-10">
              <ProductPack src={props.image_url ?? undefined} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CosmeticsStatsRowBlock({ block }: { block: StorefrontBlock }) {
  const { theme } = useStorefrontTheme();
  const props = block.props as StatsRowBlockProps;
  const items = props.items ?? [];

  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[1fr_1.18fr]">
        <div className="self-center">
          <EditableText
            path="home_stats.0.value"
            value={items[0]?.value ?? ""}
            as="h2"
            className="max-w-md text-2xl font-bold leading-tight"
            multiline
          />
          {items[0]?.label ? (
            <EditableText
              path="home_stats.0.label"
              value={items[0].label}
              as="p"
              className="mt-2 max-w-md text-sm leading-5"
              style={{ color: theme.palette.muted }}
            />
          ) : null}
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {items.slice(1).map((stat, index) => {
            const statIndex = index + 1;
            return (
              <div key={`${stat.value}-${statIndex}`}>
                <EditableText
                  path={`home_stats.${statIndex}.value`}
                  value={stat.value}
                  as="span"
                  className="block text-4xl font-black tracking-[-0.08em]"
                />
                <div className="mt-1 h-1 w-12" style={{ backgroundColor: theme.palette.primary }} />
                <EditableText
                  path={`home_stats.${statIndex}.label`}
                  value={stat.label}
                  as="p"
                  className="mt-2 max-w-[150px] text-[11px] font-semibold leading-4"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CosmeticsRichTextBlock({
  block,
  page,
}: {
  block: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  const { theme } = useStorefrontTheme();
  const props = block.props as RichTextBlockProps;
  const badges = props.badges ?? [];
  const titlePath =
    page === "about" ? blockPropPath(page, block.id, "title") : page === "contact" ? blockPropPath(page, block.id, "title") : "about.title";
  const bodyPath =
    page === "about" ? blockPropPath(page, block.id, "body") : page === "contact" ? blockPropPath(page, block.id, "body") : "about.body";
  const isStandalonePage = page === "about" || page === "contact";

  if (isStandalonePage && page === "about") {
    return (
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <EditableText
              path={titlePath}
              value={props.title}
              as="h1"
              className="font-display text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl"
              style={{ color: theme.palette.primary }}
            />
            <EditableText
              path={bodyPath}
              value={props.body}
              as="p"
              className="mt-6 max-w-xl whitespace-pre-line text-sm leading-8"
              style={{ color: theme.palette.muted }}
              multiline
            />
          </div>
          {props.image_url ? (
            <ProductPack compact src={props.image_url ?? undefined} alt="About us" />
          ) : null}
        </div>
      </section>
    );
  }

  if (isStandalonePage) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <EditableText
            path={titlePath}
            value={props.title}
            as="h1"
            className="font-display text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl"
            style={{ color: theme.palette.primary }}
          />
          <EditableText
            path={bodyPath}
            value={props.body}
            as="p"
            className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-sm leading-8"
            style={{ color: theme.palette.muted }}
            multiline
          />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <ProductPack
          compact
          src={props.image_url ?? cosmeticsTemplateImages.cleanser}
          alt="Cosmetic cleanser products"
        />
        <div>
          <EditableText
            path="about.title"
            value={props.title}
            as="h2"
            className="text-5xl font-bold tracking-[-0.06em]"
            style={{ color: theme.palette.primary }}
          />
          <EditableText
            path="about.body"
            value={props.body}
            as="p"
            className="mt-6 max-w-2xl text-xs leading-6"
            style={{ color: theme.palette.muted }}
            multiline
          />
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-6">
            {badges.slice(0, 3).map((item, index) => (
              <div key={`${item.value}-${index}`}>
                <EditableText
                  path={`value_props.${index}.title`}
                  value={item.value}
                  as="span"
                  className="block text-2xl font-black"
                  style={{ color: theme.palette.primary }}
                />
                <EditableText
                  path={`value_props.${index}.body`}
                  value={item.label}
                  as="span"
                  className="mt-1 block text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CosmeticsCtaBannerBlock({
  block,
  page,
}: {
  block: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  const { theme } = useStorefrontTheme();
  const props = block.props as CtaBannerBlockProps;

  return (
    <div
      className="grid items-center gap-6 p-8 lg:grid-cols-[1fr_0.8fr]"
      style={{ backgroundColor: theme.palette.surface }}
    >
      <div>
        <EditableText
          path={blockPropPath(page, block.id, "title")}
          value={props.title}
          as="h2"
          className="text-3xl font-bold tracking-[-0.05em]"
          style={{ color: theme.palette.primary }}
        />
        <EditableText
          path={blockPropPath(page, block.id, "body")}
          value={props.body}
          as="p"
          className="mt-4 text-xs leading-6"
          style={{ color: theme.palette.muted }}
          multiline
        />
        {props.bullets?.length ? (
          <ul className="mt-5 space-y-3 text-xs leading-5" style={{ color: theme.palette.muted }}>
            {props.bullets.map((bullet) => (
              <li key={bullet}>• {bullet}</li>
            ))}
          </ul>
        ) : null}
        <StorefrontLink
          href={props.cta_href ?? "/products"}
          className="mt-6 inline-flex px-7 py-3 text-[11px] font-bold"
          style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
        >
          {props.cta_label}
        </StorefrontLink>
      </div>
      <ProductPack compact src={props.image_url ?? cosmeticsTemplateImages.serum} alt="Cosmetic serum products" />
    </div>
  );
}

export function CosmeticsFeatureGridBlock({
  block,
  page,
}: {
  block: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  const { theme } = useStorefrontTheme();
  const props = block.props as FeatureGridBlockProps;
  const items = props.items ?? [];

  return (
    <div className="grid items-center gap-6 p-8 lg:grid-cols-[0.82fr_1fr]">
      <div className="relative h-80">
        <EditableImage
          src={cosmeticsTemplateImages.cactus}
          alt="Cosmetic serum bottle"
          className="absolute inset-0 overflow-hidden bg-transparent"
          imgClassName="object-contain object-center drop-shadow-[0_24px_42px_rgba(91,70,49,0.16)]"
        />
      </div>
      <div>
        <EditableText
          path={blockPropPath(page, block.id, "title")}
          value={props.title}
          as="h2"
          className="text-3xl font-bold tracking-[-0.05em]"
          style={{ color: theme.palette.primary }}
        />
        <EditableText
          path={blockPropPath(page, block.id, "body")}
          value={props.body}
          as="p"
          className="mt-4 text-xs leading-6"
          style={{ color: theme.palette.muted }}
          multiline
        />
        <div className="mt-6 grid gap-3">
          {items.slice(0, 3).map((item, index) => {
            const Icon = reasonIcons[index] ?? Sparkles;
            return (
              <div
                key={`${item.title}-${index}`}
                className="flex gap-3 border p-3"
                style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.background }}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center"
                  style={{ backgroundColor: theme.palette.surface, color: theme.palette.primary }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <EditableText
                    path={`value_props.${index}.title`}
                    value={item.title}
                    as="h3"
                    className="text-xs font-bold"
                  />
                  <EditableText
                    path={`value_props.${index}.body`}
                    value={item.body}
                    as="p"
                    className="mt-1 text-[11px] leading-4"
                    style={{ color: theme.palette.muted }}
                    multiline
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CosmeticsPromoTrustRow({
  ctaBlock,
  featureBlock,
  page,
}: {
  ctaBlock: StorefrontBlock;
  featureBlock: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
        <CosmeticsCtaBannerBlock block={ctaBlock} page={page} />
        <CosmeticsFeatureGridBlock block={featureBlock} page={page} />
      </div>
    </section>
  );
}

export function CosmeticsStandaloneCtaBannerBlock({
  block,
  page,
}: {
  block: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <CosmeticsCtaBannerBlock block={block} page={page} />
      </div>
    </section>
  );
}

export function CosmeticsStandaloneFeatureGridBlock({
  block,
  page,
}: {
  block: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <CosmeticsFeatureGridBlock block={block} page={page} />
      </div>
    </section>
  );
}

export function CosmeticsProductGridBlock({
  block,
  storefront,
}: {
  block: StorefrontBlock;
  storefront: StorefrontContent;
}) {
  const { theme } = useStorefrontTheme();
  const props = block.props as ProductGridBlockProps;
  const catalogProducts = storefront.products ?? [];
  const limit = props.limit ?? 4;
  const { products: gridProducts, source: productSource } = getHomepageProducts(
    storefront,
    theme.id,
    limit,
  );

  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {props.title ? (
          <EditableText
            path={blockPropPath(undefined, block.id, "title")}
            value={props.title}
            as="h2"
            className="mb-8 text-3xl font-bold tracking-[-0.05em]"
            style={{ color: theme.palette.primary }}
          />
        ) : null}
        {gridProducts.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed px-6 py-10 text-center"
            style={{ borderColor: theme.palette.border, color: theme.palette.muted }}
          >
            <p className="text-sm font-medium" style={{ color: theme.palette.text }}>
              {productSource === "theme_products"
                ? "Theme preview products will appear here."
                : "Your catalog products will appear here."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">
              {productSource === "theme_products"
                ? "Switch to live catalog products in the website editor when you are ready to publish."
                : "Add products in your admin catalog to feature them on the homepage."}
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${theme.productGridCols}`}>
            {gridProducts.map((product, index) => (
              <ProductCardThemed
                key={product.id}
                product={product}
                imagePath={
                  productSource === "merchant_products" && catalogProducts[index]?.id === product.id
                    ? `products.${index}.image_url`
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CosmeticsFaqBlock({
  block,
  palette,
  page,
}: {
  block: StorefrontBlock;
  palette: StorefrontColorPalette;
  page?: StorefrontContentPageSlug;
}) {
  const props = block.props as FaqBlockProps;
  const items = props.items?.length ? props.items : [];
  const titlePath = page === "faq" ? blockPropPath(page, block.id, "title") : "pages.faq.title";

  if (page === "faq") {
    return (
      <section className="px-4 py-16 sm:px-6 lg:py-20" style={{ backgroundColor: palette.background }}>
        <div className="mx-auto max-w-[960px] text-center">
          <EditableText
            path={titlePath}
            value={props.title}
            as="h1"
            className="text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl"
            style={{ color: palette.text }}
          />
          <p className="mx-auto mt-4 max-w-md text-sm leading-6" style={{ color: palette.muted }}>
            Find answers about orders, delivery, returns, and product routines.
          </p>
          <div className="mx-auto mt-12 grid gap-3 text-left">
            {items.map((item, index) => (
              <details
                key={`${item.question}-${index}`}
                className="group rounded-[1.5rem] p-5 shadow-sm ring-1"
                style={{ backgroundColor: `${palette.surface}cc`, borderColor: palette.border }}
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <EditableText
                    path={faqItemPath(page, block.id, index, "question")}
                    value={item.question}
                    as="span"
                    className="text-sm font-bold leading-6"
                  />
                  <Plus className="h-3.5 w-3.5 shrink-0 group-open:rotate-45" style={{ color: palette.primary }} />
                </summary>
                <EditableText
                  path={faqItemPath(page, block.id, index, "answer")}
                  value={item.answer}
                  as="p"
                  className="mt-3 max-w-[720px] text-sm leading-6"
                  style={{ color: palette.muted }}
                  multiline
                />
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const previewItems = items.length
    ? items.slice(0, 6)
    : [
        { question: "Can you ship overseas?", answer: "Yes, delivery options are shown at checkout." },
        { question: "How do I choose the right product?", answer: "Start with your routine goal and skin needs." },
        { question: "Do you offer sample products?", answer: "Sample availability depends on the store catalog." },
        { question: "Are the products cruelty free?", answer: "Check each product description for formula details." },
      ];

  return (
    <section className="px-6 py-12" style={{ backgroundColor: palette.surface }}>
      <EditableText
        path="pages.faq.title"
        value={props.title}
        as="h2"
        className="text-center text-2xl font-bold tracking-[-0.04em]"
        style={{ color: palette.primary }}
      />
      <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
        {previewItems.map((item, index) => (
          <details
            key={`${item.question}-${index}`}
            className="group px-5 py-4 text-xs shadow-[0_12px_30px_rgba(23,32,18,0.04)]"
            style={{ backgroundColor: palette.background }}
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              <EditableText
                path={`pages.faq.items.${index}.question`}
                value={item.question}
                as="span"
              />
              <Plus className="h-3.5 w-3.5 shrink-0 group-open:rotate-45" style={{ color: palette.primary }} />
            </summary>
            <EditableText
              path={`pages.faq.items.${index}.answer`}
              value={item.answer}
              as="p"
              className="mt-3 leading-5"
              style={{ color: palette.muted }}
              multiline
            />
          </details>
        ))}
      </div>
    </section>
  );
}

export function CosmeticsFaqBlockRenderer({
  block,
  page,
}: {
  block: StorefrontBlock;
  page?: StorefrontContentPageSlug;
}) {
  const { theme } = useStorefrontTheme();
  return <CosmeticsFaqBlock block={block} palette={theme.palette} page={page} />;
}

export function CosmeticsContactFormBlock({
  block,
  store,
  page,
}: {
  block: StorefrontBlock;
  store: Store;
  page?: StorefrontContentPageSlug;
}) {
  const { theme, mode } = useStorefrontTheme();
  const props = block.props as ContactFormBlockProps;
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "edit" || mode === "preview") return;

    setSubmitting(true);
    setError(null);

    try {
      await storefrontApi.submitContact(store.slug, {
        block_id: block.id,
        fields: values,
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="px-4 pb-16 sm:px-6 lg:pb-24">
      <div
        className="mx-auto max-w-xl rounded-[2rem] border p-6 shadow-[0_24px_80px_rgba(111,47,43,0.08)] sm:p-10"
        style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
      >
        <EditableText
          path={blockPropPath(page, block.id, "title")}
          value={props.title}
          as="h2"
          className="text-2xl font-semibold tracking-[-0.04em]"
          style={{ color: theme.palette.primary }}
        />
        <EditableText
          path={blockPropPath(page, block.id, "intro")}
          value={props.intro}
          as="p"
          className="mt-3 text-sm leading-7"
          style={{ color: theme.palette.muted }}
          multiline
        />

        {submitted ? (
          <p className="mt-8 rounded-2xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: `${theme.palette.primary}14`, color: theme.palette.primary }}>
            {props.success_message}
          </p>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {props.fields.map((field) => (
              <label key={field.name} className="block text-left">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.palette.muted }}>
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                    rows={4}
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.background }}
                    disabled={mode === "edit" || mode === "preview" || submitting}
                  />
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.background }}
                    disabled={mode === "edit" || mode === "preview" || submitting}
                  />
                )}
              </label>
            ))}

            {error ? (
              <p className="text-sm" style={{ color: theme.palette.primary }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={mode === "edit" || mode === "preview" || submitting}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.submit_label}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
