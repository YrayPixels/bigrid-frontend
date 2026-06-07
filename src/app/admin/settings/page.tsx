"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
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
  Palette,
  ReceiptText,
  Save,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  Wallet,
  Zap,
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const smsBalance = {
  remaining: 1240,
  total: 2000,
  reserved: 180,
};

const currentPlan = {
  name: "Growth",
  price: "NGN 18,500",
  cycle: "monthly",
  renewalDate: "28 Jun 2026",
  usage: [
    { label: "Products", value: "86 / 250" },
    { label: "Staff seats", value: "4 / 8" },
    { label: "AI generations", value: "19 / 50" },
    { label: "Custom domains", value: "1 / 2" },
  ],
};

const planOptions = [
  {
    name: "Starter",
    price: "NGN 7,500",
    description: "For new stores validating products and checkout.",
    features: ["50 products", "Basic analytics", "Manual payout review"],
  },
  {
    name: "Growth",
    price: "NGN 18,500",
    description: "For active merchants that need automation and campaigns.",
    features: ["250 products", "SMS campaigns", "Priority payout checks"],
    active: true,
  },
  {
    name: "Scale",
    price: "NGN 45,000",
    description: "For teams selling across channels with higher limits.",
    features: ["Unlimited products", "Advanced automations", "Dedicated support"],
  },
];

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

export default function AdminSettingsPage() {
  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
  });

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const store = storeQuery.data;
  const smsPercent = Math.round((smsBalance.remaining / smsBalance.total) * 100);

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Merchant control center
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Store settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Manage your subscription, SMS balance, payout destination, store profile, checkout,
            fulfilment, notifications, and compliance settings from one place.
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
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SettingsStat
              label="Current plan"
              value={currentPlan.name}
              hint={`${currentPlan.price} ${currentPlan.cycle}, renews ${currentPlan.renewalDate}`}
              icon={CreditCard}
            />
            <SettingsStat
              label="SMS balance"
              value={`${smsBalance.remaining.toLocaleString()} SMS`}
              hint={`${smsBalance.reserved.toLocaleString()} reserved for order alerts`}
              icon={Smartphone}
            />
            <SettingsStat
              label="Payout status"
              value="Pending setup"
              hint="Add bank details to receive settlements"
              icon={Wallet}
            />
            <SettingsStat
              label="Store profile"
              value={formatIndustry(store.industry)}
              hint={`Public URL: storehaus.app/${store.slug}`}
              icon={Store}
            />
          </section>

          <Tabs defaultValue="billing" className="mt-8">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-card p-1 shadow-soft">
              <TabsTrigger value="billing">Plan & SMS</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="store">Store details</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="mt-6 space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Manage subscription plan
                      </CardTitle>
                      <CardDescription>
                        Review limits, renewal date, and upgrade options for your storefront.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Renews {currentPlan.renewalDate}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-4">
                    {currentPlan.usage.map((item) => (
                      <div key={item.label} className="rounded-xl border border-border bg-background p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                          {item.label}
                        </p>
                        <p className="mt-2 font-display text-lg font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {planOptions.map((plan) => (
                      <div
                        key={plan.name}
                        className={`rounded-2xl border p-5 ${
                          plan.active
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                            <p className="mt-1 text-sm text-ink-soft">{plan.description}</p>
                          </div>
                          {plan.active ? <Badge>Active</Badge> : null}
                        </div>
                        <p className="mt-5 font-display text-2xl font-bold">
                          {plan.price}
                          <span className="text-sm font-medium text-ink-soft">/mo</span>
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button className="mt-5 w-full" variant={plan.active ? "secondary" : "default"}>
                          {plan.active ? "Current plan" : "Switch to plan"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                    SMS wallet
                  </CardTitle>
                  <CardDescription>
                    Track SMS units for order updates, delivery notices, marketing campaigns, and OTPs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-ink-soft">Available balance</p>
                          <p className="mt-1 font-display text-3xl font-bold">
                            {smsBalance.remaining.toLocaleString()} SMS
                          </p>
                        </div>
                        <Badge variant="secondary">{smsPercent}% left</Badge>
                      </div>
                      <Progress value={smsPercent} className="mt-5" />
                      <p className="mt-3 text-xs text-ink-soft">
                        Auto reminders pause when the balance drops below 100 units unless auto top-up is enabled.
                      </p>
                    </div>
                    <ToggleRow
                      title="Auto top-up SMS wallet"
                      description="Buy 1,000 units automatically when balance falls below 200."
                    />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border bg-background p-5">
                    <Field label="Top-up package">
                      <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                        <option>1,000 SMS units - NGN 6,000</option>
                        <option>2,500 SMS units - NGN 13,500</option>
                        <option>5,000 SMS units - NGN 25,000</option>
                      </select>
                    </Field>
                    <Field label="Billing card">
                      <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                        <option>Use primary billing card</option>
                        <option>Add a new payment method</option>
                      </select>
                    </Field>
                    <Button className="w-full">
                      <Smartphone className="mr-2 h-4 w-4" />
                      Buy SMS units
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

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

            <TabsContent value="store" className="mt-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Store profile and branding
                  </CardTitle>
                  <CardDescription>
                    Keep your public store information accurate for customers and AI-generated content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-2">
                  <Field label="Business name">
                    <Input defaultValue={store.business_name} />
                  </Field>
                  <Field label="Industry">
                    <select
                      defaultValue={store.industry}
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {INDUSTRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Store slug" hint="This controls your Storehaus storefront URL.">
                    <Input defaultValue={store.slug} />
                  </Field>
                  <Field label="Custom domain">
                    <Input defaultValue={store.primary_domain ?? ""} placeholder="shop.yourdomain.com" />
                  </Field>
                  <Field label="Brand color">
                    <div className="flex gap-3">
                      <Input type="color" defaultValue={store.brand_color} className="h-10 w-16 p-1" />
                      <Input defaultValue={store.brand_color} />
                    </div>
                  </Field>
                  <Field label="Support phone">
                    <Input placeholder="+234 800 000 0000" />
                  </Field>
                  <div className="lg:col-span-2">
                    <Field label="Store description">
                      <Textarea defaultValue={store.description} className="min-h-28" />
                    </Field>
                  </div>
                  <div className="lg:col-span-2 flex flex-wrap gap-3">
                    <Button>
                      <Save className="mr-2 h-4 w-4" />
                      Save store settings
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/admin/website">Open website editor</Link>
                    </Button>
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
