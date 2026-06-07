"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Search, Users, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { academicsApi, studentsApi, tenantsApi } from "@/lib/api-client";
import type { SchoolClass } from "@/lib/schoolos-types";

type Student = {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  class_level: string | null;
  school_class_id?: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  enrollment_date: string;
  status: "enrolled" | "withdrawn" | "graduated" | "suspended";
  notes: string | null;
};

const statusVariants: Record<Student["status"], string> = {
  enrolled: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  withdrawn: "bg-muted text-muted-foreground",
  graduated: "bg-primary/15 text-primary",
  suspended: "bg-destructive/15 text-destructive",
};

const classLabel = (schoolClass: SchoolClass) =>
  `${schoolClass.name}${schoolClass.section ? ` ${schoolClass.section}` : ""}`;

export default function StudentsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const studentsQ = useQuery({
    queryKey: ["students", tenantId, debounced],
    queryFn: () => studentsApi.list({ tenantId: tenantId!, search: debounced || undefined }),
    enabled: !!tenantId,
  });

  const classesQ = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: () => academicsApi.classes(tenantId!),
    enabled: !!tenantId,
  });

  const saveMut = useMutation({
    mutationFn: studentsApi.upsert,
    onSuccess: () => {
      toast.success(editing ? "Student updated" : "Student enrolled");
      qc.invalidateQueries({ queryKey: ["students", tenantId] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => {
      toast.success("Student removed");
      qc.invalidateQueries({ queryKey: ["students", tenantId] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const students = (studentsQ.data?.students ?? []) as Student[];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
            Students
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Student roster</h1>
          <p className="mt-1 text-muted-foreground">
            {students.length} {students.length === 1 ? "student" : "students"} enrolled
          </p>
        </div>
        <Button
          className="bg-gradient-hero"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          disabled={!tenantId}
        >
          <Plus className="mr-2 h-4 w-4" /> Add student
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, admission no, or guardian…"
                className="pl-9"
              />
            </div>
            {studentsQ.isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {studentsQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">
                {debounced ? "No matches" : "No students yet"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {debounced
                  ? "Try a different search term."
                  : "Enroll your first student to get started."}
              </p>
              {!debounced && (
                <Button
                  className="mt-6 bg-gradient-hero"
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add student
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adm. No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.admission_number}</TableCell>
                    <TableCell className="font-medium">
                      {s.last_name}, {s.first_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.class_level || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.guardian_name ? (
                        <div className="text-sm">
                          <div>{s.guardian_name}</div>
                          {s.guardian_phone && <div className="text-xs">{s.guardian_phone}</div>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.enrollment_date}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusVariants[s.status]}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(s);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(s)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StudentDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        classes={classesQ.data?.classes ?? []}
        classesLoading={classesQ.isLoading}
        submitting={saveMut.isPending}
        onSubmit={(values) => {
          if (!tenantId) return;
          saveMut.mutate({ ...values, tenantId, id: editing?.id });
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete &&
                `This will permanently remove ${confirmDelete.first_name} ${confirmDelete.last_name} from your roster.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                confirmDelete && tenantId && deleteMut.mutate({ id: confirmDelete.id, tenantId })
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FormValues = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "" | "male" | "female" | "other";
  classLevel: string;
  schoolClassId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  enrollmentDate: string;
  status: Student["status"];
  notes: string;
};

function StudentDialog({
  open,
  onOpenChange,
  editing,
  classes,
  classesLoading,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Student | null;
  classes: SchoolClass[];
  classesLoading: boolean;
  submitting: boolean;
  onSubmit: (v: {
    admissionNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: "male" | "female" | "other" | null;
    classLevel: string | null;
    schoolClassId: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
    guardianEmail: string;
    enrollmentDate: string;
    status: Student["status"];
    notes: string | null;
  }) => void;
}) {
  const initial: FormValues = {
    admissionNumber: editing?.admission_number ?? "",
    firstName: editing?.first_name ?? "",
    lastName: editing?.last_name ?? "",
    dateOfBirth: editing?.date_of_birth ?? "",
    gender: editing?.gender ?? "",
    classLevel: editing?.class_level ?? "",
    schoolClassId: editing?.school_class_id ? String(editing.school_class_id) : "",
    guardianName: editing?.guardian_name ?? "",
    guardianPhone: editing?.guardian_phone ?? "",
    guardianEmail: editing?.guardian_email ?? "",
    enrollmentDate: editing?.enrollment_date ?? new Date().toISOString().slice(0, 10),
    status: editing?.status ?? "enrolled",
    notes: editing?.notes ?? "",
  };
  const [v, setV] = useState<FormValues>(initial);

  useEffect(() => {
    if (open) setV(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const legacyClassLabel = v.classLevel.trim();
  const selectedClass = classes.find((schoolClass) => schoolClass.id === v.schoolClassId);
  const showLegacyClass =
    !!legacyClassLabel &&
    !selectedClass &&
    !classes.some((schoolClass) => classLabel(schoolClass) === legacyClassLabel);
  const showMissingClass = !!v.schoolClassId && !selectedClass && !showLegacyClass;
  const classSelectValue =
    selectedClass?.id ??
    (showLegacyClass ? `legacy:${legacyClassLabel}` : showMissingClass ? v.schoolClassId : "none");

  const setClassSelection = (val: string) => {
    if (val === "none") {
      setV((s) => ({ ...s, schoolClassId: "", classLevel: "" }));
      return;
    }

    if (val.startsWith("legacy:")) {
      setV((s) => ({ ...s, schoolClassId: "", classLevel: val.slice("legacy:".length) }));
      return;
    }

    const nextClass = classes.find((schoolClass) => schoolClass.id === val);
    setV((s) => ({
      ...s,
      schoolClassId: val,
      classLevel: nextClass ? classLabel(nextClass) : s.classLevel,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      admissionNumber: v.admissionNumber.trim(),
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      dateOfBirth: v.dateOfBirth || null,
      gender: v.gender || null,
      classLevel: selectedClass ? classLabel(selectedClass) : v.classLevel.trim() || null,
      schoolClassId: v.schoolClassId || null,
      guardianName: v.guardianName.trim() || null,
      guardianPhone: v.guardianPhone.trim() || null,
      guardianEmail: v.guardianEmail.trim(),
      enrollmentDate: v.enrollmentDate,
      status: v.status,
      notes: v.notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit student" : "Enroll a new student"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update student details and guardian information."
              : "Add a student to your school roster."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Admission number" required={!!editing}>
              <Input
                value={v.admissionNumber}
                onChange={(e) => set("admissionNumber", e.target.value)}
                required={!!editing}
                maxLength={40}
                placeholder="Auto-generated, e.g. BRA/2026/0001"
              />
              {!editing && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to generate from the school acronym, enrollment year, and next serial.
                </p>
              )}
            </Field>
            <Field label="Class / Grade">
              <Select value={classSelectValue} onValueChange={setClassSelection}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={classesLoading ? "Loading classes..." : "Select class"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No class</SelectItem>
                  {showLegacyClass && (
                    <SelectItem value={`legacy:${legacyClassLabel}`}>
                      {legacyClassLabel} (not in class list)
                    </SelectItem>
                  )}
                  {showMissingClass && (
                    <SelectItem value={v.schoolClassId}>
                      {classesLoading
                        ? "Loading current class..."
                        : "Current class (not in class list)"}
                    </SelectItem>
                  )}
                  {classes.map((schoolClass) => (
                    <SelectItem key={schoolClass.id} value={schoolClass.id}>
                      {classLabel(schoolClass)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="First name" required>
              <Input
                value={v.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Last name" required>
              <Input
                value={v.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={v.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Select
                value={v.gender || "unset"}
                onValueChange={(val) =>
                  set("gender", val === "unset" ? "" : (val as FormValues["gender"]))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Enrollment date" required>
              <Input
                type="date"
                value={v.enrollmentDate}
                onChange={(e) => set("enrollmentDate", e.target.value)}
                required
              />
            </Field>
            <Field label="Status">
              <Select
                value={v.status}
                onValueChange={(val) => set("status", val as Student["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-1">
            <h4 className="font-display text-sm font-semibold">Guardian</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name">
                <Input
                  value={v.guardianName}
                  onChange={(e) => set("guardianName", e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={v.guardianPhone}
                  onChange={(e) => set("guardianPhone", e.target.value)}
                  maxLength={40}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={v.guardianEmail}
                  onChange={(e) => set("guardianEmail", e.target.value)}
                  maxLength={255}
                />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <Textarea
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-hero" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Enroll student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
