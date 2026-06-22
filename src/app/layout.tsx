import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storehaus - AI-powered storefronts for small businesses",
  description:
    "Tell us about your business. Our AI builds your storefront, writes your copy, and helps you launch in minutes.",
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
