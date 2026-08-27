import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started — Bizgrid",
  description:
    "Create your Bizgrid account and open a live online store in minutes. AI storefront builder with Paystack checkout for African sellers.",
  alternates: { canonical: "/signup" },
  robots: { index: true, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
