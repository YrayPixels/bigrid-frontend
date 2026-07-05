"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  Globe2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useBillingSubscription, useStoreDomains, useStoreMe } from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import type { StoreDomain } from "@/lib/api/types";
import { getStorefrontUrl } from "@/lib/store-host";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { merchantKeys } from "@/lib/query-keys";

function copyToClipboard(value: string, label: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied.`),
    () => toast.error(`Could not copy ${label.toLowerCase()}.`),
  );
}

function DnsRecordRow({
  type,
  host,
  value,
}: {
  type: string;
  host: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">{type}</Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(`${host}\n${value}`, `${type} record`)}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-ink-soft">Host</dt>
          <dd className="mt-0.5 font-mono text-xs break-all">{host}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Value</dt>
          <dd className="mt-0.5 font-mono text-xs break-all">{value}</dd>
        </div>
      </dl>
    </div>
  );
}

function DomainCard({
  domain,
  onVerify,
  onSetPrimary,
  onDelete,
  verifying,
  deleting,
}: {
  domain: StoreDomain;
  onVerify: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
  verifying: boolean;
  deleting: boolean;
}) {
  const verified = domain.status === "verified";

  return (
    <div className="rounded-2xl border border-border bg-secondary/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{domain.hostname}</h3>
            {domain.is_primary ? <Badge>Primary</Badge> : null}
            <Badge variant={verified ? "default" : "secondary"}>
              {verified ? "Verified" : "Pending verification"}
            </Badge>
          </div>
          {verified && domain.verified_at ? (
            <p className="mt-1 text-xs text-ink-soft">
              Verified {new Date(domain.verified_at).toLocaleString()}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              Add both DNS records below, then check verification. Propagation can take up to 24 hours.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!verified ? (
            <Button type="button" variant="outline" size="sm" onClick={onVerify} disabled={verifying}>
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Check DNS
            </Button>
          ) : null}
          {verified && !domain.is_primary ? (
            <Button type="button" variant="outline" size="sm" onClick={onSetPrimary}>
              Set primary
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!verified ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DnsRecordRow
            type="TXT"
            host={domain.verification.txt_host}
            value={domain.verification.txt_value}
          />
          <DnsRecordRow
            type="CNAME"
            host={domain.verification.cname_host}
            value={domain.verification.cname_target}
          />
          <div className="lg:col-span-2 flex flex-wrap gap-3 text-xs text-ink-soft">
            <span className={domain.verification.txt_verified ? "text-primary" : undefined}>
              TXT {domain.verification.txt_verified ? "detected" : "not detected yet"}
            </span>
            <span>·</span>
            <span className={domain.verification.cname_verified ? "text-primary" : undefined}>
              CNAME {domain.verification.cname_verified ? "detected" : "not detected yet"}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Customers can visit https://{domain.hostname}
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsDomainsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeQuery = useStoreMe();
  const billingQuery = useBillingSubscription({ enabled: Boolean(storeQuery.data) });
  const domainsQuery = useStoreDomains({ enabled: Boolean(storeQuery.data) });
  const [hostname, setHostname] = useState("");
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data) {
      router.replace("/admin/onboarding");
    }
  }, [router, storeQuery.data, storeQuery.isFetched]);

  const invalidateDomains = () =>
    queryClient.invalidateQueries({ queryKey: merchantKeys.domains() });

  const addDomain = useMutation({
    mutationFn: (value: string) => api.addStoreDomain(value),
    onSuccess: async () => {
      setHostname("");
      await invalidateDomains();
      toast.success("Domain added. Configure DNS records to verify ownership.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not add domain"),
  });

  const verifyDomain = useMutation({
    mutationFn: (domainId: string) => api.verifyStoreDomain(domainId),
    onMutate: (domainId) => setActiveDomainId(domainId),
    onSettled: () => setActiveDomainId(null),
    onSuccess: async (domain) => {
      await invalidateDomains();
      if (domain.status === "verified") {
        toast.success("Domain verified and connected.");
      } else {
        toast.message("DNS records not detected yet. Try again after propagation.");
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Verification check failed"),
  });

  const setPrimary = useMutation({
    mutationFn: (domainId: string) => api.setPrimaryStoreDomain(domainId),
    onSuccess: async () => {
      await invalidateDomains();
      toast.success("Primary domain updated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update primary domain"),
  });

  const deleteDomain = useMutation({
    mutationFn: (domainId: string) => api.deleteStoreDomain(domainId),
    onMutate: (domainId) => setActiveDomainId(domainId),
    onSettled: () => setActiveDomainId(null),
    onSuccess: async () => {
      await invalidateDomains();
      toast.success("Domain removed.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove domain"),
  });

  async function handleAddDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = hostname.trim();
    if (!value) {
      toast.error("Enter a domain to connect.");
      return;
    }
    await addDomain.mutateAsync(value);
  }

  if (storeQuery.isLoading || domainsQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const store = storeQuery.data;
  const domains = domainsQuery.data;
  if (!store || !domains) return null;

  const planAllows = domains.meta.allowed;
  const atLimit = domains.meta.used >= domains.meta.max_domains;
  const currentPlan = billingQuery.data?.subscription.plan ?? "starter";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Settings</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Custom domains</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Connect your own domain so customers visit your brand URL instead of your Bizgrid subdomain.
          </p>
        </header>
        <Button asChild variant="outline" className="shadow-soft">
          <Link href={getStorefrontUrl(store.slug)} target="_blank">
            <Globe2 className="mr-2 h-4 w-4" />
            View subdomain store
          </Link>
        </Button>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Default storefront URL
          </CardTitle>
          <CardDescription>
            Every store includes a Bizgrid subdomain. Custom domains are optional add-ons on higher plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-ink-soft">Subdomain</Label>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-secondary px-3 py-2 text-sm">{domains.meta.subdomain_host}</code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(domains.meta.subdomain_host, "Subdomain")}
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {!planAllows ? (
        <Card className="border-primary/20 bg-primary/5 shadow-soft">
          <CardHeader>
            <CardTitle>Upgrade to connect a custom domain</CardTitle>
            <CardDescription>
              Custom domains are included on Growth and Scale plans. You are currently on{" "}
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/settings/plan">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Connect a domain</CardTitle>
            <CardDescription>
              Use a subdomain like <code className="text-xs">shop.yourbrand.com</code> or your apex domain.
              {domains.meta.max_domains > 1
                ? ` Your plan allows up to ${domains.meta.max_domains} domains.`
                : " Your plan includes 1 custom domain."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleAddDomain}>
              <div className="flex-1 space-y-2">
                <Label htmlFor="custom-domain">Domain</Label>
                <Input
                  id="custom-domain"
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  placeholder="shop.yourbrand.com"
                  disabled={atLimit || addDomain.isPending}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={atLimit || addDomain.isPending}>
                  {addDomain.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add domain
                </Button>
              </div>
            </form>
            {atLimit ? (
              <p className="mt-3 text-sm text-ink-soft">
                Domain limit reached. Remove a domain or upgrade your plan for more.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {domains.domains.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Connected domains</h2>
          {domains.domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              verifying={verifyDomain.isPending && activeDomainId === domain.id}
              deleting={deleteDomain.isPending && activeDomainId === domain.id}
              onVerify={() => verifyDomain.mutate(domain.id)}
              onSetPrimary={() => setPrimary.mutate(domain.id)}
              onDelete={() => deleteDomain.mutate(domain.id)}
            />
          ))}
        </section>
      ) : planAllows ? (
        <p className="text-sm text-ink-soft">No custom domains connected yet.</p>
      ) : null}

      <p className="text-sm text-ink-soft">
        Need store profile changes?{" "}
        <Link href="/admin/settings/store" className="font-medium text-primary hover:underline">
          Store details
        </Link>{" "}
        ·{" "}
        <Link href="/admin/settings/plan" className="font-medium text-primary hover:underline">
          Plan & billing
        </Link>
      </p>
    </div>
  );
}
