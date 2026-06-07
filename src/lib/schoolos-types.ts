export type SchoolClass = {
  id: string;
  name: string;
  section: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  student_count?: number;
};

export type Subject = {
  id: number;
  school_id: number;
  name: string;
  code: string | null;
  description: string | null;
};

export type AcademicTerm = {
  id: number;
  school_id: number;
  academic_session_id?: number | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  academic_session?: { id: number; name: string; status: string } | null;
};

export type AcademicSession = {
  id: number;
  school_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "active" | "archived";
  enrollments_count?: number;
};

export type StudentEnrollment = {
  id: number;
  student_id: number;
  academic_session_id: number;
  school_class_id: number;
  status: "active" | "promoted" | "transferred" | "graduated" | "withdrawn";
  enrolled_at: string | null;
  student?: {
    id: number;
    admission_number: string;
    first_name: string;
    last_name: string;
    status: string;
  };
  academic_session?: { id: number; name: string; status: string };
  school_class?: { id: number; name: string; section: string | null };
};

export type ClassSubjectAssignment = {
  id: number;
  school_class_id: number;
  subject_id: number;
  class_name: string;
  subject_name: string;
};

export type SchoolEventType =
  | "event"
  | "exam"
  | "interhouse_sports"
  | "holiday"
  | "midterm_break"
  | "sports"
  | "meeting"
  | "deadline"
  | "other";

export type TimetableWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type TimetablePeriod = {
  id: string;
  school_id: string;
  academic_session_id: number;
  academic_term_id: number;
  school_class_id: number;
  subject_id: number;
  teacher_employee_id: number;
  weekday: TimetableWeekday;
  start_time: string;
  end_time: string;
  room: string | null;
  notes: string | null;
  status: "active" | "inactive";
  school_class?: {
    id: number;
    name: string;
    section: string | null;
  } | null;
  subject?: {
    id: number;
    name: string;
    code: string | null;
  } | null;
  teacher?: {
    id: number;
    first_name: string;
    last_name: string;
    staff_id: string;
  } | null;
};

export type TimetableHoliday = {
  id: string;
  title: string;
  event_type: "holiday";
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  description: string | null;
};

export type SchoolEvent = {
  id: string;
  school_id: string;
  academic_session_id: number | null;
  academic_term_id: number | null;
  title: string;
  event_type: SchoolEventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  audience: string | null;
  description: string | null;
};

export type AttendanceSummary = {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  by_class: Array<{
    id: number;
    name: string;
    section: string | null;
    marked: number;
  }>;
};

export type AttendanceRow = {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  school_class_id: string | null;
  status: "present" | "absent" | "late" | "excused" | null;
  notes: string | null;
  record_id: string | null;
};

export type AttendanceClassRow = {
  id: string;
  name: string;
  section: string | null;
  enrolled_count: number;
  marked_count: number;
};

export type FeeCategory = {
  id: number;
  school_id: number;
  name: string;
  amount: string;
  billing_cycle: "term" | "monthly" | "one_time";
  description: string | null;
  is_active: boolean;
};

export type FeeTemplate = {
  id: number;
  school_id: number;
  fee_category_id: number | null;
  fee_category?: { id: number; name: string } | null;
  name: string;
  description: string | null;
  amount: string;
  currency: string;
  is_recurring: boolean;
  is_optional: boolean;
  status: "active" | "inactive";
};

export type Invoice = {
  id: string;
  invoice_number: string;
  student_id: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    admission_number: string;
  } | null;
  fee_category_id: string | null;
  fee_category: { id: string; name: string } | null;
  academic_session?: { id: string; name: string } | null;
  academic_term?: { id: string; name: string } | null;
  items?: Array<{
    id: string;
    description: string;
    amount: number;
    fee_template_id: string | null;
  }>;
  amount: number;
  due_date: string;
  status: "draft" | "pending" | "paid" | "partial" | "overdue" | "cancelled";
  notes: string | null;
  paid_total: number;
  created_at?: string;
};

export type FinanceSummary = {
  collected: number;
  outstanding: number;
  invoiced: number;
  collection_rate: number | null;
};

export type Student = {
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

export type Employee = {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "temporary";
  hire_date: string | null;
  salary: string | null;
  status: "active" | "on_leave" | "suspended" | "terminated";
  address: string | null;
  notes: string | null;
};

export type EmployeeOption = {
  id: string;
  name: string;
};

export type OnboardingImportSheet =
  | "classes"
  | "subjects"
  | "classSubjects"
  | "academicSessions"
  | "terms"
  | "students"
  | "enrollments"
  | "employees"
  | "feeCategories"
  | "feeTemplates";

export type OnboardingImportPayload = Record<OnboardingImportSheet, Array<Record<string, unknown>>>;

export type OnboardingImportError = {
  sheet: string;
  row: number | null;
  field: string;
  message: string;
};

export type OnboardingImportSummary = Record<
  OnboardingImportSheet,
  {
    created: number;
    updated: number;
  }
>;

export type OnboardingImportResult = {
  ok: true;
  summary: OnboardingImportSummary;
};

export type SchoolMessageChannel = "sms" | "whatsapp";

export type SchoolMessageAudience = "parents" | "teachers" | "all";

export type SchoolMessageRecipient = {
  type: "parent" | "teacher";
  name: string;
  phone: string;
  student_id?: number;
  student_name?: string;
  employee_id?: number;
  role?: string;
};

export type SchoolMessage = {
  id: string;
  school_id: string;
  channel: SchoolMessageChannel;
  audience: SchoolMessageAudience;
  title: string;
  body: string;
  recipient_count: number;
  recipients: SchoolMessageRecipient[] | null;
  status: "sent" | "queued" | "failed";
  sent_at: string | null;
  created_at: string;
  creator?: { id: number; name: string; email: string } | null;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  status?: string;
  role?: string;
};
