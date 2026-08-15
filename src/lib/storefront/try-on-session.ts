import { storefrontApi } from "@/lib/api/storefront";
import type { TryOnSession } from "@/lib/api/types";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 45;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForTryOnSession(
  slug: string,
  session: TryOnSession,
  options?: { signal?: AbortSignal },
): Promise<TryOnSession> {
  if (session.status === "success" || session.status === "error") {
    return session;
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (options?.signal?.aborted) {
      throw new DOMException("Try-on cancelled.", "AbortError");
    }
    await sleep(POLL_MS);
    if (options?.signal?.aborted) {
      throw new DOMException("Try-on cancelled.", "AbortError");
    }
    const { session: next } = await storefrontApi.getTryOnSession(slug, session.id);
    if (next.status === "success" || next.status === "error") {
      return next;
    }
  }

  throw new Error("Still working — refresh or try again in a moment.");
}
