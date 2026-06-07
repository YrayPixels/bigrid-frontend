"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  FileText,
  GraduationCap,
  Grid2X2,
  HandCoins,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  NotebookTabs,
  ReceiptText,
  Wallet,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { academicsApi, tenantsApi } from "@/lib/api-client";
import type { AcademicSession, AcademicTerm } from "@/lib/schoolos-types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TenantPeriodContextValue = {
  sessions: AcademicSession[];
  terms: AcademicTerm[];
  selectedSessionId: string;
  selectedTermId: string;
  selectedSession: AcademicSession | null;
  selectedTerm: AcademicTerm | null;
};

const TenantPeriodContext = createContext<TenantPeriodContextValue | null>(null);

export function useTenantPeriod() {
  const context = useContext(TenantPeriodContext);
  if (!context) {
    throw new Error("useTenantPeriod must be used inside TenantShell");
  }

  return context;
}

const navSections = [
  {
    label: "Main Menu",
    items: [
      {
        href: (slug: string) => `/t/${slug}`,
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: (slug: string) => `/t/${slug}/messages`,
        label: "Messages",
        icon: MessageCircle,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/messages`),
      },
      {
        href: (slug: string) => `/t/${slug}/events`,
        label: "Events",
        icon: CalendarDays,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/events`),
      },
    ],
  },
  {
    label: "Users Management",
    items: [
      {
        href: (slug: string) => `/t/${slug}/students`,
        label: "Students",
        icon: Users,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/students`),
        hasChildren: true,
      },
      {
        href: (slug: string) => `/t/${slug}/employees`,
        label: "Employees",
        icon: BriefcaseBusiness,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/employees`),
        hasChildren: true,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        href: (slug: string) => `/t/${slug}/academics/classes`,
        label: "Classes",
        icon: Grid2X2,
        match: (pathname: string, slug: string) =>
          pathname === `/t/${slug}/academics` || pathname === `/t/${slug}/academics/classes`,
      },
      {
        href: (slug: string) => `/t/${slug}/academics/subjects`,
        label: "Subjects",
        icon: BookOpen,
        match: (pathname: string, slug: string) => pathname === `/t/${slug}/academics/subjects`,
      },
      {
        href: (slug: string) => `/t/${slug}/attendance`,
        label: "Attendance",
        icon: CalendarCheck,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/attendance`),
      },
      {
        href: (slug: string) => `/t/${slug}/academics/exams`,
        label: "Exams",
        icon: ClipboardList,
        match: (pathname: string, slug: string) => pathname === `/t/${slug}/academics/exams`,
      },
      {
        href: (slug: string) => `/t/${slug}/timetable`,
        label: "Time Table",
        icon: CalendarClock,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/timetable`),
      },
      {
        href: (slug: string) => `/t/${slug}/settings`,
        label: "Leave Requests",
        icon: NotebookTabs,
      },
    ],
  },
  {
    label: "Finance Management",
    items: [
      {
        href: (slug: string) => `/t/${slug}/finance`,
        label: "Accounts",
        icon: Wallet,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/finance`),
      },
      {
        href: (slug: string) => `/t/${slug}/finance`,
        label: "Salaries",
        icon: HandCoins,
        hasChildren: true,
      },
      {
        href: (slug: string) => `/t/${slug}/finance`,
        label: "Fee Management",
        icon: ReceiptText,
        hasChildren: true,
      },
    ],
  },
  {
    label: "Others",
    items: [
      {
        href: (slug: string) => `/t/${slug}/settings`,
        label: "Support Center",
        icon: Headphones,
      },
      {
        href: (slug: string) => `/t/${slug}/settings`,
        label: "Policies & Agreements",
        icon: FileText,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        href: (slug: string) => `/t/${slug}/settings`,
        label: "Settings",
        icon: Settings,
        match: (pathname: string, slug: string) => pathname.startsWith(`/t/${slug}/settings`),
      },
    ],
  },
] as const;

export function TenantShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [periodInitialized, setPeriodInitialized] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, user, router, pathname]);

  const { data, isLoading, error } = useQuery({
    enabled: !!user,
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = data?.tenant?.id;

  const sessionsQ = useQuery({
    queryKey: ["sessions", tenantId],
    queryFn: () => academicsApi.sessions(tenantId!),
    enabled: !!tenantId,
  });
  const termsQ = useQuery({
    queryKey: ["terms", tenantId],
    queryFn: () => academicsApi.terms(tenantId!),
    enabled: !!tenantId,
  });
  const sessions = useMemo(() => sessionsQ.data?.sessions ?? [], [sessionsQ.data?.sessions]);
  const terms = useMemo(() => termsQ.data?.terms ?? [], [termsQ.data?.terms]);
  const selectedSession =
    sessions.find((session) => String(session.id) === selectedSessionId) ?? null;
  const selectedTerm = terms.find((term) => String(term.id) === selectedTermId) ?? null;
  const availableTerms = useMemo(
    () =>
      selectedSessionId
        ? terms.filter((term) => String(term.academic_session_id ?? "") === selectedSessionId)
        : terms,
    [selectedSessionId, terms],
  );

  useEffect(() => {
    if (!sessions.length || periodInitialized) return;

    const activeSession = sessions.find((session) => session.status === "active") ?? sessions[0];
    setSelectedSessionId(String(activeSession.id));
    setPeriodInitialized(true);
  }, [periodInitialized, sessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedTermId("");
      return;
    }

    const termStillApplies = availableTerms.some((term) => String(term.id) === selectedTermId);
    if (termStillApplies) return;

    const currentTerm = availableTerms.find((term) => term.is_current) ?? availableTerms[0];
    setSelectedTermId(currentTerm ? String(currentTerm.id) : "");
  }, [availableTerms, selectedSessionId, selectedTermId]);

  const periodContext = useMemo<TenantPeriodContextValue>(
    () => ({
      sessions,
      terms,
      selectedSessionId,
      selectedTermId,
      selectedSession,
      selectedTerm,
    }),
    [sessions, selectedSession, selectedSessionId, selectedTerm, selectedTermId, terms],
  );

  useEffect(() => {
    if (!isLoading && data && !data.tenant) router.replace("/app");
  }, [isLoading, data, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-destructive">
        Couldn&apos;t load school: {error.message}
      </div>
    );
  }

  if (!data?.tenant) return null;
  const tenant = data.tenant;

  const pageLabel =
    pathname === `/t/${slug}` ? "Dashboard" : (pathname.split("/").pop() ?? "Dashboard");

  return (
    <TenantPeriodContext.Provider value={periodContext}>
      <SidebarProvider style={{ "--sidebar-width": "17.25rem" } as React.CSSProperties}>
        <div className="flex min-h-screen w-full bg-[#f7f6fb]">
          <Sidebar collapsible="icon" className="border-r-0 bg-white">
            <SidebarHeader className="border-b-0 px-4 pb-3 pt-5">
              <div className="flex items-center gap-3 px-1">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0e9ff] text-[#8b35e8] ring-4 ring-[#f8f4ff]">
                  <GraduationCap className="h-5 w-5" />
                  <ShieldCheck className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-[#ff8a24]" />
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="truncate text-sm font-semibold leading-tight">{tenant.name}</div>
                  <div className="truncate text-xs font-medium text-muted-foreground">Platform</div>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="gap-0 px-3 pb-4">
              {navSections.map((section) => (
                <SidebarGroup key={section.label} className="px-0 py-1.5">
                  <SidebarGroupLabel className="h-7 px-3 text-[11px] font-medium text-[#9b95a5]">
                    {section.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {section.items.map((item) => {
                        const href = item.href(slug);
                        const active =
                          "match" in item && item.match
                            ? item.match(pathname, slug)
                            : "exact" in item && item.exact
                              ? pathname === href
                              : false;
                        return (
                          <SidebarMenuItem key={`${section.label}-${item.label}`}>
                            <SidebarMenuButton
                              asChild
                              isActive={active}
                              tooltip={item.label}
                              className="h-9 rounded-xl px-3 text-[13px] font-medium text-[#3f3a48] hover:bg-[#f5efff] hover:text-[#8b35e8] data-[active=true]:bg-[#f3eaff] data-[active=true]:text-[#8b35e8] group-data-[collapsible=icon]:rounded-lg"
                            >
                              <Link href={href}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                                {"hasChildren" in item && item.hasChildren ? (
                                  <ChevronLeft className="ml-auto h-3.5 w-3.5 rotate-180 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                                ) : null}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
            <SidebarFooter className="border-t-0 px-3 pb-5">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="All schools"
                    className="h-9 rounded-xl px-3 text-[13px] font-medium text-[#3f3a48] hover:bg-[#f5efff] hover:text-[#8b35e8]"
                  >
                    <Link href="/app">
                      <ChevronLeft className="h-4 w-4" />
                      <span>All schools</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-30 flex min-h-16 flex-col gap-3 border-b border-border/50 bg-white/90 px-5 py-3 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <span className="text-sm capitalize text-muted-foreground">{pageLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={selectedSessionId || "all"}
                  onValueChange={(value) => {
                    const nextSessionId = value === "all" ? "" : value;
                    const nextTerms =
                      nextSessionId === ""
                        ? terms
                        : terms.filter(
                            (term) => String(term.academic_session_id ?? "") === nextSessionId,
                          );
                    const currentTerm = nextTerms.find((term) => term.is_current) ?? nextTerms[0];

                    setSelectedSessionId(nextSessionId);
                    setPeriodInitialized(true);
                    setSelectedTermId(currentTerm ? String(currentTerm.id) : "");
                  }}
                >
                  <SelectTrigger className="h-10 w-[190px] rounded-xl border-border/60 bg-white text-sm shadow-sm">
                    <SelectValue placeholder="Academic session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={String(session.id)}>
                        {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedTermId || "all"}
                  onValueChange={(value) => setSelectedTermId(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-10 w-[170px] rounded-xl border-border/60 bg-white text-sm shadow-sm">
                    <SelectValue placeholder="Academic term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {availableTerms.map((term) => (
                      <SelectItem key={term.id} value={String(term.id)}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl border-border/60 bg-white"
                >
                  <Link href={`/t/${slug}/academics/sessions`}>Manage sessions</Link>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-4 w-4" />
                </Button>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign out
                </Button>
              </div>
            </header>
            <main className="flex-1 p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </TenantPeriodContext.Provider>
  );
}
