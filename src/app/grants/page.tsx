import type { Metadata } from "next";
import { BizFestLandingPage } from "@/components/marketing/bizfest-landing-page";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "BizFest 1.0 — Win ₦6M | Bizgrid",
  description:
    "Join BizFest, Nigeria's business growth festival. Build your online store, compete on the leaderboard, and win from a ₦6,000,000 prize pool. Free to participate.",
  openGraph: {
    title: "BizFest 1.0 — Learn. Build. Sell. Grow. Win.",
    description:
      "A 6-week growth programme for Nigerian small businesses. Build your Bizgrid store, make sales, and compete for ₦6,000,000 in prizes.",
    url: `${SITE_URL}/grants`,
    type: "website",
    images: [{ url: "/facebook-og.png", width: 1200, height: 630, alt: "BizFest by Bizgrid" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BizFest 1.0 — Win ₦6M",
    description:
      "Build your online store, grow your business, and compete for ₦6,000,000. Free to join.",
    images: ["/twitter-og.png"],
  },
  alternates: {
    canonical: `${SITE_URL}/grants`,
  },
};

export default function GrantsPage() {
  return <BizFestLandingPage />;
}
