"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { academicsApi, studentsApi, tenantsApi } from "@/lib/api-client";
import type {
  AcademicSession,
  AcademicTerm,
  SchoolClass,
  Student,
  Subject,
} from "@/lib/schoolos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export type AcademicSection =
  | "sessions"
  | "classes"
  | "subjects"
  | "terms"
  | "enrollments"
  | "exams";

export const academicSections: AcademicSection[] = [
  "sessions",
  "classes",
  "subjects",
  "terms",
  "enrollments",
  "exams",
];

const sectionCopy: Record<
  AcademicSection,
  { eyebrow: string; title: string; description: string }
> = {
  sessions: {
    eyebrow: "Sessions",
    title: "Academic sessions",
    description: "Create and manage school years that anchor terms, enrollments, and billing.",
  },
  classes: {
    eyebrow: "Classes",
    title: "Classes",
    description: "Organize active class groups and sections across the school.",
  },
  subjects: {
    eyebrow: "Subjects",
    title: "Subjects",
    description: "Manage the subject catalog used across classes and assessments.",
  },
  terms: {
    eyebrow: "Terms",
    title: "Academic terms",
    description: "Set up term periods inside each session and mark the current term.",
  },
  enrollments: {
    eyebrow: "Enrollments",
    title: "Session enrollments",
    description: "Place students into classes for a specific academic session.",
  },
  exams: {
    eyebrow: "Exams",
    title: "Exams",
    description: "Prepare assessment structures by assigning subjects to classes.",
  },
};

export default function AcademicsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/t/${params.slug}/academics/classes`);
  }, [params.slug, router]);

  return null;
}

export function AcademicsPageContent({ section }: { section: AcademicSection }) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

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
  const termsQ = useQuery({
    queryKey: ["terms", tenantId],
    queryFn: () => academicsApi.terms(tenantId!),
    enabled: !!tenantId,
  });
  const sessionsQ = useQuery({
    queryKey: ["sessions", tenantId],
    queryFn: () => academicsApi.sessions(tenantId!),
    enabled: !!tenantId,
  });
  const enrollmentsQ = useQuery({
    queryKey: ["enrollments", tenantId],
    queryFn: () => academicsApi.enrollments(tenantId!),
    enabled: !!tenantId,
  });
  const studentsQ = useQuery({
    queryKey: ["students", tenantId, ""],
    queryFn: () => studentsApi.list({ tenantId: tenantId! }),
    enabled: !!tenantId,
  });
  const assignQ = useQuery({
    queryKey: ["class-subjects", tenantId],
    queryFn: () => academicsApi.classSubjects(tenantId!),
    enabled: !!tenantId,
  });

  const [classDialog, setClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [termDialog, setTermDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [enrollmentDialog, setEnrollmentDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "class" | "subject" | "term" | "assign";
    id: string | number;
    label: string;
  } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["classes", tenantId] });
    qc.invalidateQueries({ queryKey: ["subjects", tenantId] });
    qc.invalidateQueries({ queryKey: ["terms", tenantId] });
    qc.invalidateQueries({ queryKey: ["sessions", tenantId] });
    qc.invalidateQueries({ queryKey: ["enrollments", tenantId] });
    qc.invalidateQueries({ queryKey: ["class-subjects", tenantId] });
  };

  const saveClass = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingClass
        ? academicsApi.updateClass(tenantId!, editingClass.id, payload)
        : academicsApi.createClass(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingClass ? "Class updated" : "Class created");
      setClassDialog(false);
      setEditingClass(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSubject = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingSubject
        ? academicsApi.updateSubject(tenantId!, editingSubject.id, payload)
        : academicsApi.createSubject(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingSubject ? "Subject updated" : "Subject created");
      setSubjectDialog(false);
      setEditingSubject(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTerm = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingTerm
        ? academicsApi.updateTerm(tenantId!, editingTerm.id, payload)
        : academicsApi.createTerm(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingTerm ? "Term updated" : "Term created");
      setTermDialog(false);
      setEditingTerm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSession = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingSession
        ? academicsApi.updateSession(tenantId!, editingSession.id, payload)
        : academicsApi.createSession(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingSession ? "Session updated" : "Session created");
      setSessionDialog(false);
      setEditingSession(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrollMut = useMutation({
    mutationFn: (payload: {
      studentId: number;
      academicSessionId: number;
      schoolClassId: number;
      status?: string;
      enrolledAt?: string;
    }) => academicsApi.enrollStudent(tenantId!, payload),
    onSuccess: () => {
      toast.success("Student enrolled for session");
      setEnrollmentDialog(false);
      invalidate();
      qc.invalidateQueries({ queryKey: ["students", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMut = useMutation({
    mutationFn: (data: { schoolClassId: number; subjectId: number }) =>
      academicsApi.assignClassSubject(tenantId!, data),
    onSuccess: () => {
      toast.success("Subject assigned to class");
      setAssignDialog(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteTarget || !tenantId) return;
      if (deleteTarget.type === "class")
        return academicsApi.deleteClass(tenantId, String(deleteTarget.id));
      if (deleteTarget.type === "subject")
        return academicsApi.deleteSubject(tenantId, Number(deleteTarget.id));
      if (deleteTarget.type === "term")
        return academicsApi.deleteTerm(tenantId, Number(deleteTarget.id));
      return academicsApi.unassignClassSubject(tenantId, Number(deleteTarget.id));
    },
    onSuccess: () => {
      toast.success("Removed");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const classes = classesQ.data?.classes ?? [];
  const subjects = subjectsQ.data?.subjects ?? [];
  const terms = termsQ.data?.terms ?? [];
  const sessions = sessionsQ.data?.sessions ?? [];
  const students = studentsQ.data?.students ?? [];
  const enrollments = enrollmentsQ.data?.enrollments ?? [];
  const assignments = assignQ.data?.assignments ?? [];
  const copy = sectionCopy[section];

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-1 text-muted-foreground">{copy.description}</p>
      </div>

      {section === "sessions" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId}
              onClick={() => {
                setEditingSession(null);
                setSessionDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New session
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.name}</TableCell>
                      <TableCell>
                        {session.start_date} — {session.end_date}
                      </TableCell>
                      <TableCell className="capitalize">{session.status}</TableCell>
                      <TableCell>{session.enrollments_count ?? 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSession(session);
                            setSessionDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Create a session like 2026/2027 to anchor terms, enrollments, and billing.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {section === "classes" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId}
              onClick={() => {
                setEditingClass(null);
                setClassDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New class
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {classesQ.isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.section ?? "—"}</TableCell>
                        <TableCell>{c.student_count ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingClass(c);
                                setClassDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "class",
                                  id: c.id,
                                  label: c.name,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {classes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                          No classes yet. Create your first class to organize students.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {section === "subjects" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId}
              onClick={() => {
                setEditingSubject(null);
                setSubjectDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New subject
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.code ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSubject(s);
                              setSubjectDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteTarget({ type: "subject", id: s.id, label: s.name })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                        No subjects defined.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {section === "terms" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId}
              onClick={() => {
                setEditingTerm(null);
                setTermDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New term
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{formatPeriod(t.start_date, t.end_date)}</TableCell>
                      <TableCell>{t.is_current ? "Yes" : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTerm(t);
                              setTermDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteTarget({ type: "term", id: t.id, label: t.name })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {terms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                        No academic terms yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {section === "enrollments" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={
                !tenantId || sessions.length === 0 || classes.length === 0 || students.length === 0
              }
              onClick={() => setEnrollmentDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Enroll student
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        {enrollment.student
                          ? `${enrollment.student.last_name}, ${enrollment.student.first_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>{enrollment.academic_session?.name ?? "—"}</TableCell>
                      <TableCell>
                        {enrollment.school_class
                          ? `${enrollment.school_class.name}${enrollment.school_class.section ? ` ${enrollment.school_class.section}` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="capitalize">{enrollment.status}</TableCell>
                    </TableRow>
                  ))}
                  {enrollments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                        Enroll students into a session and class before assigning term fees.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {section === "exams" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId || classes.length === 0 || subjects.length === 0}
              onClick={() => setAssignDialog(true)}
            >
              <BookOpen className="mr-2 h-4 w-4" /> Assign subject
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.class_name}</TableCell>
                      <TableCell>{a.subject_name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              type: "assign",
                              id: a.id,
                              label: `${a.class_name} / ${a.subject_name}`,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {assignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                        Assign subjects to classes to build your curriculum map.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <ClassFormDialog
        open={classDialog}
        onOpenChange={setClassDialog}
        initial={editingClass}
        saving={saveClass.isPending}
        onSave={(data) => saveClass.mutate(data)}
      />
      <SubjectFormDialog
        open={subjectDialog}
        onOpenChange={setSubjectDialog}
        initial={editingSubject}
        saving={saveSubject.isPending}
        onSave={(data) => saveSubject.mutate(data)}
      />
      <TermFormDialog
        open={termDialog}
        onOpenChange={setTermDialog}
        initial={editingTerm}
        sessions={sessions}
        saving={saveTerm.isPending}
        onSave={(data) => saveTerm.mutate(data)}
      />
      <SessionFormDialog
        open={sessionDialog}
        onOpenChange={setSessionDialog}
        initial={editingSession}
        saving={saveSession.isPending}
        onSave={(data) => saveSession.mutate(data)}
      />
      <EnrollmentDialog
        open={enrollmentDialog}
        onOpenChange={setEnrollmentDialog}
        sessions={sessions}
        classes={classes}
        students={students}
        saving={enrollMut.isPending}
        onSave={(data) => enrollMut.mutate(data)}
      />
      <AssignDialog
        open={assignDialog}
        onOpenChange={setAssignDialog}
        classes={classes}
        subjects={subjects}
        saving={assignMut.isPending}
        onSave={(d) => assignMut.mutate(d)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClassFormDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: SchoolClass | null;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("");

  const reset = () => {
    setName(initial?.name ?? "");
    setSection(initial?.section ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit class" : "New class"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="JSS 1" />
          </div>
          <div>
            <Label>Section (optional)</Label>
            <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-hero"
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name: name.trim(), section: section.trim() || null })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubjectFormDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Subject | null;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(initial?.name ?? "");
          setCode(initial?.code ?? "");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name: name.trim(), code: code.trim() || null })}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TermFormDialog({
  open,
  onOpenChange,
  initial,
  sessions,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: AcademicTerm | null;
  sessions: AcademicSession[];
  saving: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [current, setCurrent] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(initial?.name ?? "");
          setSessionId(initial?.academic_session_id ? String(initial.academic_session_id) : "none");
          setStart(initial?.start_date ?? "");
          setEnd(initial?.end_date ?? "");
          setCurrent(initial?.is_current ?? false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit term" : "New term"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Academic session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No session</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.id)}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={current}
              onChange={(e) => setCurrent(e.target.checked)}
            />
            Set as current term
          </label>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!name.trim() || saving}
            onClick={() =>
              onSave({
                name: name.trim(),
                academicSessionId: sessionId && sessionId !== "none" ? Number(sessionId) : null,
                startDate: start || null,
                endDate: end || null,
                isCurrent: current,
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPeriod(start?: string | null, end?: string | null) {
  if (!start && !end) return "Not set";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} — ${end}`;
}

function AssignDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classes: SchoolClass[];
  subjects: Subject[];
  saving: boolean;
  onSave: (d: { schoolClassId: number; subjectId: number }) => void;
}) {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign subject to class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` ${c.section}` : ""}
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
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!classId || !subjectId || saving}
            onClick={() => onSave({ schoolClassId: Number(classId), subjectId: Number(subjectId) })}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionFormDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: AcademicSession | null;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState<AcademicSession["status"]>("planned");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(initial?.name ?? "");
          setStart(initial?.start_date ?? "");
          setEnd(initial?.end_date ?? "");
          setStatus(initial?.status ?? "planned");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit session" : "New academic session"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2026/2027" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AcademicSession["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!name || !start || !end || saving}
            onClick={() => onSave({ name, startDate: start, endDate: end, status })}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentDialog({
  open,
  onOpenChange,
  sessions,
  classes,
  students,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessions: AcademicSession[];
  classes: SchoolClass[];
  students: Student[];
  saving: boolean;
  onSave: (data: {
    studentId: number;
    academicSessionId: number;
    schoolClassId: number;
    status?: string;
    enrolledAt?: string;
  }) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState("");
  const [enrolledAt, setEnrolledAt] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.last_name}, {student.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.id)}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Enrolled at</Label>
            <Input type="date" value={enrolledAt} onChange={(e) => setEnrolledAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!studentId || !sessionId || !classId || saving}
            onClick={() =>
              onSave({
                studentId: Number(studentId),
                academicSessionId: Number(sessionId),
                schoolClassId: Number(classId),
                status: "active",
                enrolledAt,
              })
            }
          >
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
