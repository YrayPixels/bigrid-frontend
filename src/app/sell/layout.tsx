import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SellLayoutClient from "./layout-client";

export const metadata: Metadata = {
  title: "Bizgrid Sell",
  description: "Bizgrid point of sale — works offline",
  applicationName: "Bizgrid Sell",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bizgrid",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/bizgridlogo.png", sizes: "500x499", type: "image/png" },
      { url: "/icons/sell-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/sell-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/bizgridlogo.png", sizes: "500x499", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function SellLayout({ children }: { children: ReactNode }) {
  return <SellLayoutClient>{children}</SellLayoutClient>;
}
