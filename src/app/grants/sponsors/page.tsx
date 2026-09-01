import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BizFestSponsorsForm,
  BizFestSponsorsFormFallback,
} from "@/components/marketing/bizfest-sponsors-form";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Sponsor BizFest 1.0 | Bizgrid",
  description:
    "Sponsor BizFest or book expo booths and exhibition space at Nigeria's business growth festival. Conference branding, merchant expo, and SME reach.",
  alternates: {
    canonical: `${SITE_URL}/grants/sponsors`,
  },
};

export default function BizFestSponsorsPage() {
  return (
    <Suspense fallback={<BizFestSponsorsFormFallback />}>
      <BizFestSponsorsForm />
    </Suspense>
  );
}
