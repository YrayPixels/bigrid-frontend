"use client";

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
            className="rounded-2xl border border-border bg-card p-5"
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
              className="mt-3 text-sm leading-7 text-muted-foreground"
              multiline
            />
          </details>
        ))}
      </div>
    </PageContainer>
  );
}
