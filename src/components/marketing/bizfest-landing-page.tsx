"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { BIZFEST_SIGNUP_HREF } from "@/lib/marketing/bizfest-signup";
import { trackPlatformEvent } from "@/lib/analytics/platform-events";

const PRIZES = [
  { place: "Champion", amount: "₦2.5M" },
  { place: "Runner-up", amount: "₦1.5M" },
  { place: "Third", amount: "₦1M" },
  { place: "Next 10", amount: "₦100k each" },
] as const;

const ELIGIBILITY_STEPS = [
  { step: "01", title: "Create your account", body: "Sign up for Bizgrid — free to join." },
  { step: "02", title: "Build your store", body: "Launch an online storefront in minutes." },
  { step: "03", title: "Add 5+ products", body: "List what you already sell." },
  { step: "04", title: "Complete your profile", body: "Tell customers who you are." },
  { step: "05", title: "Publish your store", body: "Go live and share your link." },
  { step: "06", title: "Make your first sale", body: "One transaction makes you official." },
] as const;

const AUDIENCE_TAGS = [
  { label: "Fashion brands", rotate: "-8deg", x: "0", y: "0" },
  { label: "Beauty & cosmetics", rotate: "5deg", x: "0.5rem", y: "0.25rem" },
  { label: "Food businesses", rotate: "3deg", x: "-0.25rem", y: "0" },
  { label: "Electronics", rotate: "-6deg", x: "0.75rem", y: "-0.15rem" },
  { label: "Home & lifestyle", rotate: "7deg", x: "0", y: "0.2rem" },
  { label: "WhatsApp sellers", rotate: "-4deg", x: "0.35rem", y: "0" },
  { label: "Instagram shops", rotate: "6deg", x: "-0.15rem", y: "0.15rem" },
  { label: "Small retailers", rotate: "-5deg", x: "0.5rem", y: "-0.1rem" },
  { label: "Service businesses", rotate: "4deg", x: "0", y: "0.25rem" },
] as const;

const NAV_LINKS = [
  { href: "#prizes", label: "Prizes" },
  { href: "#how", label: "How it works" },
  { href: "#finale", label: "Conference" },
] as const;

function BrandChip({
  label,
  className,
  labelClassName,
}: {
  label: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <span className={className}>
      <ShoppingBag className="h-3.5 w-3.5 text-primary" aria-hidden strokeWidth={2.25} />
      <span className={labelClassName}>{label}</span>
      <ShoppingBag className="h-3.5 w-3.5 text-accent" aria-hidden strokeWidth={2.25} />
    </span>
  );
}

type CtaSource = "hero" | "nav" | "sticky" | "eligibility" | "footer";

function trackApplyClick(source: CtaSource) {
  trackPlatformEvent("bizfest_apply_clicked", { source, once: false });
}

function NetworkPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.45">
        <line x1="40" y1="60" x2="120" y2="40" />
        <line x1="120" y1="40" x2="200" y2="90" />
        <line x1="200" y1="90" x2="280" y2="50" />
        <line x1="280" y1="50" x2="360" y2="110" />
        <line x1="40" y1="60" x2="80" y2="140" />
        <line x1="120" y1="40" x2="160" y2="160" />
        <line x1="200" y1="90" x2="240" y2="180" />
        <line x1="280" y1="50" x2="320" y2="160" />
        <line x1="80" y1="140" x2="160" y2="160" />
        <line x1="160" y1="160" x2="240" y2="180" />
        <line x1="240" y1="180" x2="320" y2="160" />
        <line x1="80" y1="140" x2="60" y2="240" />
        <line x1="160" y1="160" x2="140" y2="280" />
        <line x1="240" y1="180" x2="260" y2="300" />
        <line x1="320" y1="160" x2="360" y2="260" />
        <line x1="60" y1="240" x2="140" y2="280" />
        <line x1="140" y1="280" x2="260" y2="300" />
        <line x1="260" y1="300" x2="360" y2="260" />
        <line x1="140" y1="280" x2="100" y2="360" />
        <line x1="260" y1="300" x2="300" y2="370" />
      </g>
      <g fill="currentColor">
        {[
          [40, 60],
          [120, 40],
          [200, 90],
          [280, 50],
          [360, 110],
          [80, 140],
          [160, 160],
          [240, 180],
          [320, 160],
          [60, 240],
          [140, 280],
          [260, 300],
          [360, 260],
          [100, 360],
          [300, 370],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
        ))}
      </g>
    </svg>
  );
}

function GrowthMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 200"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="28" y="78" width="104" height="90" rx="10" fill="var(--ink)" />
      <rect x="40" y="94" width="32" height="28" rx="4" fill="var(--canvas-raised)" />
      <rect x="88" y="94" width="32" height="28" rx="4" fill="var(--canvas-raised)" />
      <rect x="58" y="132" width="44" height="36" rx="4" fill="var(--primary)" />
      <path d="M22 78h116l-10-22H32L22 78Z" fill="var(--accent)" />
      <path d="M32 56h96v6H32z" fill="var(--ink)" />
      <path
        d="M78 70V18M78 18l-18 18M78 18l18 18"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="118" cy="42" r="8" fill="var(--accent)" />
      <circle cx="42" cy="36" r="5" fill="var(--primary)" />
    </svg>
  );
}

export function BizFestLandingPage() {
  useEffect(() => {
    trackPlatformEvent("bizfest_landing_viewed", { source: "grants" });
  }, []);

  return (
    <div className="bizfest relative min-h-screen overflow-x-hidden bg-canvas font-sans text-ink selection:bg-primary/20">
      <style>{`
        @keyframes bizfest-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bizfest-float {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50% { transform: translateY(-10px) rotate(-6deg); }
        }
        .bizfest-rise { animation: bizfest-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .bizfest-rise-2 { animation: bizfest-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both; }
        .bizfest-rise-3 { animation: bizfest-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both; }
        .bizfest-rise-4 { animation: bizfest-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both; }
        .bizfest-float { animation: bizfest-float 4.5s ease-in-out infinite; }
        .bizfest-outline {
          color: transparent;
          -webkit-text-stroke: 2.5px var(--ink);
          paint-order: stroke fill;
        }
        @media (min-width: 640px) {
          .bizfest-outline {
            -webkit-text-stroke: 4px var(--ink);
          }
        }
      `}</style>

      <NetworkPattern className="pointer-events-none absolute -top-8 -right-16 h-[320px] w-[320px] text-primary/25 sm:h-[420px] sm:w-[420px]" />
      <NetworkPattern className="pointer-events-none absolute -bottom-10 -left-20 h-[280px] w-[280px] rotate-180 text-primary/20 sm:h-[380px] sm:w-[380px]" />

      {/* Floating pill nav */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border border-border/60 bg-canvas-raised px-4 py-2.5 shadow-soft sm:px-6 sm:py-3">
          <Link
            href="/"
            className="font-modern-sans flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-ink sm:text-base"
          >
            <BrandChip
              label="BizFest 1.0"
              className="inline-flex items-center gap-1.5"
              labelClassName="tracking-tight"
            />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-ink">
                {link.label}
              </a>
            ))}
          </div>
          <Link
            href={BIZFEST_SIGNUP_HREF}
            onClick={() => trackApplyClick("nav")}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 sm:px-5"
          >
            Apply
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative flex min-h-[100svh] flex-col">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-28 pt-28 text-center sm:px-6 sm:pb-32 sm:pt-32">
            <div className="bizfest-rise inline-flex items-center rounded-full border border-border bg-canvas-raised px-3.5 py-1.5 shadow-soft">
              <BrandChip
                label="BizFest 1.0"
                className="font-modern-sans inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink sm:text-xs"
              />
            </div>

            <h1 className="bizfest-rise-2 font-modern-sans relative mt-6 w-full text-[3.35rem] leading-[0.88] font-bold tracking-[-0.04em] uppercase sm:mt-8 sm:text-[5.25rem] md:text-[6.5rem] lg:text-[8rem]">
              <span className="block text-ink">Build. Sell.</span>
              <span className="relative mt-1 block">
                <span className="bizfest-outline">Grow. Win.</span>
                <GrowthMark className="bizfest-float pointer-events-none absolute top-1/2 right-[4%] h-24 w-[4.75rem] -translate-y-[62%] sm:right-[8%] sm:h-32 sm:w-28 md:right-[10%] md:h-40 md:w-36 lg:h-48 lg:w-40" />
              </span>
            </h1>

            <p className="bizfest-rise-3 mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ink-soft sm:mt-8 sm:text-base md:text-lg">
              Join BizFest — Nigeria&apos;s business growth festival for sellers ready to go online.
              Build on Bizgrid, compete on growth, and win from a ₦6,000,000 prize pool.
            </p>

            <div className="bizfest-rise-4 mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href={BIZFEST_SIGNUP_HREF}
                onClick={() => trackApplyClick("hero")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-ink bg-transparent px-8 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                How it works
              </a>
            </div>
          </div>

          <div
            id="prizes"
            className="absolute inset-x-0 bottom-16 z-20 bg-ink px-4 py-4 sm:bottom-0 sm:px-6 sm:py-5"
          >
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row sm:gap-8">
              <p className="font-modern-sans text-xs font-semibold tracking-[0.18em] text-primary-foreground/50 uppercase">
                ₦6,000,000 prize pool
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-8">
                {PRIZES.map((prize) => (
                  <div key={prize.place} className="flex items-baseline gap-2 text-primary-foreground">
                    <span className="font-modern-sans text-base font-bold sm:text-xl">{prize.amount}</span>
                    <span className="text-xs text-primary-foreground/45">{prize.place}</span>
                  </div>
                ))}
              </div>
              <p className="hidden text-xs text-primary-foreground/40 lg:block">Powered by Bizgrid</p>
            </div>
          </div>
        </section>

        <section className="relative bg-canvas px-3 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="relative mx-auto max-w-[90rem]">
            {/* Brand panel — overflow visible so the photo can break the frame */}
            <div className="relative overflow-visible rounded-[1.75rem] bg-ink sm:rounded-[2.75rem]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem] sm:rounded-[2.75rem]">
                <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              </div>

              <div className="relative grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
                {/* Cutout photo — overlaps the panel like the reference */}
                <div className="relative z-10 mx-auto w-[min(100%,22rem)] px-4 pt-6 sm:w-[min(100%,26rem)] lg:mx-0 lg:-my-14 lg:w-auto lg:max-w-none lg:self-stretch lg:px-0 lg:pt-0">
                  <div className="relative aspect-[3/4] w-full lg:ml-6 lg:h-[min(36rem,70vh)] lg:w-auto lg:max-w-[28rem] lg:aspect-auto xl:ml-10 xl:max-w-[32rem]">
                    <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] lg:rounded-[2rem]">
                      <Image
                        src="/landing/shop-leather.jpg"
                        alt="Seller ready to take their business online with BizFest"
                        fill
                        className="object-cover object-[center_18%]"
                        sizes="(max-width: 1024px) 90vw, 32rem"
                      />
                    </div>
                  </div>
                </div>

                {/* Copy + sticker tags */}
                <div className="relative z-10 px-6 pb-12 pt-8 sm:px-10 sm:pb-16 lg:py-16 lg:pr-16 lg:pl-6 xl:pr-20">
                  <div className="inline-flex items-center rounded-full border border-primary-foreground/30 px-3.5 py-1.5">
                    <BrandChip
                      label="Who it's for"
                      className="font-modern-sans inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-primary-foreground sm:text-xs"
                    />
                  </div>

                  <h2 className="font-modern-sans mt-5 max-w-[12ch] text-[2.75rem] leading-[0.95] font-bold tracking-tight text-primary-foreground sm:mt-6 sm:text-5xl md:text-6xl lg:text-[4.5rem]">
                    Who is BizFest for?
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/75 sm:mt-5 sm:text-base md:text-lg">
                    Already selling on WhatsApp, Instagram, or in person — but don&apos;t have a
                    proper online store yet? That&apos;s your seat at BizFest.
                  </p>

                  <ul className="mt-8 flex max-w-xl flex-wrap content-start gap-x-3 gap-y-4 sm:mt-10 sm:gap-x-4 sm:gap-y-5">
                    {AUDIENCE_TAGS.map((tag) => (
                      <li
                        key={tag.label}
                        className="rounded-2xl bg-canvas-raised px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] sm:px-5 sm:py-3 sm:text-[15px]"
                        style={{
                          transform: `translate(${tag.x}, ${tag.y}) rotate(${tag.rotate})`,
                        }}
                      >
                        {tag.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 border-t border-border bg-canvas px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                How it works
              </p>
              <h2 className="font-modern-sans mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Six steps to activate
              </h2>
              <p className="mt-3 text-sm text-ink-soft sm:text-base">
                Registration isn&apos;t enough. Complete every step to become an official BizFest
                participant.
              </p>
            </div>

            <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {ELIGIBILITY_STEPS.map((item) => (
                <li key={item.step} className="border-t border-border pt-4">
                  <span className="font-modern-sans text-xs font-bold tracking-wider text-primary">
                    {item.step}
                  </span>
                  <h3 className="font-modern-sans mt-2 text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 text-center">
              <Link
                href={BIZFEST_SIGNUP_HREF}
                onClick={() => trackApplyClick("eligibility")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Start with step 01
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="finale" className="scroll-mt-24 bg-ink px-4 py-16 text-primary-foreground sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
              The grand finale
            </p>
            <h2 className="font-modern-sans mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              BizFest Conference &amp; Expo
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60 sm:text-base">
              Top 10 businesses pitch live. Keynotes, masterclasses, networking, and a merchant expo
              — then ₦6,000,000 in prizes. Top 13 merchants win.
            </p>
            <Link
              href={BIZFEST_SIGNUP_HREF}
              onClick={() => trackApplyClick("footer")}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Apply for BizFest
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-primary-foreground/40">Free to join · No card required</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-primary-foreground/10 bg-ink px-4 py-6 text-center sm:px-6">
        <p className="text-xs text-primary-foreground/35">
          © {new Date().getFullYear()} Bizgrid ·{" "}
          <Link href="/terms" className="hover:text-primary-foreground/70">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-primary-foreground/70">
            Privacy
          </Link>
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-canvas-raised/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <Link
          href={BIZFEST_SIGNUP_HREF}
          onClick={() => trackApplyClick("sticky")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Apply Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
