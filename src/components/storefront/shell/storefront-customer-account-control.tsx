"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useCustomerAuthOptional } from "@/lib/storefront/customer-auth";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

type Variant = "pill" | "icon";

function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || "Account";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function StorefrontCustomerAccountControl({
  variant = "pill",
  className,
  iconClassName,
}: {
  variant?: Variant;
  className?: string;
  iconClassName?: string;
}) {
  const auth = useCustomerAuthOptional();
  const { theme, mode } = useStorefrontTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (mode === "edit" || !auth) return null;

  const { customer, loading, signInWithGoogle, signOut } = auth;

  if (loading && !customer) {
    if (variant === "icon") {
      return (
        <span
          className={cn("inline-flex size-9 animate-pulse rounded-full", className)}
          style={{ backgroundColor: `${theme.palette.surface}bf` }}
          aria-hidden
        />
      );
    }
    return (
      <span
        className={cn(
          "hidden h-9 w-24 animate-pulse rounded-full sm:inline-flex",
          className,
        )}
        style={{ backgroundColor: `${theme.palette.primary}55` }}
        aria-hidden
      />
    );
  }

  if (!customer) {
    if (variant === "icon") {
      return (
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className={cn(
            "hidden size-9 items-center justify-center rounded-full transition hover:opacity-80 sm:inline-flex",
            className,
          )}
          aria-label="Sign in with Google"
        >
          <UserRound className={cn("h-4 w-4", iconClassName)} />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold transition hover:opacity-90 sm:inline-flex",
          className,
        )}
        style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
      >
        Sign in
        <UserRound className="h-3.5 w-3.5" />
      </button>
    );
  }

  const avatar = customer.avatar_url ? (
    <img
      src={customer.avatar_url}
      alt=""
      className={cn("rounded-full object-cover", variant === "icon" ? "h-7 w-7" : "h-5 w-5")}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      className={cn(
        "grid place-items-center rounded-full text-[10px] font-bold",
        variant === "icon" ? "h-7 w-7" : "h-5 w-5",
      )}
      style={{
        backgroundColor: variant === "pill" ? theme.palette.background : theme.palette.primary,
        color: variant === "pill" ? theme.palette.primary : theme.palette.background,
      }}
    >
      {initials(customer.name)}
    </span>
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative hidden sm:block", variant === "icon" ? className : undefined)}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(
          "inline-flex items-center gap-1.5 transition",
          variant === "pill"
            ? cn(
                "rounded-full px-2.5 py-1.5 text-[11px] font-semibold hover:opacity-90",
                className,
              )
            : "size-9 justify-center rounded-full hover:opacity-80",
        )}
        style={
          variant === "pill"
            ? { backgroundColor: theme.palette.primary, color: theme.palette.background }
            : undefined
        }
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Signed in as ${customer.name}`}
      >
        {avatar}
        {variant === "pill" ? (
          <>
            <span className="max-w-[7rem] truncate">{firstName(customer.name)}</span>
            <ChevronDown className="h-3 w-3 opacity-80" />
          </>
        ) : null}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden rounded-2xl border shadow-lg"
          style={{
            backgroundColor: theme.palette.background,
            borderColor: theme.palette.border,
            color: theme.palette.text,
          }}
        >
          <div className="border-b px-3 py-2.5" style={{ borderColor: theme.palette.border }}>
            <p className="truncate text-sm font-semibold">{customer.name}</p>
            <p className="truncate text-xs" style={{ color: theme.palette.muted }}>
              {customer.email}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-black/[0.04]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
