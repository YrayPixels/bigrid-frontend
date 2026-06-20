import { storefrontPathLabel } from "@/lib/storefront-builder/editable-paths";

export function describeStorefrontEdit(changedPaths: string[]): string {
  if (!changedPaths.length) {
    return "I reviewed your request but did not change any protected fields.";
  }

  const labels = changedPaths.map((path) => storefrontPathLabel(path));
  if (labels.length === 1) {
    return `Done — I updated the ${labels[0]}. Check the preview on the right.`;
  }
  if (labels.length === 2) {
    return `Done — I updated the ${labels[0]} and ${labels[1]}. Check the preview on the right.`;
  }

  const last = labels.pop();
  return `Done — I updated the ${labels.join(", ")}, and ${last}. Check the preview on the right.`;
}

export function isTechnicalEditMessage(content: string): boolean {
  return /^Updated:\s*[\w.,\s]+$/i.test(content.trim());
}
