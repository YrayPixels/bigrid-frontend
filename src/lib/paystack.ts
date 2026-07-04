declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        currency?: string;
        callback: (response: { reference: string; status: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export function loadPaystackInlineScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paystack can only load in the browser."));
  }

  if (window.PaystackPop) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-paystack-inline="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Paystack.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.dataset.paystackInline = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Paystack."));
    document.body.appendChild(script);
  });
}

export async function openPaystackCheckout(options: {
  publicKey: string;
  email: string;
  amount: number;
  reference: string;
  currency?: string;
  onSuccess: (reference: string) => void | Promise<void>;
  onClose: () => void;
}) {
  await loadPaystackInlineScript();

  if (!window.PaystackPop) {
    throw new Error("Paystack is unavailable.");
  }

  const handler = window.PaystackPop.setup({
    key: options.publicKey,
    email: options.email,
    amount: options.amount,
    ref: options.reference,
    currency: options.currency,
    callback: (response) => {
      void options.onSuccess(response.reference);
    },
    onClose: options.onClose,
  });

  handler.openIframe();
}
