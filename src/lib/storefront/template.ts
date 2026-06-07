import type { Store, StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";

export type StorefrontMode = "live" | "edit" | "preview";

export type StorefrontTheme = {
  id: StorefrontTemplateId;
  brandColor: string;
  shell: "default" | "fashion";
  displayFont: string;
  pageBg: string;
  pageText: string;
  mutedText: string;
  borderColor: string;
  cardBg: string;
  buttonRadius: string;
  buttonStyle: "rounded" | "square";
  heroAlign: "left" | "center";
  productGridCols: string;
  pagePadding: string;
  pageMaxWidth: string;
};

export function resolveStorefrontTemplate(
  store: Store,
  storefront: StorefrontContent,
): StorefrontTemplateId {
  const chosen = store.storefront_template_id;
  return storefront.template?.id ?? (chosen && chosen !== "ai_pick" ? chosen : "classic");
}

export function getStorefrontTheme(
  templateId: StorefrontTemplateId,
  brandColor: string,
): StorefrontTheme {
  const base = {
    id: templateId,
    brandColor,
    pagePadding: "px-4 py-12 sm:px-6",
    pageMaxWidth: "max-w-7xl mx-auto",
  };

  switch (templateId) {
    case "fashion_lookbook":
      return {
        ...base,
        shell: "fashion",
        displayFont: "var(--font-editorial)",
        pageBg: "bg-white",
        pageText: "text-[#111111]",
        mutedText: "text-[#6e6e6e]",
        borderColor: "border-black/10",
        cardBg: "bg-[#eef0ef]",
        buttonRadius: "rounded-none",
        buttonStyle: "square",
        heroAlign: "center",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-4",
      };
    case "editorial":
      return {
        ...base,
        shell: "default",
        displayFont: "var(--font-display)",
        pageBg: "bg-background",
        pageText: "text-foreground",
        mutedText: "text-muted-foreground",
        borderColor: "border-border",
        cardBg: "bg-card",
        buttonRadius: "rounded-full",
        buttonStyle: "rounded",
        heroAlign: "center",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-3",
      };
    case "bold_grid":
      return {
        ...base,
        shell: "default",
        displayFont: "var(--font-display)",
        pageBg: "bg-background",
        pageText: "text-foreground",
        mutedText: "text-muted-foreground",
        borderColor: "border-border",
        cardBg: "bg-card",
        buttonRadius: "rounded-md",
        buttonStyle: "rounded",
        heroAlign: "left",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-3",
      };
    default:
      return {
        ...base,
        shell: "default",
        displayFont: "var(--font-display)",
        pageBg: "bg-background",
        pageText: "text-foreground",
        mutedText: "text-muted-foreground",
        borderColor: "border-border",
        cardBg: "bg-card",
        buttonRadius: "rounded-md",
        buttonStyle: "rounded",
        heroAlign: "left",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-3",
      };
  }
}

export const STOREFRONT_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
] as const;

export const STOREFRONT_FOOTER_LINKS = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
] as const;

export const STOREFRONT_THEME_PRESETS: Record<
  StorefrontTemplateId,
  { label: string; brandColor: string }
> = {
  classic: { label: "Classic Commerce", brandColor: "#1F6F5B" },
  editorial: { label: "Editorial Brand", brandColor: "#7C3A2D" },
  bold_grid: { label: "Bold Product Grid", brandColor: "#0F4C81" },
  fashion_lookbook: { label: "Fashion Lookbook", brandColor: "#123D33" },
};
