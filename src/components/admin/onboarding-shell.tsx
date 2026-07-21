"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { useAuth } from "@/lib/auth-context";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="relative z-10 border-b border-border/70 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BizgridLogo size={28} showWordmark wordmarkClassName="text-base" />
          </Link>
          <div className="flex items-center gap-3">
            {user?.email ? (
              <span className="hidden max-w-[14rem] truncate text-sm text-ink-soft sm:inline">
                {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-secondary hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="relative flex-1">{children}</main>
    </div>
  );
}
