import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
  type StorefrontTemplateType,
} from "@/lib/api/types";
import { isCodeWorkbenchEnabled } from "@/lib/features";

/** Storefront templates are JSON block layouts; bolt code projects use the workbench separately. */
export function isBoltStorefrontTemplateId(_templateId: StorefrontTemplateId): boolean {
  return false;
}

export function resolveStorefrontTemplateType(
  templateId: StorefrontTemplateId,
  templateOptions?: StorefrontTemplateOption[],
): StorefrontTemplateType {
  const option = templateOptions?.find((entry) => entry.value === templateId);
  if (option?.type) return option.type;
  return isBoltStorefrontTemplateId(templateId) ? "bolt" : "json";
}

export function isJsonStorefrontTemplate(
  templateId: StorefrontTemplateId,
  templateOptions?: StorefrontTemplateOption[],
): boolean {
  return resolveStorefrontTemplateType(templateId, templateOptions) === "json";
}

export function getJsonTemplateOptions(
  options: StorefrontTemplateOption[],
): Array<StorefrontTemplateOption & { value: StorefrontTemplateId }> {
  return getConcreteTemplateOptions(options).filter((option) =>
    isJsonStorefrontTemplate(option.value, options),
  );
}

export function getConcreteTemplateOptions(
  options: StorefrontTemplateOption[],
): Array<StorefrontTemplateOption & { value: StorefrontTemplateId }> {
  const fromInput = options.filter(
    (option): option is StorefrontTemplateOption & { value: StorefrontTemplateId } =>
      option.value !== "ai_pick" && option.is_active !== false,
  );

  const knownIds = new Set(fromInput.map((option) => option.value));
  const merged = [...fromInput];

  for (const option of STOREFRONT_TEMPLATE_OPTIONS) {
    if (option.value === "ai_pick" || knownIds.has(option.value)) continue;
    if (option.is_active === false || option.generation_status === "inactive") continue;
    merged.push(option as StorefrontTemplateOption & { value: StorefrontTemplateId });
  }

  const concrete = merged.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (isCodeWorkbenchEnabled()) return concrete;
  return concrete.filter((option) => isJsonStorefrontTemplate(option.value, options));
}
