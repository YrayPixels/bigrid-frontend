"use client";

import Link from "next/link";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { furnitureHardwareFooterColumns } from "@/lib/storefront/furniture-hardware-defaults";
import { FurnitureHeader } from "@/components/storefront/shell/furniture-header";

export function FurnitureShell({ children }: { children: React.ReactNode }) {
  const { store } = useStorefront();
  const { mode } = useStorefrontTheme();
  const brandLabel = store.business_name.toUpperCase().slice(0, 5).padEnd(5, " ");

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#1c1812]">
      <FurnitureHeader />

      <main>{children}</main>

      <footer className="mx-3 mb-6 mt-20 rounded-3xl bg-[#1c1812] p-8 text-[#f7f3eb] md:mx-6 md:mt-28 md:p-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-2xl font-semibold tracking-[0.35em]" style={{ fontFamily: "var(--font-display)" }}>
              {brandLabel}
            </div>
            <p className="mt-4 max-w-sm text-sm text-[#f7f3eb]/70">
              Furniture designed to blend timeless silhouettes with the calm of modern living.
            </p>
          </div>
          {furnitureHardwareFooterColumns.map((column) => (
            <div key={column.title}>
              <div className="mb-4 text-sm font-semibold">{column.title}</div>
              <ul className="space-y-3 text-sm text-[#f7f3eb]/70">
                {column.links.map((link) =>
                  mode === "edit" ? (
                    <li key={link.href}>{link.label}</li>
                  ) : (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-[#f7f3eb]">
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-2 border-t border-[#f7f3eb]/15 pt-6 text-xs text-[#f7f3eb]/60">
          <span>© {new Date().getFullYear()} {store.business_name}. All rights reserved.</span>
          <span>Crafted with care.</span>
        </div>
      </footer>
    </div>
  );
}
