export type ImageReplaceScope = "full_site" | "category_showcase" | "hero" | "about" | "products";

export const IMAGE_REPLACE_SCOPES: readonly ImageReplaceScope[] = [
  "full_site",
  "category_showcase",
  "hero",
  "about",
  "products",
] as const;

export function isImageReplaceScope(value: string): value is ImageReplaceScope {
  return (IMAGE_REPLACE_SCOPES as readonly string[]).includes(value);
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

export function remainingPlannedTools(
  planSteps: Array<{ tools?: string[] }>,
  completedToolNames: string[],
): string[] {
  const planned = [...new Set(planSteps.flatMap((step) => step.tools ?? []).filter(Boolean))];
  const done = new Set(completedToolNames);
  return planned.filter((tool) => !done.has(tool));
}
