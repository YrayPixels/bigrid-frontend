"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  ShoppingBag,
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
    items: [{ href: "/admin/orders", label: "Orders", icon: ShoppingBag }],
  },
];

function isNavItemActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function MerchantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider className="bg-canvas">
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-border/60 px-4 py-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Link
              href="/admin"
              className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center"
            >
              <BizgridLogo size={32} className="shrink-0 group-data-[collapsible=icon]:justify-center" />
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="font-display text-sm font-bold tracking-tight">Bizgrid</div>
                <div className="text-xs text-ink-soft">Merchant dashboard</div>
              </div>
            </Link>
            <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />
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
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-canvas-raised px-4 lg:px-6">
          <SidebarTrigger />
          <span className="text-sm font-medium text-ink-soft">Merchant dashboard</span>
        </header>
        <LaunchChecklistReminder />
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
