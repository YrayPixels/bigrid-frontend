"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { isEmailVerified, postAuthPath } from "@/lib/api/types";
import {
  AuthShell,
  AuthSubmitButton,
  Field,
  GoogleAuthFooter,
} from "@/components/auth-shell";
import { loadGuestPreview } from "@/lib/guest-preview-storage";
import { trackPlatformEvent } from "@/lib/analytics/platform-events";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPreview = searchParams.get("from") === "preview";
  const fromAd = searchParams.get("from") === "ad";
  const { user, loading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewShopName, setPreviewShopName] = useState<string | null>(null);

  useEffect(() => {
    if (!fromPreview) return;
    const guest = loadGuestPreview();
    setPreviewShopName(guest?.store.business_name ?? null);
  }, [fromPreview]);

  useEffect(() => {
    if (!loading && user) {
      if (!isEmailVerified(user)) {
        router.replace("/verify-email");
        return;
      }
      router.replace(postAuthPath(user));
    }
  }, [user, loading, router]);

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
      await api.register({ name, email, password });
      if (fromPreview) {
        trackPlatformEvent("preview_signup_completed", { source: "signup" });
      } else if (fromAd) {
        trackPlatformEvent("ad_signup_completed", { source: "signup" });
      }
      await refresh();
      toast.success("Account created. Check your email for a verification code.");
      router.replace("/verify-email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={fromPreview ? "Keep your store" : fromAd ? "Start your free trial" : "Join us"}
      subtitle={
        fromPreview
          ? previewShopName
            ? `Save ${previewShopName} with a free account — then keep editing, take payments, and publish.`
            : "Save this preview with a free account so you don't lose it."
          : fromAd
            ? "Describe your shop after signup and Bizgrid builds your storefront — payments, orders, and WhatsApp tools included."
            : "14-day free trial — no card required."
      }
      footer={
        <p className="text-center text-xs leading-relaxed text-ink-soft">
          By signing up, I confirm that I have read and agree to Bizgrid&apos;s{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <GoogleAuthFooter label="Sign up with Google" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" value={name} onChange={setName} required autoComplete="name" />
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
          autoComplete="new-password"
          helperText="At least 8 characters."
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
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
          placeholder="Re-enter your password"
          endAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="text-ink-soft transition hover:text-ink"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <AuthSubmitButton disabled={submitting}>
          {submitting
            ? "Creating account..."
            : fromPreview
              ? "Keep this store"
              : fromAd
                ? "Start free trial"
                : "Continue"}
        </AuthSubmitButton>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
