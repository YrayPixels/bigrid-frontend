import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    url: SITE_URL,
  },
};

export default function HomePage() {
  return <LandingPage />;
}
