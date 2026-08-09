"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { redirectAfterAuth } from "@/lib/api/types";
import {
  AuthShell,
  AuthSubmitButton,
  Field,
  GoogleAuthFooter,
} from "@/components/auth-shell";

export default function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      redirectAfterAuth(user);
    }
  }, [user, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user: nextUser } = await api.login({ email, password, remember });
      setUser(nextUser);
      if (nextUser?.has_store && nextUser?.can_access_admin !== false) {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: merchantKeys.store.me(),
            queryFn: () => api.getMyStore(),
            staleTime: 5 * 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: merchantKeys.dashboard("all"),
            queryFn: () => api.getDashboardOverview("all"),
            staleTime: 60 * 1000,
          }),
        ]);
      }
      toast.success(`Welcome back${nextUser?.name ? `, ${nextUser.name.split(" ")[0]}` : ""}!`);
      router.replace(postAuthPath(nextUser));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  if (!loading && user) {
    return (
      <AuthShell title="Welcome back">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          Taking you to your dashboard…
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back">
      <GoogleAuthFooter label="Sign in with Google" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-ink-soft transition hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <AuthSubmitButton disabled={submitting}>
          {submitting ? "Signing in..." : "Continue"}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
