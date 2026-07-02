"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  MessageSquare,
  FolderTree,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
} from "lucide-react";
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

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/builder", label: "Website Builder", icon: MessageSquare, exact: false },
  { href: "/admin/website", label: "Website", icon: Sparkles, exact: false },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
];

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
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
                  <StoreIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="font-display text-sm font-bold tracking-tight">Storehaus</div>
                  <div className="text-xs text-ink-soft">Merchant dashboard</div>
                </div>
              </Link>
              <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarHeader>
          <SidebarRail />

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Store</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
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
