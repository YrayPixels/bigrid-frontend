import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontThemeOverrides,
} from "@/lib/api/types";

export type StorefrontMode = "live" | "edit" | "preview";

export type StorefrontTheme = {
  id: StorefrontTemplateId;
  brandColor: string;
  palette: StorefrontColorPalette;
  shell: "default" | "fashion" | "minimalistic" | "beauty" | "cosmetics" | "furniture" | "hair_fashion";
  displayFont: string;
  /** Set only when merchant overrides body font; otherwise inherit default stack. */
  bodyFont: string | null;
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
  // Merchant store selection is authoritative when set — avoids a stale
  // storefront.template.id (often fashion_lookbook) winning after a switch.
  const merchantChoice = store.storefront_template_id;
  if (merchantChoice && merchantChoice !== "ai_pick") {
    return merchantChoice;
  }

  if (storefront.template?.id) {
    return storefront.template.id;
  }

  return "classic";
}

export function alignStorefrontTemplateToSelection(
  storefront: StorefrontContent | null | undefined,
  templateId: StorefrontTemplateId | null | undefined,
  brandColor?: string | null,
): StorefrontContent | null | undefined {
  if (!storefront || !templateId) {
    return storefront;
  }

  const existing = storefront.template?.id;
  if (existing === templateId) {
    return storefront;
  }

  return {
    ...storefront,
    template: {
      id: templateId,
      source: "merchant_selected",
    },
    palette: getDefaultStorefrontPalette(
      templateId,
      brandColor ?? storefront.palette?.primary ?? undefined,
    ),
  };
}

/**
 * Available display fonts the AI can pick from.
 * Key = machine ID used in prompts, value = CSS variable + human label.
 */
export const STOREFRONT_FONT_OPTIONS: Record<string, { css: string; label: string; description: string }> = {
  "modern-sans": { css: "var(--font-display)", label: "Modern Sans", description: "Clean modern sans-serif — Space Grotesk" },
  "elegant-serif": { css: "var(--font-editorial)", label: "Elegant Serif", description: "Sophisticated editorial serif — Playfair Display" },
  "clean-sans": { css: "var(--font-sans)", label: "Clean Sans", description: "Simple readable sans-serif — Inter" },
  "script": { css: "var(--font-script)", label: "Script", description: "Decorative flowing script — Allura" },
};

/** Body fonts (no script — body text must stay readable). */
export const STOREFRONT_BODY_FONT_OPTIONS: Record<
  "clean-sans" | "modern-sans" | "elegant-serif",
  { css: string; label: string; description: string }
> = {
  "clean-sans": STOREFRONT_FONT_OPTIONS["clean-sans"],
  "modern-sans": STOREFRONT_FONT_OPTIONS["modern-sans"],
  "elegant-serif": STOREFRONT_FONT_OPTIONS["elegant-serif"],
};

const BUTTON_RADIUS_MAP = {
  none: "rounded-none",
  md: "rounded-md",
  full: "rounded-full",
} as const;

/**
 * Resolve the display font from a storefront JSON font value.
 * Accepts CSS variable strings (e.g. "var(--font-editorial)") or font option keys (e.g. "elegant-serif").
 */
export function resolveDisplayFont(fontValue: string | null | undefined, templateDefault: string): string {
  if (!fontValue) return templateDefault;
  // Direct CSS variable match
  if (fontValue.startsWith("var(--")) return fontValue;
  // Font option key lookup
  return STOREFRONT_FONT_OPTIONS[fontValue]?.css ?? templateDefault;
}

export function resolveBodyFont(fontKey: string | null | undefined): string | null {
  if (!fontKey) return null;
  return STOREFRONT_BODY_FONT_OPTIONS[fontKey as keyof typeof STOREFRONT_BODY_FONT_OPTIONS]?.css ?? null;
}

function applyThemeOverrides(
  theme: StorefrontTheme,
  overrides?: StorefrontThemeOverrides | null,
): StorefrontTheme {
  if (!overrides) return theme;

  const next = { ...theme };

  if (overrides.button_radius) {
    next.buttonRadius = BUTTON_RADIUS_MAP[overrides.button_radius];
  }

  if (overrides.button_style === "square") {
    next.buttonStyle = "square";
    if (!overrides.button_radius) {
      next.buttonRadius = "rounded-none";
    }
  } else if (overrides.button_style === "pill") {
    next.buttonStyle = "rounded";
    if (!overrides.button_radius) {
      next.buttonRadius = "rounded-full";
    }
  } else if (overrides.button_style === "rounded") {
    next.buttonStyle = "rounded";
    if (!overrides.button_radius) {
      next.buttonRadius = "rounded-md";
    }
  }

  if (overrides.density === "compact") {
    next.pagePadding = "px-4 py-8 sm:px-5";
    next.productGridCols = "sm:grid-cols-2 lg:grid-cols-4";
  } else if (overrides.density === "airy") {
    next.pagePadding = "px-4 py-16 sm:px-8";
    next.productGridCols = "sm:grid-cols-2 lg:grid-cols-3";
  }
  // density === "default" keeps template padding/cols

  if (overrides.body_font) {
    next.bodyFont = resolveBodyFont(overrides.body_font);
  }

  return next;
}

export function getStorefrontTheme(
  templateId: StorefrontTemplateId,
  brandColor: string,
  palette?: StorefrontColorPalette,
  displayFontOverride?: string | null,
  themeOverrides?: StorefrontThemeOverrides | null,
): StorefrontTheme {
  const resolvedPalette = getStorefrontPalette(templateId, brandColor, palette);
  const base = {
    id: templateId,
    brandColor: resolvedPalette.primary,
    palette: resolvedPalette,
    bodyFont: null as string | null,
    pagePadding: "px-4 py-12 sm:px-6",
    pageMaxWidth: "max-w-7xl mx-auto",
  };

  let result: StorefrontTheme;

  switch (templateId) {
    case "cosmetics":
      result = {
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
      break;
    case "beauty":
      result = {
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
      break;
    case "minimalistic":
      result = {
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
      break;
    case "fashion_lookbook":
      result = {
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
      break;
    case "furniture-hardware":
      result = {
        ...base,
        shell: "furniture",
        displayFont: "var(--font-display)",
        // Aligned to previous hard-coded hexes so defaults are visually identical.
        pageBg: "bg-[var(--store-bg)]",
        pageText: "text-[var(--store-text)]",
        mutedText: "text-[var(--store-muted)]",
        borderColor: "border-[var(--store-border)]",
        cardBg: "bg-[var(--store-surface)]",
        buttonRadius: "rounded-full",
        buttonStyle: "rounded",
        heroAlign: "left",
        productGridCols: "sm:grid-cols-2 lg:grid-cols-4",
      };
      break;
    case "hair-and-fashion":
      result = {
        ...base,
        shell: "hair_fashion",
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
      break;
    case "editorial":
      result = {
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
      break;
    case "bold_grid":
      result = {
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
      break;
    default:
      result = {
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
      break;
  }

  if (displayFontOverride) {
    result.displayFont = resolveDisplayFont(displayFontOverride, result.displayFont);
  }

  return applyThemeOverrides(result, themeOverrides);
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
    case "furniture-hardware":
      // Match previous hard-coded theme paint (pageBg #f7f3eb, text #1c1812, etc.).
      return {
        primary: brandColor ?? "#2C2416",
        accent: "#C4A574",
        background: "#F7F3EB",
        surface: "#FFFFFF",
        text: "#1C1812",
        muted: "#7A6E5E",
        border: "#E8E0D4",
      };
    case "hair-and-fashion":
      return {
        primary: brandColor ?? "#1A1410",
        accent: "#D4A574",
        background: "#FDF8F3",
        surface: "#FFFFFF",
        text: "#1A1410",
        muted: "#7A6B5E",
        border: "#EDE4D8",
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
  "furniture-hardware": { label: "Furniture & Hardware", brandColor: "#2C2416" },
  "hair-and-fashion": { label: "Hair & Fashion", brandColor: "#1A1410" },
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

/** Clear merchant style customizations so a template’s standard look returns. */
export function clearStorefrontStyleOverrides(content: StorefrontContent): StorefrontContent {
  const next = { ...content };
  delete next.theme_overrides;
  delete next.display_font;
  return next;
}
