import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Package,
  Store,
  Truck,
} from "lucide-react";
import type { MerchantDashboardMetrics, Store as MerchantStore } from "@/lib/api/types";
import { isBusinessProfileComplete } from "@/lib/business-profile";

export type LaunchChecklistStepId =
  | "payouts"
  | "store_info"
  | "shipping"
  | "products"
  | "publish"
  | "subscription";

export type LaunchChecklistStep = {
  id: LaunchChecklistStepId;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  autoComplete?: boolean;
};

export const LAUNCH_CHECKLIST_STEPS: LaunchChecklistStep[] = [
  {
    id: "payouts",
    title: "Set up payouts to receive payments",
    description:
      "Choose your preferred payment gateway and add bank details for wallet withdrawals.",
    href: "/admin/settings?tab=payouts",
    icon: Building2,
  },
  {
    id: "store_info",
    title: "Complete store information",
    description: "You can update your store information anytime from Settings.",
    href: "/admin/settings?tab=store",
    icon: Store,
    autoComplete: true,
  },
  {
    id: "shipping",
    title: "Add delivery and shipping prices",
    description: "Add shipping prices on your website so customers can checkout.",
    href: "/admin/settings?tab=operations",
    icon: Truck,
  },
  {
    id: "products",
    title: "Add products to your store",
    description: "You can always add more products later from the Products page.",
    href: "/admin/products",
    icon: Package,
    autoComplete: true,
  },
  {
    id: "publish",
    title: "Publish your website",
    description: "Make your storefront live so customers can start shopping.",
    href: "/admin/website",
    icon: BadgeCheck,
    autoComplete: true,
  },
  {
    id: "subscription",
    title: "Choose a subscription plan",
    description: "Unlock higher limits, SMS campaigns, and growth features.",
    href: "/admin/settings?tab=billing",
    icon: CreditCard,
  },
];

export type LaunchChecklistDismissState = {
  dismissedAt: string | null;
};

export type LaunchChecklistContext = {
  store: MerchantStore | null | undefined;
  metrics: MerchantDashboardMetrics | null | undefined;
};

const STORAGE_PREFIX = "storehaus-launch-checklist";
export const LAUNCH_CHECKLIST_REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(storeId: string, suffix: string) {
  return `${STORAGE_PREFIX}:${storeId}:${suffix}`;
}

export function readDismissState(storeId: string): LaunchChecklistDismissState {
  if (typeof window === "undefined") return { dismissedAt: null };
  try {
    const raw = window.localStorage.getItem(storageKey(storeId, "dismiss"));
    if (!raw) return { dismissedAt: null };
    const parsed = JSON.parse(raw) as LaunchChecklistDismissState;
    return { dismissedAt: parsed.dismissedAt ?? null };
  } catch {
    return { dismissedAt: null };
  }
}

export function writeDismissState(storeId: string, state: LaunchChecklistDismissState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(storeId, "dismiss"), JSON.stringify(state));
}

export function isLaunchChecklistStepComplete(
  stepId: LaunchChecklistStepId,
  context: LaunchChecklistContext,
): boolean {
  const store = context.store;
  if (!store) return false;

  switch (stepId) {
    case "store_info":
      return isBusinessProfileComplete({
        business_location: store.business_location ?? null,
        weekly_orders: store.weekly_orders ?? null,
        payment_currencies: store.payment_currencies ?? [],
        staff_count: store.staff_count ?? null,
        physical_store_count: store.physical_store_count ?? null,
      });
    case "products":
      return (context.metrics?.products_count ?? 0) > 0;
    case "publish":
      return store.is_published ?? false;
    default:
      return false;
  }
}

const ESSENTIAL_LAUNCH_STEP_IDS: LaunchChecklistStepId[] = ["store_info", "products", "publish"];

export function areLaunchEssentialsComplete(context: LaunchChecklistContext): boolean {
  return ESSENTIAL_LAUNCH_STEP_IDS.every((stepId) =>
    isLaunchChecklistStepComplete(stepId, context),
  );
}

export function getLaunchChecklistProgress(context: LaunchChecklistContext) {
  const steps = LAUNCH_CHECKLIST_STEPS.map((step) => ({
    ...step,
    completed: isLaunchChecklistStepComplete(step.id, context),
  }));

  const completedCount = steps.filter((step) => step.completed).length;
  const incompleteSteps = steps.filter((step) => !step.completed);

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    incompleteSteps,
    isComplete: incompleteSteps.length === 0,
    essentialsComplete: areLaunchEssentialsComplete(context),
  };
}

export function shouldRemindLaunchChecklist(
  storeId: string,
  context: LaunchChecklistContext,
  now = Date.now(),
): boolean {
  const progress = getLaunchChecklistProgress(context);
  if (progress.essentialsComplete) return false;

  return shouldShowLaunchChecklist(storeId, context, now);
}

export function shouldShowLaunchChecklist(
  storeId: string,
  context: LaunchChecklistContext,
  now = Date.now(),
): boolean {
  const { isComplete } = getLaunchChecklistProgress(context);
  if (isComplete) return false;

  const dismiss = readDismissState(storeId);
  if (!dismiss.dismissedAt) return true;

  const dismissedAt = new Date(dismiss.dismissedAt).getTime();
  if (Number.isNaN(dismissedAt)) return true;

  return now - dismissedAt >= LAUNCH_CHECKLIST_REMIND_AFTER_MS;
}

export function dismissLaunchChecklist(storeId: string) {
  writeDismissState(storeId, { dismissedAt: new Date().toISOString() });
}

export function isLaunchChecklistSnoozed(
  storeId: string,
  context: LaunchChecklistContext,
  now = Date.now(),
): boolean {
  const progress = getLaunchChecklistProgress(context);
  if (progress.essentialsComplete || progress.isComplete) return false;

  return !shouldShowLaunchChecklist(storeId, context, now);
}
