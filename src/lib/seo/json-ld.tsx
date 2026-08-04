import type { ReactNode } from "react";

/** Renders a JSON-LD script tag for structured data. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function JsonLdGraph({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
