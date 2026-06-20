import type { Store, StorefrontContent } from "@/lib/api/types";
import {
  blockTypeLabel,
  canRemoveHomeBlock,
  createHomeBlock,
  insertHomeBlock,
  isAddableHomeBlockType,
  MAX_HOME_BLOCKS,
  resolveBlockTypeFromInstruction,
  resolvePlacementFromInstruction,
  resolveRemoveBlockId,
  isFaqItemAppendInstruction,
} from "@/lib/storefront/blocks/catalog";
import {
  findHomeBlockIndex,
  resolveHomeBlocks,
  syncLegacyFieldsFromHomeBlocks,
} from "@/lib/storefront/blocks/sync-legacy";
import {
  defaultContactFormProps,
  migrateContactBlocks,
} from "@/lib/storefront/blocks/migrate-page-blocks";
import { syncLegacyFieldsFromContactBlocks } from "@/lib/storefront/blocks/sync-page-legacy";
import { tryApplyPageBlockInstruction } from "@/lib/storefront/blocks/page-block-operations";
import type { ContactFormField, StorefrontBlockOperation } from "@/lib/storefront/blocks/types";

const BLOCK_LABELS: Record<string, string> = {
  "hero-main": "homepage hero",
  "home-stats": "homepage stats",
  "about-spotlight": "about spotlight",
  "serum-promo": "promo banner",
  "trust-features": "trust highlights",
  "featured-products": "product section",
  "home-faq": "homepage FAQ",
};

export function describeBlockChanges(
  changedBlockIds: string[],
  operations: StorefrontBlockOperation[] = [],
): string {
  const addOp = operations.find((operation) => operation.op === "add_block");
  if (addOp?.op === "add_block") {
    return `Done — I added a ${blockTypeLabel(addOp.type)} to your homepage. Check the preview on the right.`;
  }

  const removeOp = operations.find((operation) => operation.op === "remove_block");
  if (removeOp?.op === "remove_block") {
    const label = BLOCK_LABELS[removeOp.block_id] ?? "homepage section";
    return `Done — I removed the ${label} from your homepage. Check the preview on the right.`;
  }

  const readable = changedBlockIds.map((id) => BLOCK_LABELS[id] ?? "homepage section");
  if (readable.length === 1) {
    return `Done — I updated the ${readable[0]}. Check the preview on the right.`;
  }
  if (readable.length === 2) {
    return `Done — I updated the ${readable[0]} and ${readable[1]}. Check the preview on the right.`;
  }
  return "Done — I updated your homepage sections. Check the preview on the right.";
}

function persistHomeBlocks(
  next: StorefrontContent,
  blocks: ReturnType<typeof resolveHomeBlocks>,
): StorefrontContent {
  next.pages = {
    ...next.pages,
    about: next.pages?.about ?? {
      title: next.about.title,
      body: next.about.body,
      source: "ai_generated",
    },
    contact: next.pages?.contact ?? {
      title: "Contact us",
      body: "",
      email: null,
      phone: null,
      source: "ai_generated",
    },
    faq: next.pages?.faq ?? {
      title: "Frequently asked questions",
      source: "ai_generated",
      items: [],
    },
    privacy_policy: next.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default",
    },
    home: { blocks },
  };

  syncLegacyFieldsFromHomeBlocks(next, blocks);
  return next;
}

export function applyHomeBlockOperations(
  storefront: StorefrontContent,
  operations: StorefrontBlockOperation[],
): { storefront: StorefrontContent; changed_block_ids: string[] } {
  const next = structuredClone(storefront);
  const blocks = resolveHomeBlocks(next);
  const changed = new Set<string>();

  for (const operation of operations) {
    if (operation.op === "update_block") {
      const index = findHomeBlockIndex(blocks, operation.block_id);
      if (index < 0) continue;
      blocks[index] = {
        ...blocks[index],
        props: {
          ...blocks[index].props,
          ...operation.props,
        },
      };
      changed.add(operation.block_id);
      continue;
    }

    if (operation.op === "reorder_blocks") {
      const lookup = new Map(blocks.map((block) => [block.id, block]));
      const reordered = operation.order
        .map((id) => lookup.get(id))
        .filter((block): block is NonNullable<typeof block> => !!block);
      const remaining = blocks.filter((block) => !operation.order.includes(block.id));
      blocks.splice(0, blocks.length, ...reordered, ...remaining);
      operation.order.forEach((id) => changed.add(id));
      continue;
    }

    if (operation.op === "remove_block") {
      if (!canRemoveHomeBlock(operation.block_id)) continue;
      const index = findHomeBlockIndex(blocks, operation.block_id);
      if (index < 0) continue;
      blocks.splice(index, 1);
      changed.add(operation.block_id);
      continue;
    }

    if (operation.op === "add_block") {
      if (!isAddableHomeBlockType(operation.type) || blocks.length >= MAX_HOME_BLOCKS) continue;

      const block = createHomeBlock(
        operation.type,
        next,
        blocks.map((item) => item.id),
        operation.props,
      );
      insertHomeBlock(blocks, block, {
        after: operation.after,
        before: operation.before,
      });
      changed.add(block.id);
    }
  }

  return {
    storefront: persistHomeBlocks(next, blocks),
    changed_block_ids: [...changed],
  };
}

export function parseHomeBlockInstruction(
  instruction: string,
  storefront: StorefrontContent,
): StorefrontBlockOperation[] | null {
  const lower = instruction.toLowerCase();
  const blocks = resolveHomeBlocks(storefront);
  const currentOrder = blocks.map((block) => block.id);

  if (/\b(remove|delete|hide)\b/.test(lower)) {
    const blockId = resolveRemoveBlockId(instruction, blocks);
    if (blockId && canRemoveHomeBlock(blockId) && findHomeBlockIndex(blocks, blockId) >= 0) {
      return [{ op: "remove_block", block_id: blockId }];
    }
  }

  if (/\b(add|insert|create|include)\b/.test(lower) && !isFaqItemAppendInstruction(instruction)) {
    const type = resolveBlockTypeFromInstruction(instruction);
    if (type && isAddableHomeBlockType(type)) {
      const placement = resolvePlacementFromInstruction(instruction, blocks);
      return [
        {
          op: "add_block",
          type,
          after: placement.after,
          before: placement.before,
        },
      ];
    }
  }

  if (/\bmove\b.*\bfaq\b.*\babove\b.*\bproduct/.test(lower)) {
    return [{ op: "reorder_blocks", order: buildOrderWithFaqBeforeProducts(currentOrder) }];
  }

  if (/\bmove\b.*\bproduct/.test(lower) && /\babove\b.*\bfaq/.test(lower)) {
    return [{ op: "reorder_blocks", order: buildOrderWithProductsBeforeFaq(currentOrder) }];
  }

  if (/\b(make|update).*\b(trust|feature|highlight)/.test(lower) && /\bpremium|luxury|refined/.test(lower)) {
    return [
      {
        op: "update_block",
        block_id: "trust-features",
        props: {
          title: "Why Choose Us",
          body: "Premium formulas, calm textures, and trust blocks designed for a refined everyday routine.",
        },
      },
    ];
  }

  if (/\b(make|update).*\bhero\b.*\bpremium|luxury/.test(lower)) {
    return [
      {
        op: "update_block",
        block_id: "hero-main",
        props: {
          subheadline: "Premium botanical skincare with clean formulas and a refined daily ritual.",
        },
      },
    ];
  }

  return null;
}

function buildOrderWithFaqBeforeProducts(currentOrder: string[]): string[] {
  const without = currentOrder.filter((id) => id !== "home-faq" && id !== "featured-products");
  const anchorIndex = without.indexOf("trust-features");
  const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : without.length;
  return [...without.slice(0, insertAt), "home-faq", "featured-products", ...without.slice(insertAt)];
}

function buildOrderWithProductsBeforeFaq(currentOrder: string[]): string[] {
  const without = currentOrder.filter((id) => id !== "home-faq" && id !== "featured-products");
  const anchorIndex = without.indexOf("trust-features");
  const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : without.length;
  return [...without.slice(0, insertAt), "featured-products", "home-faq", ...without.slice(insertAt)];
}

export function tryApplyContactFormInstruction(
  storefront: StorefrontContent,
  instruction: string,
): { storefront: StorefrontContent; changed_paths: string[]; assistant_message: string } | null {
  const lower = instruction.toLowerCase();
  if (
    !/\bcontact form\b/.test(lower) &&
    !(/\b(add|create|include)\b/.test(lower) && /\bform\b/.test(lower))
  ) {
    return null;
  }

  const fields = resolveContactFormFieldsFromInstruction(instruction);
  const next = structuredClone(storefront);
  const blocks = migrateContactBlocks(next).map((block) => ({
    ...block,
    props: { ...block.props },
  }));

  const formIndex = blocks.findIndex((block) => block.type === "contact_form");
  if (formIndex < 0) {
    blocks.push({
      id: "contact-form",
      type: "contact_form",
      props: defaultContactFormProps(next, fields),
    });
  } else {
    blocks[formIndex] = {
      ...blocks[formIndex],
      props: {
        ...blocks[formIndex].props,
        fields,
      },
    };
  }

  next.pages = {
    ...next.pages,
    contact: {
      ...(next.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "ai_generated" as const,
      }),
      blocks,
    },
    about: next.pages?.about ?? {
      title: next.about.title,
      body: next.about.body,
      source: "ai_generated" as const,
    },
    faq: next.pages?.faq ?? {
      title: "Frequently asked questions",
      source: "ai_generated" as const,
      items: [],
    },
    privacy_policy: next.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default" as const,
    },
  };

  syncLegacyFieldsFromContactBlocks(next, blocks);

  return {
    storefront: next,
    changed_paths: ["pages.contact.blocks.contact-form"],
    assistant_message: "Done — I updated the contact page form. Check the preview on the right.",
  };
}

function resolveContactFormFieldsFromInstruction(instruction: string): ContactFormField[] {
  const lower = instruction.toLowerCase();
  const fields: ContactFormField[] = [];

  if (/\bname\b/.test(lower)) {
    fields.push({ name: "name", label: "Full name", type: "text", required: true });
  }
  if (/\bemail\b/.test(lower)) {
    fields.push({ name: "email", label: "Email", type: "email", required: true });
  }
  if (/\border number\b/.test(lower)) {
    fields.push({ name: "order_number", label: "Order number", type: "text", required: true });
  }
  if (/\bphone\b/.test(lower)) {
    fields.push({ name: "phone", label: "Phone", type: "tel", required: false });
  }
  if (/\bmessage\b/.test(lower)) {
    fields.push({ name: "message", label: "Message", type: "textarea", required: true });
  }

  if (fields.length) return fields;

  return defaultContactFormProps({} as StorefrontContent).fields;
}

export function tryApplyHomeBlockInstruction(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
): { storefront: StorefrontContent; changed_paths: string[]; assistant_message: string } | null {
  return tryApplyPageBlockInstruction(storefront, instruction, store);
}
