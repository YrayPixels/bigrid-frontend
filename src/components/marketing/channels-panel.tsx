"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Facebook, Instagram, Loader2, MessageCircle, Unlink, Video } from "lucide-react";
import { toast } from "sonner";
import {
  merchantCache,
  merchantInvalidators,
  useMarketingStatus,
  useStoreMe,
} from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/** Every social connection the store can publish or reply through. */
export function ChannelsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [whatsappForm, setWhatsappForm] = useState({
    phone_number_id: "",
    display_phone_number: "",
    access_token: "",
    waba_id: "",
  });
  const [tiktokForm, setTiktokForm] = useState({
    business_account_id: "",
    account_name: "",
    access_token: "",
  });
  const [tiktokVideoForm, setTiktokVideoForm] = useState({
    video_url: "",
    caption: "",
  });

  const storeQuery = useStoreMe();
  const statusQuery = useMarketingStatus({ enabled: Boolean(storeQuery.data) });

  // OAuth round-trips land back here with a result in the query string.
  useEffect(() => {
    const facebook = searchParams.get("facebook");
    const message = searchParams.get("message");
    if (facebook === "connected") {
      toast.success("Facebook Page connected.");
      void merchantInvalidators.marketing(queryClient);
      router.replace("/admin/marketing/channels");
    } else if (facebook === "error") {
      toast.error(message ? decodeURIComponent(message) : "Facebook connection failed.");
      router.replace("/admin/marketing/channels");
    }
  }, [queryClient, router, searchParams]);

  useEffect(() => {
    const tiktokCreator = searchParams.get("tiktok_creator");
    const message = searchParams.get("message");
    if (tiktokCreator === "connected") {
      toast.success("TikTok creator account connected.");
      void merchantInvalidators.marketing(queryClient);
      router.replace("/admin/marketing/channels");
    } else if (tiktokCreator === "error") {
      toast.error(message ? decodeURIComponent(message) : "TikTok creator connection failed.");
      router.replace("/admin/marketing/channels");
    }
  }, [queryClient, router, searchParams]);

  const connectFacebook = useMutation({
    mutationFn: () => api.connectFacebookMarketing(),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectFacebook = useMutation({
    mutationFn: () => api.disconnectFacebookMarketing(),
    onSuccess: (data) => {
      toast.success("Facebook disconnected.");
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connectInstagram = useMutation({
    mutationFn: () => api.connectInstagramMarketing(),
    onSuccess: (data) => {
      toast.success(data.message);
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectInstagram = useMutation({
    mutationFn: () => api.disconnectInstagramMarketing(),
    onSuccess: (data) => {
      toast.success("Instagram disconnected.");
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connectWhatsApp = useMutation({
    mutationFn: () => api.connectWhatsAppMarketing(whatsappForm),
    onSuccess: (data) => {
      toast.success("WhatsApp connected.");
      merchantCache.setMarketingStatus(queryClient, data);
      setWhatsappForm({ phone_number_id: "", display_phone_number: "", access_token: "", waba_id: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectWhatsApp = useMutation({
    mutationFn: () => api.disconnectWhatsAppMarketing(),
    onSuccess: (data) => {
      toast.success("WhatsApp disconnected.");
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connectTikTok = useMutation({
    mutationFn: () => api.connectTikTokMarketing(tiktokForm),
    onSuccess: (data) => {
      toast.success("TikTok connected.");
      merchantCache.setMarketingStatus(queryClient, data);
      setTiktokForm({ business_account_id: "", account_name: "", access_token: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectTikTok = useMutation({
    mutationFn: () => api.disconnectTikTokMarketing(),
    onSuccess: (data) => {
      toast.success("TikTok disconnected.");
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connectTikTokCreator = useMutation({
    mutationFn: () => api.connectTikTokCreatorMarketing(),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectTikTokCreator = useMutation({
    mutationFn: () => api.disconnectTikTokCreatorMarketing(),
    onSuccess: (data) => {
      toast.success("TikTok creator account disconnected.");
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publishTikTokVideo = useMutation({
    mutationFn: () => api.publishTikTokVideo(tiktokVideoForm),
    onSuccess: (data) => {
      toast.success(data.message || "TikTok video is publishing.");
      merchantCache.setMarketingStatus(queryClient, data);
      setTiktokVideoForm({ video_url: "", caption: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMessagingSettings = useMutation({
    mutationFn: (settings: {
      whatsapp_auto_reply_enabled?: boolean;
      tiktok_auto_reply_enabled?: boolean;
    }) => api.updateMessagingSettings(settings),
    onSuccess: (data) => {
      merchantCache.setMarketingStatus(queryClient, data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const status = statusQuery.data;
  const facebook = status?.facebook;
  const instagram = status?.instagram;
  const whatsapp = status?.whatsapp;
  const tiktok = status?.tiktok;
  const tiktokContent = status?.tiktok_content;
  const recentConversations = status?.recent_conversations ?? [];

  if (statusQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook Pages
          </CardTitle>
          <CardDescription>Connect a Page you manage to publish posts from Bizgrid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!facebook?.configured ? (
            <p className="text-sm text-ink-soft">
              Facebook posting is not configured on this platform yet. Contact support to enable it.
            </p>
          ) : facebook.connected ? (
            <>
              <div className="space-y-2">
                {facebook.pages.map((page) => (
                  <div key={page.id} className="rounded-lg border border-border px-3 py-2">
                    <div className="text-sm font-medium text-ink">{page.name}</div>
                    <div className="text-xs text-ink-soft">Page ID {page.page_id}</div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => disconnectFacebook.mutate()}
                disabled={disconnectFacebook.isPending}
                className="w-full"
              >
                {disconnectFacebook.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Disconnect Facebook
              </Button>
            </>
          ) : (
            <Button
              onClick={() => connectFacebook.mutate()}
              disabled={connectFacebook.isPending}
              className="w-full"
            >
              {connectFacebook.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="mr-2 h-4 w-4" />
              )}
              Connect Facebook Page
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram
          </CardTitle>
          <CardDescription>
            Publish to the Instagram Business account linked to your Facebook Page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!instagram?.configured ? (
            <p className="text-sm text-ink-soft">
              Instagram publishing is not enabled on this platform yet.
            </p>
          ) : instagram.connected ? (
            <>
              <div className="rounded-lg border border-border px-3 py-2">
                <div className="text-sm font-medium text-ink">@{instagram.username}</div>
                <div className="text-xs text-ink-soft">
                  Linked to {instagram.linked_page ?? "your Facebook Page"}
                </div>
              </div>
              <p className="text-xs text-ink-soft">Instagram posts always need an image.</p>
              <Button
                variant="outline"
                onClick={() => disconnectInstagram.mutate()}
                disabled={disconnectInstagram.isPending}
                className="w-full"
              >
                Disconnect Instagram
              </Button>
            </>
          ) : (
            <>
              {!facebook?.connected ? (
                <p className="text-sm text-ink-soft">
                  Connect a Facebook Page first — Instagram publishing runs through the linked Page.
                </p>
              ) : null}
              <Button
                onClick={() => connectInstagram.mutate()}
                disabled={connectInstagram.isPending || !facebook?.connected}
                className="w-full"
              >
                {connectInstagram.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Instagram className="mr-2 h-4 w-4" />
                )}
                Connect Instagram
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp AI replies
          </CardTitle>
          <CardDescription>
            When customers message your business number, AI can answer product questions and share
            your storefront link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {whatsapp?.connected ? (
            <>
              <div className="rounded-lg border border-border px-3 py-2">
                <div className="text-sm font-medium text-ink">{whatsapp.display_phone_number}</div>
                <div className="text-xs text-ink-soft">
                  Phone number ID {whatsapp.phone_number_id}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-ink">AI auto-reply</div>
                  <div className="text-xs text-ink-soft">Uses your WhatsApp message units</div>
                </div>
                <Switch
                  checked={whatsapp.auto_reply_enabled}
                  onCheckedChange={(checked) =>
                    updateMessagingSettings.mutate({ whatsapp_auto_reply_enabled: checked })
                  }
                />
              </div>
              <p className="text-xs text-ink-soft">Webhook: {whatsapp.webhook_url}</p>
              <Button
                variant="outline"
                onClick={() => disconnectWhatsApp.mutate()}
                disabled={disconnectWhatsApp.isPending}
                className="w-full"
              >
                Disconnect WhatsApp
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Field label="Phone number ID">
                <Input
                  value={whatsappForm.phone_number_id}
                  onChange={(event) =>
                    setWhatsappForm((prev) => ({ ...prev, phone_number_id: event.target.value }))
                  }
                  placeholder="From Meta WhatsApp settings"
                />
              </Field>
              <Field label="Display phone number">
                <Input
                  value={whatsappForm.display_phone_number}
                  onChange={(event) =>
                    setWhatsappForm((prev) => ({ ...prev, display_phone_number: event.target.value }))
                  }
                  placeholder="+234..."
                />
              </Field>
              <Field label="Access token">
                <Input
                  type="password"
                  value={whatsappForm.access_token}
                  onChange={(event) =>
                    setWhatsappForm((prev) => ({ ...prev, access_token: event.target.value }))
                  }
                  placeholder="Permanent token from Meta"
                />
              </Field>
              <Field label="WhatsApp Business Account ID (optional)">
                <Input
                  value={whatsappForm.waba_id ?? ""}
                  onChange={(event) =>
                    setWhatsappForm((prev) => ({ ...prev, waba_id: event.target.value }))
                  }
                  placeholder="WABA ID — used to subscribe webhooks"
                />
              </Field>
              <p className="text-xs text-ink-soft">
                After connecting, customer messages appear in{" "}
                <a href="/admin/whatsapp" className="underline">
                  WhatsApp Inbox
                </a>{" "}
                so you can reply from Bizgrid instead of only in WhatsApp.
              </p>
              <Button
                onClick={() => connectWhatsApp.mutate()}
                disabled={connectWhatsApp.isPending}
                className="w-full"
              >
                Connect WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TikTok DMs</CardTitle>
          <CardDescription>
            TikTok only allows replies after a customer messages you first — no outbound marketing or
            comment-to-DM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-ink">
            Inbound-only · 48-hour reply window · Not available in US, UK, EEA, or Switzerland
          </div>
          {tiktok?.connected ? (
            <>
              <div className="rounded-lg border border-border px-3 py-2">
                <div className="text-sm font-medium text-ink">{tiktok.account_name}</div>
                <div className="text-xs text-ink-soft">Business ID {tiktok.business_account_id}</div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-ink">AI auto-reply</div>
                  <div className="text-xs text-ink-soft">Replies to inbound TikTok DMs only</div>
                </div>
                <Switch
                  checked={tiktok.auto_reply_enabled}
                  onCheckedChange={(checked) =>
                    updateMessagingSettings.mutate({ tiktok_auto_reply_enabled: checked })
                  }
                />
              </div>
              <p className="text-xs text-ink-soft">Webhook: {tiktok.webhook_url}</p>
              <Button
                variant="outline"
                onClick={() => disconnectTikTok.mutate()}
                disabled={disconnectTikTok.isPending}
                className="w-full"
              >
                Disconnect TikTok
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Field label="Business account ID">
                <Input
                  value={tiktokForm.business_account_id}
                  onChange={(event) =>
                    setTiktokForm((prev) => ({ ...prev, business_account_id: event.target.value }))
                  }
                />
              </Field>
              <Field label="Account name">
                <Input
                  value={tiktokForm.account_name}
                  onChange={(event) =>
                    setTiktokForm((prev) => ({ ...prev, account_name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Access token">
                <Input
                  type="password"
                  value={tiktokForm.access_token}
                  onChange={(event) =>
                    setTiktokForm((prev) => ({ ...prev, access_token: event.target.value }))
                  }
                />
              </Field>
              <Button
                onClick={() => connectTikTok.mutate()}
                disabled={connectTikTok.isPending || !tiktok?.configured}
                className="w-full"
              >
                Connect TikTok Business
              </Button>
              {!tiktok?.configured ? (
                <p className="text-xs text-ink-soft">
                  TikTok app credentials are not configured on this platform yet.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            TikTok video posting
          </CardTitle>
          <CardDescription>
            Connect your TikTok creator account to publish videos from Bizgrid. Videos must be hosted
            on a verified URL prefix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-ink">
            Until TikTok app audit passes, posts may publish as private (visible only to you).
          </div>
          {!tiktokContent?.configured ? (
            <p className="text-sm text-ink-soft">
              TikTok Content Posting is not configured on this platform yet.
            </p>
          ) : tiktokContent.connected ? (
            <>
              <div className="rounded-lg border border-border px-3 py-2">
                <div className="text-sm font-medium text-ink">
                  {tiktokContent.creator_username || "TikTok Creator"}
                </div>
                <div className="text-xs text-ink-soft">Open ID {tiktokContent.open_id}</div>
              </div>
              <div className="space-y-3">
                <Field label="Public video URL">
                  <Input
                    value={tiktokVideoForm.video_url}
                    onChange={(event) =>
                      setTiktokVideoForm((prev) => ({ ...prev, video_url: event.target.value }))
                    }
                    placeholder="https://your-cdn.com/videos/promo.mp4"
                  />
                </Field>
                <Field label="Caption">
                  <Textarea
                    value={tiktokVideoForm.caption}
                    onChange={(event) =>
                      setTiktokVideoForm((prev) => ({ ...prev, caption: event.target.value }))
                    }
                    rows={3}
                    placeholder="Caption for your TikTok video…"
                  />
                </Field>
                <Button
                  onClick={() => publishTikTokVideo.mutate()}
                  disabled={
                    publishTikTokVideo.isPending ||
                    !tiktokVideoForm.video_url.trim() ||
                    !tiktokVideoForm.caption.trim()
                  }
                  className="w-full"
                >
                  {publishTikTokVideo.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="mr-2 h-4 w-4" />
                  )}
                  Publish to TikTok
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => disconnectTikTokCreator.mutate()}
                disabled={disconnectTikTokCreator.isPending}
                className="w-full"
              >
                Disconnect TikTok creator
              </Button>
            </>
          ) : (
            <Button
              onClick={() => connectTikTokCreator.mutate()}
              disabled={connectTikTokCreator.isPending}
              className="w-full"
            >
              {connectTikTokCreator.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              Connect TikTok creator account
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer conversations</CardTitle>
          <CardDescription>
            Recent WhatsApp and TikTok chats handled by the commerce agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentConversations.length === 0 ? (
            <p className="text-sm text-ink-soft">No customer messages yet.</p>
          ) : (
            recentConversations.map((conversation) => (
              <div key={conversation.id} className="space-y-1 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{conversation.channel}</Badge>
                  <span className="text-xs text-ink-soft">
                    {conversation.last_message_at
                      ? new Date(conversation.last_message_at).toLocaleString()
                      : ""}
                  </span>
                </div>
                <div className="text-sm font-medium text-ink">
                  {conversation.external_user_name || conversation.external_user_id}
                </div>
                {conversation.latest_message ? (
                  <p className="text-sm text-ink-soft">{conversation.latest_message}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
