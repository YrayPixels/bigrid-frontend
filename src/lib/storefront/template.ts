import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
} from "@/lib/api/types";

export type StorefrontMode = "live" | "edit" | "preview";

export type StorefrontTheme = {
  id: StorefrontTemplateId;
  brandColor: string;
  palette: StorefrontColorPalette;
  shell: "default" | "fashion" | "minimalistic" | "beauty" | "cosmetics";
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
  palette?: StorefrontColorPalette,
): StorefrontTheme {
  const resolvedPalette = getStorefrontPalette(templateId, brandColor, palette);
  const base = {
    id: templateId,
    brandColor: resolvedPalette.primary,
    palette: resolvedPalette,
    pagePadding: "px-4 py-12 sm:px-6",
    pageMaxWidth: "max-w-7xl mx-auto",
  };

  switch (templateId) {
    case "cosmetics":
      return {
        ...base,
        shell: "cosmetics",
        displayFont: "var(--font-display)",
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
        buttonRadius: "rounded-none",
        buttonStyle: "square",
        heroAlign: "left",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-4",
      };
    case "beauty":
      return {
        ...base,
        shell: "beauty",
        displayFont: "var(--font-editorial)",
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
        buttonRadius: "rounded-full",
        buttonStyle: "rounded",
        heroAlign: "center",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-4",
      };
    case "minimalistic":
      return {
        ...base,
        shell: "minimalistic",
        displayFont: "var(--font-display)",
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
        buttonRadius: "rounded-full",
        buttonStyle: "rounded",
        heroAlign: "center",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-3",
      };
    case "fashion_lookbook":
      return {
        ...base,
        shell: "fashion",
        displayFont: "var(--font-editorial)",
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
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
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
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
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
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
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
        buttonRadius: "rounded-md",
        buttonStyle: "rounded",
        heroAlign: "left",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-3",
      };
  }
}

export function getDefaultStorefrontPalette(
  templateId: StorefrontTemplateId,
  brandColor?: string,
): StorefrontColorPalette {
  switch (templateId) {
    case "cosmetics":
      return {
        primary: brandColor ?? "#82934C",
        accent: "#F7E7D3",
        background: "#FFFFFF",
        surface: "#F4F6F1",
        text: "#172012",
        muted: "#6E7564",
        border: "#E2E6D9",
      };
    case "beauty":
      return {
        primary: brandColor ?? "#6F2F2B",
        accent: "#E6A79F",
        background: "#FFF7F3",
        surface: "#FFFFFF",
        text: "#211313",
        muted: "#80615C",
        border: "#F0D6D0",
      };
    case "minimalistic":
      return {
        primary: brandColor ?? "#073E3F",
        accent: "#D99359",
        background: "#FBFBDC",
        surface: "#FFFFFF",
        text: "#073E3F",
        muted: "#5F7A6F",
        border: "#D8DEC1",
      };
    case "fashion_lookbook":
      return {
        primary: brandColor ?? "#111111",
        accent: "#80131B",
        background: "#FFFFFF",
        surface: "#EEF0EF",
        text: "#111111",
        muted: "#6E6E6E",
        border: "#E3E3E3",
      };
    case "editorial":
      return {
        primary: brandColor ?? "#7C3A2D",
        accent: "#D8A48F",
        background: "#FFFFFF",
        surface: "#F8F3F0",
        text: "#241613",
        muted: "#75615B",
        border: "#E8DAD5",
      };
    case "bold_grid":
      return {
        primary: brandColor ?? "#0F4C81",
        accent: "#F59E0B",
        background: "#FFFFFF",
        surface: "#F3F7FB",
        text: "#102033",
        muted: "#607085",
        border: "#DCE7F2",
      };
    default:
      return {
        primary: brandColor ?? "#1F6F5B",
        accent: "#F4B860",
        background: "#FFFFFF",
        surface: "#F7FAF8",
        text: "#10201B",
        muted: "#64736E",
        border: "#DCE7E1",
      };
  }
}

export function getStorefrontPalette(
  templateId: StorefrontTemplateId,
  brandColor: string,
  palette?: StorefrontColorPalette,
): StorefrontColorPalette {
  return {
    ...getDefaultStorefrontPalette(templateId, brandColor),
    ...palette,
    primary: palette?.primary ?? brandColor,
  };
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
  fashion_lookbook: { label: "Fashion", brandColor: "#123D33" },
  beauty: { label: "Beauty", brandColor: "#6F2F2B" },
  cosmetics: { label: "Cosmetics", brandColor: "#82934C" },
  minimalistic: { label: "Minimalistic", brandColor: "#073E3F" },
};

export const STOREFRONT_PALETTE_PRESETS: {
  id: string;
  label: string;
  palette: StorefrontColorPalette;
}[] = [
  {
    id: "fresh",
    label: "Fresh Botanical",
    palette: {
      primary: "#1F6F5B",
      accent: "#F4B860",
      background: "#FAF8EF",
      surface: "#FFFFFF",
      text: "#10201B",
      muted: "#65756E",
      border: "#DCE7E1",
    },
  },
  {
    id: "mono",
    label: "Modern Mono",
    palette: {
      primary: "#111111",
      accent: "#8A8A8A",
      background: "#FFFFFF",
      surface: "#F4F4F3",
      text: "#111111",
      muted: "#6E6E6E",
      border: "#E3E3E3",
    },
  },
  {
    id: "terracotta",
    label: "Warm Terracotta",
    palette: {
      primary: "#7C3A2D",
      accent: "#D99359",
      background: "#FFF8F2",
      surface: "#FFFFFF",
      text: "#2A1712",
      muted: "#806A61",
      border: "#EAD8CE",
    },
  },
  {
    id: "electric",
    label: "Electric Blue",
    palette: {
      primary: "#0F4C81",
      accent: "#6B4EFF",
      background: "#F6FAFF",
      surface: "#FFFFFF",
      text: "#102033",
      muted: "#607085",
      border: "#DCE7F2",
    },
  },
];
