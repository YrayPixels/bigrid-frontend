/** Unique gallery images for a PDP. Prefers product.images, then image_url, then placeholders. */
export function resolveProductGalleryImages(
  productImageUrl: string | null | undefined,
  placeholders: string[] = [],
  limit = 8,
  productImages?: string[] | null,
): string[] {
  const unique: string[] = [];

  const push = (src: string | null | undefined) => {
    const trimmed = src?.trim();
    if (!trimmed || unique.includes(trimmed)) return;
    unique.push(trimmed);
  };

  for (const src of productImages ?? []) {
    push(src);
    if (unique.length >= limit) return unique;
  }

  push(productImageUrl);
  if (unique.length >= limit) return unique;

  if (unique.length === 0) {
    for (const src of placeholders) {
      push(src);
      if (unique.length >= limit) break;
    }
  }

  return unique;
}
