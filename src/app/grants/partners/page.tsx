import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BizFestPartnersForm,
  BizFestPartnersFormFallback,
} from "@/components/marketing/bizfest-partners-form";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Partner with BizFest 1.0 | Bizgrid",
  description:
    "Sponsor or partner with BizFest — Nigeria's business growth festival. Conference branding, expo booths, and SME distribution.",
  alternates: {
    canonical: `${SITE_URL}/grants/partners`,
  },
};

export default function BizFestPartnersPage() {
  return (
    <Suspense fallback={<BizFestPartnersFormFallback />}>
      <BizFestPartnersForm />
    </Suspense>
  );
}
