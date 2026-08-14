"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { redirectAfterAuth } from "@/lib/api/types";

function DemoLoginInner() {
  const searchParams = useSearchParams();
  const { user, loading, setUser } = useAuth();
  const [status, setStatus] = useState<"idle" | "signing_in" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const enterDemo = async () => {
    setStatus("signing_in");
    setError(null);
    try {
      const { user: nextUser } = await api.demoLogin();
      setUser(nextUser);
      toast.success("Welcome to the Bizgrid demo");
      redirectAfterAuth(nextUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Demo login failed";
      setError(message);
      setStatus("error");
      toast.error(message);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (user) {
      redirectAfterAuth(user);
      return;
    }

    const queryError = searchParams.get("error");
    if (queryError) {
      setError(queryError);
      setStatus("error");
      return;
    }

    if (started.current) return;
    started.current = true;
    void enterDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-start once after auth resolves
  }, [loading, user, searchParams]);

  return (
    <AuthShell
      title="Try the demo"
      subtitle="No signup needed — you'll enter a sample merchant account with a published store, products, and orders."
    >
      <div className="space-y-4">
        {status === "signing_in" || status === "idle" ? (
          <p className="text-sm text-ink-soft">Signing you into the demo workspace…</p>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-ink">
            <p className="font-medium">Couldn’t open the demo</p>
            <p className="mt-1 text-ink-soft">{error}</p>
          </div>
        ) : null}

        <button
          type="button"
          disabled={status === "signing_in"}
          onClick={() => {
            started.current = true;
            void enterDemo();
          }}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "signing_in" ? "Opening demo…" : "Enter demo"}
        </button>

        <p className="text-center text-sm text-ink-soft">
          Prefer your own account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create one
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            sign in
          </Link>
          .
        </p>

        <p className="text-center text-xs text-ink-soft">
          Shared demo data may be edited by other visitors and can be reset by organizers.
        </p>
      </div>
    </AuthShell>
  );
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Try the demo" subtitle="Preparing demo access…">
          <p className="text-sm text-ink-soft">Loading…</p>
        </AuthShell>
      }
    >
      <DemoLoginInner />
    </Suspense>
  );
}
