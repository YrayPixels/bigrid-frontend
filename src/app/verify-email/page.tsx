"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { isEmailVerified, type User } from "@/lib/api/types";
import { AuthShell, AuthSubmitButton, Field } from "@/components/auth-shell";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, setUser, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user && isEmailVerified(user)) {
      router.replace(user.has_store ? "/admin" : "/admin/onboarding");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function finishVerified(nextUser: User, message = "Email verified") {
    setUser(nextUser);
    toast.success(message);
    router.replace(nextUser.has_store ? "/admin" : "/admin/onboarding");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.verifyEmail({ code: code.trim() });
      finishVerified(
        res.user,
        res.message === "Email already verified." ? "Email already verified" : "Email verified",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify email");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      const res = await api.resendEmailVerification();
      if (res.user && isEmailVerified(res.user)) {
        finishVerified(res.user, "Email already verified");
        return;
      }
      if (res.email_verification_sent === false) {
        toast.error(res.message || "We could not send the email. Try again or contact support.");
        return;
      }
      setResendCooldown(60);
      toast.success("Verification code sent — check your inbox and spam folder");
    } catch (error) {
      const err = error as { status?: number; message?: string };
      if (err?.status === 429) {
        setResendCooldown(60);
        toast.error("Please wait a minute before requesting another code");
      } else if (err?.status === 503) {
        toast.error(err.message || "We could not send the email. Try again or contact support.");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not resend code");
      }
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
          helperText="Code expires in 15 minutes. Check spam if you don’t see it."
        />
        <AuthSubmitButton disabled={submitting}>
          {submitting ? "Verifying..." : "Verify email"}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          disabled={resending || resendCooldown > 0}
          onClick={() => void handleResend()}
          className="font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {resending
            ? "Sending..."
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend code"}
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
