"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PenLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { merchantInvalidators } from "@/hooks/use-merchant-queries";
import type { CreateSocialPostInput, MarketingStatus } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Provider = CreateSocialPostInput["provider"];

const EMPTY = {
  provider: "facebook" as Provider,
  message: "",
  image_url: "",
  link_url: "",
  video_url: "",
};

export function PostComposer({ status }: { status: MarketingStatus }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const createPost = useMutation({
    mutationFn: (input: CreateSocialPostInput) => api.createMarketingPost(input),
    onSuccess: (data) => {
      toast.success(data.message);
      setForm(EMPTY);
      setOpen(false);
      void merchantInvalidators.marketing(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Only offer channels the store can actually reach, so a merchant cannot
  // write a post that has nowhere to go.
  const channels: Array<{ value: Provider; label: string }> = [
    ...(status.facebook?.connected ? [{ value: "facebook" as Provider, label: "Facebook" }] : []),
    ...(status.instagram?.connected ? [{ value: "instagram" as Provider, label: "Instagram" }] : []),
    ...(status.tiktok_content?.connected
      ? [{ value: "tiktok_creator" as Provider, label: "TikTok" }]
      : []),
  ];

  const isTikTok = form.provider === "tiktok_creator";
  const needsImage = form.provider === "instagram" && !form.image_url.trim();
  const missingVideo = isTikTok && !form.video_url.trim();

  function submit() {
    createPost.mutate({
      provider: form.provider,
      message: form.message.trim(),
      ...(form.image_url.trim() ? { image_url: form.image_url.trim() } : {}),
      ...(form.link_url.trim() ? { link_url: form.link_url.trim() } : {}),
      ...(form.video_url.trim() ? { video_url: form.video_url.trim() } : {}),
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Write your own
          </CardTitle>
          <CardDescription>
            Compose a post yourself instead of asking the assistant. It saves as a draft you can publish or
            schedule.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant={open ? "ghost" : "default"}
          onClick={() => setOpen((value) => !value)}
          disabled={channels.length === 0}
        >
          {open ? (
            "Cancel"
          ) : (
            <>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New post
            </>
          )}
        </Button>
      </CardHeader>

      {channels.length === 0 ? (
        <CardContent>
          <p className="text-sm text-ink-soft">
            Connect a channel first — head to the Channels tab to link Facebook, Instagram or TikTok.
          </p>
        </CardContent>
      ) : open ? (
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="composer-channel">Channel</Label>
            <Select
              value={form.provider}
              onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value as Provider }))}
            >
              <SelectTrigger id="composer-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="composer-message">{isTikTok ? "Caption" : "Post copy"}</Label>
            <Textarea
              id="composer-message"
              rows={5}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="What do you want to say?"
            />
          </div>

          {isTikTok ? (
            <div className="space-y-2">
              <Label htmlFor="composer-video">Video URL</Label>
              <Input
                id="composer-video"
                value={form.video_url}
                onChange={(event) => setForm((prev) => ({ ...prev, video_url: event.target.value }))}
                placeholder="https://your-cdn.com/videos/promo.mp4"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="composer-image">
                  Image URL{form.provider === "instagram" ? "" : " (optional)"}
                </Label>
                <Input
                  id="composer-image"
                  value={form.image_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
                  placeholder="https://your-cdn.com/product.jpg"
                />
                {form.provider === "instagram" ? (
                  <p className="text-xs text-ink-soft">Instagram posts always need an image.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="composer-link">Link (optional)</Label>
                <Input
                  id="composer-link"
                  value={form.link_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, link_url: event.target.value }))}
                  placeholder="https://your-store.bizgrid.shop/products/…"
                />
              </div>
            </>
          )}

          <Button
            onClick={submit}
            disabled={createPost.isPending || !form.message.trim() || needsImage || missingVideo}
          >
            {createPost.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Save draft
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
