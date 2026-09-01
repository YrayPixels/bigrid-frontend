"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { storefrontApi } from "@/lib/api/storefront";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BIZFEST_FOUNDING_PARTNER_PLACEHOLDERS,
  BIZFEST_PARTNERS_HREF,
  BIZFEST_SPONSORS_HREF,
  BIZFEST_SIGNUP_HREF,
} from "@/lib/marketing/bizfest-signup";
import { trackPlatformEvent } from "@/lib/analytics/platform-events";

const PRIZES = [
  { place: "Champion", amount: "₦2.5M" },
  { place: "Runner-up", amount: "₦1.5M" },
  { place: "Third", amount: "₦1M" },
  { place: "Next 10", amount: "₦100k each" },
] as const;

const REQUIREMENTS = [
  "Create a free Bizgrid account and store",
  "Add at least 5 products and complete your profile",
  "Publish your store and make your first sale",
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
  { href: "#about", label: "About" },
  { href: "#prizes-detail", label: "Prizes" },
  { href: "#partners", label: "Partners" },
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

type PartnerMarqueeItem =
  | {
      kind: "partner";
      id: number;
      name: string;
      label: string | null;
      logo_url: string | null;
      website_url: string | null;
    }
  | { kind: "placeholder"; label: string };

function buildPartnerMarqueeItems(
  partners: Array<{
    id: number;
    name: string;
    label: string | null;
    logo_url: string | null;
    website_url: string | null;
  }>,
): PartnerMarqueeItem[] {
  if (partners.length === 0) {
    return BIZFEST_FOUNDING_PARTNER_PLACEHOLDERS.map((label) => ({ kind: "placeholder", label }));
  }

  const items: PartnerMarqueeItem[] = partners.map((partner) => ({
    kind: "partner",
    ...partner,
  }));

  while (items.length < 6) {
    items.push(
      ...partners.map((partner) => ({
        kind: "partner" as const,
        ...partner,
      })),
    );
  }

  return items;
}

function PartnerSlotCard({ item }: { item: PartnerMarqueeItem }) {
  if (item.kind === "partner") {
    const inner = (
      <div
        className="flex h-[5.5rem] w-[9.5rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-border bg-canvas px-3 py-3 text-center sm:w-[10.5rem]"
      >
        {item.logo_url ? (
          <img
            src={item.logo_url}
            alt={item.name}
            className="h-8 max-w-full object-contain sm:h-9"
          />
        ) : (
          <span className="font-modern-sans text-sm font-bold leading-tight text-ink">{item.name}</span>
        )}
        {item.label ? (
          <span className="mt-1.5 text-[10px] font-medium text-ink-soft sm:text-xs">{item.label}</span>
        ) : null}
      </div>
    );

    if (item.website_url) {
      return (
        <a
          href={item.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:opacity-80"
        >
          {inner}
        </a>
      );
    }

    return inner;
  }

  return (
    <div
      className="flex h-[5.5rem] w-[9.5rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-canvas px-3 py-4 text-center sm:w-[10.5rem]"
    >
      <span className="font-modern-sans text-[10px] font-semibold tracking-[0.14em] text-ink-soft/70 uppercase sm:text-[11px]">
        Partner slot
      </span>
      <span className="mt-1.5 text-xs font-medium text-ink-soft sm:text-sm">{item.label}</span>
    </div>
  );
}

export function BizFestLandingPage() {
  const [marqueeItems, setMarqueeItems] = useState<PartnerMarqueeItem[]>(() =>
    buildPartnerMarqueeItems([]),
  );

  useEffect(() => {
    trackPlatformEvent("bizfest_landing_viewed", { source: "grants" });
    storefrontApi
      .listBizfestPartners()
      .then((response) => {
        if (response?.data) {
          setMarqueeItems(buildPartnerMarqueeItems(response.data));
        }
      })
      .catch(() => {
        /* keep placeholders */
      });
  }, []);

  const marqueeTrack = useMemo(
    () => [...marqueeItems, ...marqueeItems],
    [marqueeItems],
  );

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
          -webkit-text-stroke: 1.75px var(--ink);
          paint-order: stroke fill;
        }
        @media (min-width: 640px) {
          .bizfest-outline {
            -webkit-text-stroke: 4px var(--ink);
          }
        }
        @media (max-width: 639px) {
          .bizfest-tag {
            transform: none !important;
          }
        }
        @keyframes bizfest-partner-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .bizfest-partner-marquee-track {
          display: flex;
          width: max-content;
          animation: bizfest-partner-marquee 36s linear infinite;
        }
        .bizfest-partner-marquee:hover .bizfest-partner-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .bizfest-partner-marquee-track {
            animation: none;
            width: 100%;
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>

      <NetworkPattern className="pointer-events-none absolute -top-8 -right-16 h-[320px] w-[320px] text-primary/25 sm:h-[420px] sm:w-[420px]" />
      <NetworkPattern className="pointer-events-none absolute -bottom-10 -left-20 h-[280px] w-[280px] rotate-180 text-primary/20 sm:h-[380px] sm:w-[380px]" />

      {/* Floating pill nav */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-full border border-border/60 bg-canvas-raised px-3 py-2 shadow-soft sm:gap-4 sm:px-6 sm:py-3">
          <Link
            href="/"
            className="font-modern-sans flex min-w-0 shrink items-center gap-2 text-sm font-bold tracking-tight text-ink sm:text-base"
          >
            <BrandChip
              label="BizFest 1.0"
              className="inline-flex items-center gap-1 sm:gap-1.5"
              labelClassName="tracking-tight truncate"
            />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-ink">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle className="h-9 w-9 border-border/60" />
            <Link
              href={BIZFEST_SIGNUP_HREF}
              onClick={() => trackApplyClick("nav")}
              className="rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 sm:px-5"
            >
              Apply
            </Link>
          </div>
        </nav>
      </header>

      <main className="pb-20 sm:pb-0">
        <section className="relative flex min-h-[100svh] flex-col">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-[11.5rem] pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32">
            <div className="bizfest-rise inline-flex items-center rounded-full border border-border bg-canvas-raised px-3.5 py-1.5 shadow-soft">
              <BrandChip
                label="BizFest 1.0"
                className="font-modern-sans inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink sm:text-xs"
              />
            </div>

            <h1 className="bizfest-rise-2 font-modern-sans relative mt-5 w-full max-w-[20ch] text-[2.55rem] leading-[0.9] font-bold tracking-[-0.04em] uppercase sm:mt-8 sm:max-w-none sm:text-[5.25rem] md:text-[6.5rem] lg:text-[8rem]">
              <span className="block text-ink">Build. Sell.</span>
              <span className="relative mt-1 block">
                <span className="bizfest-outline">Grow. Win.</span>
                <GrowthMark className="bizfest-float pointer-events-none absolute top-1/2 right-[2%] hidden h-24 w-[4.75rem] -translate-y-[62%] sm:right-[8%] sm:block sm:h-32 sm:w-28 md:right-[10%] md:h-40 md:w-36 lg:h-48 lg:w-40" />
              </span>
            </h1>

            <p className="bizfest-rise-3 mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-soft sm:mt-8 sm:text-base md:text-lg">
              Join BizFest — Nigeria&apos;s business growth festival for sellers ready to go online.
              Build on Bizgrid, compete on growth, and win from a ₦6,000,000 prize pool.
            </p>

            <div className="bizfest-rise-4 mt-7 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href={BIZFEST_SIGNUP_HREF}
                onClick={() => trackApplyClick("hero")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#about"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-ink bg-transparent px-8 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                Learn more
              </a>
            </div>
          </div>

          <div
            id="prizes"
            className="absolute inset-x-0 bottom-16 z-20 bg-panel px-3 py-3.5 sm:bottom-0 sm:px-6 sm:py-5"
          >
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-8">
              <p className="font-modern-sans text-[10px] font-semibold tracking-[0.16em] text-panel-foreground/50 uppercase sm:text-xs sm:tracking-[0.18em]">
                ₦6,000,000 prize pool
              </p>
              <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8">
                {PRIZES.map((prize) => (
                  <div
                    key={prize.place}
                    className="flex items-baseline justify-center gap-1.5 text-panel-foreground sm:justify-start sm:gap-2"
                  >
                    <span className="font-modern-sans text-sm font-bold sm:text-xl">{prize.amount}</span>
                    <span className="text-[10px] text-panel-foreground/45 sm:text-xs">{prize.place}</span>
                  </div>
                ))}
              </div>
              <p className="hidden text-xs text-panel-foreground/40 lg:block">Powered by Bizgrid</p>
            </div>
          </div>
        </section>

        <section className="relative bg-canvas px-3 pt-16 pb-8 sm:px-6 sm:pt-24 sm:pb-14 lg:pt-28 lg:pb-16">
          <div className="relative mx-auto max-w-[90rem]">
            <div className="relative overflow-visible rounded-[1.5rem] bg-panel sm:rounded-[2.75rem]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem] sm:rounded-[2.75rem]">
                <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              </div>

              <div className="relative grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
                {/* Cutout — smaller on mobile, pops on desktop */}
                <div className="relative z-10 mx-auto -mt-8 flex w-full max-w-[14rem] items-end justify-center px-2 sm:-mt-10 sm:max-w-[18rem] lg:mx-0 lg:-mt-20 lg:mb-0 lg:max-w-[30rem] lg:justify-start lg:self-end lg:px-0 xl:max-w-[34rem]">
                  <div className="relative aspect-[1254/1791] w-full lg:translate-y-1">
                    <Image
                      src="/landing/bizfest-who.png"
                      alt="Seller shopping and selling online with BizFest"
                      width={1254}
                      height={1791}
                      quality={95}
                      className="h-auto w-full object-contain drop-shadow-[0_28px_50px_rgba(0,0,0,0.45)]"
                      sizes="(max-width: 1024px) 56vw, 34rem"
                      priority
                    />
                  </div>
                </div>

                <div className="relative z-10 px-5 pb-8 pt-5 text-center sm:px-10 sm:pb-12 sm:pt-8 sm:text-left lg:py-16 lg:pr-16 lg:pl-6 lg:text-left xl:pr-20">
                  <div className="inline-flex items-center rounded-full border border-panel-foreground/30 px-3.5 py-1.5">
                    <BrandChip
                      label="Who it's for"
                      className="font-modern-sans inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-panel-foreground sm:text-xs"
                    />
                  </div>

                  <h2 className="font-modern-sans mx-auto mt-4 max-w-[14ch] text-[2.15rem] leading-[0.98] font-bold tracking-tight text-panel-foreground sm:mx-0 sm:mt-6 sm:text-5xl md:text-6xl lg:text-[4.5rem]">
                    Who is BizFest for?
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-panel-foreground/75 sm:mx-0 sm:mt-5 sm:text-base md:text-lg">
                    Already selling on WhatsApp, Instagram, or in person — but don&apos;t have a
                    proper online store yet? That&apos;s your seat at BizFest.
                  </p>

                  <ul className="mt-7 flex max-w-xl flex-wrap content-start justify-center gap-x-2.5 gap-y-3 sm:mt-10 sm:justify-start sm:gap-x-4 sm:gap-y-5">
                    {AUDIENCE_TAGS.map((tag) => (
                      <li
                        key={tag.label}
                        className="bizfest-tag rounded-2xl bg-canvas-raised px-3.5 py-2 text-xs font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] sm:px-5 sm:py-3 sm:text-[15px]"
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

        <section id="about" className="scroll-mt-24 border-t border-border bg-canvas px-4 py-14 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                About BizFest
              </p>
              <h2 className="font-modern-sans mt-3 text-[1.75rem] font-bold tracking-tight text-ink sm:text-4xl">
                A growth festival for sellers going online
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                BizFest helps Nigerian small businesses that already sell — on WhatsApp, Instagram,
                or in person — build a proper online store on Bizgrid, grow real sales, and compete
                for funding. Free to join. Powered by Bizgrid.
              </p>
            </div>

            <div id="prizes-detail" className="scroll-mt-24 mt-12 sm:mt-16">
              <p className="text-center font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                Prize pool
              </p>
              <p className="font-modern-sans mt-2 text-center text-4xl font-bold tracking-tight text-ink sm:text-5xl md:text-6xl">
                ₦6,000,000
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                {PRIZES.map((prize) => (
                  <div
                    key={prize.place}
                    className="border-t-2 border-primary bg-canvas-raised px-4 py-5 text-center sm:px-5 sm:py-6"
                  >
                    <p className="font-modern-sans text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                      {prize.amount}
                    </p>
                    <p className="mt-1 text-xs font-medium tracking-wide text-ink-soft uppercase sm:text-sm">
                      {prize.place}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-12 max-w-xl sm:mt-16">
              <p className="text-center font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                To qualify
              </p>
              <h3 className="font-modern-sans mt-2 text-center text-xl font-bold text-ink sm:text-2xl">
                Simple requirements
              </h3>
              <ul className="mt-6 space-y-3">
                {REQUIREMENTS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-b border-border pb-3 text-sm text-ink last:border-b-0 sm:text-base"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-center text-xs text-ink-soft sm:text-sm">
                Registration alone isn&apos;t enough — you need an activated store with a real sale.
              </p>
            </div>

            <div className="mt-10 text-center sm:mt-12">
              <Link
                href={BIZFEST_SIGNUP_HREF}
                onClick={() => trackApplyClick("eligibility")}
                className="inline-flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:w-auto"
              >
                Apply for BizFest
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="partners"
          className="scroll-mt-24 border-t border-border bg-canvas-raised px-4 py-14 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                Partners &amp; sponsors
              </p>
              <h2 className="font-modern-sans mt-3 text-[1.75rem] font-bold tracking-tight text-ink sm:text-4xl">
                Backing Nigerian SMEs
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                BizFest is backed by partners who believe in Nigerian SMEs — funding the festival, amplifying
                reach, and showcasing brands at the conference &amp; expo.
              </p>
            </div>

            <div className="mt-10 sm:mt-12">
              <p className="text-center font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
                Founding partners
              </p>
              <div className="bizfest-partner-marquee relative mt-6">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-canvas-raised to-transparent sm:w-16"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-canvas-raised to-transparent sm:w-16"
                  aria-hidden
                />
                <div className="overflow-hidden">
                  <div className="bizfest-partner-marquee-track gap-3 px-3 sm:gap-4 sm:px-4">
                    {marqueeTrack.map((item, index) => (
                      <PartnerSlotCard
                        key={
                          item.kind === "partner"
                            ? `partner-${item.id}-${index}`
                            : `placeholder-${item.label}-${index}`
                        }
                        item={item}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center">
              <Link
                href={BIZFEST_SPONSORS_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Sponsor BizFest
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={BIZFEST_PARTNERS_HREF}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-ink bg-transparent px-8 text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                Partner with us
              </Link>
            </div>
            <p className="mt-4 text-center text-xs text-ink-soft">
              Sponsors can also book{" "}
              <Link href={`${BIZFEST_SPONSORS_HREF}?focus=booth`} className="font-medium text-ink hover:text-primary">
                expo booths
              </Link>
              {" and "}
              <Link href={`${BIZFEST_SPONSORS_HREF}?focus=space`} className="font-medium text-ink hover:text-primary">
                exhibition spaces
              </Link>
              {" at the conference."}
            </p>
          </div>
        </section>

        <section id="finale" className="scroll-mt-24 bg-panel px-4 py-14 text-panel-foreground sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
              The grand finale
            </p>
            <h2 className="font-modern-sans mt-3 text-[1.75rem] font-bold tracking-tight sm:text-4xl">
              BizFest Conference &amp; Expo
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-panel-foreground/60 sm:text-base">
              Top 10 businesses pitch live. Keynotes, masterclasses, networking, and a merchant expo
              — then ₦6,000,000 in prizes. Top 13 merchants win.
            </p>
            <Link
              href={BIZFEST_SIGNUP_HREF}
              onClick={() => trackApplyClick("footer")}
              className="mt-8 inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:w-auto"
            >
              Apply for BizFest
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-panel-foreground/40">Free to join · No card required</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-panel-foreground/10 bg-panel px-4 py-6 text-center sm:px-6">
        <p className="text-xs text-panel-foreground/35">
          © {new Date().getFullYear()} Bizgrid ·{" "}
          <Link href="/terms" className="hover:text-panel-foreground/70">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-panel-foreground/70">
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
