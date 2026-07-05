"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  ChevronFirst,
  ChevronLast,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Package,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SettingsNavMenu } from "@/components/admin/settings-nav-tree";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { LaunchChecklistReminder } from "@/components/admin/launch-checklist-reminder";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/builder", label: "Website Builder", icon: MessageSquare },
      { href: "/admin/website", label: "Website", icon: Sparkles },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/marketing/recovery", label: "Abandoned Cart", icon: ShoppingCart },
    ],
  },
  {
    label: "Growth",
    items: [{ href: "/admin/marketing", label: "Marketing", icon: Megaphone }],
  },
];

function isNavItemActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function DashboardSidebarCollapseTrigger() {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Expand sidebar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-sidebar-accent hover:text-ink"
      >
        <ChevronLast className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Collapse sidebar"
      className="inline-flex h-8 items-center gap-2 rounded-md px-1.5 text-ink-soft transition-colors hover:bg-sidebar-accent hover:text-ink"
    >
      <span className="h-5 w-px bg-border" aria-hidden="true" />
      <ChevronFirst className="h-4 w-4" />
    </button>
  );
}

export function MerchantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, impersonating } = useAuth();

  return (
    <SidebarProvider className="bg-canvas">
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-border/60 px-3 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center">
            <Link
              href="/admin"
              className="flex min-w-0 flex-1 items-center gap-2.5 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center"
            >
              <BizgridLogo size={36} className="shrink-0" />
              <span className="truncate font-display text-base font-bold tracking-tight text-ink group-data-[collapsible=icon]:hidden">
                Bizgrid
              </span>
            </Link>
            <DashboardSidebarCollapseTrigger />
          </div>
        </SidebarHeader>
        <SidebarRail />

        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = isNavItemActive(pathname, item);
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SettingsNavMenu />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-border/60 p-4">
          {user ? (
            <div className="space-y-3">
              <div className="px-2 group-data-[collapsible=icon]:hidden">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-ink-soft">{user.email}</div>
              </div>
              <button
                onClick={() => void signOut()}
                className="inline-flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
              </button>
            </div>
          ) : null}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex min-w-0 flex-col">
        {impersonating && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-600/30 bg-amber-500/15 px-4 py-2 text-sm text-ink">
            <span>
              Admin impersonation — viewing as <strong>{user?.name ?? "merchant"}</strong>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="font-medium text-amber-900 underline underline-offset-2 hover:text-ink dark:text-amber-200"
            >
              Exit session
            </button>
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-canvas-raised px-4 lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <span className="text-sm font-medium text-ink-soft">Merchant dashboard</span>
        </header>
        <LaunchChecklistReminder />
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
