import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { SITE_URL } from "@/lib/site-seo";
import { Providers } from "./providers";
import "./globals.css";

const SITE_TITLE = "Bizgrid — AI storefronts for sellers";
const SITE_DESCRIPTION =
  "Describe your shop and get a live storefront. Bizgrid helps sellers build with AI, take payments, manage orders, and grow with marketing tools.";

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
        url: "/bizgridlogo.png",
        alt: "Bizgrid",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/bizgridlogo.png"],
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
        <Providers>
          <ConfirmDialogProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </ConfirmDialogProvider>
        </Providers>
      </body>
    </html>
  );
}
