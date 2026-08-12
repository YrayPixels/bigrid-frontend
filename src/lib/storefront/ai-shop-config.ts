import type { Store } from "@/lib/api/types";

export type ShopperMode = "fashion" | "electronics" | "beauty" | "general";

export type ShopperQuickPickChip = {
  type: string;
  label: string;
  value: string;
};

export type ShopperQuickPickGroup = {
  group: string;
  chips: ShopperQuickPickChip[];
};

export type ShopperContext = {
  mode: ShopperMode;
  industry: string;
  store_name: string;
  supports_looks: boolean;
  supports_try_on: boolean;
  recommendation_type: "look" | "products";
  welcome_message: string;
  placeholder: string;
  assistant_title: string;
  quick_picks: ShopperQuickPickGroup[];
  default_suggestions: string[];
  categories: Array<{ id: string; name: string; slug: string }>;
};

function modeFromIndustry(industry: string): ShopperMode {
  const haystack = industry.toLowerCase();
  if (haystack.includes("fashion") || haystack.includes("apparel") || haystack.includes("clothing")) {
    return "fashion";
  }
  if (haystack.includes("electronic") || haystack.includes("gadget")) {
    return "electronics";
  }
  if (haystack.includes("beauty") || haystack.includes("skincare") || haystack.includes("cosmetic")) {
    return "beauty";
  }
  return "general";
}

/** Client-side fallback before the first API round-trip. */
export function fallbackShopperContext(store: Store): ShopperContext {
  const mode = modeFromIndustry(store.industry ?? "other");
  const storeName = store.business_name || "this store";

  const budgets: ShopperQuickPickChip[] = [
    { type: "budget", label: "< ₦50k", value: "< 50k" },
    { type: "budget", label: "₦50–100k", value: "50-100k" },
    { type: "budget", label: "₦100–200k", value: "100-200k" },
    { type: "budget", label: "₦200k+", value: "200k+" },
  ];

  if (mode === "fashion") {
    return {
      mode,
      industry: store.industry ?? "other",
      store_name: storeName,
      supports_looks: true,
      supports_try_on: Boolean(store.features?.virtual_try_on?.enabled),
      recommendation_type: "look",
      welcome_message: `What are you dressing for? Tell me the occasion, vibe, or budget and I’ll build a look from ${storeName}.`,
      placeholder: "e.g. Wedding outfit under ₦150k…",
      assistant_title: "Personal stylist",
      quick_picks: [
        {
          group: "Occasion",
          chips: ["Wedding", "Date night", "Office", "Vacation", "Party", "Casual"].map((label) => ({
            type: "occasion",
            label,
            value: label.toLowerCase().replace(/\s+/g, "_"),
          })),
        },
        { group: "Budget", chips: budgets },
        {
          group: "Vibe",
          chips: ["Elegant", "Minimal", "Bold", "Classic", "Trendy"].map((label) => ({
            type: "style",
            label,
            value: label.toLowerCase(),
          })),
        },
      ],
      default_suggestions: [
        "Wedding under ₦150k",
        "Elegant office look",
        "Something bold for a party",
      ],
      categories: [],
    };
  }

  if (mode === "electronics") {
    return {
      mode,
      industry: store.industry ?? "other",
      store_name: storeName,
      supports_looks: false,
      supports_try_on: false,
      recommendation_type: "products",
      welcome_message: `What are you shopping for at ${storeName}? Laptops, cameras, audio — tell me your use case and budget.`,
      placeholder: "e.g. Laptop for editing under ₦500k…",
      assistant_title: "Shopping assistant",
      quick_picks: [
        {
          group: "Category",
          chips: ["Laptops", "Cameras", "Phones", "Audio", "Accessories"].map((label) => ({
            type: "category",
            label,
            value: label.toLowerCase(),
          })),
        },
        { group: "Budget", chips: budgets },
        {
          group: "Use case",
          chips: ["Work", "Gaming", "Photography", "Student", "Travel"].map((label) => ({
            type: "use_case",
            label,
            value: label.toLowerCase().replace(/\s+/g, "_"),
          })),
        },
      ],
      default_suggestions: [
        "Laptop for work under ₦400k",
        "Good camera for beginners",
        "Wireless headphones under ₦80k",
      ],
      categories: [],
    };
  }

  return {
    mode,
    industry: store.industry ?? "other",
    store_name: storeName,
    supports_looks: false,
    supports_try_on: false,
    recommendation_type: "products",
    welcome_message: `What can I help you find at ${storeName}? Tell me what you need or pick a category.`,
    placeholder: "Tell me what you’re looking for…",
    assistant_title: mode === "beauty" ? "Beauty advisor" : "Personal shopper",
    quick_picks: [{ group: "Budget", chips: budgets }],
    default_suggestions: [
      "What’s popular here?",
      "Best value under ₦100k",
      "Help me choose",
    ],
    categories: [],
  };
}
