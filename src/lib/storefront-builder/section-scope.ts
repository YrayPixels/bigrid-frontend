export type ImageReplaceScope = "full_site" | "category_showcase" | "hero" | "about" | "products";

const FULL_SITE_PATTERN =
  /\b(all|every|whole|entire|full|across)\b.*\b(photo|photos|image|images|picture|pictures|site|website|template|storefront)\b|\b(refresh|replace|update)\b.*\b(all|every)\b.*\b(photo|photos|image|images)\b/;

const CATEGORY_SHOWCASE_PATTERN =
  /\b(essentials|essentials page|shop the essentials|category showcase|categories section|category grid|shop by category)\b/;

export function isCategoryShowcaseInstruction(text: string): boolean {
  return CATEGORY_SHOWCASE_PATTERN.test(text.toLowerCase().trim());
}

const PRODUCTS_PAGE_PATTERN =
  /\b(products page|product page|product listing|explore our essentials)\b/;

const ABOUT_PATTERN =
  /\b(about page|about section|brand story)\b/;

const HERO_PATTERN =
  /\b(homepage hero|home hero|hero section|homepage header|home header|header image)\b/;

export function inferImageReplaceScope(text: string): ImageReplaceScope | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;
  if (CATEGORY_SHOWCASE_PATTERN.test(lower)) return "category_showcase";
  if (FULL_SITE_PATTERN.test(lower)) return "full_site";
  if (PRODUCTS_PAGE_PATTERN.test(lower)) return "products";
  if (HERO_PATTERN.test(lower)) return "hero";
  if (ABOUT_PATTERN.test(lower)) return "about";
  return null;
}

export function isExplicitFullSiteImageRequest(text: string): boolean {
  return inferImageReplaceScope(text) === "full_site";
}

export function describeImageScope(scope: ImageReplaceScope): string {
  switch (scope) {
    case "category_showcase":
      return "Essentials / category showcase section";
    case "hero":
      return "homepage hero";
    case "about":
      return "about section";
    case "products":
      return "product photos";
    case "full_site":
      return "entire website";
  }
}

export function sectionScopeHint(text: string): string | null {
  const scope = inferImageReplaceScope(text);
  if (!scope || scope === "full_site") return null;
  return `Scope this work to the ${describeImageScope(scope)} only — do not change unrelated pages or sections.`;
}

export function remainingPlannedTools(
  planSteps: Array<{ tools?: string[] }>,
  completedToolNames: string[],
): string[] {
  const planned = [...new Set(planSteps.flatMap((step) => step.tools ?? []).filter(Boolean))];
  const done = new Set(completedToolNames);
  return planned.filter((tool) => !done.has(tool));
}

export function resolveImageReplaceScope(
  text: string,
  explicitScope?: ImageReplaceScope | null,
): ImageReplaceScope | null {
  if (explicitScope) return explicitScope;
  const inferred = inferImageReplaceScope(text);
  if (inferred) return inferred;
  if (isExplicitFullSiteImageRequest(text)) return "full_site";
  return null;
}

export function resolveCategoryShowcaseImageScope(
  instruction: string,
  planIntent?: string,
  message?: string,
  explicitScope?: ImageReplaceScope | null,
): ImageReplaceScope | null {
  const combined = [message, planIntent, instruction].filter(Boolean).join(" ");
  if (isCategoryShowcaseInstruction(combined) || isCategoryShowcaseInstruction(message ?? "")) {
    return "category_showcase";
  }
  return resolveImageReplaceScope(combined, explicitScope);
}
