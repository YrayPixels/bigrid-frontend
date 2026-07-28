import { codeFs, type CodeFile } from "@/lib/code-fs";
import { needsBoltTemplateSeed } from "@/lib/bolt/project-utils";
import { DEFAULT_BOLT_TEMPLATE_ID, type BoltTemplateId } from "@/lib/bolt/templates";

export async function fetchBoltTemplate(
  templateId: BoltTemplateId = DEFAULT_BOLT_TEMPLATE_ID,
): Promise<CodeFile[] | null> {
  const { getToken } = await import("@/lib/api/client");
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api/bolt/templates/${templateId}`, {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = (await res.json().catch(() => null)) as { files?: CodeFile[] } | null;
  return data?.files?.length ? data.files : null;
}

export async function seedBoltTemplateIfNeeded(
  existing?: CodeFile[],
  templateId: BoltTemplateId = DEFAULT_BOLT_TEMPLATE_ID,
): Promise<boolean> {
  const current = existing ?? codeFs.exportFiles();
  if (codeFs.listFiles().length > 0 && !needsBoltTemplateSeed(codeFs.exportFiles())) {
    return false;
  }
  if (!needsBoltTemplateSeed(current)) return false;

  const files = await fetchBoltTemplate(templateId);
  if (!files?.length) return false;

  codeFs.loadFiles(files);
  return true;
}

/** @deprecated Use seedBoltTemplateIfNeeded */
export const seedBuildItUpIfNeeded = seedBoltTemplateIfNeeded;
