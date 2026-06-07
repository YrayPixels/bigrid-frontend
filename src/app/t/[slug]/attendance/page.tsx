"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { attendanceApi, tenantsApi } from "@/lib/api-client";
import type { AttendanceRow } from "@/lib/schoolos-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
const todayIso = () => new Date().toISOString().slice(0, 10);

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
] as const;

export default function AttendancePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [markOpen, setMarkOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [draft, setDraft] = useState<Record<string, AttendanceRow["status"]>>({});

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const summaryQ = useQuery({
    queryKey: ["attendance-summary", tenantId, date],
    queryFn: () => attendanceApi.summary(tenantId!, date),
    enabled: !!tenantId,
  });

  const classesQ = useQuery({
    queryKey: ["attendance-classes", tenantId, date],
    queryFn: () => attendanceApi.classes(tenantId!, date),
    enabled: !!tenantId,
  });

  const rowsQ = useQuery({
    queryKey: ["attendance-rows", tenantId, date, selectedClass],
    queryFn: () =>
      attendanceApi.rows(tenantId!, {
        date,
        schoolClassId: selectedClass === "all" ? undefined : selectedClass,
      }),
    enabled: !!tenantId && markOpen,
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const records = Object.entries(draft)
        .filter(([, status]) => status)
        .map(([studentId, status]) => ({
          studentId: Number(studentId),
          status: status!,
        }));
      return attendanceApi.save(tenantId!, {
        date,
        schoolClassId: selectedClass === "all" ? undefined : selectedClass,
        records,
      });
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      setMarkOpen(false);
      setDraft({});
      qc.invalidateQueries({ queryKey: ["attendance-summary", tenantId] });
      qc.invalidateQueries({ queryKey: ["attendance-classes", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = summaryQ.data;
  const classes = classesQ.data?.classes ?? [];

  const displayDate = useMemo(
    () =>
      new Date(date + "T12:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [date],
  );

  const openMarkDialog = () => {
    setMarkOpen(true);
    setDraft({});
  };

  useEffect(() => {
    if (rowsQ.data?.rows) {
      const next: Record<string, AttendanceRow["status"]> = {};
      for (const row of rowsQ.data.rows) {
        next[row.student_id] = row.status ?? "present";
      }
      setDraft(next);
    }
  }, [rowsQ.data]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
            Attendance
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Mark attendance</h1>
          <p className="mt-1 text-muted-foreground">{displayDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Button className="bg-gradient-hero" disabled={!tenantId} onClick={openMarkDialog}>
            <CalendarCheck className="mr-2 h-4 w-4" /> Take attendance
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Present"
          value={summary?.present ?? 0}
          icon={<Check className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Absent"
          value={summary?.absent ?? 0}
          icon={<X className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          label="Late"
          value={summary?.late ?? 0}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          label="Excused"
          value={summary?.excused ?? 0}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By class</CardTitle>
          <CardDescription>Enrollment vs marked for {date}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {classesQ.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Set up classes in Academics to start marking attendance.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Marked</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name}
                      {c.section ? ` ${c.section}` : ""}
                    </TableCell>
                    <TableCell>{c.enrolled_count}</TableCell>
                    <TableCell>{c.marked_count}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClass(c.id);
                          openMarkDialog();
                        }}
                      >
                        Mark
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Take attendance — {date}</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All enrolled students</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rowsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rowsQ.data?.rows ?? []).map((row) => (
                  <TableRow key={row.student_id}>
                    <TableCell>
                      <div className="font-medium">
                        {row.last_name}, {row.first_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.admission_number}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft[row.student_id] ?? row.status ?? "present"}
                        onValueChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            [row.student_id]: v as AttendanceRow["status"],
                          }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {(rowsQ.data?.rows ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      No enrolled students for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-hero"
              disabled={saveMut.isPending || (rowsQ.data?.rows?.length ?? 0) === 0}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
