"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { StorefrontApiError, storefrontApi } from "@/lib/api/storefront";
import type { ShopperContext, ShoppingIntent, ShoppingLook } from "@/lib/api/types";
import { RecommendationCard } from "@/components/storefront/ai-shop/look-card";
import { OutfitLookSheet } from "@/components/storefront/try-on/outfit-look-sheet";
import { TryOnSignInDialog } from "@/components/storefront/try-on/product-try-on-cta";
import { fallbackShopperContext } from "@/lib/storefront/ai-shop-config";
import { getOrCreateVisitSessionId } from "@/lib/storefront/marketing-attribution";
import { useCart } from "@/lib/storefront/cart-context";
import { useCustomerAuthOptional } from "@/lib/storefront/customer-auth";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import {
  isTryOnAsk,
  saveOutfitPreview,
  selectedLookItems,
  tryOnEligibleLookItems,
  type CartOutfit,
} from "@/lib/storefront/outfit-look";
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
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();
  const { addLookItems } = useCart();
  const router = useRouter();
  const customerAuth = useCustomerAuthOptional();
  const customer = customerAuth?.customer ?? null;
  const authLoading = customerAuth?.loading ?? false;
  const requireCustomerAuth = customerAuth !== null;

  const [shopper, setShopper] = useState<ShopperContext>(() => fallbackShopperContext(store));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<ShoppingIntent | null>(null);
  const [look, setLook] = useState<ShoppingLook | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(shopper.default_suggestions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingTryOn, setPendingTryOn] = useState(false);
  const [preferTryOn, setPreferTryOn] = useState(true);
  const [selectedChips, setSelectedChips] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(true);
  const [thinking, setThinking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sessionId = getOrCreateVisitSessionId() || undefined;
    void storefrontApi.aiShopConfig(store.slug, sessionId).then((response) => {
      if (cancelled) return;
      setShopper(response.shopper);
      const restored = (response.messages ?? []).filter(
        (message) => message.content.trim() !== "",
      );
      if (restored.length > 0) {
        setMessages(
          restored.map((message, index) => ({
            id: `s-${index}`,
            role: message.role,
            content: message.content,
          })),
        );
      } else {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: response.shopper.welcome_message,
          },
        ]);
      }
      const restoredLook = response.recommendation ?? response.look ?? null;
      if (restoredLook) {
        setLook(restoredLook);
        setSelectedIds(restoredLook.items.map((item) => item.product_id));
        setShowFilters(false);
      }
      setSuggestions(
        response.suggestions?.length
          ? response.suggestions
          : response.shopper.default_suggestions,
      );
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

  const selectedItems = useMemo(
    () => (look ? selectedLookItems(look, selectedIds) : []),
    [look, selectedIds],
  );

  const tryOnAvailable = useMemo(() => {
    if (!look || !shopper.supports_try_on) return false;
    return tryOnEligibleLookItems(store, selectedItems).length > 0;
  }, [look, selectedItems, shopper.supports_try_on, store]);

  useEffect(() => {
    if (!look) return;
    if (typeof window === "undefined") return;
    if (authLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("try_on_look") !== "1") return;
    if (requireCustomerAuth && !customer) return;
    setTryOnOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("try_on_look");
    url.searchParams.delete("shopper");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [look, customer, authLoading, requireCustomerAuth]);

  async function runShop(opts: {
    message?: string;
    chips?: Array<{ type: string; value: string }>;
  }) {
    setBusy(true);
    setError(null);
    setThinking("Understanding your request…");
    try {
      const response = await storefrontApi.aiShop(store.slug, {
        message: opts.message,
        chips: opts.chips,
        intent,
        look,
        session_id: getOrCreateVisitSessionId() || undefined,
      });
      setShopper(response.shopper);
      setIntent(response.intent);
      const recommendation = response.recommendation ?? response.look ?? null;
      setLook(recommendation);
      if (recommendation) {
        setSelectedIds(recommendation.items.map((item) => item.product_id));
      }
      setSuggestions(response.suggestions?.length ? response.suggestions : suggestions);
      const latestThought = response.thinking?.at(-1);
      setThinking(latestThought ? latestThought.title : null);
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
      setThinking(null);
    }
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: message }]);

    if (isTryOnAsk(message) && look) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-tryon-${Date.now()}`,
          role: "assistant",
          content:
            selectedItems.length > 1
              ? "Yes — I’ll open the full look so you can try the selected pieces on together, then add or buy them as one outfit."
              : "Yes — I’ll open this piece so you can see it on you, then add it to your bag.",
        },
      ]);
      openOutfitLook(shopper.supports_try_on && tryOnAvailable);
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

  function toggleLookItem(productId: string) {
    setSelectedIds((current) => {
      if (current.includes(productId)) {
        if (current.length <= 1) return current;
        return current.filter((id) => id !== productId);
      }
      return [...current, productId];
    });
  }

  function openOutfitLook(requireTryOn = false) {
    if (!look || selectedItems.length === 0) {
      setError("Pick at least one piece to continue.");
      return;
    }
    if (requireTryOn && !tryOnAvailable) {
      setError("This look isn’t try-on ready yet.");
      return;
    }
    if (requireTryOn && requireCustomerAuth && !customer) {
      if (authLoading) return;
      setPendingTryOn(true);
      setSignInOpen(true);
      return;
    }
    setError(null);
    setPreferTryOn(requireTryOn);
    setTryOnOpen(true);
  }

  function outfitMeta(resultUrl?: string | null): CartOutfit | null {
    if (!look) return null;
    return {
      id: look.id,
      name: look.name,
      result_url: resultUrl ?? null,
    };
  }

  function addLookToBag(resultUrl?: string | null) {
    if (!look || selectedItems.length === 0) return;
    const outfit = outfitMeta(resultUrl);
    if (!outfit) return;
    addLookItems(
      selectedItems.map((item) => item.product),
      outfit,
    );
    saveOutfitPreview(
      store.id,
      outfit,
      selectedItems.map((item) => item.product_id),
    );
    const count = selectedItems.length;
    toast.success(
      shopper.supports_looks
        ? `Added all ${count} pieces to your cart.`
        : `Added ${count} item${count === 1 ? "" : "s"} to your cart.`,
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `a-cart-${Date.now()}`,
        role: "assistant",
        content: shopper.supports_looks
          ? `Added all ${count} pieces to your cart. You can pay for the full look together at checkout.`
          : `Added ${count} item${count === 1 ? "" : "s"} to your cart.`,
      },
    ]);
  }

  function buyLookNow(resultUrl?: string | null) {
    addLookToBag(resultUrl);
    router.push("/checkout");
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
          color: active ? theme.palette.background : theme.palette.text,
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
            style={{ borderColor: theme.palette.border, color: theme.palette.text }}
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
                color: message.role === "user" ? theme.palette.background : theme.palette.text,
              }}
            >
              {message.content}
            </div>
          ))}
          {busy ? (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs" style={{ color: theme.palette.muted }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {thinking ?? (shopper.supports_looks ? "Styling your look…" : "Searching the catalog…")}
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {look ? (
            <RecommendationCard
              look={look}
              shopper={shopper}
              busy={busy}
              selectedIds={selectedIds}
              tryOnAvailable={tryOnAvailable}
              onToggleItem={toggleLookItem}
              onTryOn={() => openOutfitLook(true)}
              onOpenLook={() => openOutfitLook(false)}
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

      <TryOnSignInDialog
        open={signInOpen}
        onOpenChange={(open) => {
          setSignInOpen(open);
          if (!open) setPendingTryOn(false);
        }}
        onContinue={() => {
          if (typeof window === "undefined") {
            customerAuth?.signInWithGoogle();
            return;
          }
          const ret = new URL(window.location.href);
          ret.searchParams.set("shopper", "1");
          if (pendingTryOn) ret.searchParams.set("try_on_look", "1");
          customerAuth?.signInWithGoogle(ret.toString());
        }}
      />

      {look && selectedItems.length > 0 ? (
        <OutfitLookSheet
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          look={look}
          items={selectedItems}
          preferTryOn={preferTryOn}
          onAddToCart={(resultUrl) => addLookToBag(resultUrl)}
          onBuyNow={(resultUrl) => buyLookNow(resultUrl)}
        />
      ) : null}
    </div>
  );
}
