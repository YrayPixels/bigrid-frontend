import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { SITE_URL } from "@/lib/site-seo";
import { Providers } from "./providers";
import "./globals.css";

const SITE_TITLE = "Bizgrid — AI-generated storefronts, instantly retail-ready";
const SITE_DESCRIPTION =
  "Bizgrid turns a product idea into a high-conversion storefront with AI catalog, instant theming, and global payments.";

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
    "AI commerce",
    "storefront generator",
    "small business ecommerce",
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
