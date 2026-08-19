"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { MarketingStatus } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

type FbLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

type SessionInfo = {
  waba_id?: string | null;
  phone_number_id?: string | null;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (cb: (response: FbLoginResponse) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function graphVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

function loadFacebookSdk(appId: string, version: string): Promise<void> {
  if (window.FB) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("facebook-jssdk");
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: graphVersion(version),
      });
      resolve();
    };

    if (existing) {
      const started = Date.now();
      const wait = () => {
        if (window.FB) {
          resolve();
          return;
        }
        if (Date.now() - started > 8000) {
          reject(new Error("Facebook SDK did not finish loading."));
          return;
        }
        window.setTimeout(wait, 50);
      };
      wait();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Could not load Facebook SDK"));
    document.body.appendChild(script);
  });
}

export function WhatsAppEmbeddedSignupButton({
  signup,
  onConnected,
  disabled,
}: {
  signup?: MarketingStatus["whatsapp"]["embedded_signup"];
  onConnected: (status: MarketingStatus) => void;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const sessionRef = useRef<SessionInfo>({});
  const readyRef = useRef(false);
  const appId = signup?.app_id ?? null;

  useEffect(() => {
    if (!appId) return;

    void loadFacebookSdk(appId, signup?.graph_version || "v21.0")
      .then(() => {
        readyRef.current = true;
      })
      .catch((error: Error) => toast.error(error.message));
  }, [appId, signup?.graph_version]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }

      let data: Record<string, unknown> | null = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!data || data.type !== "WA_EMBEDDED_SIGNUP") return;

      const payload = (data.data ?? {}) as SessionInfo;
      if (payload.waba_id || payload.phone_number_id) {
        sessionRef.current = {
          waba_id: payload.waba_id ?? sessionRef.current.waba_id,
          phone_number_id: payload.phone_number_id ?? sessionRef.current.phone_number_id,
        };
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const launch = useCallback(() => {
    if (!appId) {
      toast.error("Save the Meta App ID on the platform WhatsApp settings page first.");
      return;
    }
    if (!window.FB || !readyRef.current) {
      toast.error("Facebook is still loading. Try again in a moment.");
      return;
    }

    sessionRef.current = {};
    setPending(true);

    const loginOptions: Record<string, unknown> = {
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "3",
      },
    };
    if (signup?.config_id) {
      loginOptions.config_id = signup.config_id;
    }

    window.FB.login((response) => {
      const code = response.authResponse?.code;
      if (!code) {
        setPending(false);
        if (response.status !== "unknown") {
          toast.error("WhatsApp connection was cancelled.");
        }
        return;
      }

      void (async () => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        try {
          const result = await api.completeWhatsAppEmbeddedSignup({
            code,
            waba_id: sessionRef.current.waba_id,
            phone_number_id: sessionRef.current.phone_number_id,
          });
          onConnected(result);
          toast.success(result.message);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to finish WhatsApp connection");
        } finally {
          setPending(false);
        }
      })();
    }, loginOptions);
  }, [appId, onConnected, signup?.config_id]);

  return (
    <Button className="w-full" type="button" onClick={launch} disabled={disabled || pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
      Continue with WhatsApp Business
    </Button>
  );
}
