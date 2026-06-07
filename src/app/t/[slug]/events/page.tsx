"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { calendarApi, tenantsApi } from "@/lib/api-client";
import { useTenantPeriod } from "@/components/tenant-shell";
import type { SchoolEvent, SchoolEventType } from "@/lib/schoolos-types";

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

const eventTypes = Object.keys(eventTypeLabels) as SchoolEventType[];

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function formatDateTime(value: string, allDay: boolean) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    ...(allDay ? {} : { timeStyle: "short" as const }),
  }).format(date);
}

function formatEventWindow(event: SchoolEvent) {
  if (!event.end_at) return formatDateTime(event.start_at, event.all_day);

  return `${formatDateTime(event.start_at, event.all_day)} - ${formatDateTime(
    event.end_at,
    event.all_day,
  )}`;
}

export default function EventsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const { selectedSessionId, selectedTermId, selectedSession, selectedTerm } = useTenantPeriod();
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<SchoolEventType>("event");
  const [startDate, setStartDate] = useState(localDate());
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(localDate());
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState("All school");
  const [description, setDescription] = useState("");

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const eventsQ = useQuery({
    queryKey: ["school-events", tenantId, selectedSessionId, selectedTermId, "events-page"],
    queryFn: () =>
      calendarApi.events(tenantId!, {
        from: localDate(),
        to: localDate(addDays(new Date(), 180)),
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
        academicTermId: selectedTermId ? Number(selectedTermId) : undefined,
        limit: 100,
      }),
    enabled: !!tenantId,
  });

  const invalidateEventViews = () => {
    qc.invalidateQueries({ queryKey: ["school-events", tenantId] });
    qc.invalidateQueries({ queryKey: ["timetable", tenantId] });
  };

  const createMut = useMutation({
    mutationFn: () => {
      const startsAt = allDay
        ? toIsoDateTime(startDate, "00:00")
        : toIsoDateTime(startDate, startTime);
      const endsAt = allDay
        ? toIsoDateTime(endDate || startDate, "23:59")
        : endDate && endTime
          ? toIsoDateTime(endDate, endTime)
          : null;

      return calendarApi.createEvent(tenantId!, {
        title: title.trim(),
        eventType,
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : null,
        academicTermId: selectedTermId ? Number(selectedTermId) : null,
        startAt: startsAt,
        endAt: endsAt,
        allDay,
        location: location.trim() || null,
        audience: audience.trim() || null,
        description: description.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Event added to the school timetable");
      setTitle("");
      setDescription("");
      setLocation("");
      invalidateEventViews();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMut = useMutation({
    mutationFn: (eventId: string) => calendarApi.deleteEvent(tenantId!, eventId),
    onSuccess: () => {
      toast.success("Event removed");
      invalidateEventViews();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const events = eventsQ.data?.events ?? [];
  const periodLabel = useMemo(() => {
    if (!selectedSession) return "all sessions";
    return `${selectedSession.name}${selectedTerm ? ` / ${selectedTerm.name}` : ""}`;
  }, [selectedSession, selectedTerm]);
  const canCreate = !!tenantId && title.trim().length > 0 && startDate.length > 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">Events</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">School events</h1>
          <p className="mt-1 text-muted-foreground">
            Create dated events for {periodLabel}. They appear in the dashboard calendar and
            timetable event feed.
          </p>
        </div>
        <Card className="min-w-36">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Upcoming
            </div>
            <p className="mt-1 text-2xl font-semibold">{events.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Create event</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use exact dates and times for meetings, exams, sports, holidays, and deadlines.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={title}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. PTA meeting"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={eventType}
                  onValueChange={(value) => setEventType(value as SchoolEventType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {eventTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-audience">Audience</Label>
                <Input
                  id="event-audience"
                  value={audience}
                  maxLength={80}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="All school, parents, staff..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 p-4">
              <div>
                <p className="text-sm font-medium">All-day event</p>
                <p className="text-xs text-muted-foreground">
                  Hide start and end time for holidays or full-day activities.
                </p>
              </div>
              <Switch checked={allDay} onCheckedChange={setAllDay} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start-date">Start date</Label>
                <Input
                  id="event-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    if (!endDate || endDate < event.target.value) setEndDate(event.target.value);
                  }}
                />
              </div>
              {!allDay ? (
                <div className="space-y-2">
                  <Label htmlFor="event-start-time">Start time</Label>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="event-end-date">End date</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              {!allDay ? (
                <div className="space-y-2">
                  <Label htmlFor="event-end-time">End time</Label>
                  <Input
                    id="event-end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={location}
                maxLength={160}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. School hall"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={description}
                maxLength={4000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add optional details..."
                className="min-h-28"
              />
            </div>

            <Button
              className="w-full bg-gradient-hero"
              disabled={!canCreate || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create event
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-semibold">Upcoming events</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Events for the selected session and term.
                </p>
              </div>
              {eventsQ.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            {eventsQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">No events yet</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Create your first school event to place it on the calendar and timetable feed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0e3ff] text-[#8b35e8]">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatEventWindow(event)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{eventTypeLabels[event.event_type]}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteMut.isPending}
                            onClick={() => deleteMut.mutate(event.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {event.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                        ) : null}
                        {event.audience ? <span>{event.audience}</span> : null}
                      </div>
                      {event.description ? (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
