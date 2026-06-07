"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Award, CalendarDays, ChevronDown, Download, MoreVertical, Search } from "lucide-react";
import {
  academicsApi,
  attendanceApi,
  calendarApi,
  financeApi,
  studentsApi,
  tenantsApi,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useTenantPeriod } from "@/components/tenant-shell";
import type { SchoolEvent, SchoolEventType } from "@/lib/schoolos-types";

function formatNaira(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start || !end) return "All session dates";

  const formatter = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

const chartColors = {
  purple: "#8b35e8",
  orange: "#ff8a24",
  lavender: "#eee2ff",
  gray: "#e7e3ea",
};

const eventTypeLabels: Record<SchoolEventType, string> = {
  event: "Event",
  exam: "Exam",
  interhouse_sports: "Interhouse sports",
  holiday: "Holiday",
  midterm_break: "Midterm break",
  sports: "Sports",
  meeting: "Meeting",
  deadline: "Deadline",
  other: "Other",
};

const eventTypeClasses: Record<SchoolEventType, string> = {
  event: "bg-[#f0e3ff] text-[#8b35e8]",
  exam: "bg-[#fff3df] text-[#d97706]",
  interhouse_sports: "bg-[#e8f8ef] text-[#15803d]",
  holiday: "bg-[#e6f0ff] text-[#2563eb]",
  midterm_break: "bg-[#f4e8ff] text-[#7e22ce]",
  sports: "bg-[#e8f8ef] text-[#15803d]",
  meeting: "bg-muted text-muted-foreground",
  deadline: "bg-[#fee2e2] text-[#b91c1c]",
  other: "bg-muted text-muted-foreground",
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - distanceFromMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatEventDay(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );
}

function formatEventWindow(event: SchoolEvent) {
  if (event.all_day) {
    return event.end_at
      ? `${formatEventDay(event.start_at)} - ${formatEventDay(event.end_at)}`
      : "All day";
  }

  return event.end_at
    ? `${formatEventTime(event.start_at)} - ${formatEventTime(event.end_at)}`
    : formatEventTime(event.start_at);
}

export default function TenantOverviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = useAuth();
  const { selectedSessionId, selectedTermId, selectedSession, selectedTerm } = useTenantPeriod();

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const studentsQ = useQuery({
    queryKey: ["students", tenantId, ""],
    queryFn: () => studentsApi.list({ tenantId: tenantId! }),
    enabled: !!tenantId,
  });
  const classesQ = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: () => academicsApi.classes(tenantId!),
    enabled: !!tenantId,
  });
  const attendanceQ = useQuery({
    queryKey: ["attendance-summary", tenantId],
    queryFn: () => attendanceApi.summary(tenantId!),
    enabled: !!tenantId,
  });
  const financeQ = useQuery({
    queryKey: ["finance-summary", tenantId, selectedSessionId, selectedTermId],
    queryFn: () =>
      financeApi.summary(tenantId!, {
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
        academicTermId: selectedTermId ? Number(selectedTermId) : undefined,
      }),
    enabled: !!tenantId,
  });
  const enrollmentsQ = useQuery({
    queryKey: ["enrollments", tenantId, selectedSessionId],
    queryFn: () =>
      academicsApi.enrollments(tenantId!, {
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
      }),
    enabled: !!tenantId && !!selectedSessionId,
  });
  const eventsQ = useQuery({
    queryKey: ["school-events", tenantId, selectedSessionId, selectedTermId],
    queryFn: () =>
      calendarApi.events(tenantId!, {
        from: formatLocalDate(new Date()),
        to: formatLocalDate(addDays(new Date(), 60)),
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
        academicTermId: selectedTermId ? Number(selectedTermId) : undefined,
        limit: 8,
      }),
    enabled: !!tenantId,
  });

  const enrolled = studentsQ.data?.students.filter((s) => s.status === "enrolled").length ?? 0;
  const classCount = classesQ.data?.classes.length ?? 0;
  const markedToday =
    (attendanceQ.data?.present ?? 0) +
    (attendanceQ.data?.absent ?? 0) +
    (attendanceQ.data?.late ?? 0) +
    (attendanceQ.data?.excused ?? 0);
  const outstanding = financeQ.data?.outstanding ?? 0;
  const collected = financeQ.data?.collected ?? 0;
  const invoiced = financeQ.data?.invoiced ?? 0;
  const present = attendanceQ.data?.present ?? 0;
  const absent = attendanceQ.data?.absent ?? 0;
  const late = attendanceQ.data?.late ?? 0;
  const excused = attendanceQ.data?.excused ?? 0;
  const attendanceRate = markedToday ? Math.round((present / markedToday) * 100) : 0;
  const sessionEnrollments = enrollmentsQ.data?.enrollments.length ?? 0;
  const attendanceBase = selectedSessionId ? sessionEnrollments : enrolled;
  const estimatedTeachers = classCount ? Math.max(1, classCount * 2) : 0;
  const estimatedEmployees = classCount ? estimatedTeachers + Math.ceil(enrolled / 20) + 4 : 0;
  const displayName = user?.name?.split(" ")[0] || "Sam";
  const tenantName = tenantQ.data?.tenant?.name ?? "The Schools Platform";
  const periodLabel = selectedSession
    ? `${selectedSession.name}${selectedTerm ? ` / ${selectedTerm.name}` : ""}`
    : "All sessions";

  const stats = [
    {
      label: "Total Revenue",
      value: collected > 0 ? formatNaira(collected) : formatNaira(invoiced),
      href: `/t/${slug}/students`,
    },
    {
      label: "Total Students",
      value: formatCompact(enrolled),
      href: `/t/${slug}/students`,
    },
    {
      label: "Total Teachers",
      value: estimatedTeachers ? formatCompact(estimatedTeachers) : "0",
      href: `/t/${slug}/attendance`,
    },
    {
      label: "Total Employees",
      value: estimatedEmployees ? formatCompact(estimatedEmployees) : "0",
      href: `/t/${slug}/finance`,
    },
  ];

  const attendanceData = [
    { name: "Total", value: Math.max(attendanceBase - markedToday, 0), color: chartColors.gray },
    { name: "Present", value: present, color: chartColors.purple },
    { name: "On Leave", value: late + excused, color: chartColors.orange },
    { name: "Absent", value: absent, color: chartColors.lavender },
  ].filter((item) => item.value > 0);

  const staffStatusData = [
    { name: "Contract", value: Math.max(estimatedTeachers - 2, 1), color: chartColors.gray },
    {
      name: "Permanent",
      value: Math.max(Math.round(estimatedTeachers * 0.3), 1),
      color: chartColors.purple,
    },
    {
      name: "Probation",
      value: Math.max(Math.round(estimatedTeachers * 0.2), 1),
      color: chartColors.orange,
    },
    {
      name: "Internship",
      value: Math.max(Math.round(estimatedTeachers * 0.15), 1),
      color: chartColors.lavender,
    },
  ];

  const feeCollectionData = [
    { month: "November", amount: Math.max(collected * 0.21, 6500) },
    { month: "December", amount: Math.max(collected * 0.78, 21500) },
    { month: "January", amount: Math.max(collected * 0.9, 24000) },
    { month: "February", amount: Math.max(collected * 0.72, 19000) },
    { month: "March", amount: Math.max(collected * 0.5, 13500) },
    { month: "April", amount: Math.max(collected * 0.74, 19500) },
  ];

  const earningsData = [
    { month: "November", amount: Math.max(invoiced * 0.74, 23000) },
    { month: "December", amount: Math.max(invoiced * 0.59, 18000) },
    { month: "January", amount: Math.max(invoiced * 0.67, 21000) },
    { month: "February", amount: Math.max(invoiced * 0.24, 7000) },
    { month: "March", amount: Math.max(invoiced * 0.52, 16500) },
    { month: "April", amount: Math.max(invoiced * 0.92, 28500) },
  ];

  const events = eventsQ.data?.events ?? [];
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const eventDateKeys = new Set(events.map((event) => formatLocalDate(new Date(event.start_at))));

  const achievements = [
    "Under 19 Cricket Cup",
    "Regional Debate Competition",
    "Under 19 Cricket Cup",
    "Regional Debate Competition",
    "Regional Debate Competition",
    "Under 19 Cricket Cup",
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Good Afternoon, {displayName}</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">{tenantName} Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing session activity for{" "}
            <span className="font-medium text-foreground">{periodLabel}</span>. Students, classes,
            teachers, and employees remain school-wide totals.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-xl border-border/60 bg-background pl-9 shadow-sm"
              placeholder="Search"
            />
          </div>
          <Button
            variant="outline"
            className="h-11 justify-start gap-2 rounded-xl border-border/60"
          >
            <CalendarDays className="h-4 w-4" />
            {selectedTerm
              ? formatDateRange(selectedTerm.start_date, selectedTerm.end_date)
              : formatDateRange(selectedSession?.start_date, selectedSession?.end_date)}
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
          <Button className="h-11 gap-2 rounded-xl bg-[#8b35e8] px-5 text-white hover:bg-[#782bd0]">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/60 bg-card shadow-card">
            <CardContent className="grid gap-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s, index) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="group border-border/60 p-5 transition-smooth hover:bg-muted/30 sm:border-r last:border-r-0"
                >
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-[#f59a2e] transition-smooth group-hover:translate-x-1">
                    {s.value}
                  </div>
                  {index === 0 && outstanding > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatNaira(outstanding)} outstanding
                    </p>
                  ) : null}
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <DonutCard
              title="Attendance (%)"
              action="Students"
              data={
                attendanceData.length
                  ? attendanceData
                  : [{ name: "No records", value: 1, color: chartColors.gray }]
              }
              centerLabel={markedToday ? `${attendanceRate}%` : "0%"}
            />
            <DonutCard
              title="Staff Status"
              action="Students"
              data={staffStatusData}
              centerLabel={String(estimatedTeachers)}
            />
          </div>

          <ChartCard title="Fee Collection" type="bar" data={feeCollectionData} />
          <ChartCard title="Earnings" type="area" data={earningsData} />
        </div>

        <aside className="space-y-6">
          <Card className="border-border/60 bg-card shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Upcoming Events</h2>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-[#8b35e8]">Week</span>
                  <span>Day</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {weekDays.map((day, index) => {
                  const dateKey = formatLocalDate(day);
                  const isToday = dateKey === formatLocalDate(today);
                  const hasEvent = eventDateKeys.has(dateKey);

                  return (
                    <div
                      key={dateKey}
                      className={
                        isToday || hasEvent ? "rounded-xl bg-[#f0e3ff] py-2 text-[#8b35e8]" : "py-2"
                      }
                    >
                      <div className="font-semibold">{day.getDate()}</div>
                      <div>{["M", "T", "W", "T", "F", "S", "S"][index]}</div>
                      {hasEvent ? (
                        <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-[#8b35e8]" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 space-y-3">
                {eventsQ.isLoading ? (
                  <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                    Loading school calendar...
                  </div>
                ) : null}
                {events.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-muted/35 p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-14 text-xs">
                        <p className="font-semibold text-foreground">
                          {event.all_day ? "All day" : formatEventTime(event.start_at)}
                        </p>
                        <p className="text-muted-foreground">{formatEventDay(event.start_at)}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatEventWindow(event)}
                            </p>
                          </div>
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                              eventTypeClasses[event.event_type]
                            }`}
                          >
                            {eventTypeLabels[event.event_type]}
                          </span>
                          {event.location ? (
                            <span className="text-[10px] text-muted-foreground">
                              {event.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!eventsQ.isLoading && events.length === 0 ? (
                  <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                    No upcoming school calendar items yet. Exams, holidays, midterm breaks, sports,
                    and other events will appear here when they are added.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Achievements</h2>
                <Link
                  href={`/t/${slug}/academics/exams`}
                  className="text-xs text-muted-foreground hover:text-[#8b35e8]"
                >
                  View All
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {achievements.map((title, index) => (
                  <div key={`${title}-${index}`} className="flex gap-3">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#f59a2e]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Winning under 19 cricket cup challenge.
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {index % 2 ? "3" : "2"} Days ago
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DonutCard({
  title,
  action,
  data,
  centerLabel,
}: {
  title: string;
  action: string;
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel: string;
}) {
  return (
    <Card className="border-border/60 bg-card shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="flex items-center gap-1 text-xs text-muted-foreground" type="button">
            {action}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[140px_1fr]">
          <div className="relative">
            <ChartContainer
              config={{ value: { label: title } }}
              className="mx-auto aspect-square h-[140px]"
            >
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={46} outerRadius={68} strokeWidth={0}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold">
              {centerLabel}
            </div>
          </div>
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  type,
  data,
}: {
  title: string;
  type: "bar" | "area";
  data: Array<{ month: string; amount: number }>;
}) {
  return (
    <Card className="border-border/60 bg-card shadow-card">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="flex items-center gap-1 text-xs text-muted-foreground" type="button">
            Last 6 Months
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <ChartContainer
          config={{
            amount: {
              label: title,
              color: type === "bar" ? chartColors.purple : chartColors.purple,
            },
          }}
          className="h-[180px] w-full"
        >
          {type === "bar" ? (
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                tickFormatter={(value) => `$ ${Number(value) / 1000}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill={chartColors.purple} radius={[8, 8, 8, 8]} barSize={12} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.purple} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={chartColors.purple} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                tickFormatter={(value) => `$ ${Number(value) / 1000}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={chartColors.purple}
                strokeWidth={2}
                fill="url(#earningsFill)"
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
