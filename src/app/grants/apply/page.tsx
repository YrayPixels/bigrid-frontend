import type { Metadata } from "next";
import { BizFestApplyForm } from "@/components/marketing/bizfest-apply-form";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Apply to BizFest 1.0 | Bizgrid",
  description:
    "Apply to BizFest — Nigeria's business growth festival for small businesses. Free to join. Compete for ₦6,000,000 in prizes.",
  alternates: {
    canonical: `${SITE_URL}/grants/apply`,
  },
};

export default function BizFestApplyPage() {
  return <BizFestApplyForm />;
}
