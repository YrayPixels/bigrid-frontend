"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import type { StoreCategory, StorefrontContent } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import {
  categoryShowcaseItemHref,
  hydrateShowcaseItemsFromCategories,
  resolveCategoryShowcaseItemLabel,
  resolveCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-utils";
import type { CategoryShowcaseItem } from "@/lib/storefront/blocks/types";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

function ShowcaseImage({
  item,
  index,
  blockId,
  alt,
  className = "",
  imgClassName = "",
}: {
  item: CategoryShowcaseItem;
  index: number;
  blockId: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const imageUrl = item.image_url ?? "";

  return (
    <EditableImage
      path={`pages.home.blocks.${blockId}.props.items.${index}.image_url`}
      src={imageUrl}
      alt={alt}
      className={className}
      imgClassName={imgClassName}
    />
  );
}

function EditorialGridItem({
  item,
  index,
  blockId,
  categories,
}: {
  item: CategoryShowcaseItem;
  index: number;
  blockId: string;
  categories?: StoreCategory[];
}) {
  const { theme, mode } = useStorefrontTheme();
  const label = resolveCategoryShowcaseItemLabel(item, categories);
  const href = categoryShowcaseItemHref(item);

  const inner = (
    <>
      <div className="relative aspect-[4/5] bg-[#eef0ef]">
        <ShowcaseImage
          item={item}
          index={index}
          blockId={blockId}
          alt={`${label} category`}
          className="h-full w-full"
          imgClassName="object-center transition duration-500 group-hover:scale-105"
        />
      </div>
      <div
        className="mx-auto mt-3 flex w-fit items-center justify-center gap-2 border-b pb-0.5 text-lg font-bold leading-none"
        style={{ borderColor: theme.palette.text, fontFamily: "var(--font-editorial)" }}
      >
        <EditableText
          path={`pages.home.blocks.${blockId}.props.items.${index}.label`}
          value={label}
          as="span"
        />
        <ArrowRight className="h-4 w-4" />
      </div>
    </>
  );

  if (mode === "edit") {
    return (
      <div key={`${label}-${index}`} className="group text-left">
        {inner}
      </div>
    );
  }

  return (
    <Link key={`${label}-${index}`} href={href} className="group text-left">
      {inner}
    </Link>
  );
}

function StyleTileItem({
  item,
  index,
  blockId,
  categories,
}: {
  item: CategoryShowcaseItem;
  index: number;
  blockId: string;
  categories?: StoreCategory[];
}) {
  const { theme } = useStorefrontTheme();
  const label = resolveCategoryShowcaseItemLabel(item, categories);
  const href = categoryShowcaseItemHref(item);
  const ctaLabel = item.cta_label ?? "Shop now";
  const featured = index === 0;

  return (
    <StorefrontLink
      href={href}
      className="group relative block aspect-[1.55] overflow-hidden"
      style={{ backgroundColor: theme.palette.accent }}
    >
      <ShowcaseImage
        item={item}
        index={index}
        blockId={blockId}
        alt={label}
        className="h-full w-full"
        imgClassName="object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0" style={{ backgroundColor: `${theme.palette.text}1a` }} />
      {featured ? (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ backgroundColor: `${theme.palette.text}73`, color: theme.palette.background }}
        >
          <div>
            <EditableText
              path={`pages.home.blocks.${blockId}.props.items.${index}.label`}
              value={label}
              as="h3"
              className="text-2xl font-bold leading-none"
              style={{ fontFamily: "var(--font-editorial)" }}
            />
            <span
              className="mt-3 inline-flex px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}
            >
              <EditableText
                path={`pages.home.blocks.${blockId}.props.items.${index}.cta_label`}
                value={ctaLabel}
                as="span"
              />
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 p-4 text-left">
          <EditableText
            path={`pages.home.blocks.${blockId}.props.items.${index}.label`}
            value={label}
            as="span"
            className="text-sm font-bold uppercase tracking-[0.12em]"
            style={{ color: theme.palette.background }}
          />
        </div>
      )}
    </StorefrontLink>
  );
}

function CompactGridItem({
  item,
  index,
  blockId,
  categories,
}: {
  item: CategoryShowcaseItem;
  index: number;
  blockId: string;
  categories?: StoreCategory[];
}) {
  const { theme } = useStorefrontTheme();
  const label = resolveCategoryShowcaseItemLabel(item, categories);
  const href = categoryShowcaseItemHref(item);

  return (
    <StorefrontLink
      href={href}
      className="group overflow-hidden rounded-2xl border"
      style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
    >
      <div className="relative aspect-[4/5]">
        <ShowcaseImage
          item={item}
          index={index}
          blockId={blockId}
          alt={label}
          className="h-full w-full"
          imgClassName="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="px-4 py-3 text-center">
        <EditableText
          path={`pages.home.blocks.${blockId}.props.items.${index}.label`}
          value={label}
          as="span"
          className="text-sm font-semibold"
        />
      </div>
    </StorefrontLink>
  );
}

export function CategoryShowcaseBlock({
  storefront,
  categories,
  blockId = "category-showcase",
}: {
  storefront: StorefrontContent;
  categories?: StoreCategory[];
  blockId?: string;
}) {
  const { theme } = useStorefrontTheme();
  const props = resolveCategoryShowcaseProps(storefront, blockId);
  const layout = props.layout ?? "editorial_grid";
  const items =
    categories?.length
      ? hydrateShowcaseItemsFromCategories(props.items, categories, {
          limit: Math.max(props.items.length, 4),
        })
      : props.items;

  if (layout === "style_tiles") {
    return (
      <section
        className="px-4 py-12 text-center sm:px-6 lg:py-16"
        style={{ backgroundColor: theme.palette.background }}
      >
        <div className="mx-auto max-w-5xl">
          <EditableText
            path={`pages.home.blocks.${blockId}.props.title`}
            value={props.title}
            as="h2"
            className="text-3xl font-bold tracking-[-0.04em]"
            style={{ fontFamily: "var(--font-editorial)" }}
          />
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {items.map((item, index) => (
              <StyleTileItem
                key={`${item.label}-${index}`}
                item={item}
                index={index}
                blockId={blockId}
                categories={categories}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "compact_grid") {
    return (
      <section className="px-4 py-12 sm:px-6 lg:py-16" style={{ backgroundColor: theme.palette.background }}>
        <div className="mx-auto max-w-7xl">
          <EditableText
            path={`pages.home.blocks.${blockId}.props.title`}
            value={props.title}
            as="h2"
            className="text-center text-3xl font-bold tracking-[-0.04em]"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <CompactGridItem
                key={`${item.label}-${index}`}
                item={item}
                index={index}
                blockId={blockId}
                categories={categories}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="px-4 py-16 text-center sm:px-6 lg:py-20"
      style={{ backgroundColor: theme.palette.background }}
    >
      {props.eyebrow ? (
        <EditableText
          path={`pages.home.blocks.${blockId}.props.eyebrow`}
          value={props.eyebrow}
          as="p"
          className="text-[11px] font-medium tracking-[0.18em]"
          style={{ color: theme.palette.muted }}
        />
      ) : null}
      <EditableText
        path={`pages.home.blocks.${blockId}.props.title`}
        value={props.title}
        as="h2"
        className="mt-3 text-4xl font-bold tracking-[-0.04em]"
        style={{ fontFamily: "var(--font-editorial)" } as CSSProperties}
      />
      <div className="mx-auto mt-10 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <EditorialGridItem
            key={`${item.label}-${index}`}
            item={item}
            index={index}
            blockId={blockId}
            categories={categories}
          />
        ))}
      </div>
    </section>
  );
}
