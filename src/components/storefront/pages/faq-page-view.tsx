"use client";

import { Minus, Plus, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function FaqPageView({
  title,
  items,
}: {
  title: string;
  items: { question: string; answer: string }[];
}) {
  const { theme, mode } = useStorefrontTheme();

  if (theme.id === "minimalistic") {
    return (
      <div
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
            FAQs
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
          </div>
          <EditableText
            path="pages.faq.title"
            value={title}
            as="h1"
            className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl"
          />
          <p
            className="mx-auto mt-4 max-w-md text-sm leading-6"
            style={{ color: theme.palette.muted }}
          >
            Find answers about orders, delivery, returns, and your daily wellness essentials.
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
            {items.map((item, index) => (
              <details
                key={index}
                className="group rounded-[1.5rem] p-5 shadow-sm ring-1"
                style={
                  {
                    backgroundColor: `${theme.palette.surface}cc`,
                    "--tw-ring-color": theme.palette.border,
                  } as CSSProperties
                }
                open={mode === "edit" || index === 0}
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
      </div>
    );
  }

  return (
    <PageContainer narrow>
      <EditableText
        path="pages.faq.title"
        value={title}
        as="h1"
        className="text-4xl font-bold tracking-tight"
        style={{ fontFamily: theme.displayFont }}
      />
      <div className="mt-8 space-y-4">
        {items.map((item, index) => (
          <details
            key={index}
            className={`rounded-2xl border ${theme.borderColor} ${theme.cardBg} p-5`}
            open={mode === "edit"}
          >
            <summary className="cursor-pointer font-semibold">
              <EditableText
                path={`pages.faq.items.${index}.question`}
                value={item.question}
                as="span"
              />
            </summary>
            <EditableText
              path={`pages.faq.items.${index}.answer`}
              value={item.answer}
              as="p"
              className="mt-3 text-sm leading-7"
              style={{ color: theme.palette.muted }}
              multiline
            />
          </details>
        ))}
      </div>
    </PageContainer>
  );
}
