"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Bot, Check, Globe2, Loader2, MessageSquare, Palette, RefreshCw, Save, Shield, Sliders, Sparkles, User, Volume2, Zap } from "lucide-react";
import { toast } from "sonner";
import { merchantCache, useStoreMe } from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import type { Industry, UpdateStoreInput } from "@/lib/api/types";
import { INDUSTRY_OPTIONS } from "@/lib/api/types";
import { BusinessProfileFields } from "@/components/admin/business-profile-fields";
import type { BusinessProfileInput } from "@/lib/business-profile";
import { isValidStoreSlug, slugifyStore } from "@/lib/business-profile";
import { getStorefrontUrl, STORE_PLATFORM_DOMAIN } from "@/lib/store-host";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

type StoreProfileForm = {
  business_name: string;
  slug: string;
  industry: Industry;
  description: string;
  contact_email: string;
  contact_phone: string;
  brand_color: string;
  store_perks: string[];
  dealie_enabled: boolean;
  dealie_persona_id: number;
  dealie_chat_mode: "full_ai" | "ai_assisted" | "human_only";
  dealie_chat_config: {
    auto_approve_discount_percent: number;
    offline_fallback_mode: "full_ai" | "leave_message";
    sound_alerts: boolean;
    email_alerts: boolean;
  };
  business_profile: BusinessProfileInput;
};

function storeProfileFromStore(
  store: NonNullable<Awaited<ReturnType<typeof api.getMyStore>>>,
): StoreProfileForm {
  return {
    business_name: store.business_name,
    slug: store.slug,
    industry: store.industry,
    description: store.description,
    contact_email: store.contact_email ?? "",
    contact_phone: store.contact_phone ?? "",
    brand_color: store.brand_color,
    store_perks: store.store_perks?.length ? [...store.store_perks] : [""],
    dealie_enabled: store.dealie_enabled !== false,
    dealie_persona_id: Number(store.dealie_persona_id) || 1,
    dealie_chat_mode: store.dealie_chat_mode || "full_ai",
    dealie_chat_config: {
      auto_approve_discount_percent: store.dealie_chat_config?.auto_approve_discount_percent ?? 5.0,
      offline_fallback_mode: store.dealie_chat_config?.offline_fallback_mode ?? "full_ai",
      sound_alerts: store.dealie_chat_config?.sound_alerts ?? true,
      email_alerts: store.dealie_chat_config?.email_alerts ?? true,
    },
    business_profile: {
      business_location: store.business_location ?? null,
      weekly_orders: store.weekly_orders ?? null,
      payment_currencies: store.payment_currencies ?? [],
      staff_count: store.staff_count ?? null,
      physical_store_count: store.physical_store_count ?? null,
    },
  };
}

export default function AdminSettingsStorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeQuery = useStoreMe();
  const [storeForm, setStoreForm] = useState<StoreProfileForm | null>(null);

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data) {
      router.replace("/admin/onboarding");
    }
  }, [router, storeQuery.data, storeQuery.isFetched]);

  useEffect(() => {
    if (storeQuery.data) {
      setStoreForm(storeProfileFromStore(storeQuery.data));
    }
  }, [storeQuery.data]);

  const saveStoreProfile = useMutation({
    mutationFn: (body: UpdateStoreInput) => api.updateMyStore(body),
    onSuccess: (store) => {
      merchantCache.setStoreMe(queryClient, store);
      setStoreForm(storeProfileFromStore(store));
      toast.success("Store settings saved.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save store settings"),
  });

  const [syncingDealie, setSyncingDealie] = useState(false);

  async function handleSyncCatalog() {
    setSyncingDealie(true);
    try {
      const res = await api.syncDealieCatalog();
      toast.success(res.message || "Catalog synced to Dealie AI.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sync catalog to Dealie AI");
    } finally {
      setSyncingDealie(false);
    }
  }

  async function handleStoreProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeForm) return;

    const businessName = storeForm.business_name.trim();
    if (!businessName) {
      toast.error("Business name is required.");
      return;
    }

    const slug = slugifyStore(storeForm.slug);
    if (!isValidStoreSlug(slug)) {
      toast.error("Store slug must be at least 2 characters and use lowercase letters, numbers, and hyphens.");
      return;
    }

    await saveStoreProfile.mutateAsync({
      business_name: businessName,
      slug,
      industry: storeForm.industry,
      description: storeForm.description.trim(),
      contact_email: storeForm.contact_email.trim() || null,
      contact_phone: storeForm.contact_phone.trim() || null,
      brand_color: storeForm.brand_color,
      store_perks: storeForm.store_perks.map((perk) => perk.trim()).filter(Boolean),
      dealie_enabled: storeForm.dealie_enabled,
      dealie_persona_id: storeForm.dealie_persona_id,
      dealie_chat_mode: storeForm.dealie_chat_mode,
      dealie_chat_config: storeForm.dealie_chat_config,
      ...(storeForm.business_profile.business_location
        ? { business_location: storeForm.business_profile.business_location }
        : {}),
      ...(storeForm.business_profile.weekly_orders
        ? { weekly_orders: storeForm.business_profile.weekly_orders }
        : {}),
      ...(storeForm.business_profile.payment_currencies.length
        ? { payment_currencies: storeForm.business_profile.payment_currencies }
        : {}),
      ...(storeForm.business_profile.staff_count
        ? { staff_count: storeForm.business_profile.staff_count }
        : {}),
      ...(storeForm.business_profile.physical_store_count
        ? { physical_store_count: storeForm.business_profile.physical_store_count }
        : {}),
    });
  }

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const store = storeQuery.data;
  if (!store) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Settings</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Store details</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Keep your public store information accurate for customers and AI-generated content.
          </p>
        </header>
        <Button asChild variant="outline" className="shadow-soft">
          <Link href={getStorefrontUrl(store.slug)} target="_blank">
            <Globe2 className="mr-2 h-4 w-4" />
            View live store
          </Link>
        </Button>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Store profile and branding
          </CardTitle>
          <CardDescription>
            Update your business name, store URL, industry, contact details, and branding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storeForm ? (
            <form className="grid gap-5 lg:grid-cols-2" onSubmit={handleStoreProfileSubmit}>
              <Field label="Business name">
                <Input
                  value={storeForm.business_name}
                  onChange={(event) =>
                    setStoreForm((current) =>
                      current ? { ...current, business_name: event.target.value } : current,
                    )
                  }
                  required
                />
              </Field>
              <Field label="Industry">
                <select
                  value={storeForm.industry}
                  onChange={(event) =>
                    setStoreForm((current) =>
                      current
                        ? { ...current, industry: event.target.value as Industry }
                        : current,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Store slug"
                hint="Changing this updates your Bizgrid storefront URL. Existing links to the old URL will stop working."
              >
                <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                  <Input
                    value={storeForm.slug}
                    onChange={(event) =>
                      setStoreForm((current) =>
                        current ? { ...current, slug: slugifyStore(event.target.value) } : current,
                      )
                    }
                    className="border-0 shadow-none focus-visible:ring-0"
                    required
                  />
                  <span className="flex items-center border-l border-input bg-muted/40 px-3 text-sm text-ink-soft">
                    .{STORE_PLATFORM_DOMAIN}
                  </span>
                </div>
              </Field>
              <Field
                label="Custom domain"
                hint="Connect your own domain on Growth or Scale plans."
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    defaultValue={
                      store.primary_domain && store.primary_domain !== store.subdomain_host
                        ? store.primary_domain
                        : ""
                    }
                    placeholder="Not connected"
                    disabled
                  />
                  <Button asChild variant="outline" type="button" className="shrink-0">
                    <Link href="/admin/settings/domains">Manage domains</Link>
                  </Button>
                </div>
              </Field>
              <Field label="Brand color">
                <div className="flex gap-3">
                  <Input
                    type="color"
                    value={storeForm.brand_color}
                    onChange={(event) =>
                      setStoreForm((current) =>
                        current ? { ...current, brand_color: event.target.value } : current,
                      )
                    }
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={storeForm.brand_color}
                    onChange={(event) =>
                      setStoreForm((current) =>
                        current ? { ...current, brand_color: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </Field>
              <Field label="Support phone">
                <Input
                  value={storeForm.contact_phone}
                  onChange={(event) =>
                    setStoreForm((current) =>
                      current ? { ...current, contact_phone: event.target.value } : current,
                    )
                  }
                  placeholder="+234 800 000 0000"
                />
              </Field>
              <Field label="Contact email">
                <Input
                  type="email"
                  value={storeForm.contact_email}
                  onChange={(event) =>
                    setStoreForm((current) =>
                      current ? { ...current, contact_email: event.target.value } : current,
                    )
                  }
                  placeholder="hello@yourstore.com"
                />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Store description">
                  <Textarea
                    value={storeForm.description}
                    onChange={(event) =>
                      setStoreForm((current) =>
                        current ? { ...current, description: event.target.value } : current,
                      )
                    }
                    className="min-h-28"
                  />
                </Field>
              </div>
              <div className="lg:col-span-2">
                <Field
                  label="Store-wide perks"
                  hint="Shown on every product page (for example Free delivery in Lagos). Product-specific perks still apply too."
                >
                  <div className="space-y-3">
                    {storeForm.store_perks.map((perk, index) => (
                      <div key={index} className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Input
                          value={perk}
                          onChange={(event) =>
                            setStoreForm((current) =>
                              current
                                ? {
                                    ...current,
                                    store_perks: current.store_perks.map((item, itemIndex) =>
                                      itemIndex === index ? event.target.value : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          placeholder="Free delivery in Lagos"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setStoreForm((current) =>
                              current
                                ? {
                                    ...current,
                                    store_perks:
                                      current.store_perks.length === 1
                                        ? [""]
                                        : current.store_perks.filter(
                                            (_, itemIndex) => itemIndex !== index,
                                          ),
                                  }
                                : current,
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setStoreForm((current) =>
                          current
                            ? { ...current, store_perks: [...current.store_perks, ""] }
                            : current,
                        )
                      }
                    >
                      Add perk
                    </Button>
                  </div>
                </Field>
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-soft">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold tracking-tight">Dealie Negotiation & Chat Autonomy</h3>
                      <p className="text-xs text-ink-soft">
                        Dictate how Dealie interacts with buyers on your storefront product pages.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-border shadow-soft text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={storeForm.dealie_enabled}
                      onChange={(e) =>
                        setStoreForm((current) =>
                          current ? { ...current, dealie_enabled: e.target.checked } : current
                        )
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span>{storeForm.dealie_enabled ? "Dealie Active" : "Dealie Disabled"}</span>
                  </label>
                </div>

                {storeForm.dealie_enabled ? (
                  <>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Choose Chat Autonomy Mode</Label>
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* 1. Full AI Chat (Autopilot) */}
                        <div
                          onClick={() =>
                            setStoreForm((current) =>
                              current ? { ...current, dealie_chat_mode: "full_ai" } : current
                            )
                          }
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            storeForm.dealie_chat_mode === "full_ai"
                              ? "border-primary bg-white dark:bg-zinc-900 shadow-md ring-2 ring-primary/20"
                              : "border-border/60 bg-white/60 dark:bg-zinc-900/60 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-amber-500" />
                              <span className="font-display text-sm font-bold">Full AI Chat</span>
                            </div>
                            {storeForm.dealie_chat_mode === "full_ai" && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="inline-block text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                            Autopilot • 24/7
                          </span>
                          <p className="text-xs text-ink-soft leading-relaxed">
                            AI negotiates autonomously, enforces price floors, and issues cryptographic deal tokens with zero manual effort.
                          </p>
                        </div>

                        {/* 2. AI-Assisted Chat (Co-pilot) */}
                        <div
                          onClick={() =>
                            setStoreForm((current) =>
                              current ? { ...current, dealie_chat_mode: "ai_assisted" } : current
                            )
                          }
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            storeForm.dealie_chat_mode === "ai_assisted"
                              ? "border-primary bg-white dark:bg-zinc-900 shadow-md ring-2 ring-primary/20"
                              : "border-border/60 bg-white/60 dark:bg-zinc-900/60 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sliders className="h-4 w-4 text-primary" />
                              <span className="font-display text-sm font-bold">AI-Assisted</span>
                            </div>
                            {storeForm.dealie_chat_mode === "ai_assisted" && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="inline-block text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1.5">
                            Co-pilot • 1-Click
                          </span>
                          <p className="text-xs text-ink-soft leading-relaxed">
                            AI drafts smart counter-offers and answers questions, but requires your 1-click approval for deals above your discount threshold.
                          </p>
                        </div>

                        {/* 3. Full Human Chat */}
                        <div
                          onClick={() =>
                            setStoreForm((current) =>
                              current ? { ...current, dealie_chat_mode: "human_only" } : current
                            )
                          }
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            storeForm.dealie_chat_mode === "human_only"
                              ? "border-primary bg-white dark:bg-zinc-900 shadow-md ring-2 ring-primary/20"
                              : "border-border/60 bg-white/60 dark:bg-zinc-900/60 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              <span className="font-display text-sm font-bold">Human Chat Only</span>
                            </div>
                            {storeForm.dealie_chat_mode === "human_only" && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="inline-block text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1.5">
                            Manual Live Chat
                          </span>
                          <p className="text-xs text-ink-soft leading-relaxed">
                            AI auto-responder is disabled. You chat directly with customers while AI acts as a private co-pilot in your admin inbox.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mode Sub-Settings */}
                    <div className="rounded-xl border border-primary/15 bg-white/80 dark:bg-zinc-900/80 p-4 space-y-4">
                      {storeForm.dealie_chat_mode === "full_ai" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Sales Persona Strategy" hint="Tone and negotiation strategy Dealie uses when negotiating autonomously.">
                            <select
                              value={storeForm.dealie_persona_id}
                              onChange={(e) =>
                                setStoreForm((current) =>
                                  current ? { ...current, dealie_persona_id: Number(e.target.value) } : current
                                )
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value={1}>Friendly Seller (Warm, builds rapport, flexible)</option>
                              <option value={2}>Tough Negotiator (Assertive, holds firm on price)</option>
                              <option value={3}>Consultative Advisor (Professional, feature-focused)</option>
                            </select>
                          </Field>
                          <div className="rounded-lg bg-muted/40 p-3.5 flex flex-col justify-center">
                            <p className="text-xs font-semibold text-ink">Autonomous Guardrails</p>
                            <p className="text-xs text-ink-soft mt-1">
                              AI will never go below each product&apos;s configured floor price and will monotonically pace concessions.
                            </p>
                          </div>
                        </div>
                      )}

                      {storeForm.dealie_chat_mode === "ai_assisted" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            label={`Auto-Approve Discount Limit: ${storeForm.dealie_chat_config.auto_approve_discount_percent}%`}
                            hint="Discounts exceeding this percentage will be drafted for your 1-click approval before sending to the buyer."
                          >
                            <input
                              type="range"
                              min={0}
                              max={30}
                              step={1}
                              value={storeForm.dealie_chat_config.auto_approve_discount_percent}
                              onChange={(e) =>
                                setStoreForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        dealie_chat_config: {
                                          ...current.dealie_chat_config,
                                          auto_approve_discount_percent: Number(e.target.value),
                                        },
                                      }
                                    : current
                                )
                              }
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                            />
                          </Field>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Real-Time Sound Alerts</Label>
                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                checked={storeForm.dealie_chat_config.sound_alerts}
                                onChange={(e) =>
                                  setStoreForm((current) =>
                                    current
                                      ? {
                                          ...current,
                                          dealie_chat_config: {
                                            ...current.dealie_chat_config,
                                            sound_alerts: e.target.checked,
                                          },
                                        }
                                      : current
                                  )
                                }
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                              />
                              <span className="text-xs font-medium">Chime when a new deal draft is ready for review</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {storeForm.dealie_chat_mode === "human_only" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Offline Fallback" hint="What happens when you are away or offline.">
                            <select
                              value={storeForm.dealie_chat_config.offline_fallback_mode}
                              onChange={(e) =>
                                setStoreForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        dealie_chat_config: {
                                          ...current.dealie_chat_config,
                                          offline_fallback_mode: e.target.value as "full_ai" | "leave_message",
                                        },
                                      }
                                    : current
                                )
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="leave_message">Leave Message (Store owner will reply shortly)</option>
                              <option value="full_ai">Full AI Takeover (AI answers during offline hours)</option>
                            </select>
                          </Field>
                          <div className="rounded-lg bg-muted/40 p-3.5 flex flex-col justify-center">
                            <p className="text-xs font-semibold text-ink">Live Console Integration</p>
                            <p className="text-xs text-ink-soft mt-1">
                              Incoming customer chats will appear instantly in your <Link href="/admin/messages" className="font-semibold text-primary underline">Messages Console</Link> with live AI Copilot suggestions.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Central Gateway Hub */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <h4 className="text-sm font-bold text-ink">Central WhatsApp Bargaining Gateway</h4>
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                          Zero-Config Live
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-soft">
                        Your store is connected to Dealie&apos;s Central WhatsApp Gateway. When buyers tap &quot;Bargain on WhatsApp&quot;, negotiations route to your store with your active floor prices and chat mode.
                      </p>
                      <div className="rounded-lg bg-background p-3 border border-border/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-mono text-ink truncate max-w-md">
                          wa.me/234800DEALIE?text=Deal:v{store.dealie_vendor_id || store.id}_[product_id]
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://wa.me/234800DEALIE?text=Deal:v${store.dealie_vendor_id || store.id}_catalog`);
                            toast.success("WhatsApp store deep-link copied to clipboard!");
                          }}
                        >
                          Copy Store WhatsApp Link
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-primary/10 pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-ink">Manual Catalog Synchronization</p>
                        <p className="text-xs text-ink-soft">Push active products, floor prices, and chat mode settings directly to Dealie.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncingDealie}
                        onClick={() => void handleSyncCatalog()}
                        className="bg-white hover:bg-primary/5 border-primary/20 text-primary shadow-soft"
                      >
                        {syncingDealie ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        )}
                        {syncingDealie ? "Syncing..." : "Sync Catalog to Dealie AI"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-5">
                <div className="mb-5">
                  <h3 className="font-display text-lg font-semibold">Business operations</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Update where you sell, how you get paid, and the size of your team.
                  </p>
                </div>
                <BusinessProfileFields
                  value={storeForm.business_profile}
                  onChange={(business_profile) =>
                    setStoreForm((current) => (current ? { ...current, business_profile } : current))
                  }
                />
              </div>
              <div className="lg:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={saveStoreProfile.isPending}>
                  {saveStoreProfile.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save store settings
                </Button>
                <Button asChild variant="outline" type="button">
                  <Link href="/admin/website">Open website</Link>
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-sm text-ink-soft">
        Need payout or plan settings?{" "}
        <Link href="/admin/settings?tab=payouts" className="font-medium text-primary hover:underline">
          Payouts
        </Link>{" "}
        ·{" "}
        <Link href="/admin/settings/plan" className="font-medium text-primary hover:underline">
          Plan & billing
        </Link>
      </p>
    </div>
  );
}
