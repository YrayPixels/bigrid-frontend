"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import {
  merchantCache,
  merchantInvalidators,
  usePaymentSettings,
} from "@/hooks/use-merchant-queries";
import { useAuth } from "@/lib/auth-context";
import { isEmailVerified } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Banknote, Save } from "lucide-react";

export function PayoutDetailsCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = usePaymentSettings();
  const emailVerified = isEmailVerified(user);

  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (!data) return;
    setAccountName(data.payout_account_name ?? "");
    setBankName(data.payout_bank_name ?? "");
    setAccountNumber(data.payout_account_number ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!emailVerified) {
        throw new Error("Verify your email before adding payout details.");
      }
      return api.updatePaymentSettings({
        payout_account_name: accountName.trim(),
        payout_bank_name: bankName.trim(),
        payout_account_number: accountNumber.trim(),
      });
    },
    onSuccess: (payments) => {
      merchantCache.setPaymentSettings(queryClient, payments);
      merchantInvalidators.store(queryClient);
      toast.success("Payout details saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save payout details");
    },
  });

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Payout bank account
          {data?.payouts_configured ? <Badge className="bg-green-600">Ready</Badge> : null}
        </CardTitle>
        <CardDescription>
          Bizgrid collects customer payments via Paystack. Add your bank details so we can settle
          your order earnings to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!emailVerified ? (
          <div className="rounded-xl border border-amber-600/25 bg-amber-500/10 p-4 text-sm text-ink">
            <p className="font-medium">Verify your email to save payout details</p>
            <p className="mt-1 text-ink-soft">
              Open{" "}
              <Link href="/verify-email" className="font-medium text-primary hover:underline">
                verify email
              </Link>{" "}
              and enter the 6-digit code we sent you. Check spam if it&apos;s not in your inbox.
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-background p-4 text-sm text-ink-soft">
          {data?.checkout_enabled ? (
            <p>
              Online checkout is active on your storefront. Customers pay Bizgrid; you receive
              settlements after payment clears.
            </p>
          ) : (
            <p>
              Platform checkout is not configured yet. Contact support if checkout is unavailable on
              your live store.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="payout-account-name">Account holder name</Label>
            <Input
              id="payout-account-name"
              placeholder="Business or owner name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              disabled={isLoading || !emailVerified}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-bank-name">Bank name</Label>
            <Input
              id="payout-bank-name"
              placeholder="e.g. Access Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              disabled={isLoading || !emailVerified}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-account-number">Account number</Label>
            <Input
              id="payout-account-number"
              inputMode="numeric"
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              disabled={isLoading || !emailVerified}
            />
          </div>
        </div>

        <Button
          disabled={
            saveMutation.isPending ||
            !emailVerified ||
            !accountName.trim() ||
            !bankName.trim() ||
            !accountNumber.trim()
          }
          onClick={() => saveMutation.mutate()}
        >
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save payout details"}
        </Button>
      </CardContent>
    </Card>
  );
}
