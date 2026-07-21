"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isEmailVerified } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || isEmailVerified(user) || user.impersonating) return null;
  if (pathname === "/admin/onboarding" || pathname.startsWith("/admin/onboarding/")) return null;

  return (
    <div className="border-b border-amber-600/25 bg-amber-500/10 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-200" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Verify your email to publish and add payouts</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              We emailed a code to <span className="font-medium text-ink">{user.email}</span>. You can keep
              building meanwhile.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" asChild>
          <Link href="/verify-email">Verify email</Link>
        </Button>
      </div>
    </div>
  );
}
