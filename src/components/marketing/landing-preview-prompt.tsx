"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
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
import { trackPlatformEvent } from "@/lib/analytics/platform-events";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPT = "I sell handmade soy candles. Warm, cozy, gift-friendly.";
const MAX_PROMPT_LENGTH = 100;

const SUGGESTIONS = [
  "Vintage fashion boutique",
  "Natural skincare brand",
  "Home ceramics studio",
] as const;

const PREVIEW_FAN = [
  {
    src: "/landing/preview-candle.jpg",
    alt: "Candle shop storefront preview",
    rotate: "max-sm:-rotate-3 sm:-rotate-6",
    offset: "translate-y-2 sm:translate-y-4 md:-translate-x-2",
    mood: {
      id: "candle",
      wash: "oklch(0.78 0.12 75 / 0.95)",
      accent: "oklch(0.58 0.12 50 / 0.55)",
      base: "oklch(0.9 0.05 78)",
      ring: "oklch(0.62 0.12 55)",
    },
  },
  {
    src: "/landing/preview-perfume.jpg",
    alt: "Beauty storefront preview",
    rotate: "rotate-0",
    offset: "z-10 -translate-y-0.5 sm:-translate-y-1 md:scale-105",
    mood: {
      id: "perfume",
      wash: "oklch(0.86 0.13 90 / 0.95)",
      accent: "oklch(0.72 0.16 85 / 0.55)",
      base: "oklch(0.95 0.04 95)",
      ring: "oklch(0.7 0.15 85)",
    },
  },
  {
    src: "/landing/preview-gallery.jpg",
    alt: "Product gallery storefront preview",
    rotate: "max-sm:rotate-2 sm:rotate-3",
    offset: "translate-y-1.5 sm:translate-y-3 md:translate-x-1",
    mood: {
      id: "gallery",
      wash: "oklch(0.8 0.11 45 / 0.95)",
      accent: "oklch(0.62 0.13 35 / 0.55)",
      base: "oklch(0.92 0.04 50)",
      ring: "oklch(0.62 0.12 40)",
    },
  },
  {
    src: "/landing/preview-checkout.jpg",
    alt: "Checkout experience preview",
    rotate: "max-sm:rotate-3 sm:rotate-6",
    offset: "translate-y-3 sm:translate-y-6 md:translate-x-2",
    mood: {
      id: "checkout",
      wash: "oklch(0.88 0.07 55 / 0.95)",
      accent: "oklch(0.5 0.12 30 / 0.45)",
      base: "oklch(0.94 0.03 58)",
      ring: "oklch(0.5 0.11 32)",
    },
  },
] as const;

export type LandingMood = (typeof PREVIEW_FAN)[number]["mood"];

export const LANDING_MOODS = PREVIEW_FAN.map((item) => item.mood);

type LandingPreviewPromptProps = {
  mood?: LandingMood | null;
  onMoodChange?: (mood: LandingMood | null) => void;
};

export function LandingPreviewPrompt({ mood = null, onMoodChange }: LandingPreviewPromptProps) {
  const [session, setSession] = useState<GuestChatSession | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const moodClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerTypeRef = useRef<"mouse" | "touch" | "pen" | "unknown">("unknown");
  const chatStarted = (session?.messages.length ?? 0) > 1 || sending;

  function setMood(next: LandingMood | null, options?: { force?: boolean }) {
    if (moodClearTimer.current) {
      clearTimeout(moodClearTimer.current);
      moodClearTimer.current = null;
    }
    if (next) {
      onMoodChange?.(next);
      return;
    }
    // Touch devices: keep mood until the user taps again (mouseLeave fires after tap).
    if (!options?.force && pointerTypeRef.current !== "mouse") return;
    moodClearTimer.current = setTimeout(() => {
      onMoodChange?.(null);
      moodClearTimer.current = null;
    }, 120);
  }

  useEffect(() => {
    return () => {
      if (moodClearTimer.current) clearTimeout(moodClearTimer.current);
    };
  }, []);

  useEffect(() => {
    const stored = loadGuestChatSession();
    if (stored && stored.status !== "ready") {
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

  useEffect(() => {
    if (!chatStarted) return;
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chatStarted]);

  useEffect(() => {
    if (session?.messages.some((message) => message.role === "user")) {
      trackPlatformEvent("preview_started", { source: "landing" });
    }
    if (session?.status === "ready" && session.store && session.storefront) {
      trackPlatformEvent("preview_ready", { source: "landing" });
    }
  }, [session?.status, session?.store, session?.storefront, session?.messages]);

  async function sendMessage(message: string) {
    if (!session || sending) return;
    const trimmed = message.trim().slice(0, MAX_PROMPT_LENGTH);
    if (!trimmed) return;

    const isFirstUserTurn = !session.messages.some((m) => m.role === "user");
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
      if (isFirstUserTurn) {
        trackPlatformEvent("preview_started", { source: "landing" });
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
      <section id="try-preview" className="scroll-mt-24 px-6 py-24">
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
        : "e.g. Vintage inspired clothing";

  if (!chatStarted) {
    return (
      <section id="try-preview" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-mesh transition-opacity duration-500"
          style={{ opacity: mood ? 0.08 : 0.55 }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(0.18_0.03_200/0.03)_1px,transparent_1px),linear-gradient(90deg,oklch(0.18_0.03_200/0.03)_1px,transparent_1px)] bg-[length:48px_48px]" />

        <div className="relative mx-auto flex min-h-0 max-w-4xl flex-col px-4 pt-6 pb-8 text-center sm:min-h-[calc(100svh-4.5rem)] sm:px-6 sm:pt-10 sm:pb-6 md:pt-12">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center pb-4 sm:pb-6">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-primary uppercase sm:text-[11px] sm:tracking-[0.18em]">
              Bizgrid AI store builder
            </p>
            <h1 className="font-display mt-3 max-w-3xl text-[1.85rem] leading-[1.08] font-bold tracking-tight text-balance text-ink sm:mt-4 sm:text-5xl md:text-[3.5rem]">
              Open a live online store in minutes — powered by AI
            </h1>
            <p className="mt-3 max-w-xl text-sm text-pretty text-ink-soft sm:mt-4 sm:text-base md:text-lg">
              Describe what you sell in a few words to generate a storefront you can preview free —
              payments, orders, and marketing built in.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 w-full max-w-2xl sm:mt-8">
              <div className="rounded-2xl bg-primary/30 p-px shadow-glow">
                <div className="flex flex-col gap-2 rounded-[15px] border border-primary/35 bg-canvas-raised/90 p-2 shadow-elevated backdrop-blur-sm sm:flex-row sm:items-center sm:gap-3 sm:p-2.5">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value.slice(0, MAX_PROMPT_LENGTH))}
                    disabled={sending}
                    placeholder={placeholder}
                    maxLength={MAX_PROMPT_LENGTH}
                    className="w-full flex-1 bg-transparent px-3 py-3 text-left text-base text-ink outline-none placeholder:text-ink-soft/70 disabled:opacity-60 sm:px-4"
                    aria-label="Describe your business"
                    autoComplete="off"
                    enterKeyHint="go"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-ink-soft">
                <span>No account needed yet</span>
                <span className="font-mono tabular-nums">
                  {input.length} / {MAX_PROMPT_LENGTH}
                </span>
              </div>
            </form>

            <div className="mt-3 flex w-full max-w-2xl gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-4 sm:flex-wrap sm:items-center sm:justify-center sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-ink-soft backdrop-blur-sm transition hover:border-primary/40 hover:text-ink disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl pt-1 sm:pt-2 sm:pb-2 md:pb-6">
            <p className="mb-3 text-[11px] text-ink-soft sm:hidden">Tap a storefront to preview its look</p>
            <div className="flex items-end justify-center gap-1.5 px-1 sm:gap-3 sm:px-0 md:gap-4">
              {PREVIEW_FAN.map((preview) => {
                const active = mood?.id === preview.mood.id;
                return (
                  <div
                    key={preview.src}
                    className={cn(
                      "relative w-[23%] min-w-0 origin-bottom touch-manipulation sm:w-[24%]",
                      preview.rotate,
                      preview.offset,
                      active && "z-20",
                    )}
                  >
                    <button
                      type="button"
                      onPointerEnter={(event) => {
                        pointerTypeRef.current =
                          event.pointerType === "mouse" ||
                          event.pointerType === "touch" ||
                          event.pointerType === "pen"
                            ? event.pointerType
                            : "unknown";
                        if (event.pointerType === "mouse") setMood(preview.mood);
                      }}
                      onPointerLeave={(event) => {
                        if (event.pointerType === "mouse") setMood(null);
                      }}
                      onFocus={() => setMood(preview.mood)}
                      onBlur={() => setMood(null, { force: true })}
                      onClick={() => setMood(mood?.id === preview.mood.id ? null : preview.mood, { force: true })}
                      aria-label={`Preview mood: ${preview.alt}`}
                      aria-pressed={active}
                      className={cn(
                        "group relative w-full overflow-visible rounded-lg border bg-card sm:rounded-xl",
                        active
                          ? "animate-mood-pulse border-transparent"
                          : "border-border/80 shadow-elevated transition-[transform,box-shadow,border-color] duration-500 ease-out hover:scale-[1.04] hover:border-transparent",
                      )}
                      style={
                        {
                          "--mood-ring": preview.mood.ring,
                          "--mood-ring-soft": `color-mix(in oklab, ${preview.mood.ring} 35%, transparent)`,
                        } as CSSProperties
                      }
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 rounded-lg transition-opacity duration-500 sm:rounded-xl",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                        style={{
                          background: `linear-gradient(160deg, ${preview.mood.wash} 0%, transparent 55%), ${preview.mood.accent}`,
                          mixBlendMode: "multiply",
                        }}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute -inset-5 -z-10 rounded-full blur-2xl transition-opacity duration-500 sm:-inset-8 sm:blur-3xl",
                          active ? "opacity-80" : "opacity-0 group-hover:opacity-55",
                        )}
                        style={{ background: preview.mood.wash }}
                      />
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg sm:rounded-xl">
                        <Image
                          src={preview.src}
                          alt={preview.alt}
                          width={480}
                          height={640}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          priority={preview.src.includes("perfume") || preview.src.includes("candle")}
                          sizes="(max-width: 640px) 23vw, 180px"
                        />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-soft sm:mt-4 sm:text-sm">
              Fashion, beauty, home, and more — then claim the shop when you’re ready.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="try-preview" className="scroll-mt-20 px-4 py-8 sm:scroll-mt-24 sm:px-6 sm:py-10 md:py-14">
      <div ref={workspaceRef} className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              Building your storefront
            </p>
            <h2 className="font-display mt-1 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Keep chatting — your live preview updates here
            </h2>
          </div>
          <button
            type="button"
            onClick={handleStartOver}
            className="self-start text-sm font-medium text-ink-soft transition hover:text-ink sm:self-auto"
          >
            Start over
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated lg:grid lg:grid-cols-[minmax(280px,400px)_1fr]">
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Preview assistant</p>
                <p className="truncate text-xs text-ink-soft">Describe → name brand → live storefront</p>
              </div>
            </div>

            <div ref={listRef} className="max-h-[min(48svh,360px)] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[420px] sm:px-5">
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

            {isReady ? (
              <div className="border-t border-border bg-primary/5 px-4 py-3 sm:px-5">
                <p className="text-xs text-ink-soft">
                  Preview ready for{" "}
                  <span className="font-semibold text-ink">{session.store?.business_name}</span>.
                </p>
                <Link
                  href="/signup?from=preview"
                  onClick={() => trackPlatformEvent("claim_store_clicked", { source: "landing" })}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Claim this store
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="border-t border-border p-3 sm:p-4">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-canvas-raised px-3 py-2">
                <span className="mb-2 font-mono text-primary">/</span>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, MAX_PROMPT_LENGTH))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  rows={2}
                  disabled={sending}
                  placeholder={placeholder}
                  maxLength={MAX_PROMPT_LENGTH}
                  className="max-h-28 w-full resize-none bg-transparent py-1.5 text-sm outline-none disabled:opacity-60"
                  aria-label="Chat with Bizgrid"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="mb-0.5 inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </div>

          <div className="border-t border-border bg-secondary/30 lg:border-t-0 lg:border-l">
            {isReady && session.store && session.storefront ? (
              <div className="p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                      Live preview
                    </p>
                    <p className="font-display truncate text-base font-semibold sm:text-lg">
                      {session.store.business_name}
                    </p>
                  </div>
                  <Link href="/preview" className="shrink-0 text-xs font-medium text-primary hover:underline">
                    Open full preview
                  </Link>
                </div>
                <GuestStorefrontBrowser store={session.store} storefront={session.storefront} />
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[320px] sm:py-12 lg:min-h-full">
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
        </div>
      </div>
    </section>
  );
}
