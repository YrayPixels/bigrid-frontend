"use client";

import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { StorefrontApiError, storefrontApi } from "@/lib/api/storefront";
import type { ShoppingIntent, ShoppingLook, StoreProduct } from "@/lib/api/types";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PageTitle } from "@/components/storefront/theme/page-title";
import { LookCard } from "@/components/storefront/ai-shop/look-card";
import { FittingSheet } from "@/components/storefront/try-on/fitting-sheet";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const OCCASIONS = ["Wedding", "Date night", "Office", "Vacation", "Party", "Casual"] as const;
const BUDGETS = [
  { label: "< ₦50k", value: "< 50k" },
  { label: "₦50–100k", value: "50-100k" },
  { label: "₦100–200k", value: "100-200k" },
  { label: "₦200k+", value: "200k+" },
] as const;
const VIBES = ["Elegant", "Minimal", "Bold", "Classic", "Trendy"] as const;

function chip(type: string, value: string) {
  return { type, value };
}

export function AiStylist() {
  const { store, storefront } = useStorefront();
  const products = storefront.products ?? [];
  const { theme } = useStorefrontTheme();
  const { addItem } = useCart();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "What are you dressing for? Pick an occasion, budget, and vibe — or just tell me what you need.",
    },
  ]);
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<ShoppingIntent | null>(null);
  const [look, setLook] = useState<ShoppingLook | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Wedding under ₦150k",
    "Elegant office look",
    "Something bold for a party",
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState<StoreProduct | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  const tryOnAvailable = useMemo(() => {
    if (!look?.try_on_product_id) return false;
    const item = look.items.find((entry) => entry.product_id === look.try_on_product_id);
    return Boolean(item?.product.try_on?.enabled || item?.product.try_on_available);
  }, [look]);

  async function runShop(opts: {
    message?: string;
    chips?: Array<string | { type: string; value: string }>;
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
      setIntent(response.intent);
      setLook(response.look);
      setSuggestions(response.suggestions?.length ? response.suggestions : suggestions);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.reply,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof StorefrontApiError
          ? err.message
          : "Couldn’t build a look right now. Try again in a moment.";
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
    if (lower.includes("see it on") || lower === "see it on me") {
      openTryOn();
      return;
    }

    await runShop({ message });
  }

  async function showLookFromChips() {
    const chips: Array<{ type: string; value: string }> = [];
    if (selectedOccasion) chips.push(chip("occasion", selectedOccasion.toLowerCase().replace(/\s+/g, "_")));
    if (selectedBudget) chips.push(chip("budget", selectedBudget));
    if (selectedVibe) chips.push(chip("style", selectedVibe.toLowerCase()));
    if (chips.length === 0) return;

    const summary = [
      selectedOccasion,
      selectedVibe,
      selectedBudget ? `budget ${selectedBudget}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: summary }]);
    await runShop({
      message: `Show me what you'd wear for ${summary}`,
      chips,
    });
  }

  function openTryOn() {
    if (!look?.try_on_product_id) {
      setError("This look isn’t try-on ready yet. Pick another dress or enable try-on on the product.");
      return;
    }
    const fromLook = look.items.find((item) => item.product_id === look.try_on_product_id)?.product;
    const fromCatalog = products.find((product) => product.id === look.try_on_product_id) ?? null;
    const product = fromLook ?? fromCatalog;
    if (!product) {
      setError("Couldn’t find the try-on product for this look.");
      return;
    }
    setTryOnProduct(product);
    setTryOnOpen(true);
  }

  function addLookToCart() {
    if (!look) return;
    for (const item of look.items) {
      addItem(item.product, 1);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `a-cart-${Date.now()}`,
        role: "assistant",
        content: `Added all ${look.items.length} pieces to your cart. Ready when you are.`,
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
          "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition",
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

  return (
    <PageContainer className="py-10 sm:py-14">
      <PageTitle
        title="Personal shopper"
        subtitle="Tell us the occasion. We’ll build a complete look from this store — then you can try it on."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <section
            className={cn("border p-4 sm:p-5", theme.borderColor)}
            style={{ backgroundColor: theme.palette.surface }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
              Occasion
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OCCASIONS.map((occasion) => (
                <ChipButton
                  key={occasion}
                  label={occasion}
                  active={selectedOccasion === occasion}
                  onClick={() => setSelectedOccasion((prev) => (prev === occasion ? null : occasion))}
                />
              ))}
            </div>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
              Budget
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGETS.map((budget) => (
                <ChipButton
                  key={budget.value}
                  label={budget.label}
                  active={selectedBudget === budget.value}
                  onClick={() => setSelectedBudget((prev) => (prev === budget.value ? null : budget.value))}
                />
              ))}
            </div>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
              Vibe
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VIBES.map((vibe) => (
                <ChipButton
                  key={vibe}
                  label={vibe}
                  active={selectedVibe === vibe}
                  onClick={() => setSelectedVibe((prev) => (prev === vibe ? null : vibe))}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={busy || (!selectedOccasion && !selectedBudget && !selectedVibe)}
              onClick={() => void showLookFromChips()}
              className="mt-5 w-full px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              Show me what you’d wear
            </button>
          </section>

          <section
            className={cn("flex min-h-[320px] flex-col border", theme.borderColor)}
            style={{ backgroundColor: theme.palette.surface }}
          >
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
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
                  Styling your look…
                </div>
              ) : null}
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
            </div>

            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t px-4 py-3 sm:px-5" style={{ borderColor: theme.palette.border }}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={busy}
                    onClick={() => void sendMessage(suggestion)}
                    className={cn("border px-3 py-1.5 text-[11px] font-medium disabled:opacity-50", theme.borderColor)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              className="flex gap-2 border-t p-3 sm:p-4"
              style={{ borderColor: theme.palette.border }}
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Just tell me what you need…"
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
          </section>
        </div>

        <div className="space-y-4">
          {look ? (
            <LookCard
              look={look}
              busy={busy}
              tryOnAvailable={tryOnAvailable || Boolean(store.features?.virtual_try_on?.enabled)}
              onTryOn={openTryOn}
              onAddLook={addLookToCart}
            />
          ) : (
            <div
              className={cn("border px-5 py-10 text-sm", theme.borderColor)}
              style={{ backgroundColor: theme.palette.surface, color: theme.palette.muted }}
            >
              Your complete look will land here — dress, bag, shoes, and accessories from this catalog.
            </div>
          )}
        </div>
      </div>

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
    </PageContainer>
  );
}
