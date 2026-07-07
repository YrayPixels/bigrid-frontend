"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { AuthShell, Field } from "@/components/auth-shell";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.resetPasswordWithCode({ email, code, password });
      toast.success(res.message);
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Enter the code from your email and choose a new password.">
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
          label="Reset code"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          required
          autoComplete="one-time-code"
          placeholder="6-digit code"
        />
        <Field
          label="New password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
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
        <Field
          label="Confirm new password"
          type={showConfirm ? "text" : "password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
          endAdornment={
            <button
              type="button"
              onClick={() => setShowConfirm((value) => !value)}
              className="text-ink-soft transition hover:text-ink"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Resetting..." : "Reset password"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Need a new code?{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Request another
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

