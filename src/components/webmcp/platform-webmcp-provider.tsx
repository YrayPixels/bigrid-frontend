"use client";

import { useEffect } from "react";
import { isWebMcpSupported, registerWebMcpTools } from "@/lib/webmcp/model-context";
import { createPlatformWebMcpTools } from "@/lib/webmcp/platform-tools";

/**
 * Registers Bizgrid platform WebMCP tools on every page when the browser supports WebMCP.
 * Agents can search products across all stores; cart writes go to each store's own checkout.
 */
export function PlatformWebMcpProvider() {
  useEffect(() => {
    if (!isWebMcpSupported()) return;

    const controller = new AbortController();
    const tools = createPlatformWebMcpTools();

    void registerWebMcpTools(tools, controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
