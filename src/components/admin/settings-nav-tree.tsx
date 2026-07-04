"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BellRing,
  ChevronRight,
  CreditCard,
  ReceiptText,
  Settings,
  Store,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SettingsNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  href: string;
  page?: "store" | "plan";
  tab?: "payouts" | "operations" | "notifications" | "policies";
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: "store",
    label: "Store",
    icon: Store,
    iconClassName: "bg-sky-500/15 text-sky-600",
    href: "/admin/settings/store",
    page: "store",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    iconClassName: "bg-violet-500/15 text-violet-600",
    href: "/admin/settings/plan",
    page: "plan",
  },
  {
    id: "payouts",
    label: "Payouts",
    icon: Wallet,
    iconClassName: "bg-amber-500/15 text-amber-600",
    href: "/admin/settings?tab=payouts",
    tab: "payouts",
  },
  {
    id: "operations",
    label: "Operations",
    icon: Truck,
    iconClassName: "bg-orange-500/15 text-orange-600",
    href: "/admin/settings?tab=operations",
    tab: "operations",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: BellRing,
    iconClassName: "bg-rose-500/15 text-rose-600",
    href: "/admin/settings?tab=notifications",
    tab: "notifications",
  },
  {
    id: "policies",
    label: "Policies",
    icon: ReceiptText,
    iconClassName: "bg-slate-500/15 text-slate-600",
    href: "/admin/settings?tab=policies",
    tab: "policies",
  },
];

function isNavItemActive(item: SettingsNavItem, pathname: string, activeTab: string) {
  if (item.page) {
    return pathname.startsWith(`/admin/settings/${item.page}`);
  }
  if (item.tab) {
    return pathname === "/admin/settings" && activeTab === item.tab;
  }
  return false;
}

export function SettingsNavMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "payouts";
  const settingsActive = pathname.startsWith("/admin/settings");
  const [open, setOpen] = useState(settingsActive);

  useEffect(() => {
    if (settingsActive) setOpen(true);
  }, [settingsActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Settings" isActive={settingsActive}>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                open && "rotate-90",
              )}
            />
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item, pathname, activeTab);

              return (
                <SidebarMenuSubItem key={item.id}>
                  <SidebarMenuSubButton asChild isActive={isActive}>
                    <Link href={item.href}>
                      <span className="flex-1 truncate">{item.label}</span>
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded",
                          item.iconClassName,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
