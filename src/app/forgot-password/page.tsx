"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { AuthShell, AuthSubmitButton, Field } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.requestPasswordReset({ email });
      toast.success(res.message);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request reset code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a 6-digit code to reset your password.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
        <AuthSubmitButton disabled={submitting}>
          {submitting ? "Sending code..." : "Send reset code"}
        </AuthSubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

