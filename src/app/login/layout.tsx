import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in — Bizgrid",
  description:
    "Sign in to your Bizgrid account to manage your storefront, orders, payments, and WhatsApp tools.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
