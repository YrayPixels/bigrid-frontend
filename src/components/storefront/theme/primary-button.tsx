"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function PrimaryButton({
  href,
  children,
  className,
  onClick,
  type = "button",
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const { theme, mode } = useStorefrontTheme();
  const classes = cn(
    "inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white transition",
    theme.buttonRadius,
    className,
  );
  const style = { backgroundColor: theme.palette.primary, color: theme.palette.background };

  if (mode === "edit") {
    return (
      <span className={cn(classes, "cursor-default opacity-90")} style={style}>
        {children}
      </span>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} style={style}>
      {children}
    </button>
  );
}
