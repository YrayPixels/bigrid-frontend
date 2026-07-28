"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type PreviewViewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTH_PX: Record<Exclude<PreviewViewport, "desktop">, number> = {
  mobile: 390,
  tablet: 768,
};

const FRAME_SRC_DOC =
  '<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;background:transparent;"><div id="device-preview-root"></div></body></html>';

function syncIframeStyles(iframeDoc: Document) {
  const head = iframeDoc.head;
  head.querySelectorAll("[data-device-preview-style]").forEach((node) => node.remove());

  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute("data-device-preview-style", "true");
    head.appendChild(clone);
  });

  iframeDoc.documentElement.className = document.documentElement.className;
  iframeDoc.documentElement.style.height = "100%";
  iframeDoc.body.style.margin = "0";
  iframeDoc.body.style.height = "100%";
  iframeDoc.body.style.overflow = "auto";
  iframeDoc.body.style.background = "transparent";
}

/**
 * Renders children in a real iframe for tablet/mobile so Tailwind
 * viewport breakpoints (sm/md/lg) match the device width — not the
 * admin browser window. Desktop stays in-document.
 */
export function DevicePreviewFrame({
  viewport,
  children,
}: {
  viewport: PreviewViewport;
  children: ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  const handleLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    syncIframeStyles(doc);
    setMountNode(doc.getElementById("device-preview-root"));
  }, []);

  useEffect(() => {
    if (viewport === "desktop") {
      setMountNode(null);
      return;
    }

    const doc = iframeRef.current?.contentDocument;
    if (doc?.readyState === "complete" && doc.getElementById("device-preview-root")) {
      handleLoad();
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      const activeDoc = iframeRef.current?.contentDocument;
      if (!activeDoc) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncIframeStyles(activeDoc), 50);
    });
    observer.observe(document.head, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      setMountNode(null);
    };
  }, [handleLoad, viewport]);

  if (viewport === "desktop") {
    return <>{children}</>;
  }

  const width = VIEWPORT_WIDTH_PX[viewport];

  return (
    <div className="mx-auto w-full" style={{ maxWidth: width }}>
      <iframe
        ref={iframeRef}
        title={`${viewport} preview`}
        srcDoc={FRAME_SRC_DOC}
        onLoad={handleLoad}
        className="w-full rounded-2xl border-0 bg-transparent"
        style={{ width: "100%", height: "min(72vh, 760px)" }}
      />
      {mountNode ? createPortal(children, mountNode) : null}
    </div>
  );
}
