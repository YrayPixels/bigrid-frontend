import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "Storehaus — AI-generated storefronts, instantly retail-ready",
  description:
    "Storehaus turns a product idea into a high-conversion storefront with AI catalog, instant theming, and global payments.",
  openGraph: {
    title: "Storehaus — AI commerce engine",
    description:
      "Generate a retail-ready storefront in minutes. AI catalog, instant art direction, global checkout.",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
