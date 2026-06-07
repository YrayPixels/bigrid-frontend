"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { employeesApi, tenantsApi } from "@/lib/api-client";
import type { Employee, EmployeeOption } from "@/lib/schoolos-types";

const statusVariants: Record<Employee["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  on_leave: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  suspended: "bg-destructive/15 text-destructive",
  terminated: "bg-muted text-muted-foreground",
};

const statusLabels: Record<Employee["status"], string> = {
  active: "Active",
  on_leave: "On leave",
  suspended: "Suspended",
  terminated: "Terminated",
};

const employmentTypeLabels: Record<Employee["employment_type"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
};

export default function EmployeesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const employeesQ = useQuery({
    queryKey: ["employees", tenantId, debounced],
    queryFn: () => employeesApi.list({ tenantId: tenantId!, search: debounced || undefined }),
    enabled: !!tenantId,
  });

  const rolesQ = useQuery({
    queryKey: ["employee-roles", tenantId],
    queryFn: () => employeesApi.roles(tenantId!),
    enabled: !!tenantId,
  });

  const departmentsQ = useQuery({
    queryKey: ["employee-departments", tenantId],
    queryFn: () => employeesApi.departments(tenantId!),
    enabled: !!tenantId,
  });

  const saveMut = useMutation({
    mutationFn: employeesApi.upsert,
    onSuccess: () => {
      toast.success(editing ? "Employee updated" : "Employee added");
      qc.invalidateQueries({ queryKey: ["employees", tenantId] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      toast.success("Employee removed");
      qc.invalidateQueries({ queryKey: ["employees", tenantId] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRoleMut = useMutation({
    mutationFn: (name: string) => employeesApi.createRole(tenantId!, { name }),
    onSuccess: () => {
      toast.success("Role added");
      qc.invalidateQueries({ queryKey: ["employee-roles", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDepartmentMut = useMutation({
    mutationFn: (name: string) => employeesApi.createDepartment(tenantId!, { name }),
    onSuccess: () => {
      toast.success("Department added");
      qc.invalidateQueries({ queryKey: ["employee-departments", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const employees = employeesQ.data?.employees ?? [];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
            Employees
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Employee directory</h1>
          <p className="mt-1 text-muted-foreground">
            {employees.length} {employees.length === 1 ? "employee" : "employees"} on record
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
          <Plus className="mr-2 h-4 w-4" /> Add employee
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
                placeholder="Search by name, staff ID, role, department…"
                className="pl-9"
              />
            </div>
            {employeesQ.isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {employeesQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <BriefcaseBusiness className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">
                {debounced ? "No matches" : "No employees yet"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {debounced
                  ? "Try a different search term."
                  : "Add your first employee to start building the staff directory."}
              </p>
              {!debounced && (
                <Button
                  className="mt-6 bg-gradient-hero"
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add employee
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles / Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-mono text-xs">{employee.staff_id}</TableCell>
                    <TableCell className="font-medium">
                      {employee.last_name}, {employee.first_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{employee.role}</div>
                        <div className="text-xs text-muted-foreground">
                          {employmentTypeLabels[employee.employment_type]}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.department || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.email || employee.phone ? (
                        <div className="text-sm">
                          {employee.email && <div>{employee.email}</div>}
                          {employee.phone && <div className="text-xs">{employee.phone}</div>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusVariants[employee.status]}>
                        {statusLabels[employee.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(employee);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDelete(employee)}
                        >
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

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        submitting={saveMut.isPending}
        roleOptions={rolesQ.data?.roles ?? []}
        departmentOptions={departmentsQ.data?.departments ?? []}
        optionsLoading={rolesQ.isLoading || departmentsQ.isLoading}
        creatingRole={createRoleMut.isPending}
        creatingDepartment={createDepartmentMut.isPending}
        onCreateRole={async (name) => (await createRoleMut.mutateAsync(name)).role}
        onCreateDepartment={async (name) =>
          (await createDepartmentMut.mutateAsync(name)).department
        }
        onSubmit={(values) => {
          if (!tenantId) return;
          saveMut.mutate({ ...values, tenantId, id: editing?.id });
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete &&
                `This will permanently remove ${confirmDelete.first_name} ${confirmDelete.last_name} from your employee directory.`}
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
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  employmentType: Employee["employment_type"];
  hireDate: string;
  salary: string;
  status: Employee["status"];
  address: string;
  notes: string;
};

function EmployeeDialog({
  open,
  onOpenChange,
  editing,
  submitting,
  roleOptions,
  departmentOptions,
  optionsLoading,
  creatingRole,
  creatingDepartment,
  onCreateRole,
  onCreateDepartment,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Employee | null;
  submitting: boolean;
  roleOptions: EmployeeOption[];
  departmentOptions: EmployeeOption[];
  optionsLoading: boolean;
  creatingRole: boolean;
  creatingDepartment: boolean;
  onCreateRole: (name: string) => Promise<EmployeeOption>;
  onCreateDepartment: (name: string) => Promise<EmployeeOption>;
  onSubmit: (v: {
    staffId?: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: string;
    department: string | null;
    employmentType: Employee["employment_type"];
    hireDate: string | null;
    salary: string | null;
    status: Employee["status"];
    address: string | null;
    notes: string | null;
  }) => void;
}) {
  const initial: FormValues = {
    staffId: editing?.staff_id ?? "",
    firstName: editing?.first_name ?? "",
    lastName: editing?.last_name ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    role: editing?.role ?? "",
    department: editing?.department ?? "",
    employmentType: editing?.employment_type ?? "full_time",
    hireDate: editing?.hire_date ?? "",
    salary: editing?.salary ?? "",
    status: editing?.status ?? "active",
    address: editing?.address ?? "",
    notes: editing?.notes ?? "",
  };
  const [v, setV] = useState<FormValues>(initial);
  const [newRole, setNewRole] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  useEffect(() => {
    if (open) {
      setV(initial);
      setNewRole("");
      setNewDepartment("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const roles = includeCurrentOption(roleOptions, v.role);
  const departments = includeCurrentOption(departmentOptions, v.department);

  const addRole = async () => {
    const name = newRole.trim();
    if (!name) return;

    try {
      const option = await onCreateRole(name);
      set("role", option.name);
      setNewRole("");
    } catch {
      // Toast is handled by the mutation.
    }
  };

  const addDepartment = async () => {
    const name = newDepartment.trim();
    if (!name) return;

    try {
      const option = await onCreateDepartment(name);
      set("department", option.name);
      setNewDepartment("");
    } catch {
      // Toast is handled by the mutation.
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      staffId: editing ? v.staffId.trim() : undefined,
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim() || null,
      phone: v.phone.trim() || null,
      role: v.role.trim(),
      department: v.department.trim() || null,
      employmentType: v.employmentType,
      hireDate: v.hireDate || null,
      salary: v.salary || null,
      status: v.status,
      address: v.address.trim() || null,
      notes: v.notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit employee" : "Add a new employee"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update staff details, employment status, and contact information."
              : "Add a staff member to your school employee directory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Staff ID">
              <Input
                value={editing ? v.staffId : "Generated when saved"}
                readOnly
                disabled={!editing}
                maxLength={40}
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Roles / Title" required>
              <Select value={v.role} onValueChange={(val) => set("role", val)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={optionsLoading ? "Loading roles..." : "Select a role"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  maxLength={80}
                  placeholder="Create role, e.g. Teacher"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addRole}
                  disabled={creatingRole || !newRole.trim()}
                >
                  {creatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
                </Button>
              </div>
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
            <Field label="Department">
              <Select
                value={v.department || "none"}
                onValueChange={(val) => set("department", val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={optionsLoading ? "Loading departments..." : "Select a department"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  maxLength={80}
                  placeholder="Create department, e.g. Academics"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addDepartment}
                  disabled={creatingDepartment || !newDepartment.trim()}
                >
                  {creatingDepartment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
                </Button>
              </div>
            </Field>
            <Field label="Employment type">
              <Select
                value={v.employmentType}
                onValueChange={(val) => set("employmentType", val as Employee["employment_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hire date">
              <Input
                type="date"
                value={v.hireDate}
                onChange={(e) => set("hireDate", e.target.value)}
              />
            </Field>
            <Field label="Monthly salary">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={v.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Status">
              <Select
                value={v.status}
                onValueChange={(val) => set("status", val as Employee["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-1">
            <h4 className="font-display text-sm font-semibold">Contact</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <Input
                  type="email"
                  value={v.email}
                  onChange={(e) => set("email", e.target.value)}
                  maxLength={255}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={v.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  maxLength={40}
                />
              </Field>
            </div>
          </div>

          <Field label="Address">
            <Textarea
              value={v.address}
              onChange={(e) => set("address", e.target.value)}
              maxLength={2000}
              rows={2}
            />
          </Field>

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
              {editing ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function includeCurrentOption(options: EmployeeOption[], current: string) {
  const name = current.trim();
  if (!name || options.some((option) => option.name === name)) return options;
  return [{ id: `current-${name}`, name }, ...options];
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
