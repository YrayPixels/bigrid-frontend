"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BuilderThinkingLog } from "@/components/admin/builder/builder-thinking-log";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import type { BuilderAiTurn } from "@/lib/storefront-builder/local-ai";
import { streamBuilderThinkingTurn } from "@/lib/storefront-builder/thinking-stream";

export default function BuilderThinkingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [input, setInput] = useState(
    "Glow Rituals is an organic skincare brand for busy professionals. build my website",
  );
  const [entries, setEntries] = useState<AgentThinkingLogEntry[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [finalTurn, setFinalTurn] = useState<BuilderAiTurn | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["storefront-templates"],
    queryFn: api.getStorefrontTemplates,
  });

  const sessionQuery = useQuery({
    queryKey: ["builder-session"],
    queryFn: async () => {
      const current = await api.getCurrentBuilderSession();
      if (current.session) return current;
      return api.startBuilderSession();
    },
    enabled: !!user,
  });

  const session = sessionQuery.data?.session ?? null;
  const templateOptions = useMemo(
    () => templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS,
    [templatesQuery.data],
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function runThinkingStream() {
    if (!session || streaming) return;

    const message = input.trim();
    if (!message) return;

    const controller = new AbortController();
    setAbortController(controller);
    setStreaming(true);
    setEntries([]);
    setFinalTurn(null);

    try {
      const history = session.messages
        .slice(-8)
        .map((entry) => ({
          role: entry.role,
          content: entry.content,
        }))
        .filter((entry): entry is { role: "user" | "assistant"; content: string } =>
          entry.role === "user" || entry.role === "assistant",
        );

      const turn = await streamBuilderThinkingTurn({
        message,
        session,
        recommendations: session.recommendations ?? [],
        templateOptions,
        history,
        signal: controller.signal,
        onLog: (entry) => setEntries((current) => [...current, entry]),
      });

      setFinalTurn(turn);
    } catch (error) {
      if (controller.signal.aborted) return;
      toast.error(error instanceof Error ? error.message : "Thinking stream failed");
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  }

  function stopStream() {
    abortController?.abort();
    setStreaming(false);
  }

  if (loading || !user || sessionQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-8">
      <div className="mb-6 shrink-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/builder"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to builder
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Developer view
              </span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">AI thinking log</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Streams the internal Interpreter → Planner → Executor → Critic pipeline. Merchant chat
              on the main builder still uses the backend orchestrator; this page runs the local
              thinking agents directly. When a draft already exists, refine instructions run the
              full pipeline too — say &quot;build my website&quot; to trigger a fresh build instead.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-ink-soft">
            <div>Session: {session.id.slice(0, 8)}…</div>
            <div>Status: {session.status}</div>
            <div>Draft: {session.storefront_snapshot ? "yes" : "no"}</div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-surface p-4">
          <label htmlFor="thinking-input" className="text-sm font-semibold">
            Test message
          </label>
          <p className="mt-1 text-xs text-ink-soft">
            Use a full build prompt or a refine instruction if your session already has a draft.
          </p>
          <textarea
            id="thinking-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={8}
            className="mt-4 min-h-[180px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none ring-primary/20 focus:ring-2"
            placeholder="Describe your business or ask for a change…"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={runThinkingStream}
              disabled={streaming || !input.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {streaming ? "Streaming…" : "Run thinking stream"}
            </button>
            {streaming ? (
              <button
                type="button"
                onClick={stopStream}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
              >
                Stop
              </button>
            ) : null}
          </div>

          {finalTurn ? (
            <div className="mt-4 rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Final assistant reply
              </p>
              <p className="mt-2 text-sm leading-6">{finalTurn.assistant_message}</p>
            </div>
          ) : null}
        </div>

        <BuilderThinkingLog entries={entries} streaming={streaming} />
      </div>
    </div>
  );
}
