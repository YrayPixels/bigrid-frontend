"use client";

import { useEffect, useMemo } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontThemeOptional } from "@/lib/storefront/theme-context";
import type { StoreProduct } from "@/lib/api/types";

interface DealieWidgetProps {
  vendorId?: number | string | null;
  productId?: number | string | null;
  enabled?: boolean;
}

export function DealieWidget({ vendorId, productId, enabled = true }: DealieWidgetProps) {
  const dealieApiBase = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
  const cart = useCart();
  const data = useStorefront();
  const themeContext = useStorefrontThemeOptional();
  const theme = themeContext?.theme;

  // Extract vendor storefront color template & design tokens
  const primaryColor = theme?.palette?.primary || data?.store?.brand_color || "#0E7C66";
  const accentColor = theme?.palette?.accent || primaryColor;
  const bgColor = theme?.palette?.background || "#ffffff";
  const surfaceColor = theme?.palette?.surface || "#ffffff";
  const textColor = theme?.palette?.text || "#0f172a";
  const mutedColor = theme?.palette?.muted || "#64748b";
  const borderColor = theme?.palette?.border || "#e2e8f0";
  const isSquare = theme?.buttonStyle === "square";

  const buttonRadius = isSquare ? "6px" : "9999px";
  const drawerRadius = isSquare ? "8px" : "20px";
  const cardRadius = isSquare ? "6px" : "14px";
  const chipRadius = isSquare ? "4px" : "9999px";
  const inputRadius = isSquare ? "4px" : "9999px";
  const sendRadius = isSquare ? "4px" : "50%";
  const msgRadius = isSquare ? "4px" : "16px";

  // Dynamic CSS stylesheet aligned with vendor storefront palette
  const dynamicCss = useMemo(() => {
    const primaryGlow = `${primaryColor}40`;
    return `
      .dealie-widget-root {
        font-family: var(--store-body-font, var(--font-sans, inherit)) !important;
      }
      .dealie-toggle-btn {
        background: var(--store-brand, ${primaryColor}) !important;
        color: #ffffff !important;
        border-radius: ${buttonRadius} !important;
        box-shadow: 0 10px 25px -5px ${primaryGlow}, 0 8px 10px -6px ${primaryGlow} !important;
        font-family: var(--font-sans, inherit) !important;
      }
      .dealie-toggle-btn:hover {
        transform: translateY(-2px) scale(1.03) !important;
        box-shadow: 0 14px 30px -5px ${primaryGlow} !important;
      }
      .dealie-chat-drawer {
        background: var(--store-surface, ${surfaceColor}) !important;
        border-radius: ${drawerRadius} !important;
        border: 1px solid var(--store-border, ${borderColor}) !important;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--store-border, ${borderColor}) !important;
        font-family: var(--store-body-font, var(--font-sans, inherit)) !important;
      }
      .dealie-header {
        background: var(--store-brand, ${primaryColor}) !important;
        color: #ffffff !important;
        font-family: var(--font-display, inherit) !important;
      }
      .dealie-product-card {
        background: var(--store-bg, ${bgColor}) !important;
        border-bottom: 1px solid var(--store-border, ${borderColor}) !important;
      }
      .dealie-product-meta h5 {
        color: var(--store-text, ${textColor}) !important;
        font-family: var(--font-display, inherit) !important;
      }
      .dealie-product-meta span {
        color: var(--store-accent, ${accentColor}) !important;
      }
      .dealie-messages {
        background: var(--store-surface, ${surfaceColor}) !important;
      }
      .dealie-msg.user {
        background: var(--store-brand, ${primaryColor}) !important;
        color: #ffffff !important;
        border-radius: ${msgRadius} !important;
        border-bottom-right-radius: 4px !important;
      }
      .dealie-msg.bot {
        background: var(--store-bg, ${bgColor}) !important;
        color: var(--store-text, ${textColor}) !important;
        border: 1px solid var(--store-border, ${borderColor}) !important;
        border-radius: ${msgRadius} !important;
        border-bottom-left-radius: 4px !important;
      }
      .dealie-typing {
        background: var(--store-bg, ${bgColor}) !important;
        border: 1px solid var(--store-border, ${borderColor}) !important;
      }
      .dealie-typing span {
        background: var(--store-accent, ${accentColor}) !important;
      }
      .dealie-deal-card {
        background: rgba(34, 197, 94, 0.08) !important;
        border: 1.5px solid var(--store-accent, #22c55e) !important;
        border-radius: ${cardRadius} !important;
      }
      .dealie-deal-card h4 {
        color: var(--store-accent, #15803d) !important;
        font-family: var(--font-display, inherit) !important;
      }
      .dealie-deal-price {
        color: var(--store-accent, #166534) !important;
      }
      .dealie-accept-btn {
        background: var(--store-brand, var(--store-accent, #22c55e)) !important;
        color: #ffffff !important;
        border-radius: ${buttonRadius} !important;
        font-family: var(--font-sans, inherit) !important;
      }
      .dealie-chips {
        background: var(--store-bg, ${bgColor}) !important;
        border-top: 1px solid var(--store-border, ${borderColor}) !important;
      }
      .dealie-chip {
        background: var(--store-surface, ${surfaceColor}) !important;
        border: 1px solid var(--store-border, ${borderColor}) !important;
        color: var(--store-text, ${textColor}) !important;
        border-radius: ${chipRadius} !important;
      }
      .dealie-chip:hover {
        border-color: var(--store-brand, ${primaryColor}) !important;
        color: var(--store-brand, ${primaryColor}) !important;
      }
      .dealie-input-area {
        background: var(--store-surface, ${surfaceColor}) !important;
        border-top: 1px solid var(--store-border, ${borderColor}) !important;
      }
      .dealie-input-area input {
        background: var(--store-bg, ${bgColor}) !important;
        color: var(--store-text, ${textColor}) !important;
        border: 1px solid var(--store-border, ${borderColor}) !important;
        border-radius: ${inputRadius} !important;
      }
      .dealie-input-area input:focus {
        border-color: var(--store-brand, ${primaryColor}) !important;
      }
      .dealie-send-btn {
        background: var(--store-brand, ${primaryColor}) !important;
        color: #ffffff !important;
        border-radius: ${sendRadius} !important;
      }
    `;
  }, [
    primaryColor,
    accentColor,
    bgColor,
    surfaceColor,
    textColor,
    borderColor,
    buttonRadius,
    drawerRadius,
    cardRadius,
    chipRadius,
    inputRadius,
    sendRadius,
    msgRadius,
  ]);

  // Inject or update dynamic theme styling in the document head
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const styleId = "dealie-storefront-theme-style";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = dynamicCss;
    return () => {
      // Optional cleanup if component unmounts
    };
  }, [enabled, dynamicCss]);

  useEffect(() => {
    function handleDealClosed(event: Event) {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail || {};
      const { agreed_price, deal_token, product_id, product_name, image_url, quantity } = detail;
      if (!agreed_price || !deal_token) return;

      const agreedNum = Number(agreed_price);
      const qtyNum = Math.max(1, Number(quantity || 1));

      sessionStorage.setItem("dealie_agreed_price", String(agreedNum));
      sessionStorage.setItem("dealie_token", String(deal_token));
      sessionStorage.setItem("dealie_product_id", String(product_id || ""));

      // Try to find the real product from context for full metadata, but always fall back
      // to a minimal product built directly from the event payload so addItem always fires.
      const contextProducts: StoreProduct[] = data?.products ?? data?.storefront?.products ?? [];
      const found = contextProducts.find(
        (p: StoreProduct) =>
          String(p.id) === String(product_id) ||
          p.sku === String(product_id) ||
          p.slug === String(product_id) ||
          p.name.toLowerCase() === String(product_name || product_id || "").toLowerCase(),
      );

      const negotiatedProduct: StoreProduct = found
        ? { ...found, effective_price: agreedNum, price: agreedNum }
        : {
            id: String(product_id || "dealie-product"),
            name: String(product_name || "Negotiated Item"),
            price: agreedNum,
            effective_price: agreedNum,
            image_url: String(image_url || ""),
            slug: String(product_id || ""),
            sku: String(product_id || ""),
            description: "",
            currency: String(detail.currency || "NGN"),
            stock_quantity: 100,
            in_stock: true,
          };

      if (cart?.addItem) {
        cart.addItem(negotiatedProduct, qtyNum);
      }
    }

    window.addEventListener("dealie:deal_closed", handleDealClosed);
    return () => {
      window.removeEventListener("dealie:deal_closed", handleDealClosed);
    };
  }, [cart, data]);

  // Collapse drawer and notify widget script when navigating to a new product page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const drawer = document.getElementById("dealie-drawer");
      if (drawer) {
        drawer.classList.remove("open");
      }
      if (productId && vendorId) {
        const setProdEvent = new CustomEvent("dealie:set_product", {
          detail: {
            vendorId: String(vendorId),
            productId: String(productId),
          },
        });
        window.dispatchEvent(setProdEvent);
      }
    }
  }, [vendorId, productId]);

  useEffect(() => {
    if (!enabled || !vendorId) return;

    // 1. Inject / update main Dealie AI Widget UI script (`widget.js`)
    const mainScriptId = "dealie-widget-main-script";
    let mainScript = document.getElementById(mainScriptId) as HTMLScriptElement | null;

    if (!mainScript) {
      mainScript = document.createElement("script");
      mainScript.id = mainScriptId;
      mainScript.src = `${dealieApiBase}/static/widget.js`;
      mainScript.async = true;
      mainScript.setAttribute("data-api-base", dealieApiBase);
      mainScript.setAttribute("data-vendor-id", String(vendorId));
      mainScript.setAttribute("data-theme-color", primaryColor);
      mainScript.setAttribute("data-accent-color", accentColor);
      if (productId) {
        mainScript.setAttribute("data-product-id", String(productId));
      }
      document.body.appendChild(mainScript);
    } else {
      mainScript.setAttribute("data-vendor-id", String(vendorId));
      mainScript.setAttribute("data-theme-color", primaryColor);
      mainScript.setAttribute("data-accent-color", accentColor);
      if (productId) {
        mainScript.setAttribute("data-product-id", String(productId));
      } else {
        mainScript.removeAttribute("data-product-id");
      }
    }

    // 2. Inject / update Dealie listener script (`dealie-widget-listener.js`)
    const listenerScriptId = "dealie-widget-listener-script";
    let listenerScript = document.getElementById(listenerScriptId) as HTMLScriptElement | null;

    if (!listenerScript) {
      listenerScript = document.createElement("script");
      listenerScript.id = listenerScriptId;
      listenerScript.src = `${dealieApiBase}/static/dealie-widget-listener.js`;
      listenerScript.async = true;
      listenerScript.setAttribute("data-vendor-id", String(vendorId));
      if (productId) {
        listenerScript.setAttribute("data-product-id", String(productId));
      }
      document.body.appendChild(listenerScript);
    }
  }, [enabled, vendorId, productId, dealieApiBase, primaryColor, accentColor]);

  if (!enabled || !vendorId) return null;

  return null;
}

