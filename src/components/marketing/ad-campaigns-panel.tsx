"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Loader2, Megaphone, Pause, Play, Plus, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { merchantInvalidators, useAdAccounts, useAdCampaigns } from "@/hooks/use-merchant-queries";
import { merchantKeys } from "@/lib/query-keys";
import type { AdCampaign, MarketingStatus, SaveAdCampaignInput } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
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

type Props = {
  status: MarketingStatus;
};

const EMPTY_FORM = {
  name: "",
  objective: "OUTCOME_TRAFFIC" as const,
  daily_budget_major: "",
  message: "",
  headline: "",
  link_url: "",
  image_url: "",
  call_to_action: "SHOP_NOW",
  age_min: "18",
  age_max: "65",
  countries: "NG",
};

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function campaignBadge(campaign: AdCampaign) {
  if (campaign.status === "active") return <Badge className="bg-emerald-600">Running</Badge>;
  if (campaign.status === "paused") return <Badge className="bg-amber-600">Paused</Badge>;
  if (campaign.status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (campaign.status === "publishing") return <Badge variant="secondary">Launching</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

export function AdCampaignsPanel({ status }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const adsEnabled = status.ads?.configured ?? false;
  const accountConnected = status.ads?.connected ?? false;
  const currency = status.ads?.currency ?? "NGN";
  const minBudgetMinor = status.ads?.capabilities?.min_daily_budget_minor ?? 100000;

  const campaignsQuery = useAdCampaigns({ enabled: adsEnabled });
  const accountsQuery = useAdAccounts({ enabled: adsEnabled && !accountConnected });

  const campaigns = campaignsQuery.data?.campaigns ?? [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: merchantKeys.marketing.campaigns() });
    void merchantInvalidators.marketing(queryClient);
  };

  const selectAccount = useMutation({
    mutationFn: (adAccountId: string) => api.selectAdAccount(adAccountId),
    onSuccess: (data) => {
      toast.success(data.message);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createCampaign = useMutation({
    mutationFn: (input: SaveAdCampaignInput) => api.createAdCampaign(input),
    onSuccess: (data) => {
      toast.success(data.message);
      setForm(EMPTY_FORM);
      setShowForm(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const launchCampaign = useMutation({
    mutationFn: (campaignId: string) => api.launchAdCampaign(campaignId),
    onSuccess: (data) => {
      toast.success(data.message);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setState = useMutation({
    mutationFn: ({ campaignId, active }: { campaignId: string; active: boolean }) =>
      api.setAdCampaignState(campaignId, active),
    onSuccess: (data) => {
      toast.success(data.message);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const archiveCampaign = useMutation({
    mutationFn: (campaignId: string) => api.archiveAdCampaign(campaignId),
    onSuccess: (data) => {
      toast.success(data.message);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!adsEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Paid ads
          </CardTitle>
          <CardDescription>
            Running paid Facebook and Instagram ads from Bizgrid is not enabled on this platform yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function submitForm() {
    const budgetMajor = Number(form.daily_budget_major);

    if (!Number.isFinite(budgetMajor) || budgetMajor <= 0) {
      toast.error("Enter a daily budget.");
      return;
    }

    createCampaign.mutate({
      name: form.name.trim(),
      objective: form.objective,
      daily_budget_minor: Math.round(budgetMajor * 100),
      targeting: {
        countries: form.countries
          .split(",")
          .map((code) => code.trim().toUpperCase())
          .filter((code) => code.length === 2),
        age_min: Number(form.age_min) || 18,
        age_max: Number(form.age_max) || 65,
      },
      creative: {
        message: form.message.trim(),
        headline: form.headline.trim() || undefined,
        link_url: form.link_url.trim(),
        image_url: form.image_url.trim() || undefined,
        call_to_action: form.call_to_action,
      },
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Ad account
          </CardTitle>
          <CardDescription>
            Ads run from your own Meta ad account and are billed by Meta, not Bizgrid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accountConnected ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <div className="text-sm font-medium text-ink">{status.ads.account_name}</div>
                <div className="text-xs text-ink-soft">
                  {status.ads.account_id} · {currency}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void api.disconnectAdAccount().then(() => {
                    toast.success("Ad account disconnected.");
                    refresh();
                  });
                }}
              >
                Disconnect
              </Button>
            </div>
          ) : accountsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your ad accounts…
            </div>
          ) : accountsQuery.isError ? (
            <p className="text-sm text-ink-soft">
              {(accountsQuery.error as Error).message}
            </p>
          ) : (accountsQuery.data?.accounts.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">
              No ad accounts found on your Facebook login. Create one in Meta Ads Manager first.
            </p>
          ) : (
            <div className="space-y-2">
              {accountsQuery.data?.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{account.name}</div>
                    <div className="text-xs text-ink-soft">
                      {account.currency}
                      {account.active ? "" : " · inactive"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!account.active || selectAccount.isPending}
                    onClick={() => selectAccount.mutate(account.id)}
                  >
                    Use this
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Campaigns are created paused. Nothing is spent until you turn one on.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((open) => !open)} disabled={!accountConnected}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accountConnected ? (
            <p className="text-sm text-ink-soft">Connect an ad account above to start building campaigns.</p>
          ) : null}

          {showForm ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign name</Label>
                <Input
                  id="campaign-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Weekend traffic push"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-objective">Goal</Label>
                  <Select
                    value={form.objective}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, objective: value as typeof prev.objective }))
                    }
                  >
                    <SelectTrigger id="campaign-objective">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(status.ads.capabilities?.objectives ?? []).map((objective) => (
                        <SelectItem key={objective.value} value={objective.value}>
                          {objective.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-budget">Daily budget ({currency})</Label>
                  <Input
                    id="campaign-budget"
                    type="number"
                    min={minBudgetMinor / 100}
                    value={form.daily_budget_major}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, daily_budget_major: event.target.value }))
                    }
                    placeholder={String(minBudgetMinor / 100)}
                  />
                  <p className="text-xs text-ink-soft">
                    Minimum {formatMoney(minBudgetMinor, currency)} per day.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-message">Ad copy</Label>
                <Textarea
                  id="campaign-message"
                  rows={4}
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="What should the ad say?"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-headline">Headline</Label>
                  <Input
                    id="campaign-headline"
                    value={form.headline}
                    onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
                    placeholder="Free delivery this week"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-cta">Button</Label>
                  <Select
                    value={form.call_to_action}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, call_to_action: value }))}
                  >
                    <SelectTrigger id="campaign-cta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHOP_NOW">Shop now</SelectItem>
                      <SelectItem value="ORDER_NOW">Order now</SelectItem>
                      <SelectItem value="LEARN_MORE">Learn more</SelectItem>
                      <SelectItem value="CONTACT_US">Contact us</SelectItem>
                      <SelectItem value="MESSAGE_PAGE">Send message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-link">Destination link</Label>
                <Input
                  id="campaign-link"
                  value={form.link_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, link_url: event.target.value }))}
                  placeholder="https://your-store.bizgrid.shop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-image">Ad image URL</Label>
                <Input
                  id="campaign-image"
                  value={form.image_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
                  placeholder="https://your-cdn.com/product.jpg"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="campaign-countries">Countries</Label>
                  <Input
                    id="campaign-countries"
                    value={form.countries}
                    onChange={(event) => setForm((prev) => ({ ...prev, countries: event.target.value }))}
                    placeholder="NG, GH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-age-min">Age from</Label>
                  <Input
                    id="campaign-age-min"
                    type="number"
                    min={18}
                    max={65}
                    value={form.age_min}
                    onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-age-max">Age to</Label>
                  <Input
                    id="campaign-age-max"
                    type="number"
                    min={18}
                    max={65}
                    value={form.age_max}
                    onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submitForm}
                  disabled={
                    createCampaign.isPending ||
                    !form.name.trim() ||
                    !form.message.trim() ||
                    !form.link_url.trim()
                  }
                >
                  {createCampaign.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Save draft
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {campaignsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading campaigns…
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No campaigns yet. Ask the assistant to draft one, or create it here.
            </p>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {campaignBadge(campaign)}
                    <span className="text-sm font-medium text-ink">{campaign.name}</span>
                  </div>
                  <span className="text-xs text-ink-soft">
                    {formatMoney(campaign.daily_budget_minor, campaign.currency)}/day
                  </span>
                </div>

                {campaign.creative?.message ? (
                  <p className="whitespace-pre-wrap text-sm text-ink-soft">{campaign.creative.message}</p>
                ) : null}

                {campaign.metrics ? (
                  <div className="flex flex-wrap gap-3 border-t border-border/60 pt-2 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {(campaign.metrics.impressions ?? 0).toLocaleString()} impressions
                    </span>
                    <span>{(campaign.metrics.clicks ?? 0).toLocaleString()} clicks</span>
                    <span>
                      {formatMoney(Math.round((campaign.metrics.spend ?? 0) * 100), campaign.currency)} spent
                    </span>
                  </div>
                ) : null}

                {campaign.error_message ? (
                  <p className="text-xs text-destructive">{campaign.error_message}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {!campaign.launched ? (
                    <Button
                      size="sm"
                      onClick={() => launchCampaign.mutate(campaign.id)}
                      disabled={launchCampaign.isPending}
                    >
                      <Rocket className="mr-1.5 h-3.5 w-3.5" />
                      Launch (paused)
                    </Button>
                  ) : campaign.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setState.mutate({ campaignId: campaign.id, active: false })}
                      disabled={setState.isPending}
                    >
                      <Pause className="mr-1.5 h-3.5 w-3.5" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setState.mutate({ campaignId: campaign.id, active: true })}
                      disabled={setState.isPending}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      Start spending
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => archiveCampaign.mutate(campaign.id)}
                    disabled={archiveCampaign.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Archive
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
