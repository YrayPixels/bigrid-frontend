import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { BizgridLogo } from "@/components/bizgrid-logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AuthShowcase />

      <div className="flex min-h-screen w-full flex-col bg-card lg:w-1/2">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-16 xl:px-24">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/">
              <BizgridLogo size={28} showWordmark wordmarkClassName="text-base" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-ink-soft transition hover:text-ink"
            >
              Back to website
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-ink-soft">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthShowcase() {
  return (
    <div className="relative hidden min-h-screen w-1/2 overflow-hidden bg-gradient-hero lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0/0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,oklch(0.35_0.08_260/0.35),transparent_50%)]" />

      <div className="relative z-10 flex items-center justify-between p-8">
        <Link href="/">
          <BizgridLogo size={32} showWordmark wordmarkClassName="text-lg text-white" />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
        >
          Back to website
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-8 pb-12">
        <div className="relative h-[380px] w-full max-w-md">
          <div className="absolute left-0 top-4 w-44 animate-[float_6s_ease-in-out_infinite]">
            <ShowcaseCard title="Total orders" value="2,420" change="+18%" positive />
          </div>
          <div className="absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-[float_7s_ease-in-out_infinite_0.5s]">
              <ShowcaseChartCard />
            </div>
          </div>
          <div className="absolute bottom-2 right-0 w-44 animate-[float_6.5s_ease-in-out_infinite_1s]">
            <ShowcaseCard title="Store visitors" value="1,210" change="+12%" positive />
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 px-8 py-6">
        <p className="text-sm text-white/70">
          Launch your online store, accept payments, and grow with AI-powered tools.
        </p>
      </div>
    </div>
  );
}

function ShowcaseCard({
  title,
  value,
  change,
  positive,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-elevated backdrop-blur-sm">
      <p className="text-xs font-medium text-ink-soft">{title}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
      <div
        className={`mt-2 flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}
      >
        <TrendIcon className="h-3.5 w-3.5" />
        {change} vs last month
      </div>
      <div className="mt-3 flex h-8 items-end gap-1">
        {[40, 65, 45, 80, 55, 90, 70].map((height, index) => (
          <span
            key={index}
            className={`flex-1 rounded-sm ${positive ? "bg-emerald-400/70" : "bg-red-400/70"}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ShowcaseChartCard() {
  const bars = [35, 55, 40, 70, 50, 85, 60, 75, 45, 90, 65, 80];

  return (
    <div className="rounded-2xl border border-white/60 bg-white/95 p-5 shadow-elevated backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-soft">Revenue trend</p>
        <div className="flex gap-3 text-[10px] text-ink-soft">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            2024
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            2025
          </span>
        </div>
      </div>
      <div className="mt-4 flex h-28 items-end gap-1.5">
        {bars.map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/80 to-primary/40"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-ink-soft">
        {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-card px-3 text-muted-foreground">Or</span>
      </div>
    </div>
  );
}

export function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
  endAdornment,
  helperText,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  endAdornment?: ReactNode;
  helperText?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span className="relative block">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15 ${
            endAdornment ? "pr-10" : ""
          }`}
        />
        {endAdornment ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">{endAdornment}</span>
        ) : null}
      </span>
      {helperText ? <span className="mt-1.5 block text-xs text-ink-soft">{helperText}</span> : null}
    </label>
  );
}

export function AuthSubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.09-1.92 3.29-4.75 3.29-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !API_BASE;

export function getGoogleAuthUrl(): string | null {
  if (USE_MOCKS) return null;
  return `${API_BASE}/storehause/auth/google`;
}

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const googleAuthUrl = getGoogleAuthUrl();

  if (!googleAuthUrl) return null;

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = googleAuthUrl;
      }}
      className="flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-ink transition hover:bg-muted"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

export function GoogleAuthFooter({ label = "Continue with Google" }: { label?: string }) {
  if (!getGoogleAuthUrl()) return null;

  return (
    <>
      <AuthDivider />
      <GoogleSignInButton label={label} />
    </>
  );
}
