"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GuestStorefrontBrowser } from "@/components/marketing/guest-storefront-browser";
import type { GuestChatSession } from "@/lib/storefront-builder/guest-preview-types";
import { createGuestChatSession } from "@/lib/storefront-builder/guest-preview-types";
import {
  clearGuestPreview,
  loadGuestChatSession,
  saveGuestChatSession,
} from "@/lib/guest-preview-storage";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPT = "I sell handmade soy candles. Warm, cozy, gift-friendly.";

const PREVIEW_IMAGES = [
  {
    src: "/landing/preview-candle.jpg",
    alt: "Product page preview",
    className: "aspect-[3/4] bg-muted rounded-lg overflow-hidden relative group",
  },
  {
    src: "/landing/preview-perfume.jpg",
    alt: "Editorial product layout",
    className: "aspect-[3/4] bg-muted rounded-lg overflow-hidden hidden md:block",
  },
  {
    src: "/landing/preview-gallery.jpg",
    alt: "Product gallery grid",
    className: "aspect-[3/4] bg-muted rounded-lg overflow-hidden hidden md:block",
  },
  {
    src: "/landing/preview-checkout.jpg",
    alt: "Checkout flow preview",
    className: "aspect-[3/4] bg-muted rounded-lg overflow-hidden",
  },
] as const;

export function LandingPreviewPrompt() {
  const [session, setSession] = useState<GuestChatSession | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const chatStarted = (session?.messages.length ?? 0) > 1 || sending;

  useEffect(() => {
    const stored = loadGuestChatSession();
    if (stored && stored.status !== "ready") {
      // Resume an in-progress homepage chat; ready drafts stay available via Create account.
      setSession(stored);
      return;
    }
    if (stored?.status === "ready" && stored.store && stored.storefront) {
      setSession(stored);
      return;
    }
    const fresh = createGuestChatSession();
    saveGuestChatSession(fresh);
    setSession(fresh);
  }, []);

  useEffect(() => {
    if (!chatStarted) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.messages.length, sending, chatStarted]);

  async function sendMessage(message: string) {
    if (!session || sending) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    setSending(true);
    setInput("");
    const prior = session;
    setSession({
      ...prior,
      messages: [
        ...prior.messages,
        {
          id: `local_${Date.now()}`,
          role: "user",
          content: trimmed,
          created_at: new Date().toISOString(),
        },
      ],
    });

    try {
      const res = await fetch("/api/guest-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ mode: "chat", message: trimmed, session: prior }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        session?: GuestChatSession;
        message?: string;
      };
      if (!res.ok || !data.session) {
        throw new Error(data.message || "Could not continue the chat.");
      }
      saveGuestChatSession(data.session);
      setSession(data.session);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not continue the chat.");
      setSession(loadGuestChatSession() ?? prior);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input || (!chatStarted ? EXAMPLE_PROMPT : ""));
  }

  function handleStartOver() {
    clearGuestPreview();
    const fresh = createGuestChatSession();
    saveGuestChatSession(fresh);
    setSession(fresh);
    setInput("");
    toast.message("Started a new preview chat.");
  }

  if (!session) {
    return (
      <section id="try-preview" className="scroll-mt-24 px-6 py-12">
        <div className="mx-auto grid max-w-4xl place-items-center rounded-2xl border border-border bg-card py-16 shadow-elevated">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const isReady = session.status === "ready" && session.store && session.storefront;
  const placeholder =
    session.status === "awaiting_name"
      ? 'e.g. Stitch Atelier — or "you pick"'
      : session.status === "ready"
        ? 'Try "update the content" or "change the headline…"'
        : EXAMPLE_PROMPT;

  return (
    <section id="try-preview" className="animate-reveal scroll-mt-24 px-6 py-12 [animation-delay:400ms]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-border bg-card shadow-elevated",
            chatStarted && "lg:grid lg:grid-cols-[minmax(320px,400px)_1fr]",
          )}
        >
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Preview assistant
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Describe what you sell → name your brand → get a live storefront
                </p>
              </div>
              {chatStarted ? (
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="text-xs font-medium text-ink-soft transition hover:text-ink"
                >
                  Start over
                </button>
              ) : null}
            </div>

            {chatStarted ? (
              <div ref={listRef} className="max-h-[420px] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                {session.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-ink",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {sending ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-ink-soft">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      {session.status === "generating" ? "Building storefront…" : "Thinking…"}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
                {PREVIEW_IMAGES.map((preview) => (
                  <div key={preview.src} className={preview.className}>
                    <Image
                      src={preview.src}
                      alt={preview.alt}
                      width={640}
                      height={832}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {isReady ? (
              <div className="border-t border-border bg-primary/5 px-4 py-3 sm:px-5">
                <p className="text-xs text-ink-soft">
                  Preview ready for{" "}
                  <span className="font-semibold text-ink">{session.store?.business_name}</span>.
                </p>
                <Link
                  href="/signup?from=preview"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Create account & manage store
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="border-t border-border p-3 sm:p-4">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-canvas-raised px-3 py-2">
                <span className="mb-2 font-mono text-primary">/</span>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input || (!chatStarted ? EXAMPLE_PROMPT : ""));
                    }
                  }}
                  rows={chatStarted ? 2 : 1}
                  disabled={sending}
                  placeholder={placeholder}
                  className="max-h-28 w-full resize-none bg-transparent py-1.5 text-sm outline-none disabled:opacity-60"
                  aria-label="Chat with Bizgrid"
                />
                <button
                  type="submit"
                  disabled={sending || (!input.trim() && chatStarted)}
                  className="mb-0.5 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground uppercase transition hover:opacity-90 disabled:opacity-50"
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : chatStarted ? (
                    <Send className="h-4 w-4" />
                  ) : (
                    "Start"
                  )}
                </button>
              </div>
              {!chatStarted ? (
                <p className="mt-2 text-center text-xs text-ink-soft">
                  No account needed yet — we&apos;ll ask for your brand name, then build a preview here.
                </p>
              ) : null}
            </form>
          </div>

          {chatStarted ? (
            <div className="border-t border-border bg-secondary/30 lg:border-t-0 lg:border-l">
              {isReady && session.store && session.storefront ? (
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                        Live preview
                      </p>
                      <p className="font-display text-lg font-semibold">{session.store.business_name}</p>
                    </div>
                    <Link
                      href="/preview"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open full preview
                    </Link>
                  </div>
                  <GuestStorefrontBrowser store={session.store} storefront={session.storefront} />
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center lg:min-h-full">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                    {sending || session.status === "generating" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </div>
                  <h3 className="font-display mt-4 text-lg font-semibold">
                    {session.status === "awaiting_name"
                      ? "Name your brand"
                      : session.status === "generating"
                        ? "Building your storefront…"
                        : "Storefront preview"}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-ink-soft">
                    {session.status === "awaiting_name"
                      ? "Reply with a short brand name in the chat — then we'll generate products that fit what you sell."
                      : "Your live storefront will appear here after we have your brand name."}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
