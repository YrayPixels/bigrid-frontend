"use client";

import { useEffect } from "react";
import { ensurePlatformWebMcpTools } from "@/lib/webmcp/bootstrap";

/**
 * Registers Bizgrid platform WebMCP tools on every page when the browser supports WebMCP.
 * Agents can search products across all stores; cart writes go to each store's own checkout.
 */
export function PlatformWebMcpProvider() {
  useEffect(() => {
    void ensurePlatformWebMcpTools();
  }, []);

  return null;
}
