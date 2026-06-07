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
