"use client";

import { MessageSquareText } from "lucide-react";
import type { StoreProduct } from "@/lib/api/types";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

interface BargainButtonProps {
  product: StoreProduct;
  variant?: "primary" | "secondary" | "pill" | "square";
  className?: string;
}

export function BargainButton({ product, variant = "secondary", className = "" }: BargainButtonProps) {
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();

  // If Dealie is explicitly disabled for this store, don't show the button
  if (store.dealie_enabled === false) return null;

  const handleBargainClick = () => {
    const detail = {
      productId: product.id || product.sku,
      productName: product.name,
      productPrice: product.effective_price ?? product.price,
      productImage: product.image_url ?? undefined,
      shopName: store.business_name || "Store",
      currency: product.currency || "NGN",
      vendorId: store.dealie_vendor_id || store.id,
    };

    try {
      // 1. Dispatch custom event for Dealie widget listener
      const event = new CustomEvent("open-dealie-chat", { detail });
      window.dispatchEvent(event);
    } catch (e) {
      console.warn("[Dealie] Failed to dispatch open-dealie-chat event:", e);
    }

    // 2. Fallback: Check if drawer opened; if not, invoke openDealieChat or click launcher
    try {
      const drawer = document.getElementById("dealie-drawer");
      if (!drawer || !drawer.classList.contains("open")) {
        if (typeof (window as unknown as Record<string, unknown>).openDealieChat === "function") {
          (window as unknown as { openDealieChat: (opts: Record<string, unknown>) => void }).openDealieChat(detail);
        } else {
          const toggleBtn = document.getElementById("dealie-toggle-btn");
          if (toggleBtn) toggleBtn.click();
        }
      }
    } catch (e) {
      console.warn("[Dealie] Fallback opener error:", e);
    }
  };

  const isSquare = theme.buttonStyle === "square" || variant === "square";
  const isPill = !isSquare && (variant === "pill" || theme.buttonStyle === "rounded");
  const radiusClass = isSquare ? "rounded-none" : isPill ? "rounded-full" : "rounded-md";

  const accentColor = theme.palette.accent || theme.palette.primary;
  const textColor = theme.palette.text;

  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "234800000000").replace(/[^\d]/g, "");
  const vendorIdentifier = store.dealie_vendor_id || store.id;
  const productIdentifier = product.id || product.sku;
  const waText = encodeURIComponent(
    `Deal:v${vendorIdentifier}_p${productIdentifier} - Hi, I want to bargain for ${product.name} (Retail: ₦${(product.effective_price ?? product.price).toLocaleString()})`
  );
  const whatsappUrl = `https://wa.me/${waNumber}?text=${waText}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleBargainClick}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition hover:opacity-90 active:scale-[0.98] ${radiusClass} ${className}`}
        style={{
          backgroundColor: `${accentColor}18`,
          border: `1.5px solid ${accentColor}`,
          color: textColor,
          fontFamily: "var(--font-sans, inherit)",
        }}
        title="Bargain price with AI sales assistant"
      >
        <MessageSquareText className="h-4 w-4" style={{ color: accentColor }} />
        <span>Bargain Price</span>
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition hover:bg-emerald-600 hover:text-white active:scale-[0.98] ${radiusClass} bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400`}
        style={{ fontFamily: "var(--font-sans, inherit)" }}
        title="Bargain directly on WhatsApp with instant AI counter-offers"
      >
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.072-1.808-.415-1.285-.532-2.115-1.846-2.18-1.932-.061-.087-.514-.684-.514-1.306 0-.621.326-.927.441-1.054.116-.127.253-.159.338-.159.085 0 .169.002.243.006.079.004.184-.03.288.22.109.261.371.905.404.972.033.067.054.146.011.233-.044.087-.066.141-.131.218-.065.076-.137.17-.196.228-.065.065-.133.136-.057.266.076.13.338.558.725.903.498.444.919.582 1.049.647.13.065.207.054.283-.033.076-.087.326-.38.413-.511.087-.13.174-.109.293-.065.12.043.762.359.893.424.13.065.218.098.25.152.033.054.033.315-.111.72z" />
        </svg>
        <span>WhatsApp</span>
      </a>
    </div>
  );
}

