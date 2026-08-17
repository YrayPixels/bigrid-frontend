import type { Metadata } from "next";
import { AdLandingPage } from "@/components/marketing/ad-landing-page";

export const metadata: Metadata = {
  title: "Start Your Free Trial | Bizgrid",
  description:
    "Open your online store in minutes. 14-day free trial, no card required. AI storefront builder with Paystack checkout for African sellers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdStartPage() {
  return <AdLandingPage />;
}
