import type {
  BuilderBusinessProfile,
  BuilderMessage,
  BuilderPendingAction,
  BuilderPendingAddProduct,
  BuilderPendingAwaitKind,
  BuilderSession,
} from "@/lib/api/types";

export function parseMerchantPrice(message: string): number | null {
  const text = message.trim();
  if (!text || text.length > 120) return null;

  const normalized = text
    .replace(/₦/g, "")
    .replace(/\b(ngn|naira)\b/gi, "")
    .replace(/,/g, "")
    .trim();

  const match =
    normalized.match(
      /(?:^|\b)(?:lets?\s+)?(?:set|price|for|at|of|it(?:'s| is)?|to)?\s*[:=]?\s*(\d{3,9})(?:\b|$)/i,
    ) ?? normalized.match(/^(\d{3,9})$/);

  if (!match?.[1]) return null;
  const price = Number(match[1]);
  if (!Number.isFinite(price) || price <= 0) return null;
  return price;
}

export function looksLikePriceReply(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > 120) return false;
  if (parseMerchantPrice(text) == null) return false;
  if (/\b(add|create|build|website|headline|color|banner|description)\b/i.test(text) && text.length > 40) {
    return false;
  }
  return true;
}

export function isCancelPendingAction(message: string): boolean {
  return /^(never\s*mind|nvm|cancel|stop|skip|forget\s+it|don'?t)[\s!.]*$/i.test(message.trim());
}

/** Merchant started a new request instead of answering the clarification. */
export function looksLikeNewRequest(message: string): boolean {
  const text = message.trim();
  if (text.length < 24) return false;
  return /\b(add|create|update|change|rewrite|replace|build|switch|remove|delete|publish|list|show)\b/i.test(
    text,
  );
}

function asStringRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeAddProductsPending(value: Record<string, unknown>): BuilderPendingAction | null {
  if (!Array.isArray(value.products)) return null;
  const products: BuilderPendingAddProduct[] = value.products
    .map((item) => {
      const row = asStringRecord(item);
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return null;
      const price =
        typeof row.price === "number" && Number.isFinite(row.price) && row.price > 0
          ? row.price
          : undefined;
      return {
        name,
        ...(price ? { price } : {}),
        ...(typeof row.description === "string" ? { description: row.description } : {}),
        ...(typeof row.category === "string" ? { category: row.category } : {}),
        ...(typeof row.stock_quantity === "number" ? { stock_quantity: row.stock_quantity } : {}),
        ...(typeof row.image_url === "string" ? { image_url: row.image_url } : {}),
      } satisfies BuilderPendingAddProduct;
    })
    .filter((item): item is BuilderPendingAddProduct => Boolean(item));

  if (!products.length) return null;
  return {
    type: "add_products",
    products,
    find_images: value.find_images !== false,
    ...(typeof value.question === "string" ? { question: value.question } : {}),
    ...(typeof value.original_message === "string"
      ? { original_message: value.original_message }
      : {}),
  };
}

function sanitizeResumeToolPending(value: Record<string, unknown>): BuilderPendingAction | null {
  const tool = typeof value.tool === "string" ? value.tool.trim() : "";
  if (!tool) return null;
  const awaitKind = value.await_kind;
  const kind: BuilderPendingAwaitKind | undefined =
    awaitKind === "price" || awaitKind === "product_name" || awaitKind === "text"
      ? awaitKind
      : undefined;

  return {
    type: "resume_tool",
    tool,
    arguments: asStringRecord(value.arguments),
    ...(typeof value.await_field === "string" ? { await_field: value.await_field.trim() } : {}),
    ...(kind ? { await_kind: kind } : {}),
    ...(typeof value.question === "string" ? { question: value.question } : {}),
    ...(typeof value.original_message === "string"
      ? { original_message: value.original_message }
      : {}),
  };
}

export function sanitizePendingAction(value: unknown): BuilderPendingAction | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.type === "add_products") return sanitizeAddProductsPending(record);
  if (record.type === "resume_tool") return sanitizeResumeToolPending(record);
  if (record.type === "clarification") {
    const question = typeof record.question === "string" ? record.question.trim() : "";
    if (!question) return null;
    return {
      type: "clarification",
      question,
      ...(typeof record.original_message === "string"
        ? { original_message: record.original_message }
        : {}),
    };
  }
  return null;
}

/** Prefer profile pending_action; fall back to the latest assistant requirements payload. */
export function getPendingAction(session: BuilderSession): BuilderPendingAction | null {
  const fromProfile = sanitizePendingAction(session.business_profile?.pending_action);
  if (fromProfile) return fromProfile;

  const messages = Array.isArray(session.messages) ? session.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index] as BuilderMessage;
    if (entry.role !== "assistant") continue;
    const payload = entry.payload;
    if (!payload || typeof payload !== "object") continue;
    const pending = sanitizePendingAction((payload as Record<string, unknown>).pending_action);
    if (pending) return pending;
  }
  return null;
}

export function withPendingAction(
  profile: BuilderBusinessProfile,
  pending: BuilderPendingAction | null,
): BuilderBusinessProfile {
  return {
    ...profile,
    pending_action: pending,
  };
}

export function applyPriceToPendingProducts(
  pending: Extract<BuilderPendingAction, { type: "add_products" }>,
  price: number,
): BuilderPendingAddProduct[] {
  return pending.products.map((product) => ({
    ...product,
    price: product.price && product.price > 0 ? product.price : price,
  }));
}

export function canDeterministicallyResume(
  pending: BuilderPendingAction,
  message: string,
): boolean {
  if (isCancelPendingAction(message)) return false;
  if (pending.type === "add_products") return looksLikePriceReply(message);
  if (pending.type !== "resume_tool") return false;

  const kind = pending.await_kind ?? "text";
  if (kind === "price") return looksLikePriceReply(message);
  const text = message.trim();
  if (!text) return false;
  if (kind === "product_name") return text.length <= 80 && !looksLikeNewRequest(message);
  return text.length <= 240 && !looksLikeNewRequest(message);
}

/** Merge the merchant's clarification reply into the pending tool arguments. */
export function buildResumedToolArguments(
  pending: Extract<BuilderPendingAction, { type: "resume_tool" }>,
  message: string,
): Record<string, unknown> | null {
  const args = { ...pending.arguments };
  const kind = pending.await_kind ?? "text";
  const field =
    pending.await_field?.trim() ||
    (kind === "price" ? "price" : kind === "product_name" ? "product_name" : "instruction");

  if (kind === "price") {
    const price = parseMerchantPrice(message);
    if (price == null) return null;
    args[field] = price;
    return args;
  }

  const answer = message.trim();
  if (!answer) return null;
  args[field] = answer;
  // Keep intent/instruction useful when the await field is product_name.
  if (kind === "product_name" && typeof args.intent !== "string") {
    args.intent = pending.original_message ?? answer;
  }
  return args;
}

export function formatPendingActionHint(pending: BuilderPendingAction): string {
  if (pending.type === "add_products") {
    const names = pending.products.map((product) => product.name).join(", ");
    return (
      `### Pending clarification\n` +
      `We asked for a price to finish adding: ${names}.\n` +
      `If the merchant is answering with a price, continue that product add (with find_images=${pending.find_images !== false}) — do NOT call update_product.`
    );
  }

  if (pending.type === "clarification") {
    return (
      `### Pending clarification\n` +
      `We asked: "${pending.question}"\n` +
      (pending.original_message
        ? `Original request: "${pending.original_message}"\n`
        : "") +
      `Treat the merchant's reply as answering that question and continue the original request — do not start an unrelated action.`
    );
  }

  const field = pending.await_field ?? pending.await_kind ?? "detail";
  return (
    `### Pending clarification\n` +
    (pending.question ? `We asked: "${pending.question}"\n` : "") +
    `Pending tool: ${pending.tool} (waiting for ${field}).\n` +
    `Treat the merchant's reply as answering that question and resume ${pending.tool} — do not start an unrelated action.`
  );
}

export function pendingActionSummary(pending: BuilderPendingAction): string {
  if (pending.type === "add_products") {
    return `add_products (${pending.products.map((product) => product.name).join(", ")})`;
  }
  if (pending.type === "clarification") {
    return `clarification: ${pending.question.slice(0, 80)}`;
  }
  return `${pending.tool} (await ${pending.await_field ?? pending.await_kind ?? "answer"})`;
}
