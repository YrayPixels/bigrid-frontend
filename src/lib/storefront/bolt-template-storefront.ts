import { fetchBoltTemplate } from "@/lib/bolt/seed-template";
import { isBoltTemplateId } from "@/lib/bolt/templates";
import { codeFs } from "@/lib/code-fs";
import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";

export async function applyBoltTemplateToStorefront(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId,
  options?: { loadIntoCodeFs?: boolean },
): Promise<StorefrontContent> {
  if (!isBoltTemplateId(templateId)) {
    return storefront;
  }

  const files = await fetchBoltTemplate(templateId);
  if (!files?.length) {
    return storefront;
  }

  if (options?.loadIntoCodeFs !== false) {
    codeFs.loadFiles(files);
  }

  const mainHtml =
    files.find((file) => file.path.replace(/^\/+/, "") === "index.html")?.content ?? undefined;

  return {
    ...storefront,
    template: {
      id: templateId,
      source: storefront.template?.source ?? "merchant_selected",
    },
    custom_files: files,
    ...(mainHtml ? { custom_code: mainHtml } : {}),
  };
}

/** @deprecated Use applyBoltTemplateToStorefront */
export const attachBoltTemplateToStorefront = applyBoltTemplateToStorefront;

export function clearBoltProjectFromStorefront(storefront: StorefrontContent): StorefrontContent {
  const next = { ...storefront };
  delete next.custom_files;
  delete next.custom_code;
  codeFs.loadFiles([]);
  return next;
}

export async function prepareStorefrontForTemplate(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId,
): Promise<StorefrontContent> {
  if (!isBoltTemplateId(templateId)) {
    return clearBoltProjectFromStorefront(storefront);
  }

  return applyBoltTemplateToStorefront(storefront, templateId);
}
