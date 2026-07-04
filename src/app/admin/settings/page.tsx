"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Banknote,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Globe2,
  Loader2,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  Save,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { INDUSTRY_OPTIONS } from "@/lib/api/types";
import { getStorefrontUrl } from "@/lib/store-host";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const SETTINGS_TABS = [
  "payouts",
  "operations",
  "notifications",
  "policies",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

const payoutChecklist = [
  "Bank account must match business or owner identity",
  "BVN or KYC review may be required before high-volume payouts",
  "Settlement schedule can be daily, twice weekly, or weekly",
];

function formatIndustry(value?: string) {
  return INDUSTRY_OPTIONS.find((option) => option.value === value)?.label ?? "Other";
}

function SettingsStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  title,
  description,
  checked,
}: {
  title: string;
  description: string;
  checked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">{description}</p>
      </div>
      <Switch defaultChecked={checked} aria-label={title} />
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  comingSoon,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {comingSoon ? <Badge variant="secondary">Coming soon</Badge> : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const settingsTab = isSettingsTab(requestedTab) ? requestedTab : "payouts";
  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
  });

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data) {
      router.replace("/admin/onboarding");
    }
  }, [router, storeQuery.data, storeQuery.isFetched]);

  useEffect(() => {
    if (requestedTab === "billing") {
      const checkout = searchParams.get("checkout");
      router.replace(
        checkout ? `/admin/settings/plan?checkout=${checkout}` : "/admin/settings/plan",
      );
      return;
    }
    if (requestedTab === "store") {
      router.replace("/admin/settings/store");
    }
  }, [requestedTab, router, searchParams]);

  function handleSettingsTabChange(tab: string) {
    if (!isSettingsTab(tab)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("checkout");
    router.replace(`/admin/settings?${params.toString()}`, { scroll: false });
  }

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const store = storeQuery.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Merchant control center
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Store settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Manage payout destination, checkout, fulfilment, notifications, and compliance
            settings.{" "}
            <Link href="/admin/settings/store" className="font-medium text-primary hover:underline">
              Store details
            </Link>{" "}
            and{" "}
            <Link href="/admin/settings/plan" className="font-medium text-primary hover:underline">
              Plan & billing
            </Link>{" "}
            live on their own pages.
          </p>
        </header>
        {store ? (
          <Button asChild variant="outline" className="shadow-soft">
            <Link href={getStorefrontUrl(store.slug)} target="_blank">
              <Globe2 className="mr-2 h-4 w-4" />
              View live store
            </Link>
          </Button>
        ) : null}
      </div>

      {store ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Link href="/admin/settings/plan" className="block transition-opacity hover:opacity-90">
              <SettingsStat
                label="Plan & billing"
                value="Manage plan"
                hint="Subscription, SMS, WhatsApp, and AI credits"
                icon={CreditCard}
              />
            </Link>
            <SettingsStat
              label="Payout status"
              value="Pending setup"
              hint="Add bank details to receive settlements"
              icon={Wallet}
            />
            <Link href="/admin/settings/store" className="block transition-opacity hover:opacity-90">
              <SettingsStat
                label="Store profile"
                value={formatIndustry(store.industry)}
                hint={`Public URL: ${getStorefrontUrl(store.slug)}`}
                icon={Store}
              />
            </Link>
          </section>

          <Tabs value={settingsTab} onValueChange={handleSettingsTabChange}>
            <TabsList className="hidden">
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="payouts" className="mt-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    Payout options
                  </CardTitle>
                  <CardDescription>
                    Set how completed orders are settled to your business account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Account holder name">
                      <Input defaultValue={store.business_name} />
                    </Field>
                    <Field label="Bank name">
                      <Input placeholder="e.g. Access Bank" />
                    </Field>
                    <Field label="Account number">
                      <Input inputMode="numeric" placeholder="0123456789" />
                    </Field>
                    <Field label="Settlement schedule">
                      <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                        <option>Daily settlement</option>
                        <option>Twice weekly</option>
                        <option>Weekly settlement</option>
                      </select>
                    </Field>
                    <Field label="Payout currency">
                      <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                        <option>NGN - Nigerian Naira</option>
                        <option>USD - US Dollar</option>
                      </select>
                    </Field>
                    <Field label="Minimum payout amount">
                      <Input defaultValue="5000" inputMode="numeric" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Settlement notes">
                        <Textarea placeholder="Add internal payout instructions or finance contact details." />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Save payout method
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background p-5">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">Verification checklist</h3>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm text-ink-soft">
                        {payoutChecklist.map((item) => (
                          <li key={item} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ToggleRow
                      title="Hold payouts during disputes"
                      description="Automatically pause affected order settlements until support review is complete."
                      checked
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="operations" className="mt-6 grid gap-6 xl:grid-cols-2">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Checkout and delivery
                  </CardTitle>
                  <CardDescription>
                    Configure fulfilment rules customers see during checkout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    title="Allow local delivery"
                    description="Offer doorstep delivery inside selected cities or zones."
                    checked
                  />
                  <ToggleRow
                    title="Allow pickup"
                    description="Let customers collect orders from your store, warehouse, or event stand."
                  />
                  <Field label="Default delivery fee">
                    <Input defaultValue="1500" inputMode="numeric" />
                  </Field>
                  <Field label="Fulfilment promise">
                    <Input defaultValue="Ships within 24-48 hours" />
                  </Field>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-primary" />
                    Inventory and order controls
                  </CardTitle>
                  <CardDescription>
                    Decide how stock, low inventory, and order handling should behave.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    title="Hide out-of-stock products"
                    description="Remove unavailable products from storefront browsing."
                    checked
                  />
                  <ToggleRow
                    title="Require manual order acceptance"
                    description="Review each paid order before fulfilment begins."
                  />
                  <Field label="Low-stock alert threshold">
                    <Input defaultValue="5" inputMode="numeric" />
                  </Field>
                  <Field label="Default order note">
                    <Textarea placeholder="Add a message customers receive after purchase." />
                  </Field>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-primary" />
                    Merchant and customer notifications
                  </CardTitle>
                  <CardDescription>
                    Choose which events should send email, SMS, and dashboard alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    title="New order alerts"
                    description="Notify store admins immediately when a customer places an order."
                    checked
                  />
                  <ToggleRow
                    title="Customer SMS updates"
                    description="Send payment confirmation, fulfilment, and delivery messages to buyers."
                    checked
                  />
                  <ToggleRow
                    title="Low-stock alerts"
                    description="Warn your team before popular products sell out."
                    checked
                  />
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Admin notification email">
                      <Input type="email" placeholder="orders@yourstore.com" />
                    </Field>
                    <Field label="SMS sender name">
                      <Input defaultValue={store.business_name.slice(0, 11)} maxLength={11} />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies" className="mt-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ReceiptText className="h-5 w-5 text-primary" />
                    Policies, taxes, and compliance
                  </CardTitle>
                  <CardDescription>
                    Publish the business rules customers need before and after checkout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-2">
                  <Field label="Return policy">
                    <Textarea
                      className="min-h-32"
                      placeholder="Describe return windows, accepted conditions, and refund timing."
                    />
                  </Field>
                  <Field label="Shipping policy">
                    <Textarea
                      className="min-h-32"
                      placeholder="Describe delivery coverage, timelines, and failed delivery handling."
                    />
                  </Field>
                  <Field label="Tax display">
                    <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                      <option>Prices include tax</option>
                      <option>Add tax at checkout</option>
                      <option>No tax collected</option>
                    </select>
                  </Field>
                  <Field label="Business registration number">
                    <Input placeholder="Optional CAC or local registration number" />
                  </Field>
                  <div className="lg:col-span-2">
                    <Button>
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Save policy settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
