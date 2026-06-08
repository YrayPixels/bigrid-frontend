"use client";

import { Leaf, Plus, ShieldCheck, Sparkles } from "lucide-react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const cosmeticsStats = [
  ["Trusted by over 350,000+ Clients", "worldwide since 2008"],
  ["6M+", "Worldwide Product sale per year"],
  ["4.6", "3,350 Rating Worldwide"],
];

const cosmeticsReasons = [
  {
    icon: Leaf,
    title: "Quality ingredients",
    body: "Botanical extracts and gentle actives selected for daily skin routines.",
  },
  {
    icon: ShieldCheck,
    title: "Clinically mindful",
    body: "Simple formulas designed to support skin comfort, glow, and consistency.",
  },
  {
    icon: Sparkles,
    title: "Clean finish",
    body: "Light textures that layer easily from cleanser to serum to moisturiser.",
  },
];

function Bottle({
  className = "",
  label = "COSME",
  size = "md",
}: {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "h-64 w-24" : size === "sm" ? "h-36 w-14" : "h-52 w-20";

  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-t-md bg-[#c89150]" />
      <div className="absolute left-1/2 top-7 h-3 w-10 -translate-x-1/2 bg-[#f2dfc9]" />
      <div className="absolute inset-x-0 bottom-0 top-9 rounded-b-[2rem] rounded-t-lg border border-[#e6ddcf] bg-gradient-to-b from-white to-[#f7f1e8] shadow-[0_18px_50px_rgba(91,70,49,0.12)]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[11px] font-semibold tracking-[0.28em] text-[#333]">
          {label}
        </div>
        <div className="absolute bottom-5 left-1/2 h-px w-8 -translate-x-1/2 bg-[#d8cdbc]" />
      </div>
    </div>
  );
}

function ProductPack({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative ${compact ? "h-52" : "h-[420px]"} w-full`}>
      <div className="absolute bottom-6 left-[10%] h-28 w-28 rounded-full bg-[#e5eadf]" />
      <div className="absolute bottom-12 left-[18%] h-36 w-28 rounded-t-[3rem] bg-[#f0dfca] shadow-[0_20px_40px_rgba(91,70,49,0.1)]" />
      <Bottle className="absolute bottom-8 left-[8%]" size={compact ? "sm" : "md"} />
      <Bottle className="absolute bottom-8 left-[27%]" size={compact ? "sm" : "lg"} />
      <Bottle className="absolute bottom-8 left-[49%]" size={compact ? "sm" : "md"} />
      {!compact ? (
        <>
          <div className="absolute right-[12%] top-8 h-40 w-28 bg-[#e9e1d5] shadow-[0_20px_40px_rgba(91,70,49,0.08)]">
            <div className="absolute inset-x-0 top-0 h-12 bg-[#d8d8d1]" />
            <div className="absolute left-1/2 top-20 h-px w-12 -translate-x-1/2 bg-[#b4aa99]" />
          </div>
          <div className="absolute bottom-10 left-[34%] h-24 w-20 rounded-t-[3rem] bg-[#f4e2ca] p-3 shadow-lg">
            <div className="h-16 rounded-t-[2rem] bg-[#8a9860]" />
          </div>
          <div className="absolute bottom-20 left-[39%] h-28 w-20">
            <span className="absolute bottom-0 left-8 h-24 w-5 rounded-full bg-[#9aa66b]" />
            <span className="absolute bottom-8 left-2 h-12 w-5 rotate-[-32deg] rounded-full bg-[#a8b47a]" />
            <span className="absolute bottom-10 right-2 h-14 w-5 rotate-[30deg] rounded-full bg-[#8d9c5d]" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function FaqPreview({ items }: { items: { question: string; answer: string }[] }) {
  const previewItems = items.length ? items.slice(0, 6) : [
    { question: "Can you ship overseas?", answer: "Yes, delivery options are shown at checkout." },
    { question: "How do I choose the right product?", answer: "Start with your routine goal and skin needs." },
    { question: "Do you offer sample products?", answer: "Sample availability depends on the store catalog." },
    { question: "Are the products cruelty free?", answer: "Check each product description for formula details." },
  ];

  return (
    <section className="bg-[#f4f6f1] px-6 py-12">
      <h2 className="text-center text-2xl font-bold tracking-[-0.04em] text-[#82934c]">
        Frequently Ask Questions
      </h2>
      <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
        {previewItems.map((item, index) => (
          <details
            key={`${item.question}-${index}`}
            className="group bg-white px-5 py-4 text-xs shadow-[0_12px_30px_rgba(23,32,18,0.04)]"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              <span>{item.question}</span>
              <Plus className="h-3.5 w-3.5 shrink-0 text-[#82934c] group-open:rotate-45" />
            </summary>
            <p className="mt-3 leading-5 text-[#6e7564]">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CosmeticsHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme } = useStorefrontTheme();
  const headline =
    storefront.hero.headline.toLowerCase().includes("discover") ||
    storefront.hero.headline.toLowerCase().includes("shop")
      ? store.business_name
      : storefront.hero.headline;

  return (
    <div className="bg-white text-[#111]">
      <section className="px-4 pb-8 pt-6 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden bg-white">
          <div className="relative min-h-[620px] overflow-hidden bg-white px-6 py-16 sm:px-12 lg:px-16">
            <div className="absolute right-0 top-0 h-[410px] w-[48%] rounded-bl-[16rem] bg-[#fff2df]" />
            <div className="grid min-h-[520px] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative z-10">
                <p className="text-[12px] tracking-[0.28em] text-[#4f5648]">Discover the Nature with</p>
                <EditableText
                  path="hero.headline"
                  value={headline}
                  as="h1"
                  className="mt-4 max-w-xl text-7xl font-bold uppercase leading-[0.82] tracking-[-0.075em] text-[#82934c] sm:text-8xl lg:text-[9rem]"
                />
                <EditableText
                  path="hero.subheadline"
                  value={storefront.hero.subheadline}
                  as="p"
                  className="mt-7 max-w-md text-xs leading-6 text-[#4f5648]"
                  multiline
                />
                <StorefrontLink
                  href="/products"
                  className="mt-8 inline-flex bg-[#82934c] px-8 py-3 text-[11px] font-bold text-white shadow-[0_18px_35px_rgba(130,147,76,0.28)]"
                >
                  {storefront.hero.cta_label}
                </StorefrontLink>
              </div>
              <div className="relative z-10">
                <ProductPack />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[1fr_1.18fr]">
          <div className="self-center">
            <h2 className="max-w-md text-2xl font-bold leading-tight">
              Trusted by over 350,000+ Clients worldwide since 2008
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {cosmeticsStats.slice(1).map(([value, label]) => (
              <div key={value}>
                <div className="text-4xl font-black tracking-[-0.08em]">{value}</div>
                <div className="mt-1 h-1 w-12 bg-[#82934c]" />
                <p className="mt-2 max-w-[150px] text-[11px] font-semibold leading-4">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <ProductPack compact />
          <div>
            <h2 className="text-5xl font-bold tracking-[-0.06em] text-[#82934c]">Best Skin Cleanser</h2>
            <EditableText
              path="about.body"
              value={storefront.about.body}
              as="p"
              className="mt-6 max-w-2xl text-xs leading-6 text-[#4f5648]"
              multiline
            />
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-6">
              {[
                ["100%", "Organic"],
                ["Clinical", "Approved"],
                ["Herbal", "Products"],
              ].map(([value, label]) => (
                <div key={value}>
                  <div className="text-2xl font-black text-[#82934c]">{value}</div>
                  <div className="mt-1 text-[11px]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="grid items-center gap-6 bg-[#f4f6f1] p-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-[#82934c]">Our Best Serums</h2>
              <p className="mt-4 text-xs leading-6 text-[#4f5648]">
                Lightweight botanical actives made to layer cleanly after cleansing and before daily
                moisture.
              </p>
              <ul className="mt-5 space-y-3 text-xs leading-5 text-[#4f5648]">
                <li>• Designed for bright, hydrated-looking skin.</li>
                <li>• Calm textures for morning and evening routines.</li>
                <li>• Simple steps customers can understand quickly.</li>
              </ul>
              <StorefrontLink href="/products" className="mt-6 inline-flex bg-[#82934c] px-7 py-3 text-[11px] font-bold text-white">
                Explore
              </StorefrontLink>
            </div>
            <ProductPack compact />
          </div>

          <div className="grid items-center gap-6 p-8 lg:grid-cols-[0.82fr_1fr]">
            <div className="relative h-80">
              <Bottle className="absolute bottom-3 left-1/2 -translate-x-1/2 rotate-[-24deg]" size="lg" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-[#82934c]">Why Choose Us</h2>
              <p className="mt-4 text-xs leading-6 text-[#4f5648]">
                A calm product story, premium formulas, and trust blocks that match the clean
                cosmetics reference.
              </p>
              <div className="mt-6 grid gap-3">
                {cosmeticsReasons.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-3 border border-[#e2e6d9] bg-white p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#f4f6f1] text-[#82934c]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold">{title}</h3>
                      <p className="mt-1 text-[11px] leading-4 text-[#6e7564]">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <FaqPreview items={storefront.pages?.faq?.items ?? []} />

      <section className="px-4 py-14 text-center sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-[-0.05em] text-[#82934c]">Testimonials</h2>
          <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-[#6e7564]">
            Clean routines, soft finishes, and customer confidence across every product page.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {["A perfect daily routine.", "Soft, clean, and easy.", "The cleanser feels fresh."].map(
              (quote, index) => (
                <article key={quote} className="border-t border-[#e2e6d9] pt-5">
                  <div className="text-[#c9a23e]">★★★★★</div>
                  <p className="mt-3 text-xs leading-5 text-[#4f5648]">{quote}</p>
                  <div>
                    <div className="mt-4 text-[11px] font-bold">Customer {index + 1}</div>
                  </div>
                </article>
              ),
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
