"use client";

import { PageContainer } from "@/components/storefront/theme/page-container";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function ContentPageView({
  title,
  body,
  titlePath,
  bodyPath,
}: {
  title: string;
  body: string;
  titlePath?: string;
  bodyPath?: string;
}) {
  const { theme } = useStorefrontTheme();

  if (theme.id === "beauty" || theme.id === "cosmetics") {
    return (
      <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
        <section className="px-4 py-16 text-center sm:px-6 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.palette.muted }}>
            {title}
          </p>
          {titlePath ? (
            <EditableText
              path={titlePath}
              value={title}
              as="h1"
              className="mx-auto mt-3 max-w-3xl font-display text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl"
            />
          ) : (
            <h1 className="mx-auto mt-3 max-w-3xl font-display text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl">
              {title}
            </h1>
          )}
        </section>
        <section className="px-4 pb-16 sm:px-6 lg:pb-24">
          <div className="mx-auto grid max-w-5xl gap-6 rounded-[2rem] border p-6 shadow-[0_24px_80px_rgba(111,47,43,0.08)] sm:p-10" style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}>
            {bodyPath ? (
              <EditableText
                path={bodyPath}
                value={body}
                as="p"
                className="whitespace-pre-line text-sm leading-8 sm:text-base"
                style={{ color: theme.palette.muted }}
                multiline
              />
            ) : (
              <div className="whitespace-pre-line text-sm leading-8 sm:text-base" style={{ color: theme.palette.muted }}>
                {body}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <PageContainer narrow className={theme.pageText}>
      {titlePath ? (
        <EditableText
          path={titlePath}
          value={title}
          as="h1"
          className="text-4xl font-bold tracking-tight"
          style={{ fontFamily: theme.displayFont }}
        />
      ) : (
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: theme.displayFont }}>
          {title}
        </h1>
      )}
      {bodyPath ? (
        <EditableText
          path={bodyPath}
          value={body}
          as="p"
          className="mt-6 whitespace-pre-line text-sm leading-7"
          style={{ color: theme.palette.muted }}
          multiline
        />
      ) : (
        <div
          className="mt-6 space-y-4 whitespace-pre-line text-sm leading-7"
          style={{ color: theme.palette.muted }}
        >
          {body}
        </div>
      )}
    </PageContainer>
  );
}
