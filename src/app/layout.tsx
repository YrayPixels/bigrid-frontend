import type { Metadata } from "next";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { TikTokPixel } from "@/components/analytics/tiktok-pixel";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { JsonLd } from "@/lib/seo/json-ld";
import { organizationSchema, softwareApplicationSchema, websiteSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-seo";
import { Providers } from "./providers";
import "./globals.css";

const SITE_TITLE = "AI Website Builder for African Businesses | Bizgrid";
const SITE_DESCRIPTION =
  "Describe your shop and get a live storefront. Bizgrid helps African sellers build with AI, take Paystack payments, manage orders, and grow on WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Bizgrid",
  authors: [{ name: "Bizgrid", url: SITE_URL }],
  creator: "Bizgrid",
  publisher: "Bizgrid",
  keywords: [
    "AI storefront",
    "ecommerce builder",
    "online store",
    "sell online",
    "storefront generator",
    "Bizgrid",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "en_US",
    siteName: "Bizgrid",
    images: [
      {
        url: "/facebook-og.png",
        width: 1536,
        height: 1024,
        alt: "Bizgrid",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/twitter-og.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/bizgridlogo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MetaPixel />
        <TikTokPixel />
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <JsonLd data={softwareApplicationSchema()} />
        <Providers>
          <ConfirmDialogProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ConfirmDialogProvider>
        </Providers>
      </body>
    </html>
  );
}
