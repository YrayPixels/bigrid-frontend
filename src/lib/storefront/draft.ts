import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
} from "@/lib/api/types";
import { clearBoltProjectFromStorefront } from "./bolt-template-storefront";
import { applyFurnitureHardwareTemplatePreset } from "./template-presets/furniture-hardware";
import { applyHairFashionTemplatePreset } from "./template-presets/hair-and-fashion";
import { getDefaultStorefrontPalette, resolveStorefrontTemplate } from "./template";

type StorefrontDefaultsContext = Pick<Store, "business_name" | "description">;

function defaultHero(context?: StorefrontDefaultsContext): StorefrontContent["hero"] {
  const businessName = context?.business_name ?? "Our store";
  const description =
    context?.description?.trim() || `Tell customers what makes ${businessName} special.`;

  return {
    headline: `Welcome to ${businessName}`,
    subheadline: description,
    cta_label: "Shop now",
  };
}

function defaultAbout(context?: StorefrontDefaultsContext): StorefrontContent["about"] {
  const businessName = context?.business_name ?? "Our store";
  const description =
    context?.description?.trim() || `Tell customers what makes ${businessName} special.`;

  return {
    title: `About ${businessName}`,
    body: description,
  };
}

function defaultSeo(context?: StorefrontDefaultsContext): StorefrontContent["seo"] {
  const businessName = context?.business_name ?? "Our store";
  const description =
    context?.description?.trim() || `Tell customers what makes ${businessName} special.`;

  return {
    title: `${businessName} | Online Store`,
    description: description.slice(0, 150),
  };
}

/** Ensure required storefront sections exist before rendering or editing. */
export function normalizeStorefrontContent(
  content: StorefrontContent,
  context?: StorefrontDefaultsContext,
): StorefrontContent {
  const heroDefaults = defaultHero(context);
  const aboutDefaults = defaultAbout(context);
  const seoDefaults = defaultSeo(context);

  return {
    ...content,
    hero: {
      ...heroDefaults,
      ...content.hero,
      headline: content.hero?.headline?.trim() || heroDefaults.headline,
      subheadline: content.hero?.subheadline?.trim() || heroDefaults.subheadline,
      cta_label: content.hero?.cta_label?.trim() || heroDefaults.cta_label,
    },
    about: {
      ...aboutDefaults,
      ...content.about,
      title: content.about?.title?.trim() || aboutDefaults.title,
      body: content.about?.body?.trim() || aboutDefaults.body,
    },
    seo: {
      ...seoDefaults,
      ...content.seo,
      title: content.seo?.title?.trim() || seoDefaults.title,
      description: content.seo?.description?.trim() || seoDefaults.description,
    },
    value_props: content.value_props ?? [],
  };
}

export function cloneStorefrontContent(content: StorefrontContent): StorefrontContent {
  return JSON.parse(JSON.stringify(content)) as StorefrontContent;
}

export function setDraftField(
  content: StorefrontContent,
  path: string,
  value: string,
): StorefrontContent {
  const next = cloneStorefrontContent(content);
  const parts = path.split(".");

  if (parts[0] === "hero" && parts[1]) {
    next.hero = { ...defaultHero(), ...next.hero, [parts[1]]: value };
    return next;
  }

  if (parts[0] === "about" && parts[1]) {
    next.about = { ...defaultAbout(), ...next.about, [parts[1]]: value };
    if (next.pages?.about) {
      next.pages.about = { ...next.pages.about, [parts[1]]: value, source: "merchant" };
    }
    return next;
  }

  if (parts[0] === "seo" && parts[1]) {
    next.seo = { ...next.seo, [parts[1]]: value };
    return next;
  }

  if (parts[0] === "media" && parts[1] === "category_images" && parts[2]) {
    const index = Number(parts[2]);
    const categoryImages = [...(next.media?.category_images ?? [])];
    categoryImages[index] = value.trim() || null;
    next.media = {
      ...next.media,
      category_images: categoryImages,
    };
    return next;
  }

  if (parts[0] === "media" && parts[1]) {
    next.media = {
      ...next.media,
      [parts[1]]: value.trim() || null,
    };
    return next;
  }

  if (parts[0] === "data_plugs" && parts[1]) {
    if (
      parts[1] !== "home_products_source" ||
      (value !== "merchant_products" && value !== "theme_products")
    ) {
      return next;
    }

    next.data_plugs = {
      ...next.data_plugs,
      home_products_source: value,
    };
    return next;
  }

  if (parts[0] === "products" && parts[1] && parts[2] === "image_url") {
    const index = Number(parts[1]);
    next.products = (next.products ?? []).map((product, productIndex) =>
      productIndex === index ? { ...product, image_url: value.trim() || null } : product,
    );
    return next;
  }

  if (parts[0] === "value_props" && parts[1] && parts[2]) {
    const index = Number(parts[1]);
    const field = parts[2] as "title" | "body";
    next.value_props = next.value_props.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    );
    return next;
  }

  if (parts[0] === "pages" && parts[1] === "about" && parts[2]) {
    next.pages = {
      ...next.pages,
      about: {
        ...(next.pages?.about ?? {
          title: next.about.title,
          body: next.about.body,
          source: "merchant" as const,
        }),
        [parts[2]]: value,
        source: "merchant",
      },
      contact: next.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "merchant",
      },
      faq: next.pages?.faq ?? {
        title: "Frequently asked questions",
        source: "merchant",
        items: [],
      },
      privacy_policy: next.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
    };
    if (parts[2] === "title" || parts[2] === "body") {
      next.about = { ...next.about, [parts[2]]: value };
    }
    return next;
  }

  if (parts[0] === "pages" && parts[1] === "contact" && parts[2]) {
    next.pages = {
      ...next.pages,
      contact: {
        ...(next.pages?.contact ?? {
          title: "Contact us",
          body: "",
          email: null,
          phone: null,
          source: "merchant" as const,
        }),
        [parts[2]]: value,
        source: "merchant",
      },
      about: next.pages?.about ?? {
        title: next.about.title,
        body: next.about.body,
        source: "merchant",
      },
      faq: next.pages?.faq ?? {
        title: "Frequently asked questions",
        source: "merchant",
        items: [],
      },
      privacy_policy: next.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
    };
    return next;
  }

  if (parts[0] === "home_stats" && parts[1] && parts[2]) {
    const index = Number(parts[1]);
    const field = parts[2] as "value" | "label";
    const homeStats = [...(next.home_stats ?? [])];
    homeStats[index] = {
      ...(homeStats[index] ?? { value: "", label: "" }),
      [field]: value,
    };
    next.home_stats = homeStats;
    return next;
  }

  if (parts[0] === "navigation" && parts[1] && parts[2] === "label") {
    const index = Number(parts[1]);
    const navigation = [...(next.navigation ?? [])];
    navigation[index] = {
      ...(navigation[index] ?? { label: "", href: "/" }),
      label: value,
    };
    next.navigation = navigation;
    return next;
  }

  if (parts[0] === "pages" && parts[1] === "faq" && parts[2] === "title") {
    next.pages = {
      ...next.pages,
      faq: {
        ...(next.pages?.faq ?? { title: "Frequently asked questions", source: "merchant", items: [] }),
        title: value,
        source: "merchant",
      },
      about: next.pages?.about ?? {
        title: next.about.title,
        body: next.about.body,
        source: "merchant",
      },
      contact: next.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "merchant",
      },
      privacy_policy: next.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
    };
    return next;
  }

  if (parts[0] === "pages" && parts[1] === "faq" && parts[2] === "items" && parts[3] && parts[4]) {
    const index = Number(parts[3]);
    const field = parts[4] as "question" | "answer";
    const faq = next.pages?.faq ?? {
      title: "Frequently asked questions",
      source: "merchant" as const,
      items: [],
    };
    faq.items = faq.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    );
    next.pages = {
      ...next.pages,
      about: next.pages?.about ?? {
        title: next.about.title,
        body: next.about.body,
        source: "merchant",
      },
      contact: next.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "merchant",
      },
      faq: { ...faq, source: "merchant" },
      privacy_policy: next.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
    };
    return next;
  }

  return next;
}

export function applyTemplateToDraft(
  content: StorefrontContent,
  templateId: StorefrontTemplateId,
  palette?: StorefrontColorPalette,
): StorefrontContent {
  return {
    ...content,
    template: { id: templateId, source: "merchant_selected" },
    ...(palette ? { palette } : {}),
  };
}

export function applyTemplatePreset(
  content: StorefrontContent,
  templateId: StorefrontTemplateId,
  brandColor?: string | null,
): StorefrontContent {
  const withoutBoltProject = clearBoltProjectFromStorefront(content);

  if (templateId === "furniture-hardware") {
    return applyFurnitureHardwareTemplatePreset(withoutBoltProject, brandColor ?? undefined);
  }

  if (templateId === "hair-and-fashion") {
    return applyHairFashionTemplatePreset(withoutBoltProject, brandColor ?? undefined);
  }

  return applyTemplateToDraft(
    withoutBoltProject,
    templateId,
    getDefaultStorefrontPalette(templateId, brandColor ?? undefined),
  );
}

export function getInitialDraft(store: Store, storefront: StorefrontContent): StorefrontContent {
  const templateId = resolveStorefrontTemplate(store, storefront);
  return applyTemplateToDraft(
    normalizeStorefrontContent(cloneStorefrontContent(storefront), store),
    templateId,
  );
}
