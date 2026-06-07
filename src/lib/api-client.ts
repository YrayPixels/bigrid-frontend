import type {
  AcademicSession,
  AcademicTerm,
  AttendanceClassRow,
  AttendanceRow,
  AttendanceSummary,
  ClassSubjectAssignment,
  Employee,
  EmployeeOption,
  FeeCategory,
  FeeTemplate,
  FinanceSummary,
  Invoice,
  OnboardingImportPayload,
  OnboardingImportResult,
  SchoolClass,
  SchoolEvent,
  SchoolEventType,
  TimetableHoliday,
  TimetablePeriod,
  TimetableWeekday,
  SchoolMessage,
  SchoolMessageAudience,
  SchoolMessageChannel,
  Student,
  StudentEnrollment,
  Subject,
} from "@/lib/schoolos-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api";

export type BackendUser = {
  id: number | string;
  name: string;
  email: string;
  email_verified_at?: string | null;
};

export type AuthState = {
  token: string;
  user: BackendUser;
};

const AUTH_STORAGE_KEY = "school-harmony-auth";

export function readStoredAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAuth(auth: AuthState) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

type ApiErrorBody = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]> | Array<{ message?: string }>;
};

export class ApiRequestError extends Error {
  details?: ApiErrorBody["errors"];

  constructor(message: string, details?: ApiErrorBody["errors"]) {
    super(message);
    this.name = "ApiRequestError";
    this.details = details;
  }
}

function formatApiError(body: ApiErrorBody, status: number) {
  if (Array.isArray(body.errors)) {
    const first = body.errors[0]?.message;
    if (first) return body.message ? `${body.message} ${first}` : first;
  } else if (body.errors) {
    const first = Object.values(body.errors)[0]?.[0];
    if (first) return first;
  }
  return body.message ?? body.error ?? `Request failed (${status})`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = readStoredAuth();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!res.ok) {
    throw new ApiRequestError(formatApiError(body, res.status), body.errors);
  }
  return body as T;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiFetch<{ message: string; user: BackendUser; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ message: string; user: BackendUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => apiFetch<{ user: BackendUser }>("/auth/me"),
  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    }),
};

export const tenantsApi = {
  create: (data: { name: string; slug: string; motto?: string; contactEmail?: string }) =>
    apiFetch<
      | { ok: true; tenant: { id: string; slug: string; name: string } }
      | { ok: false; error: string }
    >("/schools", { method: "POST", body: JSON.stringify(data) }),
  checkSlug: (slug: string) =>
    apiFetch<{ available: boolean; reason: "reserved" | "taken" | null }>("/schools/check-slug", {
      method: "POST",
      body: JSON.stringify({ slug }),
    }),
  listMine: () =>
    apiFetch<{ tenants: Array<{ id: string; slug: string; name: string; role: string }> }>(
      "/schools/mine",
    ),
  getBySlug: (slug: string) =>
    apiFetch<{ tenant: { id: string; slug: string; name: string } | null; role: string | null }>(
      "/schools/by-slug",
      { method: "POST", body: JSON.stringify({ slug }) },
    ),
};

function schoolPath(tenantId: string, suffix: string) {
  return `/schools/${tenantId}${suffix}`;
}

export const onboardingImportApi = {
  upload: (tenantId: string, data: OnboardingImportPayload) =>
    apiFetch<OnboardingImportResult>(schoolPath(tenantId, "/onboarding-import"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const studentsApi = {
  list: (data: { tenantId: string; search?: string }) => {
    const query = data.search ? `?search=${encodeURIComponent(data.search)}` : "";
    return apiFetch<{ students: Student[] }>(schoolPath(data.tenantId, `/students${query}`), {
      method: "GET",
    });
  },
  upsert: (data: Record<string, unknown>) =>
    apiFetch<{ student: Student }>(schoolPath(String(data.tenantId), "/students"), {
      method: data.id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    }),
  delete: (data: { id: string; tenantId: string }) =>
    apiFetch<{ ok: true }>(schoolPath(data.tenantId, `/students/${data.id}`), { method: "DELETE" }),
};

export const employeesApi = {
  list: (data: { tenantId: string; search?: string }) => {
    const query = data.search ? `?search=${encodeURIComponent(data.search)}` : "";
    return apiFetch<{ employees: Employee[] }>(schoolPath(data.tenantId, `/employees${query}`), {
      method: "GET",
    });
  },
  upsert: (data: Record<string, unknown>) =>
    apiFetch<{ employee: Employee }>(schoolPath(String(data.tenantId), "/employees"), {
      method: data.id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    }),
  delete: (data: { id: string; tenantId: string }) =>
    apiFetch<{ ok: true }>(schoolPath(data.tenantId, `/employees/${data.id}`), {
      method: "DELETE",
    }),
  roles: (tenantId: string) =>
    apiFetch<{ roles: EmployeeOption[] }>(schoolPath(tenantId, "/employee-roles")),
  createRole: (tenantId: string, data: { name: string }) =>
    apiFetch<{ role: EmployeeOption }>(schoolPath(tenantId, "/employee-roles"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  departments: (tenantId: string) =>
    apiFetch<{ departments: EmployeeOption[] }>(schoolPath(tenantId, "/employee-departments")),
  createDepartment: (tenantId: string, data: { name: string }) =>
    apiFetch<{ department: EmployeeOption }>(schoolPath(tenantId, "/employee-departments"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const academicsApi = {
  sessions: (tenantId: string) =>
    apiFetch<{ sessions: AcademicSession[] }>(schoolPath(tenantId, "/sessions")),
  createSession: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ session: AcademicSession }>(schoolPath(tenantId, "/sessions"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSession: (tenantId: string, sessionId: number, data: Record<string, unknown>) =>
    apiFetch<{ session: AcademicSession }>(schoolPath(tenantId, `/sessions/${sessionId}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  classes: (tenantId: string) =>
    apiFetch<{ classes: SchoolClass[] }>(schoolPath(tenantId, "/classes")),
  createClass: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ class: SchoolClass }>(schoolPath(tenantId, "/classes"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateClass: (tenantId: string, classId: string, data: Record<string, unknown>) =>
    apiFetch<{ class: SchoolClass }>(schoolPath(tenantId, `/classes/${classId}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteClass: (tenantId: string, classId: string) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/classes/${classId}`), { method: "DELETE" }),

  subjects: (tenantId: string) =>
    apiFetch<{ subjects: Subject[] }>(schoolPath(tenantId, "/subjects")),
  createSubject: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ subject: Subject }>(schoolPath(tenantId, "/subjects"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSubject: (tenantId: string, subjectId: number, data: Record<string, unknown>) =>
    apiFetch<{ subject: Subject }>(schoolPath(tenantId, `/subjects/${subjectId}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteSubject: (tenantId: string, subjectId: number) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/subjects/${subjectId}`), { method: "DELETE" }),

  terms: (tenantId: string) => apiFetch<{ terms: AcademicTerm[] }>(schoolPath(tenantId, "/terms")),
  createTerm: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ term: AcademicTerm }>(schoolPath(tenantId, "/terms"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTerm: (tenantId: string, termId: number, data: Record<string, unknown>) =>
    apiFetch<{ term: AcademicTerm }>(schoolPath(tenantId, `/terms/${termId}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTerm: (tenantId: string, termId: number) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/terms/${termId}`), { method: "DELETE" }),

  classSubjects: (tenantId: string) =>
    apiFetch<{ assignments: ClassSubjectAssignment[] }>(schoolPath(tenantId, "/class-subjects")),
  assignClassSubject: (tenantId: string, data: { schoolClassId: number; subjectId: number }) =>
    apiFetch<{ assignment: unknown }>(schoolPath(tenantId, "/class-subjects"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  unassignClassSubject: (tenantId: string, assignmentId: number) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/class-subjects/${assignmentId}`), {
      method: "DELETE",
    }),
  enrollments: (
    tenantId: string,
    params?: { academicSessionId?: number; schoolClassId?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.academicSessionId)
      search.set("academicSessionId", String(params.academicSessionId));
    if (params?.schoolClassId) search.set("schoolClassId", params.schoolClassId);
    const query = search.toString() ? `?${search.toString()}` : "";
    return apiFetch<{ enrollments: StudentEnrollment[] }>(
      schoolPath(tenantId, `/enrollments${query}`),
    );
  },
  enrollStudent: (
    tenantId: string,
    data: {
      studentId: number;
      academicSessionId: number;
      schoolClassId: number;
      status?: string;
      enrolledAt?: string;
    },
  ) =>
    apiFetch<{ enrollment: StudentEnrollment }>(schoolPath(tenantId, "/enrollments"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const timetableApi = {
  list: (
    tenantId: string,
    params: {
      academicSessionId: number;
      academicTermId: number;
      schoolClassId?: number;
      from?: string;
      to?: string;
    },
  ) => {
    const search = new URLSearchParams({
      academicSessionId: String(params.academicSessionId),
      academicTermId: String(params.academicTermId),
    });
    if (params.schoolClassId) search.set("schoolClassId", String(params.schoolClassId));
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);

    return apiFetch<{
      periods: TimetablePeriod[];
      holidays: TimetableHoliday[];
    }>(schoolPath(tenantId, `/timetable-periods?${search}`));
  },
  createPeriod: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ period: TimetablePeriod }>(schoolPath(tenantId, "/timetable-periods"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePeriod: (tenantId: string, periodId: string, data: Record<string, unknown>) =>
    apiFetch<{ period: TimetablePeriod }>(schoolPath(tenantId, `/timetable-periods/${periodId}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deletePeriod: (tenantId: string, periodId: string) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/timetable-periods/${periodId}`), {
      method: "DELETE",
    }),
};

export const calendarApi = {
  events: (
    tenantId: string,
    params?: {
      from?: string;
      to?: string;
      academicSessionId?: number;
      academicTermId?: number;
      type?: SchoolEventType;
      limit?: number;
    },
  ) => {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.academicSessionId)
      search.set("academicSessionId", String(params.academicSessionId));
    if (params?.academicTermId) search.set("academicTermId", String(params.academicTermId));
    if (params?.type) search.set("type", params.type);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<{ events: SchoolEvent[] }>(schoolPath(tenantId, `/events${query}`));
  },
  createEvent: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ event: SchoolEvent }>(schoolPath(tenantId, "/events"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateEvent: (tenantId: string, eventId: string, data: Record<string, unknown>) =>
    apiFetch<{ event: SchoolEvent }>(schoolPath(tenantId, `/events/${eventId}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteEvent: (tenantId: string, eventId: string) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/events/${eventId}`), { method: "DELETE" }),
};

export const messagesApi = {
  list: (tenantId: string) =>
    apiFetch<{ messages: SchoolMessage[] }>(schoolPath(tenantId, "/messages")),
  send: (
    tenantId: string,
    data: {
      channel: SchoolMessageChannel;
      audience: SchoolMessageAudience;
      title: string;
      body: string;
    },
  ) =>
    apiFetch<{ message: SchoolMessage }>(schoolPath(tenantId, "/messages"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const attendanceApi = {
  summary: (tenantId: string, date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return apiFetch<AttendanceSummary>(schoolPath(tenantId, `/attendance/summary${q}`));
  },
  classes: (tenantId: string, date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return apiFetch<{ date: string; classes: AttendanceClassRow[] }>(
      schoolPath(tenantId, `/attendance/classes${q}`),
    );
  },
  rows: (tenantId: string, params: { date: string; schoolClassId?: string }) => {
    const search = new URLSearchParams({ date: params.date });
    if (params.schoolClassId) search.set("schoolClassId", params.schoolClassId);
    return apiFetch<{ date: string; rows: AttendanceRow[] }>(
      schoolPath(tenantId, `/attendance?${search}`),
    );
  },
  save: (
    tenantId: string,
    data: {
      date: string;
      schoolClassId?: string;
      records: Array<{ studentId: number; status: string; notes?: string }>;
    },
  ) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, "/attendance"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const financeApi = {
  summary: (tenantId: string, params?: { academicSessionId?: number; academicTermId?: number }) => {
    const search = new URLSearchParams();
    if (params?.academicSessionId)
      search.set("academicSessionId", String(params.academicSessionId));
    if (params?.academicTermId) search.set("academicTermId", String(params.academicTermId));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<FinanceSummary>(schoolPath(tenantId, `/finance/summary${query}`));
  },
  feeCategories: (tenantId: string) =>
    apiFetch<{ fee_categories: FeeCategory[] }>(schoolPath(tenantId, "/fee-categories")),
  createFeeCategory: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ fee_category: FeeCategory }>(schoolPath(tenantId, "/fee-categories"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateFeeCategory: (tenantId: string, id: number, data: Record<string, unknown>) =>
    apiFetch<{ fee_category: FeeCategory }>(schoolPath(tenantId, `/fee-categories/${id}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteFeeCategory: (tenantId: string, id: number) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/fee-categories/${id}`), { method: "DELETE" }),

  feeTemplates: (tenantId: string) =>
    apiFetch<{ fee_templates: FeeTemplate[] }>(schoolPath(tenantId, "/fee-templates")),
  createFeeTemplate: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ fee_template: FeeTemplate }>(schoolPath(tenantId, "/fee-templates"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateFeeTemplate: (tenantId: string, id: number, data: Record<string, unknown>) =>
    apiFetch<{ fee_template: FeeTemplate }>(schoolPath(tenantId, `/fee-templates/${id}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteFeeTemplate: (tenantId: string, id: number) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/fee-templates/${id}`), {
      method: "DELETE",
    }),
  assignFeeTemplate: (
    tenantId: string,
    data: {
      feeTemplateId: number;
      academicSessionId: number;
      academicTermId?: number | null;
      assignmentType: "school" | "class" | "student";
      assignmentId?: number | null;
      dueDate: string;
    },
  ) =>
    apiFetch<{ assignment: unknown; invoices_created: number }>(
      schoolPath(tenantId, "/fee-assignments"),
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  invoices: (
    tenantId: string,
    params?: { academicSessionId?: number; academicTermId?: number },
  ) => {
    const search = new URLSearchParams();
    if (params?.academicSessionId)
      search.set("academicSessionId", String(params.academicSessionId));
    if (params?.academicTermId) search.set("academicTermId", String(params.academicTermId));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<{ invoices: Invoice[] }>(schoolPath(tenantId, `/invoices${query}`));
  },
  createInvoice: (tenantId: string, data: Record<string, unknown>) =>
    apiFetch<{ invoice: Invoice }>(schoolPath(tenantId, "/invoices"), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateInvoice: (tenantId: string, id: string, data: Record<string, unknown>) =>
    apiFetch<{ invoice: Invoice }>(schoolPath(tenantId, `/invoices/${id}`), {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteInvoice: (tenantId: string, id: string) =>
    apiFetch<{ ok: true }>(schoolPath(tenantId, `/invoices/${id}`), { method: "DELETE" }),

  recordPayment: (tenantId: string, invoiceId: string, data: Record<string, unknown>) =>
    apiFetch<{ payment: unknown }>(schoolPath(tenantId, `/invoices/${invoiceId}/payments`), {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
