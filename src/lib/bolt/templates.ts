export const BOLT_TEMPLATE_IDS = ["furniture-hardware", "hair-and-fashion"] as const;

export type BoltTemplateId = (typeof BOLT_TEMPLATE_IDS)[number];

export const DEFAULT_BOLT_TEMPLATE_ID: BoltTemplateId = "furniture-hardware";

export function isBoltTemplateId(value: string): value is BoltTemplateId {
  return (BOLT_TEMPLATE_IDS as readonly string[]).includes(value);
}
