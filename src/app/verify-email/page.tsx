"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { isEmailVerified } from "@/lib/api/types";
import { AuthShell, AuthSubmitButton, Field } from "@/components/auth-shell";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, refresh, setUser, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user && isEmailVerified(user)) {
      router.replace(user.has_store ? "/admin" : "/admin/onboarding");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.verifyEmail({ code: code.trim() });
      setUser(res.user);
      await refresh();
      toast.success("Email verified");
      router.replace(res.user.has_store ? "/admin" : "/admin/onboarding");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify email");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.resendEmailVerification();
      toast.success("Verification code sent — check your inbox");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  if (loading || !user || isEmailVerified(user)) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`Enter the 6-digit code we sent to ${user.email}. You’ll need this before publishing or adding payouts.`}
      footer={
        <p className="text-center text-sm text-ink-soft">
          Wrong account?{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <Field
          label="Verification code"
          value={code}
          onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          required
          autoComplete="one-time-code"
          placeholder="6-digit code"
          helperText="Code expires in 15 minutes."
        />
        <AuthSubmitButton disabled={submitting}>
          {submitting ? "Verifying..." : "Verify email"}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResend()}
          className="font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </p>

      {user.has_store ? (
        <p className="mt-4 text-center text-sm text-ink-soft">
          <Link href="/admin" className="font-medium text-primary hover:underline">
            Continue to dashboard
          </Link>{" "}
          — you can verify later.
        </p>
      ) : (
        <p className="mt-4 text-center text-sm text-ink-soft">
          <Link href="/admin/onboarding" className="font-medium text-primary hover:underline">
            Continue store setup
          </Link>{" "}
          — you can verify later.
        </p>
      )}
    </AuthShell>
  );
}
