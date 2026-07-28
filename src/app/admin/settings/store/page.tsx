"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Globe2, Loader2, Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { merchantCache, useStoreMe } from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import type { Industry, UpdateStoreInput } from "@/lib/api/types";
import { INDUSTRY_OPTIONS } from "@/lib/api/types";
import { BusinessProfileFields } from "@/components/admin/business-profile-fields";
import type { BusinessProfileInput } from "@/lib/business-profile";
import { isValidStoreSlug, slugifyStore } from "@/lib/business-profile";
import { getStorefrontUrl, STORE_PLATFORM_DOMAIN } from "@/lib/store-host";
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
