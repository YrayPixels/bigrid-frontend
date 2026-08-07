"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { merchantCache, useMarketingStatus, useStoreMe } from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function AssistantPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Tell me what you want to promote — a product, a sale, or a new arrival — and I'll draft it for you. Everything I write lands in Posts for you to review before it goes anywhere.",
    },
  ]);

  const storeQuery = useStoreMe();
  const statusQuery = useMarketingStatus({ enabled: Boolean(storeQuery.data) });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      api.sendMarketingChat(
        message,
        messages.slice(-10).map((entry) => ({ role: entry.role, content: entry.content })),
      ),
    onSuccess: (response, message) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: response.assistant_message },
      ]);
      setInput("");
      merchantCache.setMarketingStatus(queryClient, response.status);

      // Drafting is only half the job — point the merchant at the review step
      // so a new draft never sits unnoticed.
      if (response.post) {
        toast.success("Draft ready to review", {
          action: { label: "Review", onClick: () => router.push("/admin/marketing/content") },
        });
      }
      if (response.campaign) {
        toast.success("Ad campaign drafted", {
          action: { label: "Review", onClick: () => router.push("/admin/marketing/ads") },
        });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const instagramConnected = statusQuery.data?.instagram?.connected;

  const suggestedPrompts = useMemo(
    () => [
      "Draft a post announcing our latest products",
      "Plan a week of posts for my store",
      instagramConnected
        ? "Write an Instagram post for my best seller"
        : "Write a weekend promo post with a link to our store",
    ],
    [instagramConnected],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate(trimmed);
  }

  return (
    <Card className="flex min-h-[560px] flex-col overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <CardTitle>Campaign assistant</CardTitle>
        <CardDescription>
          Ask for post ideas, a content plan, or an ad. Everything is saved as a draft for you to
          review.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="min-h-[300px] flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "assistant"
                  ? "bg-muted text-ink"
                  : "ml-auto bg-primary text-primary-foreground"
              }`}
            >
              {message.content}
            </div>
          ))}
          {chatMutation.isPending ? (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Marketing agent is thinking…
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-border px-3 py-1.5 text-left text-xs text-ink-soft transition-colors hover:bg-muted hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the marketing agent to draft a post or campaign…"
            rows={3}
            className="min-h-[88px] resize-none"
          />
          <Button type="submit" disabled={!input.trim() || chatMutation.isPending} className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
