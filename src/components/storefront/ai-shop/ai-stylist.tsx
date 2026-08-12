"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { StorefrontApiError, storefrontApi } from "@/lib/api/storefront";
import type { ShopperContext, ShoppingIntent, ShoppingLook, StoreProduct } from "@/lib/api/types";
import { RecommendationCard } from "@/components/storefront/ai-shop/look-card";
import { FittingSheet } from "@/components/storefront/try-on/fitting-sheet";
import { fallbackShopperContext } from "@/lib/storefront/ai-shop-config";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiStylistPanelProps = {
  onClose?: () => void;
  className?: string;
};

export function AiStylistPanel({ onClose, className }: AiStylistPanelProps) {
  const { store, storefront } = useStorefront();
  const products = storefront.products ?? [];
  const { theme } = useStorefrontTheme();
  const { addItem } = useCart();

  const [shopper, setShopper] = useState<ShopperContext>(() => fallbackShopperContext(store));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<ShoppingIntent | null>(null);
  const [look, setLook] = useState<ShoppingLook | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(shopper.default_suggestions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState<StoreProduct | null>(null);
  const [selectedChips, setSelectedChips] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void storefrontApi.aiShopConfig(store.slug).then((response) => {
      if (cancelled) return;
      setShopper(response.shopper);
      setSuggestions(response.shopper.default_suggestions);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: response.shopper.welcome_message,
        },
      ]);
    }).catch(() => {
      if (cancelled) return;
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: shopper.welcome_message,
        },
      ]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.slug]);

  const tryOnAvailable = useMemo(() => {
    if (!look?.try_on_product_id || !shopper.supports_try_on) return false;
    const item = look.items.find((entry) => entry.product_id === look.try_on_product_id);
    return Boolean(item?.product.try_on?.enabled || item?.product.try_on_available);
  }, [look, shopper.supports_try_on]);

  async function runShop(opts: {
    message?: string;
    chips?: Array<{ type: string; value: string }>;
  }) {
    setBusy(true);
    setError(null);
    try {
      const response = await storefrontApi.aiShop(store.slug, {
        message: opts.message,
        chips: opts.chips,
        intent,
        look,
      });
      setShopper(response.shopper);
      setIntent(response.intent);
      const recommendation = response.recommendation ?? response.look;
      setLook(recommendation);
      setSuggestions(response.suggestions?.length ? response.suggestions : suggestions);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.reply,
        },
      ]);
      if (recommendation) {
        setShowFilters(false);
      }
    } catch (err) {
      const message =
        err instanceof StorefrontApiError
          ? err.message
          : "Couldn’t find recommendations right now. Try again in a moment.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: message }]);

    const lower = message.toLowerCase();
    if (shopper.supports_try_on && (lower.includes("see it on") || lower === "see it on me")) {
      openTryOn();
      return;
    }

    await runShop({ message });
  }

  function toggleChip(group: string, chip: { type: string; label: string; value: string }) {
    const key = `${group}:${chip.type}:${chip.value}`;
    setSelectedChips((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = chip.value;
      }
      return next;
    });
  }

  function isChipActive(group: string, chip: { type: string; value: string }) {
    return Boolean(selectedChips[`${group}:${chip.type}:${chip.value}`]);
  }

  async function showFromQuickPicks() {
    const chips: Array<{ type: string; value: string }> = [];
    const labels: string[] = [];

    for (const group of shopper.quick_picks) {
      for (const chip of group.chips) {
        if (isChipActive(group.group, chip)) {
          chips.push({ type: chip.type, value: chip.value });
          labels.push(chip.label);
        }
      }
    }

    if (chips.length === 0) return;

    const summary = labels.join(" · ");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: summary }]);

    const prompt = shopper.supports_looks
      ? `Show me what you'd wear for ${summary}`
      : `Help me find ${summary} from this store`;

    await runShop({ message: prompt, chips });
  }

  function openTryOn() {
    if (!look?.try_on_product_id) {
      setError("This item isn’t try-on ready yet.");
      return;
    }
    const fromLook = look.items.find((item) => item.product_id === look.try_on_product_id)?.product;
    const fromCatalog = products.find((product) => product.id === look.try_on_product_id) ?? null;
    const product = fromLook ?? fromCatalog;
    if (!product) {
      setError("Couldn’t find the try-on product.");
      return;
    }
    setTryOnProduct(product);
    setTryOnOpen(true);
  }

  function addRecommendationToCart() {
    if (!look) return;
    for (const item of look.items) {
      addItem(item.product, 1);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `a-cart-${Date.now()}`,
        role: "assistant",
        content: shopper.supports_looks
          ? `Added all ${look.items.length} pieces to your cart.`
          : `Added ${look.items.length} item${look.items.length === 1 ? "" : "s"} to your cart.`,
      },
    ]);
  }

  function ChipButton({
    active,
    label,
    onClick,
  }: {
    active?: boolean;
    label: string;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition",
          theme.borderColor,
        )}
        style={{
          backgroundColor: active ? theme.palette.primary : "transparent",
          color: active ? theme.palette.background : theme.palette.foreground,
        }}
      >
        {label}
      </button>
    );
  }

  const hasSelectedChips = Object.keys(selectedChips).length > 0;
  const quickPickCta = shopper.supports_looks ? "Show me what you’d wear" : "Find products";

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
            AI shopper
          </p>
          <h2 className="truncate text-sm font-semibold" style={{ fontFamily: theme.displayFont }}>
            {shopper.assistant_title}
          </h2>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: theme.palette.border, color: theme.palette.foreground }}
            aria-label="Close shopper"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showFilters && shopper.quick_picks.length > 0 ? (
          <section className="space-y-3 border-b p-4" style={{ borderColor: theme.palette.border }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.palette.muted }}>
              Quick picks
            </p>
            {shopper.quick_picks.map((group) => (
              <div key={group.group}>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: theme.palette.muted }}>
                  {group.group}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.chips.map((chip) => (
                    <ChipButton
                      key={`${group.group}-${chip.type}-${chip.value}`}
                      label={chip.label}
                      active={isChipActive(group.group, chip)}
                      onClick={() => toggleChip(group.group, chip)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={busy || !hasSelectedChips}
              onClick={() => void showFromQuickPicks()}
              className="w-full px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] disabled:opacity-50"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              {quickPickCta}
            </button>
          </section>
        ) : shopper.quick_picks.length > 0 ? (
          <div className="border-b px-4 py-2" style={{ borderColor: theme.palette.border }}>
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="text-[11px] font-semibold uppercase tracking-[0.1em] underline-offset-2 hover:underline"
              style={{ color: theme.palette.muted }}
            >
              Edit quick picks
            </button>
          </div>
        ) : null}

        <div className="space-y-3 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                message.role === "user" ? "ml-auto" : "mr-auto",
              )}
              style={{
                backgroundColor:
                  message.role === "user" ? theme.palette.primary : `${theme.palette.muted}18`,
                color: message.role === "user" ? theme.palette.background : theme.palette.foreground,
              }}
            >
              {message.content}
            </div>
          ))}
          {busy ? (
            <div className="inline-flex items-center gap-2 text-xs" style={{ color: theme.palette.muted }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {shopper.supports_looks ? "Styling your look…" : "Searching the catalog…"}
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {look ? (
            <RecommendationCard
              look={look}
              shopper={shopper}
              busy={busy}
              tryOnAvailable={tryOnAvailable}
              onTryOn={openTryOn}
              onAddLook={addRecommendationToCart}
            />
          ) : null}
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div
          className="flex shrink-0 flex-wrap gap-1.5 border-t px-3 py-2"
          style={{ borderColor: theme.palette.border }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => void sendMessage(suggestion)}
              className={cn("border px-2.5 py-1 text-[10px] font-medium disabled:opacity-50", theme.borderColor)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex shrink-0 gap-2 border-t p-3"
        style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={shopper.placeholder}
          className="min-w-0 flex-1 border bg-transparent px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: theme.palette.border }}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex items-center justify-center px-3 disabled:opacity-50"
          style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {tryOnProduct ? (
        <FittingSheet
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          product={tryOnProduct}
          onAddToCart={() => addItem(tryOnProduct, 1)}
          onBuyNow={() => {
            addItem(tryOnProduct, 1);
            window.location.href = "/checkout";
          }}
        />
      ) : null}
    </div>
  );
}
