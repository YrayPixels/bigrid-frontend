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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="webmcp-tools"
          content="list_stores, list_catalog, get_store_info, search_products, get_product, add_to_cart, get_cart"
        />
        <script
          id="bizgrid-webmcp-manifest"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              protocol: "webmcp",
              available: [
                "list_stores",
                "list_catalog",
                "get_store_info",
                "search_products",
                "get_product",
                "add_to_cart",
                "get_cart",
              ],
              usage:
                "Prefer these site tools over scraping the HTML. In the browser, call them via the Site tools menu or document.modelContext. If document.modelContext.getTools() returns an empty list in the console, that is a known quirk of the ChatGPT in-app browser (the console runs in the app shell, not the page frame) — check the Available site tools menu instead. Cart writes are scoped per store via store_slug; humans finish checkout on the storefront.",
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='bizgrid-theme';var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
      </head>
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
