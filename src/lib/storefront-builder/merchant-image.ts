/** Extract merchant-uploaded image URLs from chat markers like `[Image: https://…]`. */
export function extractMerchantImageUrls(message: string): string[] {
  const urls: string[] = [];
  const re = /\[Image:\s*(https?:\/\/[^\s\]]+)\]/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(message)) !== null) {
    const url = match[1]?.trim();
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function extractFirstMerchantImageUrl(message: string): string | null {
  return extractMerchantImageUrls(message)[0] ?? null;
}

export function messageHasMerchantImage(message: string): boolean {
  return extractMerchantImageUrls(message).length > 0;
}

export function formatMerchantImageRefs(urls: string[]): string {
  return urls.map((url) => `[Image: ${url}]`).join(" ");
}
