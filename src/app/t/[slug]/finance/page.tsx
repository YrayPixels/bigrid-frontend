"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, Receipt, TrendingUp, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { academicsApi, financeApi, studentsApi, tenantsApi } from "@/lib/api-client";
import type {
  AcademicSession,
  AcademicTerm,
  FeeCategory,
  FeeTemplate,
  Invoice,
  SchoolClass,
} from "@/lib/schoolos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { useTenantPeriod } from "@/components/tenant-shell";

function formatNaira(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
}

export default function FinancePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const { selectedSessionId, selectedTermId } = useTenantPeriod();

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const summaryQ = useQuery({
    queryKey: ["finance-summary", tenantId, selectedSessionId, selectedTermId],
    queryFn: () =>
      financeApi.summary(tenantId!, {
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
        academicTermId: selectedTermId ? Number(selectedTermId) : undefined,
      }),
    enabled: !!tenantId,
  });
  const feesQ = useQuery({
    queryKey: ["fee-categories", tenantId],
    queryFn: () => financeApi.feeCategories(tenantId!),
    enabled: !!tenantId,
  });
  const templatesQ = useQuery({
    queryKey: ["fee-templates", tenantId],
    queryFn: () => financeApi.feeTemplates(tenantId!),
    enabled: !!tenantId,
  });
  const invoicesQ = useQuery({
    queryKey: ["invoices", tenantId, selectedSessionId, selectedTermId],
    queryFn: () =>
      financeApi.invoices(tenantId!, {
        academicSessionId: selectedSessionId ? Number(selectedSessionId) : undefined,
        academicTermId: selectedTermId ? Number(selectedTermId) : undefined,
      }),
    enabled: !!tenantId,
  });
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
  const classesQ = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: () => academicsApi.classes(tenantId!),
    enabled: !!tenantId,
  });
  const studentsQ = useQuery({
    queryKey: ["students", tenantId, ""],
    queryFn: () => studentsApi.list({ tenantId: tenantId! }),
    enabled: !!tenantId,
  });

  const [feeDialog, setFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeCategory | null>(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeeTemplate | null>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null);
  const [deleteFee, setDeleteFee] = useState<FeeCategory | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["finance-summary", tenantId] });
    qc.invalidateQueries({ queryKey: ["fee-categories", tenantId] });
    qc.invalidateQueries({ queryKey: ["fee-templates", tenantId] });
    qc.invalidateQueries({ queryKey: ["invoices", tenantId] });
  };

  const saveFee = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingFee
        ? financeApi.updateFeeCategory(tenantId!, editingFee.id, payload)
        : financeApi.createFeeCategory(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingFee ? "Fee updated" : "Fee created");
      setFeeDialog(false);
      setEditingFee(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFeeMut = useMutation({
    mutationFn: () => financeApi.deleteFeeCategory(tenantId!, deleteFee!.id),
    onSuccess: () => {
      toast.success("Fee category removed");
      setDeleteFee(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTemplate = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingTemplate
        ? financeApi.updateFeeTemplate(tenantId!, editingTemplate.id, payload)
        : financeApi.createFeeTemplate(tenantId!, payload),
    onSuccess: () => {
      toast.success(editingTemplate ? "Fee template updated" : "Fee template created");
      setTemplateDialog(false);
      setEditingTemplate(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInvoice = useMutation({
    mutationFn: (payload: Record<string, unknown>) => financeApi.createInvoice(tenantId!, payload),
    onSuccess: () => {
      toast.success("Invoice created");
      setInvoiceDialog(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recordPayment = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      financeApi.recordPayment(tenantId!, paymentDialog!.id, payload),
    onSuccess: () => {
      toast.success("Payment recorded");
      setPaymentDialog(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignTemplate = useMutation({
    mutationFn: (payload: {
      feeTemplateId: number;
      academicSessionId: number;
      academicTermId?: number | null;
      assignmentType: "school" | "class" | "student";
      assignmentId?: number | null;
      dueDate: string;
    }) => financeApi.assignFeeTemplate(tenantId!, payload),
    onSuccess: (result) => {
      toast.success(
        `${result.invoices_created} invoice${result.invoices_created === 1 ? "" : "s"} generated`,
      );
      setAssignDialog(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = summaryQ.data;
  const fees = feesQ.data?.fee_categories ?? [];
  const templates = templatesQ.data?.fee_templates ?? [];
  const invoices = invoicesQ.data?.invoices ?? [];
  const students = studentsQ.data?.students ?? [];
  const sessions = sessionsQ.data?.sessions ?? [];
  const terms = termsQ.data?.terms ?? [];
  const classes = classesQ.data?.classes ?? [];

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">Finance</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Fees & invoicing</h1>
        <p className="mt-1 text-muted-foreground">
          Fee structures, invoices, and offline payments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold">
              {formatNaira(summary?.collected ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold">
              {formatNaira(summary?.outstanding ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collection rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold">
              {summary?.collection_rate != null ? `${summary.collection_rate}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="fees">Fee structures</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId || students.length === 0}
              onClick={() => setInvoiceDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> New invoice
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>
                        {inv.student ? `${inv.student.last_name}, ${inv.student.first_name}` : "—"}
                      </TableCell>
                      <TableCell>
                        {formatNaira(inv.amount)}
                        {inv.paid_total > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            Paid {formatNaira(inv.paid_total)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {inv.status !== "paid" && inv.status !== "cancelled" && (
                          <Button variant="outline" size="sm" onClick={() => setPaymentDialog(inv)}>
                            Record pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        No invoices yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={!tenantId || templates.length === 0 || sessions.length === 0}
              onClick={() => setAssignDialog(true)}
            >
              Assign fee
            </Button>
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId}
              onClick={() => {
                setEditingTemplate(null);
                setTemplateDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New template
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Fee templates</CardTitle>
              <CardDescription>
                Create billable items, then assign them to a session/class.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.fee_category?.name ?? "—"}</TableCell>
                      <TableCell>{formatNaira(Number(template.amount))}</TableCell>
                      <TableCell>{template.status}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTemplate(template);
                            setTemplateDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        No fee templates yet. Create a term fee before assigning it.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-hero"
              disabled={!tenantId}
              onClick={() => {
                setEditingFee(null);
                setFeeDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New fee
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Fee structures</CardTitle>
              <CardDescription>Tuition, levies, and recurring charges.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{formatNaira(Number(f.amount))}</TableCell>
                      <TableCell>{f.billing_cycle}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingFee(f);
                              setFeeDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteFee(f)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                        No fee structures defined yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FeeDialog
        open={feeDialog}
        onOpenChange={setFeeDialog}
        initial={editingFee}
        saving={saveFee.isPending}
        onSave={(d) => saveFee.mutate(d)}
      />
      <TemplateDialog
        open={templateDialog}
        onOpenChange={setTemplateDialog}
        initial={editingTemplate}
        fees={fees}
        saving={saveTemplate.isPending}
        onSave={(d) => saveTemplate.mutate(d)}
      />
      <AssignFeeDialog
        open={assignDialog}
        onOpenChange={setAssignDialog}
        templates={templates}
        sessions={sessions}
        terms={terms}
        classes={classes}
        students={students}
        saving={assignTemplate.isPending}
        onSave={(d) => assignTemplate.mutate(d)}
      />
      <InvoiceDialog
        open={invoiceDialog}
        onOpenChange={setInvoiceDialog}
        students={students}
        fees={fees}
        saving={createInvoice.isPending}
        onSave={(d) => createInvoice.mutate(d)}
      />
      <PaymentDialog
        invoice={paymentDialog}
        onClose={() => setPaymentDialog(null)}
        saving={recordPayment.isPending}
        onSave={(d) => recordPayment.mutate(d)}
      />

      <AlertDialog open={!!deleteFee} onOpenChange={() => setDeleteFee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteFee?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This fee category will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteFeeMut.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeeDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FeeCategory | null;
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("term");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(initial?.name ?? "");
          setAmount(initial ? String(initial.amount) : "");
          setCycle(initial?.billing_cycle ?? "term");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit fee" : "New fee structure"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Billing cycle</Label>
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="term">Per term</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!name || !amount || saving}
            onClick={() => onSave({ name, amount: Number(amount), billingCycle: cycle })}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  initial,
  fees,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FeeTemplate | null;
  fees: FeeCategory[];
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [feeCategoryId, setFeeCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(initial?.name ?? "");
          setFeeCategoryId(initial?.fee_category_id ? String(initial.fee_category_id) : "");
          setAmount(initial ? String(initial.amount) : "");
          setDescription(initial?.description ?? "");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit fee template" : "New fee template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Fee category (optional)</Label>
            <Select value={feeCategoryId} onValueChange={setFeeCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {fees.map((fee) => (
                  <SelectItem key={fee.id} value={String(fee.id)}>
                    {fee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!name || !amount || saving}
            onClick={() =>
              onSave({
                name,
                amount: Number(amount),
                description: description || null,
                feeCategoryId:
                  feeCategoryId && feeCategoryId !== "none" ? Number(feeCategoryId) : null,
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

function AssignFeeDialog({
  open,
  onOpenChange,
  templates,
  sessions,
  terms,
  classes,
  students,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: FeeTemplate[];
  sessions: AcademicSession[];
  terms: AcademicTerm[];
  classes: SchoolClass[];
  students: Array<{ id: string; first_name: string; last_name: string }>;
  saving: boolean;
  onSave: (d: {
    feeTemplateId: number;
    academicSessionId: number;
    academicTermId?: number | null;
    assignmentType: "school" | "class" | "student";
    assignmentId?: number | null;
    dueDate: string;
  }) => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [termId, setTermId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"school" | "class" | "student">("school");
  const [assignmentId, setAssignmentId] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const filteredTerms = terms.filter(
    (term) => !sessionId || String(term.academic_session_id ?? "") === sessionId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign fee template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {template.name}
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
            <Label>Term (optional)</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger>
                <SelectValue placeholder="All terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All terms</SelectItem>
                {filteredTerms.map((term) => (
                  <SelectItem key={term.id} value={String(term.id)}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assign to</Label>
            <Select
              value={assignmentType}
              onValueChange={(v) => setAssignmentType(v as "school" | "class" | "student")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school">Entire school</SelectItem>
                <SelectItem value="class">Class</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {assignmentType === "class" && (
            <div>
              <Label>Class</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((schoolClass) => (
                    <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                      {schoolClass.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {assignmentType === "student" && (
            <div>
              <Label>Student</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
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
          )}
          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={
              !templateId ||
              !sessionId ||
              !dueDate ||
              saving ||
              (assignmentType !== "school" && !assignmentId)
            }
            onClick={() =>
              onSave({
                feeTemplateId: Number(templateId),
                academicSessionId: Number(sessionId),
                academicTermId: termId && termId !== "none" ? Number(termId) : null,
                assignmentType,
                assignmentId:
                  assignmentType === "school"
                    ? null
                    : assignmentType === "class"
                      ? Number(assignmentId)
                      : Number(assignmentId),
                dueDate,
              })
            }
          >
            Assign & generate invoices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({
  open,
  onOpenChange,
  students,
  fees,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  students: Array<{ id: string; first_name: string; last_name: string }>;
  fees: FeeCategory[];
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [feeId, setFeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fee category (optional)</Label>
            <Select
              value={feeId}
              onValueChange={(v) => {
                setFeeId(v);
                const fee = fees.find((f) => String(f.id) === v);
                if (fee) setAmount(String(fee.amount));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {fees.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name} — {formatNaira(Number(f.amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!studentId || !amount || saving}
            onClick={() =>
              onSave({
                studentId: Number(studentId),
                feeCategoryId: feeId && feeId !== "none" ? Number(feeId) : null,
                amount: Number(amount),
                dueDate,
                status: "pending",
              })
            }
          >
            Create invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  invoice,
  onClose,
  saving,
  onSave,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  saving: boolean;
  onSave: (d: Record<string, unknown>) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  if (!invoice) return null;
  const remaining = Math.max(0, invoice.amount - invoice.paid_total);

  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment — {invoice.invoice_number}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Balance: {formatNaira(remaining)} of {formatNaira(invoice.amount)}
        </p>
        <div className="space-y-4">
          <div>
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min={0.01}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(remaining)}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Paid on</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-hero"
            disabled={!amount || saving}
            onClick={() =>
              onSave({
                amount: Number(amount),
                paidAt,
                method,
              })
            }
          >
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
