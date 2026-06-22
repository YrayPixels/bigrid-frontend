import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    num: "01 / Catalog",
    title: "AI Catalog Management",
    body: "Upload a single photo and Storehaus generates descriptions, tags, and variants for every product in your niche.",
  },
  {
    num: "02 / Identity",
    title: "Instant Art Direction",
    body: "Our models don't just pick colors; they build custom design systems tailored to your brand's unique energy.",
  },
  {
    num: "03 / Scale",
    title: "Global Operations",
    body: "Built-in tax compliance, multicurrency checkout, and integrated shipping partners for immediate scaling.",
  },
] as const;

const SHOWCASE_SHOPS = [
  {
    name: "Sable & Stitch",
    category: "LUXURY RETAIL",
    image: "/landing/shop-leather.jpg",
    alt: "Sable & Stitch storefront",
  },
  {
    name: "Forma Studio",
    category: "HOME & OBJECTS",
    image: "/landing/shop-ceramic.jpg",
    alt: "Forma Studio storefront",
  },
] as const;

const PREVIEW_IMAGES = [
  {
    src: "/landing/preview-candle.jpg",
    alt: "Generated candle product",
    className: "aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden relative group",
    showProgress: true,
  },
  {
    src: "/landing/preview-perfume.jpg",
    alt: "Editorial perfume layout",
    className: "aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden hidden md:block",
    showProgress: false,
  },
  {
    src: "/landing/preview-gallery.jpg",
    alt: "Product gallery grid",
    className: "aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden hidden md:block",
    showProgress: false,
  },
  {
    src: "/landing/preview-checkout.jpg",
    alt: "Checkout flow interface",
    className: "aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden",
    showProgress: false,
  },
] as const;

export function LandingPage() {
  return (
    <div className="landing-theme min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-foreground/10 bg-background/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-display text-2xl font-black italic tracking-tighter"
          >
            Storehaus
          </Link>
          <div className="hidden gap-6 text-sm font-medium text-foreground/60 md:flex">
            <a href="#platform" className="transition-colors hover:text-foreground">
              Platform
            </a>
            <a href="#showcase" className="transition-colors hover:text-foreground">
              Showcase
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-medium">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-primary"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center">
          <div className="animate-reveal mb-8 inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            AI Commerce Engine v2.0
          </div>
          <h1 className="animate-reveal font-display mb-8 text-6xl leading-[0.9] font-medium tracking-tight text-balance [animation-delay:100ms] md:text-8xl">
            Your product idea, <br />
            <span className="font-normal italic">instantly</span> retail-ready.
          </h1>
          <p className="animate-reveal mx-auto mb-10 max-w-xl text-lg text-pretty text-foreground/60 [animation-delay:200ms]">
            Storehaus generates high-conversion storefronts, handles your global payments, and
            scales your inventory automatically.
          </p>
          <div className="animate-reveal flex flex-col items-center justify-center gap-4 [animation-delay:300ms] sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-primary px-8 py-4 text-lg font-medium text-primary-foreground transition-all ring-primary/20 hover:ring-4 sm:w-auto"
            >
              Generate your store
            </Link>
            <a
              href="#showcase"
              className="w-full rounded-full border border-foreground/10 px-8 py-4 text-lg font-medium transition-all hover:bg-foreground/5 sm:w-auto"
            >
              View examples
            </a>
          </div>
        </section>

        <section className="animate-reveal px-6 py-12 [animation-delay:400ms]">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-foreground/10 bg-white shadow-xl">
            <div className="flex flex-col items-center gap-4 bg-stone-50/50 p-6 md:flex-row">
              <div className="flex w-full flex-1 items-center gap-3 rounded-xl border border-foreground/10 bg-white px-4 py-3">
                <span className="font-mono text-primary">/</span>
                <input
                  type="text"
                  readOnly
                  value="A luxury candle brand called 'Lueur' inspired by brutalist architecture"
                  className="w-full border-none bg-transparent font-sans text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-2 font-mono text-xs whitespace-nowrap text-foreground/60 uppercase">
                Processing <span className="text-foreground">Styles…</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
              {PREVIEW_IMAGES.map((preview) => (
                <div key={preview.src} className={preview.className}>
                  <Image
                    src={preview.src}
                    alt={preview.alt}
                    width={640}
                    height={832}
                    className="h-full w-full object-cover"
                  />
                  {preview.showProgress ? (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent p-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                        <div className="animate-line h-full bg-primary" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="platform"
          className="mx-auto max-w-6xl border-t border-foreground/10 px-6 py-24"
        >
          <div className="grid gap-12 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.num} className="space-y-4">
                <span className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
                  {feature.num}
                </span>
                <h3 className="font-display text-2xl">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-foreground/60">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="showcase" className="bg-foreground py-24 text-background">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 flex items-end justify-between">
              <h2 className="font-display text-5xl leading-none italic">Live Shops</h2>
              <p className="max-w-[24ch] font-mono text-sm text-background/60">
                Join 12,000+ brands selling with Storehaus technology.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {SHOWCASE_SHOPS.map((shop) => (
                <div key={shop.name} className="group cursor-crosshair">
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-white/5">
                    <Image
                      src={shop.image}
                      alt={shop.alt}
                      width={1280}
                      height={832}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-xl">{shop.name}</span>
                    <span className="font-mono text-xs opacity-50">{shop.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="pricing" className="border-t border-foreground/10 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-12 md:flex-row">
          <div className="space-y-4">
            <span className="font-display text-xl font-bold tracking-tighter italic">
              Storehaus
            </span>
            <p className="max-w-[30ch] text-xs text-foreground/60">
              The future of autonomous commerce. Built for the next generation of merchants.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-16">
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-foreground/60 uppercase">Platform</span>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#platform" className="transition-colors hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#showcase" className="transition-colors hover:text-primary">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-primary">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-foreground/60 uppercase">Support</span>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#platform" className="transition-colors hover:text-primary">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="mailto:support@storehaus.ai" className="transition-colors hover:text-primary">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-primary">
                    Legal
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl items-center justify-between border-t border-foreground/10 pt-8 font-mono text-[10px] text-foreground/60">
          <span>© {new Date().getFullYear()} STOREHAUS AI INC.</span>
          <span>EST. BERLIN / NYC</span>
        </div>
      </footer>
    </div>
  );
}
