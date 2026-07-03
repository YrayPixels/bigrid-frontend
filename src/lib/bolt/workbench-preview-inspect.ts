import { getPreviewUrl } from "@/lib/bolt/webcontainer-runtime";
import { runWebContainerCommand } from "@/lib/bolt/webcontainer-terminal";

type PreviewSurface = "static" | "webcontainer";

type RegisteredPreview = {
  surface: PreviewSurface;
  getDocument: () => Document | null;
};

let registered: RegisteredPreview | null = null;

export function registerWorkbenchPreview(target: RegisteredPreview): () => void {
  registered = target;
  return () => {
    if (registered === target) registered = null;
  };
}

function pickElements(doc: Document, selector?: string): Element[] {
  if (selector?.trim()) {
    try {
      return [...doc.querySelectorAll(selector)];
    } catch {
      return [];
    }
  }
  return [doc.documentElement];
}

function readComputedStyles(el: Element): Record<string, string> {
  const view = el.ownerDocument.defaultView;
  if (!view) return {};
  const computed = view.getComputedStyle(el);
  const keys = [
    "color",
    "background-color",
    "background",
    "font-family",
    "font-size",
    "border-color",
    "display",
    "width",
    "height",
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = computed.getPropertyValue(key);
    if (value) out[key] = value;
  }
  return out;
}

export async function inspectPreviewForAgent(args: {
  selector?: string;
  include_html?: boolean;
  include_screenshot?: boolean;
}): Promise<{
  ok: boolean;
  surface: PreviewSurface | "none";
  preview_url?: string;
  selector?: string;
  matches: Array<{
    tag: string;
    text_preview: string;
    styles: Record<string, string>;
    html_preview?: string;
  }>;
  html_excerpt?: string;
  screenshot_data_url?: string;
  message: string;
}> {
  const selector = args.selector?.trim() || undefined;
  const preview = getPreviewUrl();

  if (registered?.getDocument()) {
    const doc = registered.getDocument();
    if (!doc) {
      return {
        ok: false,
        surface: registered.surface,
        preview_url: preview?.url,
        selector,
        matches: [],
        message: "Preview document is not ready yet.",
      };
    }

    const elements = pickElements(doc, selector);
    const matches = elements.slice(0, 5).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text_preview: (el.textContent ?? "").trim().slice(0, 240),
      styles: readComputedStyles(el),
      html_preview: args.include_html ? el.outerHTML.slice(0, 1200) : undefined,
    }));

    let screenshot_data_url: string | undefined;
    if (args.include_screenshot && registered.surface === "static") {
      screenshot_data_url = await captureStaticPreviewScreenshot();
    }

    return {
      ok: matches.length > 0,
      surface: registered.surface,
      preview_url: preview?.url,
      selector,
      matches,
      screenshot_data_url,
      message:
        matches.length > 0
          ? `Inspected ${matches.length} element(s) in the ${registered.surface} preview.`
          : selector
            ? `No elements matched selector "${selector}" in the preview.`
            : "Preview document is empty.",
    };
  }

  if (preview?.port) {
    let output = "";
    const curl = await runWebContainerCommand({
      command: `curl -sS "http://127.0.0.1:${preview.port}/" | head -c 12000`,
      onOutput: (chunk) => {
        output = (output + chunk).slice(-12_000);
      },
    });

    return {
      ok: curl.exitCode === 0 && output.length > 0,
      surface: "webcontainer",
      preview_url: preview.url,
      selector,
      matches: [],
      html_excerpt: output.slice(0, 12_000),
      message:
        curl.exitCode === 0 && output.length > 0
          ? "Fetched HTML from the dev server (cross-origin preview — computed styles unavailable from parent frame)."
          : "Could not fetch preview HTML from the dev server.",
    };
  }

  return {
    ok: false,
    surface: "none",
    selector,
    matches: [],
    message: "No live preview is available yet.",
  };
}

async function captureStaticPreviewScreenshot(): Promise<string | undefined> {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Custom storefront preview"]');
  if (!iframe) return undefined;

  try {
    const { width, height } = iframe.getBoundingClientRect();
    if (width < 1 || height < 1) return undefined;

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${canvas.width}px;height:${canvas.height}px;overflow:hidden">
          ${iframe.contentDocument?.documentElement.outerHTML ?? ""}
        </div>
      </foreignObject>
    </svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    const dataUrl = await new Promise<string | undefined>((resolve) => {
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      image.src = url;
    });
    return dataUrl;
  } catch {
    return undefined;
  }
}
