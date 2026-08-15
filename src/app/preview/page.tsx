"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { GuestStorefrontBrowser } from "@/components/marketing/guest-storefront-browser";
import { KeepStoreCta } from "@/components/marketing/keep-store-cta";
import type { GuestChatSession } from "@/lib/storefront-builder/guest-preview-types";
import { createGuestChatSession } from "@/lib/storefront-builder/guest-preview-types";
import {
  clearGuestPreview,
  isReturningReadyGuestPreview,
  loadGuestChatSession,
  markGuestPreviewVisitActive,
  saveGuestChatSession,
} from "@/lib/guest-preview-storage";
import { trackPlatformEvent } from "@/lib/analytics/platform-events";
import { cn } from "@/lib/utils";

function PreviewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seedQuery = searchParams.get("q")?.trim() ?? "";

  const [session, setSession] = useState<GuestChatSession | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bootstrappedQuery = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.messages.length, sending]);

  useEffect(() => {
    if (session?.status !== "ready" || !session.store || !session.storefront) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [session?.status, session?.store, session?.storefront]);

  useEffect(() => {
    if (session?.messages.some((message) => message.role === "user")) {
      trackPlatformEvent("preview_started", { source: "preview" });
    }
    if (session?.status === "ready" && session.store && session.storefront) {
      trackPlatformEvent("preview_ready", { source: "preview" });
    }
  }, [session?.status, session?.store, session?.storefront, session?.messages]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Fresh start from homepage seed — never reuse an old draft.
      if (seedQuery) {
        if (bootstrappedQuery.current === seedQuery) return;
        bootstrappedQuery.current = seedQuery;
        clearGuestPreview();
        setSending(true);
        try {
          const res = await fetch("/api/guest-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ mode: "start", message: seedQuery }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            session?: GuestChatSession;
            message?: string;
          };
          if (!res.ok || !data.session) {
            throw new Error(data.message || "Could not start the preview chat.");
          }
          if (cancelled) return;
          trackPlatformEvent("preview_started", { source: "preview" });
          saveGuestChatSession(data.session);
          setSession(data.session);
          // Drop ?q= so refresh doesn't re-run the seed turn.
          router.replace("/preview");
        } catch (error) {
          if (cancelled) return;
          toast.error(error instanceof Error ? error.message : "Could not start the preview chat.");
          const fresh = createGuestChatSession();
          saveGuestChatSession(fresh);
          setSession(fresh);
        } finally {
          if (!cancelled) {
            setSending(false);
            setReady(true);
          }
        }
        return;
      }

      const stored = loadGuestChatSession();
      if (stored) {
        const returning = isReturningReadyGuestPreview(stored);
        markGuestPreviewVisitActive();
        setSession(stored);
        setReady(true);
        if (returning && stored.store?.business_name) {
          toast.message(`${stored.store.business_name} is still here`, {
            description: "Keep this store so you don’t lose the preview.",
          });
        }
        return;
      }

      setSession(createGuestChatSession());
      setReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [seedQuery, router]);

  async function sendMessage(message: string) {
    if (!session || sending) return;
    const trimmed = message.trim();
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
        trackPlatformEvent("preview_started", { source: "preview" });
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
    void sendMessage(input);
  }

  function handleStartOver() {
    clearGuestPreview();
    bootstrappedQuery.current = null;
    setSession(createGuestChatSession());
    setInput("");
    router.replace("/preview");
    toast.message("Started a new preview chat.");
  }

  if (!ready || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-sm text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Starting your preview chat…
        </div>
      </div>
    );
  }

  const isReady = session.status === "ready" && session.store && session.storefront;
  const isGenerating = session.status === "generating" || sending;
  const placeholder =
    session.status === "awaiting_name"
      ? 'e.g. Stitch Atelier — or "you pick"'
      : session.status === "ready"
        ? 'Try "update the content" or "change the headline…"'
        : "Describe what you sell…";

  return (
    <div className={cn("flex min-h-screen flex-col bg-canvas text-ink", isReady && "pb-24 lg:pb-0")}>
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center">
            <BizgridLogo size={32} showWordmark wordmarkClassName="text-xl font-bold tracking-tight" />
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleStartOver}
              className="hidden text-sm font-medium text-ink-soft transition hover:text-ink sm:inline"
            >
              Start over
            </button>
            <Link href="/login" className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:inline">
              Log in
            </Link>
            {isReady ? (
              <KeepStoreCta
                variant="header"
                source="preview"
                shopName={session.store?.business_name}
                className="hidden sm:inline-flex"
              />
            ) : (
              <Link
                href="/signup?from=preview"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                Create account
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(320px,400px)_1fr] lg:px-6 lg:py-8">
        <section
          className={cn(
            "flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:min-h-[calc(100vh-8rem)]",
            isReady && "order-2 lg:order-1",
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Preview assistant
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Step 1: what you sell · Step 2: brand name · Step 3: storefront preview
            </p>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
            <KeepStoreCta
              variant="inline"
              source="preview"
              shopName={session.store?.business_name}
              className="hidden lg:block"
            />
          ) : null}

          <form onSubmit={handleSubmit} className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-canvas-raised px-3 py-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={2}
                disabled={sending}
                placeholder={placeholder}
                className="max-h-28 w-full resize-none bg-transparent text-sm outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </section>

        <section
          ref={previewRef}
          className={cn("min-w-0 scroll-mt-20", isReady && "order-1 lg:order-2")}
        >
          {isReady && session.store && session.storefront ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-gradient-mesh/30 p-5 sm:p-6">
                <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
                  Live preview
                </p>
                <h1 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {session.store.business_name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                  {session.storefront.products?.length ?? 0} starter products · brand color{" "}
                  <span
                    className="ml-1 inline-block h-3 w-3 rounded-full align-middle"
                    style={{ backgroundColor: session.store.brand_color }}
                    aria-hidden
                  />{" "}
                  {session.store.brand_color}. Save it so you don&apos;t lose this preview.
                </p>
                <KeepStoreCta
                  variant="compact"
                  source="preview"
                  shopName={session.store.business_name}
                  className="mt-4 h-11 w-full justify-center px-4 text-sm lg:hidden"
                />
              </div>
              <GuestStorefrontBrowser
                store={session.store}
                storefront={session.storefront}
                keepStoreSource="preview"
              />
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center lg:min-h-[calc(100vh-8rem)]">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </div>
              <h2 className="font-display mt-4 text-xl font-semibold">
                {session.status === "awaiting_name"
                  ? "Name your brand"
                  : isGenerating
                    ? "Building your storefront…"
                    : "Your storefront preview will appear here"}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-ink-soft">
                {session.status === "awaiting_name"
                  ? "Reply in the chat with a short brand name — then we'll generate products that match what you sell."
                  : "Chat through what you sell and your brand name. We'll draft a full storefront with about 10 products."}
              </p>
            </div>
          )}
        </section>
      </main>
      {isReady ? (
        <KeepStoreCta variant="sticky" source="preview" shopName={session.store?.business_name} />
      ) : null}
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-canvas">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <PreviewChatPage />
    </Suspense>
  );
}
