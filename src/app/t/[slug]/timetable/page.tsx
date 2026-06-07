"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  academicsApi,
  calendarApi,
  employeesApi,
  tenantsApi,
  timetableApi,
} from "@/lib/api-client";
import type {
  Employee,
  SchoolClass,
  Subject,
  TimetableHoliday,
  TimetablePeriod,
  TimetableWeekday,
} from "@/lib/schoolos-types";
import { useTenantPeriod } from "@/components/tenant-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CalendarMode = "day" | "week" | "month";
type TimetableFilter = "lessons" | "holidays";

const WEEKDAYS: TimetableWeekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const CALENDAR_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const WEEKDAY_LABELS: Record<TimetableWeekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

const CALENDAR_LABELS: Record<(typeof CALENDAR_WEEKDAYS)[number], string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const weekdayFromDate = (date: Date): TimetableWeekday | null => {
  const day = date.getDay();
  if (day === 1) return "monday";
  if (day === 2) return "tuesday";
  if (day === 3) return "wednesday";
  if (day === 4) return "thursday";
  if (day === 5) return "friday";
  return null;
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

function startOfMonthGrid(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

function monthGrid(date: Date) {
  const start = startOfMonthGrid(date);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function weekGrid(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function sameDay(a: Date, b: Date) {
  return formatLocalDate(a) === formatLocalDate(b);
}

function isHolidayOnDate(holiday: TimetableHoliday, date: Date) {
  const dayKey = formatLocalDate(date);
  const startKey = formatLocalDate(new Date(holiday.start_at));
  const endKey = holiday.end_at ? formatLocalDate(new Date(holiday.end_at)) : startKey;
  return dayKey >= startKey && dayKey <= endKey;
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatHolidayRange(holiday: TimetableHoliday) {
  const formatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const start = formatter.format(new Date(holiday.start_at));

  if (!holiday.end_at) return start;

  const end = formatter.format(new Date(holiday.end_at));
  return start === end ? start : `${start} - ${end}`;
}

function classLabel(c: SchoolClass) {
  return c.section ? `${c.name} ${c.section}` : c.name;
}

function periodClassLabel(period: TimetablePeriod) {
  if (!period.school_class) return "Class";
  return period.school_class.section
    ? `${period.school_class.name} ${period.school_class.section}`
    : period.school_class.name;
}

function teacherLabel(period: TimetablePeriod) {
  if (!period.teacher) return "Teacher";
  return `${period.teacher.first_name} ${period.teacher.last_name}`;
}

export default function TimetablePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const { selectedSessionId, selectedTermId, selectedSession, selectedTerm } = useTenantPeriod();

  const [classFilter, setClassFilter] = useState<string>("all");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeFilters, setActiveFilters] = useState<Record<TimetableFilter, boolean>>({
    lessons: true,
    holidays: true,
  });
  const [periodDialog, setPeriodDialog] = useState(false);
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriod | null>(null);
  const [deletePeriod, setDeletePeriod] = useState<TimetablePeriod | null>(null);

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const canLoadTimetable = !!tenantId && !!selectedSessionId && !!selectedTermId;
  const monthStart = startOfMonthGrid(currentDate);
  const monthEnd = addDays(monthStart, 41);

  const timetableQ = useQuery({
    queryKey: [
      "timetable",
      tenantId,
      selectedSessionId,
      selectedTermId,
      classFilter,
      formatLocalDate(monthStart),
      formatLocalDate(monthEnd),
    ],
    queryFn: () =>
      timetableApi.list(tenantId!, {
        academicSessionId: Number(selectedSessionId),
        academicTermId: Number(selectedTermId),
        schoolClassId: classFilter !== "all" ? Number(classFilter) : undefined,
        from: formatLocalDate(monthStart),
        to: formatLocalDate(monthEnd),
      }),
    enabled: canLoadTimetable,
  });

  const classesQ = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: () => academicsApi.classes(tenantId!),
    enabled: !!tenantId,
  });
  const subjectsQ = useQuery({
    queryKey: ["subjects", tenantId],
    queryFn: () => academicsApi.subjects(tenantId!),
    enabled: !!tenantId,
  });
  const employeesQ = useQuery({
    queryKey: ["employees", tenantId, ""],
    queryFn: () => employeesApi.list({ tenantId: tenantId! }),
    enabled: !!tenantId,
  });

  const periods = timetableQ.data?.periods ?? [];
  const holidays = timetableQ.data?.holidays ?? [];
  const classes = classesQ.data?.classes ?? [];
  const subjects = subjectsQ.data?.subjects ?? [];
  const employees = employeesQ.data?.employees ?? [];
  const selectedDayWeekday = weekdayFromDate(selectedDate);
  const selectedDayLessons = selectedDayWeekday
    ? periods.filter((period) => period.weekday === selectedDayWeekday)
    : [];
  const selectedDayHolidays = holidays.filter((holiday) => isHolidayOnDate(holiday, selectedDate));

  const periodCountsByWeekday = useMemo(() => {
    const list = timetableQ.data?.periods ?? [];
    const counts = Object.fromEntries(WEEKDAYS.map((day) => [day, 0])) as Record<
      TimetableWeekday,
      number
    >;
    for (const period of list) counts[period.weekday] += 1;
    return counts;
  }, [timetableQ.data?.periods]);

  const visibleDates =
    calendarMode === "day"
      ? [selectedDate]
      : calendarMode === "week"
        ? weekGrid(currentDate)
        : monthGrid(currentDate);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["timetable", tenantId] });
    qc.invalidateQueries({ queryKey: ["school-events", tenantId] });
  };

  const savePeriod = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingPeriod
        ? timetableApi.updatePeriod(tenantId!, editingPeriod.id, payload)
        : timetableApi.createPeriod(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingPeriod ? "Lesson updated" : "Lesson added to timetable");
      setPeriodDialog(false);
      setEditingPeriod(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePeriodMut = useMutation({
    mutationFn: (periodId: string) => timetableApi.deletePeriod(tenantId!, periodId),
    onSuccess: () => {
      toast.success("Lesson removed");
      setDeletePeriod(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveHoliday = useMutation({
    mutationFn: (payload: Record<string, unknown>) => calendarApi.createEvent(tenantId!, payload),
    onSuccess: () => {
      toast.success("Holiday added");
      setHolidayDialog(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const periodLabel =
    selectedSession && selectedTerm
      ? `${selectedSession.name} / ${selectedTerm.name}`
      : "Select a session and term in the header";
  const calendarTitle = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const goPrevious = () => {
    if (calendarMode === "day") {
      const next = addDays(selectedDate, -1);
      setSelectedDate(next);
      setCurrentDate(next);
      return;
    }
    if (calendarMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
      return;
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goNext = () => {
    if (calendarMode === "day") {
      const next = addDays(selectedDate, 1);
      setSelectedDate(next);
      setCurrentDate(next);
      return;
    }
    if (calendarMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
      return;
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-[2rem] bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Timetable for {periodLabel}. Lessons repeat Monday to Friday; holidays block calendar
              dates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border/60 bg-muted/40 p-1 text-sm">
              {(["day", "week", "month"] as CalendarMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-lg px-5 py-2 capitalize transition-smooth ${
                    calendarMode === mode
                      ? "bg-black text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setCalendarMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={!canLoadTimetable}
              onClick={() => setHolidayDialog(true)}
            >
              <CalendarOff className="mr-2 h-4 w-4" />
              Add holiday
            </Button>
            <Button
              className="rounded-xl bg-[#ff755f] text-white hover:bg-[#ef604c]"
              disabled={!canLoadTimetable}
              onClick={() => {
                setEditingPeriod(null);
                setPeriodDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="space-y-6 border-r border-border/60 pr-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Filters
              </p>
              <div className="mt-4 space-y-2">
                <FilterToggle
                  checked={activeFilters.lessons}
                  colorClass="bg-[#c9f6e7] text-[#159268]"
                  label="Lessons"
                  onToggle={() =>
                    setActiveFilters((filters) => ({
                      ...filters,
                      lessons: !filters.lessons,
                    }))
                  }
                />
                <FilterToggle
                  checked={activeFilters.holidays}
                  colorClass="bg-[#ffe7d6] text-[#d46a28]"
                  label="Holidays"
                  onToggle={() =>
                    setActiveFilters((filters) => ({
                      ...filters,
                      holidays: !filters.holidays,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Class
              </Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="mt-3 h-10 rounded-xl">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MiniCalendar
              currentDate={currentDate}
              holidays={holidays}
              periodCountsByWeekday={periodCountsByWeekday}
              selectedDate={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setCurrentDate(date);
              }}
            />
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {calendarMode === "day"
                    ? new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(selectedDate)
                    : calendarTitle}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {periods.length} lessons, {holidays.length} holidays
                </p>
              </div>
              <div className="flex items-center gap-2">
                {timetableQ.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : null}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={goPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={goNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!selectedSessionId || !selectedTermId ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Choose an academic session and term from the header to manage the timetable.
                </CardContent>
              </Card>
            ) : null}

            {canLoadTimetable ? (
              <div
                className={
                  calendarMode === "day"
                    ? "grid grid-cols-1 overflow-hidden rounded-2xl border border-border/60"
                    : "grid grid-cols-7 overflow-hidden rounded-2xl border border-border/60"
                }
              >
                {calendarMode !== "day"
                  ? CALENDAR_WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="border-b border-r border-border/60 bg-muted/20 px-3 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
                      >
                        {CALENDAR_LABELS[day]}
                      </div>
                    ))
                  : null}
                {visibleDates.map((date, index) => {
                  const weekday = weekdayFromDate(date);
                  const dayLessons = weekday
                    ? periods.filter((period) => period.weekday === weekday)
                    : [];
                  const dayHolidays = holidays.filter((holiday) => isHolidayOnDate(holiday, date));
                  const visibleLessons = activeFilters.lessons ? dayLessons : [];
                  const visibleHolidays = activeFilters.holidays ? dayHolidays : [];
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = sameDay(date, new Date());
                  const isSelected = sameDay(date, selectedDate);

                  return (
                    <button
                      key={`${formatLocalDate(date)}-${index}`}
                      type="button"
                      className={`min-h-[132px] border-b border-r border-border/60 bg-white p-2 text-left transition-smooth last:border-r-0 hover:bg-[#fbf8ff] ${
                        calendarMode === "day" ? "min-h-[520px]" : ""
                      } ${!isCurrentMonth && calendarMode === "month" ? "bg-muted/15 text-muted-foreground" : ""}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isSelected || isToday ? "bg-black text-white" : "text-foreground"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {visibleHolidays.length > 0 ? (
                          <span className="rounded-full bg-[#ffe7d6] px-1.5 py-0.5 text-[10px] font-medium text-[#d46a28]">
                            {visibleHolidays.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        {visibleHolidays.map((holiday) => (
                          <CalendarEntry
                            key={`holiday-${holiday.id}-${formatLocalDate(date)}`}
                            tone="holiday"
                            title={holiday.title}
                            subtitle={formatHolidayRange(holiday)}
                          />
                        ))}
                        {visibleLessons
                          .slice(0, calendarMode === "month" ? 3 : 12)
                          .map((period) => (
                            <CalendarEntry
                              key={period.id}
                              tone="lesson"
                              title={period.subject?.name ?? "Lesson"}
                              subtitle={`${periodClassLabel(period)} · ${formatTime(period.start_time)}`}
                              onEdit={(event) => {
                                event.stopPropagation();
                                setEditingPeriod(period);
                                setPeriodDialog(true);
                              }}
                              onDelete={(event) => {
                                event.stopPropagation();
                                setDeletePeriod(period);
                              }}
                            />
                          ))}
                        {visibleLessons.length > 3 && calendarMode === "month" ? (
                          <div className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                            +{visibleLessons.length - 3} more
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {canLoadTimetable ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CompactPreview
            holidays={selectedDayHolidays}
            lessons={selectedDayLessons}
            selectedDate={selectedDate}
          />
          <ComfortPreview
            holidays={selectedDayHolidays}
            lessons={selectedDayLessons}
            selectedDate={selectedDate}
          />
        </div>
      ) : null}

      <PeriodFormDialog
        open={periodDialog}
        onOpenChange={(open) => {
          setPeriodDialog(open);
          if (!open) setEditingPeriod(null);
        }}
        initial={editingPeriod}
        sessionId={selectedSessionId}
        termId={selectedTermId}
        classes={classes}
        subjects={subjects}
        employees={employees}
        saving={savePeriod.isPending}
        onSave={(data) => savePeriod.mutate(data)}
      />

      <HolidayFormDialog
        open={holidayDialog}
        onOpenChange={setHolidayDialog}
        sessionId={selectedSessionId}
        termId={selectedTermId}
        saving={saveHoliday.isPending}
        onSave={(data) => saveHoliday.mutate(data)}
      />

      <AlertDialog open={!!deletePeriod} onOpenChange={() => setDeletePeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletePeriod?.subject?.name} on {WEEKDAY_LABELS[deletePeriod?.weekday ?? "monday"]}{" "}
              will be removed from the timetable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePeriod && deletePeriodMut.mutate(deletePeriod.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterToggle({
  checked,
  colorClass,
  label,
  onToggle,
}: {
  checked: boolean;
  colorClass: string;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button className="flex w-full items-center gap-2 text-xs" type="button" onClick={onToggle}>
      <span className={`flex h-4 w-4 items-center justify-center rounded ${colorClass}`}>
        {checked ? "✓" : ""}
      </span>
      <span>{label}</span>
    </button>
  );
}

function MiniCalendar({
  currentDate,
  holidays,
  periodCountsByWeekday,
  selectedDate,
  onSelect,
}: {
  currentDate: Date;
  holidays: TimetableHoliday[];
  periodCountsByWeekday: Record<TimetableWeekday, number>;
  selectedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const days = monthGrid(currentDate);

  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(currentDate)}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {CALENDAR_WEEKDAYS.map((day) => (
          <span key={day}>{CALENDAR_LABELS[day].slice(0, 1)}</span>
        ))}
        {days.map((date) => {
          const weekday = weekdayFromDate(date);
          const hasLesson = weekday ? periodCountsByWeekday[weekday] > 0 : false;
          const hasHoliday = holidays.some((holiday) => isHolidayOnDate(holiday, date));
          const selected = sameDay(date, selectedDate);

          return (
            <button
              key={formatLocalDate(date)}
              type="button"
              className={`relative flex h-6 items-center justify-center rounded-full ${
                selected ? "bg-black text-white" : "hover:bg-muted"
              }`}
              onClick={() => onSelect(date)}
            >
              {date.getDate()}
              {hasLesson || hasHoliday ? (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    hasHoliday ? "bg-[#f59a2e]" : "bg-[#8b35e8]"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarEntry({
  tone,
  title,
  subtitle,
  onEdit,
  onDelete,
}: {
  tone: "lesson" | "holiday";
  title: string;
  subtitle: string;
  onEdit?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const toneClass =
    tone === "holiday"
      ? "border-[#ffd8bd] bg-[#fff3e8] text-[#9a4f1d]"
      : "border-[#d9cef8] bg-[#ede7ff] text-[#4f3b93]";

  return (
    <div className={`group/entry rounded-md border px-2 py-1.5 text-[11px] ${toneClass}`}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate opacity-80">{subtitle}</p>
        </div>
        {onEdit || onDelete ? (
          <div className="hidden shrink-0 gap-0.5 group-hover/entry:flex">
            {onEdit ? (
              <button type="button" onClick={onEdit}>
                <Pencil className="h-3 w-3" />
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompactPreview({
  holidays,
  lessons,
  selectedDate,
}: {
  holidays: TimetableHoliday[];
  lessons: TimetablePeriod[];
  selectedDate: Date;
}) {
  return (
    <Card className="border-border/60 bg-white shadow-card">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Compact View
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          {new Intl.DateTimeFormat("en", {
            weekday: "long",
            day: "numeric",
            month: "short",
          }).format(selectedDate)}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            colorClass="bg-[#ede7ff] text-[#4f3b93]"
            label="Lessons"
            value={lessons.length}
          />
          <StatPill
            colorClass="bg-[#fff3e8] text-[#9a4f1d]"
            label="Holidays"
            value={holidays.length}
          />
          <StatPill
            colorClass="bg-[#e9fbf4] text-[#159268]"
            label="Teachers"
            value={new Set(lessons.map((lesson) => lesson.teacher_employee_id)).size}
          />
          <StatPill
            colorClass="bg-[#eef3ff] text-[#315cbd]"
            label="Classes"
            value={new Set(lessons.map((lesson) => lesson.school_class_id)).size}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ComfortPreview({
  holidays,
  lessons,
  selectedDate,
}: {
  holidays: TimetableHoliday[];
  lessons: TimetablePeriod[];
  selectedDate: Date;
}) {
  return (
    <Card className="border-border/60 bg-white shadow-card">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Comfort View
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          {new Intl.DateTimeFormat("en", { day: "numeric", month: "long" }).format(selectedDate)}
        </h2>
        <div className="mt-4 space-y-2">
          {holidays.map((holiday) => (
            <div key={holiday.id} className="rounded-xl bg-[#fff3e8] p-3 text-sm text-[#9a4f1d]">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarOff className="h-4 w-4" />
                {holiday.title}
              </div>
              <p className="mt-1 text-xs">{formatHolidayRange(holiday)}</p>
            </div>
          ))}
          {lessons.slice(0, 3).map((lesson) => (
            <div key={lesson.id} className="rounded-xl bg-[#ede7ff] p-3 text-sm text-[#4f3b93]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{lesson.subject?.name ?? "Lesson"}</p>
                  <p className="truncate text-xs">{periodClassLabel(lesson)}</p>
                </div>
                <span className="text-xs font-medium">{formatTime(lesson.start_time)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs opacity-80">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {teacherLabel(lesson)}
                </span>
                {lesson.room ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {lesson.room}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
          {holidays.length === 0 && lessons.length === 0 ? (
            <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
              No entries for this day.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StatPill({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className={`rounded-xl px-3 py-2 text-sm ${colorClass}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function PeriodFormDialog({
  open,
  onOpenChange,
  initial,
  sessionId,
  termId,
  classes,
  subjects,
  employees,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TimetablePeriod | null;
  sessionId: string;
  termId: string;
  classes: SchoolClass[];
  subjects: Subject[];
  employees: Employee[];
  saving: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [schoolClassId, setSchoolClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [weekday, setWeekday] = useState<TimetableWeekday>("monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setSchoolClassId(initial ? String(initial.school_class_id) : "");
    setSubjectId(initial ? String(initial.subject_id) : "");
    setTeacherId(initial ? String(initial.teacher_employee_id) : "");
    setWeekday(initial?.weekday ?? "monday");
    setStartTime(initial?.start_time ?? "09:00");
    setEndTime(initial?.end_time ?? "09:45");
    setRoom(initial?.room ?? "");
    setNotes(initial?.notes ?? "");
  };

  const teachers = employees.filter(
    (e) => e.status === "active" && e.role.toLowerCase().includes("teacher"),
  );
  const teacherOptions =
    teachers.length > 0 ? teachers : employees.filter((e) => e.status === "active");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit event" : "Add event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Class</Label>
            <Select value={schoolClassId} onValueChange={setSchoolClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {classLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.last_name}, {e.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Day</Label>
            <Select value={weekday} onValueChange={(v) => setWeekday(v as TimetableWeekday)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {WEEKDAY_LABELS[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Room (optional)</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room 4" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-hero"
            disabled={
              !sessionId ||
              !termId ||
              !schoolClassId ||
              !subjectId ||
              !teacherId ||
              !startTime ||
              !endTime ||
              saving
            }
            onClick={() =>
              onSave({
                academicSessionId: Number(sessionId),
                academicTermId: Number(termId),
                schoolClassId: Number(schoolClassId),
                subjectId: Number(subjectId),
                teacherEmployeeId: Number(teacherId),
                weekday,
                startTime,
                endTime,
                room: room.trim() || null,
                notes: notes.trim() || null,
              })
            }
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HolidayFormDialog({
  open,
  onOpenChange,
  sessionId,
  termId,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  termId: string;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setTitle("");
          setStartDate("");
          setEndDate("");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add holiday</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Midterm break"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End date (optional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Holidays appear as blockers on the timetable so staff can avoid scheduling lessons on
            those dates.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-hero"
            disabled={!title.trim() || !startDate || !sessionId || !termId || saving}
            onClick={() =>
              onSave({
                title: title.trim(),
                eventType: "holiday",
                academicSessionId: Number(sessionId),
                academicTermId: Number(termId),
                startAt: `${startDate}T00:00:00`,
                endAt: endDate ? `${endDate}T23:59:59` : null,
                allDay: true,
              })
            }
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save holiday"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
