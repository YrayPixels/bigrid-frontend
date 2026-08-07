"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function MarketingPageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        </div>
        <p className="text-sm text-ink-soft">{description}</p>
      </div>
      <Link
        href="/admin/marketing"
        className="inline-flex shrink-0 text-sm font-medium text-primary hover:underline"
      >
        Back to marketing
      </Link>
    </div>
  );
}
