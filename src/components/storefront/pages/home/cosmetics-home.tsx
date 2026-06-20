"use client";

import { Leaf, Plus, ShieldCheck, Sparkles } from "lucide-react";
import type { Store, StorefrontColorPalette, StorefrontContent } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { resolveHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import type { StorefrontBlock } from "@/lib/storefront/blocks/types";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const DEFAULT_STATS = [
  { value: "Trusted by over 350,000+ Clients", label: "worldwide since 2008" },
  { value: "6M+", label: "Worldwide Product sale per year" },
  { value: "4.6", label: "3,350 Rating Worldwide" },
];

const DEFAULT_TRUST_ITEMS = [
  {
    icon: Leaf,
    title: "Quality ingredients",
    body: "Botanical extracts and gentle actives selected for daily skin routines.",
  },
  {
    icon: ShieldCheck,
    title: "Clinically mindful",
    body: "Simple formulas designed to support skin comfort, glow, and consistency.",
  },
  {
    icon: Sparkles,
    title: "Clean finish",
    body: "Light textures that layer easily from cleanser to serum to moisturiser.",
  },
];

const DEFAULT_PROMO_BULLETS = [
  "Designed for bright, hydrated-looking skin.",
  "Calm textures for morning and evening routines.",
  "Simple steps customers can understand quickly.",
];

const DEFAULT_TESTIMONIALS = [
  { quote: "A perfect daily routine.", author: "Customer 1" },
  { quote: "Soft, clean, and easy.", author: "Customer 2" },
  { quote: "The cleanser feels fresh.", author: "Customer 3" },
];

function blockProps(storefront: StorefrontContent, blockId: string): Record<string, unknown> {
  return resolveHomeBlocks(storefront).find((block: StorefrontBlock) => block.id === blockId)?.props ?? {};
}

function ProductPack({
  compact = false,
  src,
  alt = "Cosmetic skincare product arrangement",
  imagePath,
}: {
  compact?: boolean;
  src?: string;
  alt?: string;
  imagePath?: string;
}) {
  const imageSrc = src ?? (compact ? cosmeticsTemplateImages.cleanser : cosmeticsTemplateImages.hero);

  return (
    <div className={`relative ${compact ? "h-64" : "h-[430px]"} w-full`}>
      <div className="absolute inset-x-6 bottom-6 h-20 rounded-[50%] bg-[#dfe5d2] blur-2xl" />
      <EditableImage
        path={imagePath}
        src={imageSrc}
        alt={alt}
        className={`absolute inset-0 overflow-hidden bg-transparent ${compact ? "p-4" : "p-0"}`}
        imgClassName="object-contain object-center drop-shadow-[0_22px_38px_rgba(91,70,49,0.18)]"
      />
    </div>
  );
}

function FaqPreview({
  items,
  title,
  palette,
}: {
  items: { question: string; answer: string }[];
  title: string;
  palette: StorefrontColorPalette;
}) {
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
        value={title}
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

export function CosmeticsHome({
  storefront,
  store,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme } = useStorefrontTheme();
  const headline = storefront.hero.headline || store.business_name;
  const accentBackground = `${theme.palette.accent}66`;

  const heroBlock = blockProps(storefront, "hero-main");
  const promoBlock = blockProps(storefront, "serum-promo");
  const trustBlock = blockProps(storefront, "trust-features");

  const stats =
    storefront.home_stats?.length === 3
      ? storefront.home_stats
      : DEFAULT_STATS;

  const badgeProps = storefront.value_props?.length
    ? storefront.value_props.slice(0, 3)
    : [
        { title: "100%", body: "Organic" },
        { title: "Clinical", body: "Approved" },
        { title: "Herbal", body: "Products" },
      ];

  const promoBullets = Array.isArray(promoBlock.bullets)
    ? (promoBlock.bullets as string[])
    : DEFAULT_PROMO_BULLETS;

  const trustItemsRaw = Array.isArray(trustBlock.items)
    ? (trustBlock.items as { title: string; body: string }[])
    : DEFAULT_TRUST_ITEMS.map(({ title, body }) => ({ title, body }));

  const testimonials =
    storefront.home_testimonials?.length === 3
      ? storefront.home_testimonials
      : DEFAULT_TESTIMONIALS;

  const faqTitle = storefront.pages?.faq?.title ?? "Frequently Ask Questions";

  const heroImage =
    storefront.media?.hero_image_url ??
    (typeof heroBlock.image_url === "string" ? heroBlock.image_url : null) ??
    cosmeticsTemplateImages.hero;

  const aboutImage =
    storefront.media?.about_image_url ??
    (typeof blockProps(storefront, "about-spotlight").image_url === "string"
      ? (blockProps(storefront, "about-spotlight").image_url as string)
      : null) ??
    cosmeticsTemplateImages.cleanser;

  const promoImage =
    (typeof promoBlock.image_url === "string" ? promoBlock.image_url : null) ??
    cosmeticsTemplateImages.serum;

  const trustImage =
    (typeof trustBlock.image_url === "string" ? trustBlock.image_url : null) ??
    cosmeticsTemplateImages.cactus;

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="px-4 pb-8 pt-6 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden" style={{ backgroundColor: theme.palette.background }}>
          <div className="relative min-h-[620px] overflow-hidden px-6 py-16 sm:px-12 lg:px-16">
            <div
              className="absolute right-0 top-0 h-[410px] w-[48%] rounded-bl-[16rem]"
              style={{ backgroundColor: accentBackground }}
            />
            <div className="grid min-h-[520px] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative z-10">
                <EditableText
                  path="pages.home.blocks.hero-main.props.eyebrow"
                  value={String(heroBlock.eyebrow ?? "Discover the Nature with")}
                  as="p"
                  className="text-[12px] tracking-[0.28em]"
                  style={{ color: theme.palette.muted }}
                />
                <EditableText
                  path="hero.headline"
                  value={headline}
                  as="h1"
                  className="mt-4 max-w-xl text-7xl font-bold uppercase leading-[0.82] tracking-[-0.075em] sm:text-8xl lg:text-[9rem]"
                  style={{ color: theme.palette.primary }}
                />
                <EditableText
                  path="hero.subheadline"
                  value={storefront.hero.subheadline}
                  as="p"
                  className="mt-7 max-w-md text-xs leading-6"
                  style={{ color: theme.palette.muted }}
                  multiline
                />
                <StorefrontLink
                  href="/products"
                  className="mt-8 inline-flex px-8 py-3 text-[11px] font-bold shadow-[0_18px_35px_rgba(23,32,18,0.18)]"
                  style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
                >
                  <EditableText path="hero.cta_label" value={storefront.hero.cta_label} as="span" />
                </StorefrontLink>
              </div>
              <div className="relative z-10">
                <ProductPack src={heroImage} imagePath="media.hero_image_url" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[1fr_1.18fr]">
          <div className="self-center">
            <EditableText
              path="home_stats.0.value"
              value={stats[0]?.value ?? DEFAULT_STATS[0].value}
              as="h2"
              className="max-w-md text-2xl font-bold leading-tight"
              multiline
            />
            <EditableText
              path="home_stats.0.label"
              value={stats[0]?.label ?? DEFAULT_STATS[0].label}
              as="p"
              className="mt-2 max-w-md text-sm leading-5"
              style={{ color: theme.palette.muted }}
            />
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {stats.slice(1).map((stat, index) => {
              const statIndex = index + 1;
              return (
                <div key={`stat-${statIndex}`}>
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

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <ProductPack
            compact
            src={aboutImage}
            alt="Cosmetic cleanser products"
            imagePath="media.about_image_url"
          />
          <div>
            <EditableText
              path="about.title"
              value={storefront.about.title || "Best Skin Cleanser"}
              as="h2"
              className="text-5xl font-bold tracking-[-0.06em]"
              style={{ color: theme.palette.primary }}
            />
            <EditableText
              path="about.body"
              value={storefront.about.body}
              as="p"
              className="mt-6 max-w-2xl text-xs leading-6"
              style={{ color: theme.palette.muted }}
              multiline
            />
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-6">
              {badgeProps.map((item, index) => (
                <div key={`badge-${index}`}>
                  <EditableText
                    path={`value_props.${index}.title`}
                    value={item.title}
                    as="span"
                    className="block text-2xl font-black"
                    style={{ color: theme.palette.primary }}
                  />
                  <EditableText
                    path={`value_props.${index}.body`}
                    value={item.body}
                    as="span"
                    className="mt-1 block text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div
            className="grid items-center gap-6 p-8 lg:grid-cols-[1fr_0.8fr]"
            style={{ backgroundColor: theme.palette.surface }}
          >
            <div>
              <EditableText
                path="pages.home.blocks.serum-promo.props.title"
                value={String(promoBlock.title ?? "Our Best Serums")}
                as="h2"
                className="text-3xl font-bold tracking-[-0.05em]"
                style={{ color: theme.palette.primary }}
              />
              <EditableText
                path="pages.home.blocks.serum-promo.props.body"
                value={String(
                  promoBlock.body ??
                    "Lightweight botanical actives made to layer cleanly after cleansing and before daily moisture.",
                )}
                as="p"
                className="mt-4 text-xs leading-6"
                style={{ color: theme.palette.muted }}
                multiline
              />
              <ul className="mt-5 space-y-3 text-xs leading-5" style={{ color: theme.palette.muted }}>
                {promoBullets.map((bullet, index) => (
                  <li key={`promo-bullet-${index}`}>
                    •{" "}
                    <EditableText
                      path={`pages.home.blocks.serum-promo.props.bullets.${index}`}
                      value={bullet}
                      as="span"
                    />
                  </li>
                ))}
              </ul>
              <StorefrontLink
                href="/products"
                className="mt-6 inline-flex px-7 py-3 text-[11px] font-bold"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                <EditableText
                  path="pages.home.blocks.serum-promo.props.cta_label"
                  value={String(promoBlock.cta_label ?? "Explore")}
                  as="span"
                />
              </StorefrontLink>
            </div>
            <ProductPack
              compact
              src={promoImage}
              alt="Cosmetic serum products"
              imagePath="pages.home.blocks.serum-promo.props.image_url"
            />
          </div>

          <div className="grid items-center gap-6 p-8 lg:grid-cols-[0.82fr_1fr]">
            <div className="relative h-80">
              <EditableImage
                path="pages.home.blocks.trust-features.props.image_url"
                src={trustImage}
                alt="Cosmetic serum bottle"
                className="absolute inset-0 overflow-hidden bg-transparent"
                imgClassName="object-contain object-center drop-shadow-[0_24px_42px_rgba(91,70,49,0.16)]"
              />
            </div>
            <div>
              <EditableText
                path="pages.home.blocks.trust-features.props.title"
                value={String(trustBlock.title ?? "Why Choose Us")}
                as="h2"
                className="text-3xl font-bold tracking-[-0.05em]"
                style={{ color: theme.palette.primary }}
              />
              <EditableText
                path="pages.home.blocks.trust-features.props.body"
                value={String(
                  trustBlock.body ??
                    "A calm product story, premium formulas, and trust blocks that match the clean cosmetics reference.",
                )}
                as="p"
                className="mt-4 text-xs leading-6"
                style={{ color: theme.palette.muted }}
                multiline
              />
              <div className="mt-6 grid gap-3">
                {DEFAULT_TRUST_ITEMS.map(({ icon: Icon }, index) => {
                  const item = trustItemsRaw[index] ?? DEFAULT_TRUST_ITEMS[index];
                  return (
                    <div
                      key={`trust-${index}`}
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
                          path={`pages.home.blocks.trust-features.props.items.${index}.title`}
                          value={item.title}
                          as="h3"
                          className="text-xs font-bold"
                        />
                        <EditableText
                          path={`pages.home.blocks.trust-features.props.items.${index}.body`}
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
        </div>
      </section>

      <FaqPreview
        items={storefront.pages?.faq?.items ?? []}
        title={faqTitle}
        palette={theme.palette}
      />

      <section className="px-4 py-14 text-center sm:px-6">
        <div className="mx-auto max-w-5xl">
          <EditableText
            path="home_testimonials_title"
            value={storefront.home_testimonials_title ?? "Testimonials"}
            as="h2"
            className="text-3xl font-bold tracking-[-0.05em]"
            style={{ color: theme.palette.primary }}
          />
          <EditableText
            path="home_testimonials_intro"
            value={
              storefront.home_testimonials_intro ??
              "Clean routines, soft finishes, and customer confidence across every product page."
            }
            as="p"
            className="mx-auto mt-3 max-w-lg text-xs leading-6"
            style={{ color: theme.palette.muted }}
            multiline
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {testimonials.map((item, index) => (
              <article key={`testimonial-${index}`} className="border-t pt-5" style={{ borderColor: theme.palette.border }}>
                <div className="text-[#c9a23e]">★★★★★</div>
                <EditableText
                  path={`home_testimonials.${index}.quote`}
                  value={item.quote}
                  as="p"
                  className="mt-3 text-xs leading-5"
                  multiline
                />
                <EditableText
                  path={`home_testimonials.${index}.author`}
                  value={item.author}
                  as="span"
                  className="mt-4 block text-[11px] font-bold"
                />
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
