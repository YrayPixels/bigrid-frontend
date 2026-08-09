"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  Coins,
  Edit3,
  HandCoins,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "whatsapp" | "pending" | "human" | "ai">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [customDealPrice, setCustomDealPrice] = useState<string>("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftText, setEditedDraftText] = useState("");
  const [editedDraftPrice, setEditedDraftPrice] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll sessions list every 4 seconds or on WS events
  const sessionsQuery = useQuery({
    queryKey: ["dealie-sessions"],
    queryFn: () => api.getDealieSessions(),
    refetchInterval: 4000,
  });

  const sessions = sessionsQuery.data || [];

  // Auto-select first session if none selected
  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].session_id);
    }
  }, [selectedSessionId, sessions]);

  // Fetch detail for selected session
  const sessionDetailQuery = useQuery({
    queryKey: ["dealie-session-detail", selectedSessionId],
    queryFn: () => (selectedSessionId ? api.getDealieSessionDetail(selectedSessionId) : null),
    enabled: Boolean(selectedSessionId),
    refetchInterval: 3000,
  });

  const currentSession = sessionDetailQuery.data;

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  // Populate draft editing state
  useEffect(() => {
    if (currentSession?.pending_draft) {
      setEditedDraftText(currentSession.pending_draft.text || "");
      setEditedDraftPrice(
        currentSession.pending_draft.suggested_price
          ? String(currentSession.pending_draft.suggested_price)
          : ""
      );
    }
  }, [currentSession?.pending_draft]);

  // Mutations
  const sendReplyMutation = useMutation({
    mutationFn: (body: { sessionId: string; userId: string; message: string; productId?: number | null }) =>
      api.sendDealieVendorReply(body),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["dealie-session-detail", selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ["dealie-sessions"] });
      toast.success("Reply delivered to buyer.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to deliver reply");
    },
  });

  const approveDraftMutation = useMutation({
    mutationFn: (body: {
      sessionId: string;
      userId: string;
      action: "approve" | "edit" | "reject";
      editedMessage?: string | null;
      overridePrice?: number | null;
    }) => api.approveDealieDraft(body),
    onSuccess: (res) => {
      setIsEditingDraft(false);
      queryClient.invalidateQueries({ queryKey: ["dealie-session-detail", selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ["dealie-sessions"] });
      toast.success(res.status === "rejected" ? "Draft rejected." : "Draft approved and sent to buyer!");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to process draft");
    },
  });

  const issueDealMutation = useMutation({
    mutationFn: (body: { sessionId: string; userId: string; productId: number; agreedPrice: number }) =>
      api.issueDealieManualDeal(body),
    onSuccess: (res) => {
      setCustomDealPrice("");
      queryClient.invalidateQueries({ queryKey: ["dealie-session-detail", selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ["dealie-sessions"] });
      toast.success(`Cryptographic Deal Token created at ₦${res.agreed_price.toLocaleString()}!`);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to issue deal");
    },
  });

  const toggleTakeoverMutation = useMutation({
    mutationFn: (body: { sessionId: string; userId: string; takeover: boolean }) =>
      api.toggleDealieTakeover(body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["dealie-session-detail", selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ["dealie-sessions"] });
      toast.success(res.is_human_takeover ? "Human Takeover Active. AI paused." : "AI Resumed for this session.");
    },
  });

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (filterMode === "whatsapp" && s.channel !== "whatsapp" && !s.user_id.startsWith("whatsapp:")) return false;
    if (filterMode === "pending" && !s.has_pending_draft) return false;
    if (filterMode === "human" && !s.is_human_takeover) return false;
    if (filterMode === "ai" && (s.is_human_takeover || s.has_pending_draft)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUser = s.user_id.toLowerCase().includes(q);
      const matchProd = s.active_product?.name.toLowerCase().includes(q);
      const matchMsg = s.last_message?.toLowerCase().includes(q);
      const matchName = s.channel_user_name?.toLowerCase().includes(q);
      if (!matchUser && !matchProd && !matchMsg && !matchName) return false;
    }
    return true;
  });

  function handleSendManualReply() {
    if (!replyText.trim() || !currentSession) return;
    sendReplyMutation.mutate({
      sessionId: currentSession.session_id,
      userId: currentSession.user_id,
      message: replyText.trim(),
      productId: currentSession.active_product?.id,
    });
  }

  function handleApproveDraft() {
    if (!currentSession) return;
    approveDraftMutation.mutate({
      sessionId: currentSession.session_id,
      userId: currentSession.user_id,
      action: isEditingDraft ? "edit" : "approve",
      editedMessage: isEditingDraft ? editedDraftText.trim() : null,
      overridePrice: isEditingDraft && editedDraftPrice ? Number(editedDraftPrice) : null,
    });
  }

  function handleRejectDraft() {
    if (!currentSession) return;
    approveDraftMutation.mutate({
      sessionId: currentSession.session_id,
      userId: currentSession.user_id,
      action: "reject",
    });
  }

  function handleIssueDealToken() {
    if (!currentSession || !currentSession.active_product) return;
    const priceNum = Number(customDealPrice);
    if (!priceNum || priceNum <= 0) {
      toast.error("Please enter a valid deal price");
      return;
    }
    issueDealMutation.mutate({
      sessionId: currentSession.session_id,
      userId: currentSession.user_id,
      productId: currentSession.active_product.id,
      agreedPrice: priceNum,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Live Chat & Negotiations
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Messages Console</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Manage live buyer bargaining sessions, approve AI-assisted deals, and chat directly with WhatsApp & web customers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["dealie-sessions"] });
              queryClient.invalidateQueries({ queryKey: ["dealie-session-detail", selectedSessionId] });
              toast.success("Sessions refreshed");
            }}
            className="text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[680px]">
        {/* Left Column: Sessions List */}
        <Card className="lg:col-span-4 flex flex-col h-full border-border/50 bg-card/60 backdrop-blur">
          <CardHeader className="p-4 border-b border-border/50 pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Conversations ({filteredSessions.length})</span>
              <span className="text-xs text-ink-soft font-normal">Live Sync</span>
            </CardTitle>
            <Input
              placeholder="Search by buyer, phone, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs mb-2.5"
            />
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "whatsapp", label: "🟢 WhatsApp" },
                  { id: "pending", label: "Needs Approval" },
                  { id: "human", label: "Live Human" },
                  { id: "ai", label: "AI Active" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    filterMode === tab.id
                      ? "bg-primary text-white shadow-soft"
                      : "bg-muted/50 text-ink-soft hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5">
            {sessionsQuery.isLoading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-ink-soft">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-ink-soft/40" />
                No active negotiation sessions found.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = s.session_id === selectedSessionId;
                const isWhatsApp = s.channel === "whatsapp" || s.user_id.startsWith("whatsapp:");
                const displayName = s.channel_user_name || (isWhatsApp ? s.user_id.replace("whatsapp:", "") : `Buyer ${s.user_id.replace("buyer_", "").slice(0, 8)}`);

                return (
                  <div
                    key={s.session_id}
                    onClick={() => setSelectedSessionId(s.session_id)}
                    className={`cursor-pointer rounded-xl p-3.5 transition-all border ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card hover:bg-muted/40 border-transparent hover:border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isWhatsApp && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="WhatsApp Channel" />
                        )}
                        <span className="font-bold text-xs truncate">
                          {displayName}
                        </span>
                        {s.unread_vendor_count > 0 && (
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isWhatsApp && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] px-1 py-0 font-medium">
                            WhatsApp
                          </Badge>
                        )}
                        {s.has_pending_draft ? (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0">
                            Draft Ready
                          </Badge>
                        ) : s.is_human_takeover ? (
                          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] px-1.5 py-0">
                            Human Live
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] px-1.5 py-0">
                            Full AI
                          </Badge>
                        )}
                      </div>
                    </div>

                    {s.active_product && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-soft mb-1 truncate">
                        <Package className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{s.active_product.name}</span>
                      </div>
                    )}

                    <p className="text-xs text-ink-soft line-clamp-1 italic">
                      &quot;{s.last_message || "No messages yet"}&quot;
                    </p>

                    {s.last_offer_price && (
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-ink-soft">Last Offer:</span>
                        <span className="font-bold text-primary">₦{s.last_offer_price.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Center Column: Live Chat Feed (5 cols) */}
        <Card className="lg:col-span-5 shadow-soft flex flex-col h-[750px]">
          {currentSession ? (
            <>
              {/* Chat Session Top Bar */}
              <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      {currentSession.channel === "whatsapp" || currentSession.user_id.startsWith("whatsapp:") ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <span>{currentSession.channel_user_name || currentSession.user_id.replace("whatsapp:", "")}</span>
                        </>
                      ) : (
                        <span>Buyer {currentSession.user_id.replace("buyer_", "").slice(0, 8)}</span>
                      )}
                    </h3>
                    {(currentSession.channel === "whatsapp" || currentSession.user_id.startsWith("whatsapp:")) && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                        WhatsApp
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      Mode: {currentSession.chat_mode.replace("_", " ")}
                    </Badge>
                  </div>
                  {currentSession.active_product && (
                    <p className="text-xs text-ink-soft mt-0.5">
                      Discussing: <strong className="text-ink">{currentSession.active_product.name}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={currentSession.is_human_takeover ? "destructive" : "outline"}
                    onClick={() =>
                      toggleTakeoverMutation.mutate({
                        sessionId: currentSession.session_id,
                        userId: currentSession.user_id,
                        takeover: !currentSession.is_human_takeover,
                      })
                    }
                    className="text-xs h-8"
                  >
                    {currentSession.is_human_takeover ? (
                      <>
                        <Bot className="mr-1.5 h-3.5 w-3.5" /> Release to AI
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Take Over Chat
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-canvas/30">
                {currentSession.messages.map((m, idx) => {
                  const isBuyer = m.sender === "user" || m.sender_type === "user";
                  const isHumanVendor = m.sender_type === "vendor_human";

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isBuyer ? "items-start" : "items-end"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {isBuyer ? (
                          <>
                            <User className="h-3 w-3 text-ink-soft" />
                            <span className="text-[10px] font-semibold text-ink-soft">Buyer</span>
                          </>
                        ) : isHumanVendor ? (
                          <>
                            <span className="text-[10px] font-semibold text-purple-600">Store Merchant</span>
                            <UserCheck className="h-3 w-3 text-purple-600" />
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-semibold text-primary">Dealie AI</span>
                            <Bot className="h-3 w-3 text-primary" />
                          </>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isBuyer
                            ? "bg-white dark:bg-zinc-900 border border-border text-ink rounded-bl-none"
                            : isHumanVendor
                            ? "bg-purple-600 text-white rounded-br-none"
                            : "bg-primary text-white rounded-br-none"
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })}

                {/* Pending AI Draft Box (1-Click Approval) */}
                {currentSession.pending_draft && (
                  <div className="rounded-2xl border-2 border-dashed border-amber-500 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <Sparkles className="h-4 w-4" /> AI Generated Draft (Awaiting Your Approval)
                      </span>
                      {currentSession.pending_draft.suggested_price && (
                        <Badge className="bg-amber-600 text-white text-xs">
                          Proposed Offer: ₦{currentSession.pending_draft.suggested_price.toLocaleString()}
                        </Badge>
                      )}
                    </div>

                    {!isEditingDraft ? (
                      <p className="text-xs text-ink leading-relaxed italic bg-white/70 dark:bg-zinc-900/70 p-3 rounded-lg border border-amber-500/20">
                        &quot;{currentSession.pending_draft.text}&quot;
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          value={editedDraftText}
                          onChange={(e) => setEditedDraftText(e.target.value)}
                          className="text-xs min-h-20 bg-white dark:bg-zinc-900"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-semibold shrink-0">Adjust Price (₦):</Label>
                          <Input
                            type="number"
                            value={editedDraftPrice}
                            onChange={(e) => setEditedDraftPrice(e.target.value)}
                            className="h-8 text-xs w-32 bg-white dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {!isEditingDraft ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingDraft(true)}
                            className="h-8 text-xs"
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Draft
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRejectDraft}
                            disabled={approveDraftMutation.isPending}
                            className="h-8 text-xs"
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleApproveDraft}
                            disabled={approveDraftMutation.isPending}
                            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-soft"
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" /> 1-Click Approve & Send
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditingDraft(false)}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleApproveDraft}
                            disabled={approveDraftMutation.isPending}
                            className="h-8 text-xs bg-primary text-white font-bold"
                          >
                            Save & Send to Buyer
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Reply Bar */}
              <div className="p-3 border-t border-border bg-card space-y-2">
                {/* Quick Reply Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "I can give you a 10% discount on that today!",
                    "What quantity are you looking to buy?",
                    "That item is ready for same-day delivery.",
                    "Deal accepted! Locking in your price now.",
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => setReplyText(preset)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-ink-soft border border-border/50 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a manual message to buyer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendManualReply();
                      }
                    }}
                    className="h-10 text-xs"
                  />
                  <Button
                    onClick={handleSendManualReply}
                    disabled={!replyText.trim() || sendReplyMutation.isPending}
                    className="shrink-0 h-10 shadow-soft"
                  >
                    {sendReplyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid place-items-center flex-1 text-ink-soft text-xs">
              Select a conversation on the left to view the chat thread.
            </div>
          )}
        </Card>

        {/* Right Column: AI Copilot & Deal Control (3 cols) */}
        <Card className="lg:col-span-3 shadow-soft flex flex-col h-[750px] overflow-y-auto">
          <CardHeader className="p-4 pb-3 border-b border-border bg-primary/5">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /> AI Copilot & Deal Control
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time margin analysis, pricing bounds, and deal token creation.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-5">
            {currentSession?.active_product ? (
              <>
                {/* Active Product Specs */}
                <div className="rounded-xl border border-border p-3.5 space-y-3 bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    {currentSession.active_product.image_url ? (
                      <img
                        src={currentSession.active_product.image_url}
                        alt={currentSession.active_product.name}
                        className="h-12 w-12 rounded-lg object-cover border border-border"
                      />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-ink-soft">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs truncate">
                        {currentSession.active_product.name}
                      </h4>
                      <p className="text-[11px] text-ink-soft">
                        SKU: {currentSession.active_product.sku || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-ink-soft uppercase font-semibold">Retail Price</span>
                      <p className="font-bold text-ink">
                        ₦{currentSession.active_product.ceiling_price.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-soft uppercase font-semibold">Floor Limit</span>
                      <p className="font-bold text-emerald-600">
                        ₦{currentSession.active_product.floor_price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Copilot Intelligence Box */}
                {currentSession.copilot && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5" /> Suggested Counter
                      </span>
                      <Badge className="bg-primary text-white text-[10px]">
                        {currentSession.copilot.max_discount_margin_percent}% Margin
                      </Badge>
                    </div>

                    <p className="font-display text-2xl font-black text-ink">
                      ₦{currentSession.copilot.recommended_counter_price.toLocaleString()}
                    </p>

                    <p className="text-xs text-ink-soft leading-relaxed">
                      {currentSession.copilot.recommended_message}
                    </p>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReplyText(currentSession.copilot?.recommended_message || "")}
                      className="w-full text-xs h-8 bg-white dark:bg-zinc-900 border-primary/30 text-primary shadow-soft"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Insert into Reply
                    </Button>
                  </div>
                )}

                {/* 1-Click Issue Deal Token Panel */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" /> Issue Cryptographic Deal
                  </div>
                  <p className="text-[11px] text-ink-soft leading-relaxed">
                    Instantly sign a deal token at an agreed price. Pushes the discounted price directly to the buyer&apos;s checkout cart.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">Agreed Deal Price (₦):</Label>
                    <Input
                      type="number"
                      placeholder={String(currentSession.copilot?.recommended_counter_price || currentSession.active_product.floor_price)}
                      value={customDealPrice}
                      onChange={(e) => setCustomDealPrice(e.target.value)}
                      className="h-9 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <Button
                    size="sm"
                    onClick={handleIssueDealToken}
                    disabled={!customDealPrice || issueDealMutation.isPending}
                    className="w-full text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-soft"
                  >
                    {issueDealMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <HandCoins className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Issue Deal & Send to Cart
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-xs text-ink-soft">
                <Package className="h-8 w-8 mx-auto mb-2 text-ink-soft/40" />
                Select a session with an active product to view pricing bounds and AI Copilot suggestions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
