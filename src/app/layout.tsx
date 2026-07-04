import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { SITE_URL } from "@/lib/site-seo";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Bizgrid — AI-powered storefronts for small businesses",
  description:
    "Tell us about your business. Our AI builds your storefront, writes your copy, and helps you launch in minutes.",
  openGraph: {
    title: "Bizgrid — AI-powered storefronts for small businesses",
    description:
      "Tell us about your business. Our AI builds your storefront, writes your copy, and helps you launch in minutes.",
    type: "website",
    siteName: "Bizgrid",
    images: [{ url: "/bizgridlogo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bizgrid — AI-powered storefronts for small businesses",
    description:
      "Tell us about your business. Our AI builds your storefront, writes your copy, and helps you launch in minutes.",
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
