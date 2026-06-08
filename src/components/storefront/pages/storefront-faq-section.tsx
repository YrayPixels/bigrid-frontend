"use client";

import { Minus, Plus, Search } from "lucide-react";
import type { CSSProperties } from "react";
import type { StorefrontPages } from "@/lib/api/types";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const storefrontFaqFallbacks = [
  {
    question: "Is there a free delivery option?",
    answer:
      "Yes, eligible orders include free standard delivery. Express options are shown at checkout.",
  },
  {
    question: "Can I change my order later?",
    answer: "Reach out as soon as possible and the store team will help before the order ships.",
  },
  {
    question: "What is your return policy?",
    answer: "Unworn items can be returned or exchanged in line with the store return policy.",
  },
  {
    question: "Can other info be added to an invoice?",
    answer: "Yes. Add your billing details at checkout or contact the store after ordering.",
  },
  {
    question: "How does sizing work?",
    answer: "Use the size options on each product page and check the size guide before checkout.",
  },
  {
    question: "How do I change my account email?",
    answer: "Contact the store support team and they will help update your customer details.",
  },
];

export function StorefrontFaqSection({ faqPage }: { faqPage?: StorefrontPages["faq"] }) {
  const { theme } = useStorefrontTheme();
  const faqItems = faqPage?.items?.length ? faqPage.items : storefrontFaqFallbacks;

  if (theme.id === "minimalistic" || theme.id === "beauty" || theme.id === "cosmetics") {
    const isBeauty = theme.id === "beauty";
    const isCosmetics = theme.id === "cosmetics";
    return (
      <section
        className="px-4 py-16 sm:px-6 lg:py-20"
        style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}
      >
        <div className="mx-auto max-w-[960px] text-center">
          <div
            className="mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm"
            style={{ backgroundColor: `${theme.palette.surface}cc` }}
          >
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
            {isCosmetics ? "Skincare help" : isBeauty ? "Beauty help" : "FAQs"}
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
          </div>
          <EditableText
            path="pages.faq.title"
            value={faqPage?.title ?? "Frequently asked questions"}
            as="h2"
            className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl"
          />
          <p
            className="mx-auto mt-4 max-w-md text-sm leading-6"
            style={{ color: theme.palette.muted }}
          >
            {isCosmetics
              ? "Have questions about your order, delivery, or skincare routine? We are here to help."
              : isBeauty
              ? "Have questions about your order, delivery, or beauty routine? We are here to help."
              : "Have questions about your order, delivery, or daily wellness routine? We are here to help."}
          </p>

          <div
            className="mx-auto mt-8 flex h-12 max-w-[340px] items-center gap-3 rounded-full border px-5 text-left text-sm shadow-sm"
            style={{
              backgroundColor: `${theme.palette.surface}cc`,
              borderColor: theme.palette.border,
              color: theme.palette.muted,
            }}
          >
            <Search className="h-4 w-4" strokeWidth={1.8} />
            <span>Search help topics</span>
          </div>

          <div className="mx-auto mt-12 grid gap-3 text-left">
            {faqItems.map((item, index) => (
              <details
                key={`${item.question}-${index}`}
                className="group rounded-[1.5rem] p-5 shadow-sm ring-1"
                style={
                  {
                    backgroundColor: `${theme.palette.surface}cc`,
                    "--tw-ring-color": theme.palette.border,
                  } as CSSProperties
                }
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <EditableText
                    path={`pages.faq.items.${index}.question`}
                    value={item.question}
                    as="span"
                    className="text-sm font-bold leading-6"
                  />
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                    style={{
                      backgroundColor: theme.palette.background,
                      color: theme.palette.primary,
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 group-open:hidden" strokeWidth={2.2} />
                    <Minus className="hidden h-3.5 w-3.5 group-open:block" strokeWidth={2.2} />
                  </span>
                </summary>
                <EditableText
                  path={`pages.faq.items.${index}.answer`}
                  value={item.answer}
                  as="p"
                  className="mt-3 max-w-[720px] text-sm leading-6"
                  style={{ color: theme.palette.muted }}
                  multiline
                />
              </details>
            ))}
          </div>
        </div>

        <div
          className="mx-auto mt-12 max-w-3xl rounded-[2rem] px-6 py-10 text-center"
          style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
        >
          <h3 className="text-lg font-semibold">Still have questions?</h3>
          <p
            className="mx-auto mt-2 max-w-md text-sm leading-6"
            style={{ color: `${theme.palette.background}b3` }}
          >
            {isCosmetics
              ? "Send us a note and our team will help you choose the right skincare essentials."
              : isBeauty
              ? "Send us a note and our team will help you choose the right beauty essentials."
              : "Send us a note and our team will help you choose the right essentials."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="border-t pt-16 sm:pt-20"
      style={{
        backgroundColor: theme.palette.background,
        borderColor: theme.palette.border,
        color: theme.palette.text,
      }}
    >
      <div className="mx-auto max-w-[960px] px-4 text-center sm:px-6">
        <p className="text-[11px] font-extrabold uppercase tracking-tight">FAQs</p>
        <EditableText
          path="pages.faq.title"
          value={faqPage?.title ?? "Frequently asked questions"}
          as="h2"
          className="mt-4 text-4xl font-medium leading-none tracking-[-0.04em] sm:text-5xl"
          style={{ fontFamily: "var(--font-editorial)" }}
        />
        <p className="mx-auto mt-5 max-w-md text-sm" style={{ color: theme.palette.muted }}>
          Have questions? We're here to help.
        </p>

        <div
          className="mx-auto mt-8 flex h-11 max-w-[310px] items-center gap-3 rounded-md border px-4 text-left text-sm shadow-sm"
          style={{
            backgroundColor: theme.palette.surface,
            borderColor: theme.palette.border,
            color: theme.palette.muted,
          }}
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
          <span>Search</span>
        </div>

        <div
          className="mx-auto mt-16 divide-y text-left"
          style={{ borderColor: theme.palette.border }}
        >
          {faqItems.map((item, index) => (
            <details key={`${item.question}-${index}`} className="group py-5" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                <EditableText
                  path={`pages.faq.items.${index}.question`}
                  value={item.question}
                  as="span"
                  className="text-sm font-extrabold leading-6"
                />
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border"
                  style={{ borderColor: theme.palette.text }}
                >
                  <Plus className="h-3 w-3 group-open:hidden" strokeWidth={2.2} />
                  <Minus className="hidden h-3 w-3 group-open:block" strokeWidth={2.2} />
                </span>
              </summary>
              <EditableText
                path={`pages.faq.items.${index}.answer`}
                value={item.answer}
                as="p"
                className="mt-2 max-w-[700px] text-sm leading-6"
                style={{ color: theme.palette.muted }}
                multiline
              />
            </details>
          ))}
        </div>
      </div>

      <div
        className="mt-16 px-4 py-10 text-center sm:px-6"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <div className="flex justify-center -space-x-2">
          {[
            "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=80&q=80",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
          ].map((image, index) => (
            <img
              key={image}
              src={image}
              alt=""
              className="h-9 w-9 rounded-full border-2 border-white object-cover"
              style={{ zIndex: 3 - index }}
            />
          ))}
        </div>
        <h3 className="mt-6 text-sm font-extrabold">Still have questions?</h3>
        <p className="mt-2 text-sm" style={{ color: theme.palette.muted }}>
          Can't find the answer you're looking for? Please chat to our friendly team.
        </p>
      </div>
    </section>
  );
}
