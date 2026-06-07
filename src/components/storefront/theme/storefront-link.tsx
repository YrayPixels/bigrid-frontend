"use client";

import Link from "next/link";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function StorefrontLink({
  href,
  children,
  className,
  style,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const { mode } = useStorefrontTheme();

  if (mode === "edit") {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} style={style} onClick={onClick}>
      {children}
    </Link>
  );
}
