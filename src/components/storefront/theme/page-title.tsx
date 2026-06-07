"use client";

import { cn } from "@/lib/utils";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { EditableText } from "./editable-text";

export function PageTitle({
  title,
  subtitle,
  titlePath,
  subtitlePath,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  titlePath?: string;
  subtitlePath?: string;
  centered?: boolean;
}) {
  const { theme } = useStorefrontTheme();

  return (
    <div className={cn(centered && "text-center")}>
      {titlePath ? (
        <EditableText
          path={titlePath}
          value={title}
          as="h1"
          className={cn(
            "text-4xl font-bold tracking-tight",
            theme.id === "fashion_lookbook" && "tracking-[-0.04em]",
          )}
          style={{ fontFamily: theme.displayFont }}
        />
      ) : (
        <h1
          className={cn(
            "text-4xl font-bold tracking-tight",
            theme.id === "fashion_lookbook" && "tracking-[-0.04em]",
          )}
          style={{ fontFamily: theme.displayFont }}
        >
          {title}
        </h1>
      )}
      {subtitle ? (
        subtitlePath ? (
          <EditableText
            path={subtitlePath}
            value={subtitle}
            as="p"
            className={cn("mt-2 text-sm", theme.mutedText)}
            multiline
          />
        ) : (
          <p className={cn("mt-2 text-sm", theme.mutedText)}>{subtitle}</p>
        )
      ) : null}
    </div>
  );
}
