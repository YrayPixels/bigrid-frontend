"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Clock,
  Link2,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Unlink,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { CustomerConversationDetail } from "@/lib/api/types";
import { merchantCache, useMarketingStatus } from "@/hooks/use-merchant-queries";
import { WhatsAppEmbeddedSignupButton } from "@/components/marketing/whatsapp-embedded-signup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isWithinServiceWindow(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

export default function AdminWhatsAppInboxPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "tiktok">("all");
  const [replyText, setReplyText] = useState("");
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({
    phone_number_id: "",
    display_phone_number: "",
    access_token: "",
    waba_id: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const marketingQuery = useMarketingStatus({ staleTime: 0, refetchOnMount: "always" });

  const conversationsQuery = useQuery({
    queryKey: ["wa-conversations"],
    queryFn: () => api.getConversations(),
    refetchInterval: 6000,
  });

  const conversations = conversationsQuery.data?.conversations ?? [];
  const whatsappStatus = marketingQuery.data?.whatsapp ?? conversationsQuery.data?.whatsapp;
  const connected = Boolean(whatsappStatus?.connected);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations]);

  const detailQuery = useQuery({
    queryKey: ["wa-conversation-detail", selectedId],
    queryFn: () => (selectedId ? api.getConversationDetail(selectedId) : null),
    enabled: Boolean(selectedId),
    refetchInterval: 4000,
  });

  const detail = detailQuery.data as CustomerConversationDetail | null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  const replyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.sendConversationReply(id, text),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["wa-conversation-detail", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["wa-conversations"] });
      toast.success("Reply sent via WhatsApp.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    },
  });

  const connectWhatsApp = useMutation({
    mutationFn: () => api.connectWhatsAppMarketing(whatsappForm),
    onSuccess: (data) => {
      toast.success("WhatsApp connected. Incoming customer messages will appear here.");
      merchantCache.setMarketingStatus(queryClient, data);
      queryClient.invalidateQueries({ queryKey: ["wa-conversations"] });
      setWhatsappForm({
        phone_number_id: "",
        display_phone_number: "",
        access_token: "",
        waba_id: "",
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to connect WhatsApp");
    },
  });

  const disconnectWhatsApp = useMutation({
    mutationFn: () => api.disconnectWhatsAppMarketing(),
    onSuccess: (data) => {
      toast.success("WhatsApp disconnected.");
      merchantCache.setMarketingStatus(queryClient, data);
      queryClient.invalidateQueries({ queryKey: ["wa-conversations"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect WhatsApp");
    },
  });

  const updateMessagingSettings = useMutation({
    mutationFn: (settings: { whatsapp_auto_reply_enabled?: boolean }) =>
      api.updateMessagingSettings(settings),
    onSuccess: (data) => {
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    },
  });

  const filtered = conversations.filter((c) => {
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.external_user_name?.toLowerCase().includes(q) ||
        c.external_user_id.toLowerCase().includes(q) ||
        c.latest_message?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function handleSend() {
    if (!replyText.trim() || !selectedId) return;
    replyMutation.mutate({ id: selectedId, text: replyText.trim() });
  }

  async function handleAiDraft() {
    if (!selectedId) return;
    setIsDraftLoading(true);
    try {
      const res = await api.getConversationAiDraft(selectedId);
      setReplyText(res.draft);
      toast.success("AI draft loaded — review and edit before sending.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setIsDraftLoading(false);
    }
  }

  const lastInboundMessage = detail?.messages
    ?.filter((m) => m.direction === "inbound")
    .at(-1);
  const serviceWindowOpen = isWithinServiceWindow(lastInboundMessage?.created_at ?? null);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Left panel — conversation list */}
      <Card className="flex w-[360px] shrink-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 space-y-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Inbox
          </CardTitle>
          <CardDescription>
            {connected
              ? `Connected as ${whatsappStatus?.display_phone_number ?? "your business number"}${
                  whatsappStatus?.coexistence ? " · also on your phone" : ""
                }`
              : "Connect your WhatsApp Business number to receive customer messages here."}
          </CardDescription>
          {connected ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <div className="text-xs font-medium">AI auto-reply</div>
                <div className="text-[11px] text-ink-soft">Replies instantly, then you can take over</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={whatsappStatus?.auto_reply_enabled ?? true}
                  onCheckedChange={(checked) =>
                    updateMessagingSettings.mutate({ whatsapp_auto_reply_enabled: checked })
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-ink-soft"
                  onClick={() => disconnectWhatsApp.mutate()}
                  disabled={disconnectWhatsApp.isPending}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-soft" />
            <Input
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "whatsapp", "tiktok"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={channelFilter === f ? "default" : "outline"}
                onClick={() => setChannelFilter(f)}
                className="text-xs capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {conversationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">
              No conversations yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface-secondary ${
                      selectedId === conv.id ? "bg-surface-secondary" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(conv.id);
                      setReplyText("");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">
                        {conv.external_user_name || conv.external_user_id}
                      </span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {conv.channel}
                      </Badge>
                      <p className="truncate text-xs text-ink-soft">
                        {conv.latest_direction === "outbound" && "You: "}
                        {conv.latest_message || "No messages"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Right panel — chat view */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        {!connected ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-md space-y-4">
              <div className="text-center">
                <Link2 className="mx-auto mb-3 h-10 w-10 text-ink-soft" />
                <h2 className="text-lg font-semibold">Connect your WhatsApp number</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Use the same number on your phone (WhatsApp Business app) and in this inbox.
                  Open WhatsApp Business 2.24.17+ during setup and scan the QR Meta shows you.
                </p>
              </div>
              <WhatsAppEmbeddedSignupButton
                signup={whatsappStatus?.embedded_signup}
                onConnected={(data) => {
                  merchantCache.setMarketingStatus(queryClient, data);
                  queryClient.invalidateQueries({ queryKey: ["wa-conversations"] });
                }}
              />
              <p className="text-center text-xs text-ink-soft">
                Click the button, log into Meta, then confirm in WhatsApp Business on your phone.
                You do not need a phone number ID.
              </p>
              <button
                type="button"
                className="w-full text-center text-xs text-ink-soft underline"
                onClick={() => setShowManualConnect((open) => !open)}
              >
                {showManualConnect ? "Hide Cloud API credentials" : "Use Cloud API credentials instead"}
              </button>
              {showManualConnect ? (
              <div className="space-y-3">
                <p className="text-xs text-ink-soft">
                  This is only for a number already in WhatsApp Manager as Cloud API. Phone number
                  ID is under WhatsApp Manager → Account tools → Phone numbers, or Meta Developer →
                  WhatsApp → API setup. This path usually takes the number off the phone app.
                </p>
                <div className="space-y-1.5">
                  <Label>Phone number ID</Label>
                  <Input
                    value={whatsappForm.phone_number_id}
                    onChange={(e) =>
                      setWhatsappForm((prev) => ({ ...prev, phone_number_id: e.target.value }))
                    }
                    placeholder="From Meta WhatsApp settings"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Display phone number</Label>
                  <Input
                    value={whatsappForm.display_phone_number}
                    onChange={(e) =>
                      setWhatsappForm((prev) => ({
                        ...prev,
                        display_phone_number: e.target.value,
                      }))
                    }
                    placeholder="+234..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Access token</Label>
                  <Input
                    type="password"
                    value={whatsappForm.access_token}
                    onChange={(e) =>
                      setWhatsappForm((prev) => ({ ...prev, access_token: e.target.value }))
                    }
                    placeholder="Permanent token from Meta"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp Business Account ID (optional)</Label>
                  <Input
                    value={whatsappForm.waba_id}
                    onChange={(e) =>
                      setWhatsappForm((prev) => ({ ...prev, waba_id: e.target.value }))
                    }
                    placeholder="Used to subscribe webhooks"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => connectWhatsApp.mutate()}
                  disabled={
                    connectWhatsApp.isPending ||
                    !whatsappForm.phone_number_id.trim() ||
                    !whatsappForm.display_phone_number.trim() ||
                    !whatsappForm.access_token.trim()
                  }
                >
                  {connectWhatsApp.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Connect WhatsApp
                </Button>
                {whatsappStatus?.webhook_url ? (
                  <p className="text-xs text-ink-soft">
                    Platform webhook: {whatsappStatus.webhook_url}
                  </p>
                ) : null}
              </div>
              ) : null}
            </div>
          </div>
        ) : !selectedId || !detail ? (
          <div className="flex flex-1 items-center justify-center text-ink-soft">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <CardHeader className="shrink-0 border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {detail.external_user_name || detail.external_user_id}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {detail.channel}
                    </Badge>
                    {detail.external_user_name && (
                      <span>{detail.external_user_id}</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {serviceWindowOpen ? (
                    <Badge variant="default" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      Service window open
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      Window closed
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-ink-soft"
                    onClick={() => disconnectWhatsApp.mutate()}
                    disabled={disconnectWhatsApp.isPending}
                  >
                    <Unlink className="mr-1 h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {detail.messages.map((msg) => {
                  const isInbound = msg.direction === "inbound";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isInbound
                            ? "bg-surface-secondary text-ink"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                        <div
                          className={`mt-1 flex items-center gap-1.5 text-[10px] ${
                            isInbound ? "text-ink-soft" : "text-primary-foreground/70"
                          }`}
                        >
                          {!isInbound && msg.sent_by === "ai" && (
                            <span className="flex items-center gap-0.5">
                              <Bot className="h-3 w-3" /> AI
                            </span>
                          )}
                          {!isInbound && msg.sent_by === "merchant" && (
                            <span className="flex items-center gap-0.5">
                              <User className="h-3 w-3" /> You
                            </span>
                          )}
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            {/* Reply box */}
            <div className="shrink-0 border-t p-4">
              {!serviceWindowOpen && (
                <p className="mb-2 text-xs text-amber-600">
                  The 24-hour service window has closed. You can only send template messages
                  until the customer messages again.
                </p>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  className="resize-none"
                />
                <div className="flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={
                      !replyText.trim() || replyMutation.isPending
                    }
                    className="gap-1.5"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAiDraft}
                    disabled={isDraftLoading}
                    className="gap-1.5"
                  >
                    {isDraftLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AI Draft
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
