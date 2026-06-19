"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/builder", label: "Website Builder", icon: MessageSquare, exact: false },
  { href: "/admin/website", label: "Website", icon: Sparkles, exact: false },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
];

export function MerchantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-canvas">
        <Sidebar>
          <SidebarHeader className="border-b border-border/60 px-4 py-4">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
                <StoreIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-sm font-bold tracking-tight">Storehaus</div>
                <div className="text-xs text-ink-soft">Merchant dashboard</div>
              </div>
            </Link>
          </SidebarHeader>

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
                        <SidebarMenuButton asChild isActive={active}>
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
                <div className="px-2">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="truncate text-xs text-ink-soft">{user.email}</div>
                </div>
                <button
                  onClick={() => void signOut()}
                  className="inline-flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : null}
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-canvas-raised px-4 lg:px-6">
            <SidebarTrigger />
            <span className="text-sm font-medium text-ink-soft">Merchant dashboard</span>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
