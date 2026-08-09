"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MerchantShell } from "@/components/merchant-shell";
import { OnboardingShell } from "@/components/admin/onboarding-shell";
import { useAuth } from "@/lib/auth-context";
import { LocationScopeProvider } from "@/lib/location-scope";
import { BuilderRealtimeProvider } from "@/lib/storefront-builder/realtime-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const isOnboarding = pathname === "/admin/onboarding" || pathname.startsWith("/admin/onboarding/");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.can_access_admin === false) {
      router.replace("/sell");
    }
  }, [loading, user, router]);

  // Block until client hydration mounts and initial auth check finishes.
  if (!mounted || loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isOnboarding) {
    return <OnboardingShell>{children}</OnboardingShell>;
  }

  return (
    <BuilderRealtimeProvider>
      <LocationScopeProvider>
        <MerchantShell>{children}</MerchantShell>
      </LocationScopeProvider>
    </BuilderRealtimeProvider>
  );
}
