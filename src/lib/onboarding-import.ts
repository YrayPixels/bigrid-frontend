import * as XLSX from "xlsx";
import type { OnboardingImportPayload, OnboardingImportSheet } from "@/lib/schoolos-types";

type ColumnType = "text" | "number" | "date" | "boolean" | "enum" | "currency";

type TemplateColumn = {
  header: string;
  key: string;
  type?: ColumnType;
  sample: string | number | boolean | null;
};

type SheetConfig = {
  sheetName: string;
  payloadKey: OnboardingImportSheet;
  columns: TemplateColumn[];
};

const SHEETS: SheetConfig[] = [
  {
    sheetName: "Classes",
    payloadKey: "classes",
    columns: [
      { header: "Name", key: "name", sample: "JSS 1" },
      { header: "Section", key: "section", sample: "A" },
      { header: "Description", key: "description", sample: "Junior secondary one" },
      { header: "Sort Order", key: "sortOrder", type: "number", sample: 1 },
      { header: "Is Active", key: "isActive", type: "boolean", sample: true },
    ],
  },
  {
    sheetName: "Subjects",
    payloadKey: "subjects",
    columns: [
      { header: "Name", key: "name", sample: "Mathematics" },
      { header: "Code", key: "code", sample: "MATH" },
      { header: "Description", key: "description", sample: "Core numeracy subject" },
    ],
  },
  {
    sheetName: "Class Subjects",
    payloadKey: "classSubjects",
    columns: [
      { header: "Class Name", key: "className", sample: "JSS 1" },
      { header: "Class Section", key: "classSection", sample: "A" },
      { header: "Subject Name", key: "subjectName", sample: "Mathematics" },
    ],
  },
  {
    sheetName: "Academic Sessions",
    payloadKey: "academicSessions",
    columns: [
      { header: "Name", key: "name", sample: "2026/2027" },
      { header: "Start Date", key: "startDate", type: "date", sample: "2026-09-01" },
      { header: "End Date", key: "endDate", type: "date", sample: "2027-07-31" },
      { header: "Status", key: "status", type: "enum", sample: "active" },
    ],
  },
  {
    sheetName: "Terms",
    payloadKey: "terms",
    columns: [
      { header: "Academic Session", key: "academicSessionName", sample: "2026/2027" },
      { header: "Name", key: "name", sample: "First Term" },
      { header: "Start Date", key: "startDate", type: "date", sample: "2026-09-01" },
      { header: "End Date", key: "endDate", type: "date", sample: "2026-12-15" },
      { header: "Is Current", key: "isCurrent", type: "boolean", sample: true },
    ],
  },
  {
    sheetName: "Students",
    payloadKey: "students",
    columns: [
      { header: "Admission Number", key: "admissionNumber", sample: "SHS/2026/0001" },
      { header: "First Name", key: "firstName", sample: "Ada" },
      { header: "Last Name", key: "lastName", sample: "Okafor" },
      { header: "Date Of Birth", key: "dateOfBirth", type: "date", sample: "2014-05-20" },
      { header: "Gender", key: "gender", type: "enum", sample: "female" },
      { header: "Class Name", key: "className", sample: "JSS 1" },
      { header: "Class Section", key: "classSection", sample: "A" },
      { header: "Guardian Name", key: "guardianName", sample: "Mrs Okafor" },
      { header: "Guardian Phone", key: "guardianPhone", sample: "08030000000" },
      { header: "Guardian Email", key: "guardianEmail", sample: "guardian@example.com" },
      { header: "Enrollment Date", key: "enrollmentDate", type: "date", sample: "2026-09-01" },
      { header: "Status", key: "status", type: "enum", sample: "enrolled" },
      { header: "Notes", key: "notes", sample: "Transferred from previous school" },
    ],
  },
  {
    sheetName: "Enrollments",
    payloadKey: "enrollments",
    columns: [
      { header: "Admission Number", key: "admissionNumber", sample: "SHS/2026/0001" },
      { header: "Academic Session", key: "academicSessionName", sample: "2026/2027" },
      { header: "Class Name", key: "className", sample: "JSS 1" },
      { header: "Class Section", key: "classSection", sample: "A" },
      { header: "Status", key: "status", type: "enum", sample: "active" },
      { header: "Enrolled At", key: "enrolledAt", type: "date", sample: "2026-09-01" },
    ],
  },
  {
    sheetName: "Employees",
    payloadKey: "employees",
    columns: [
      { header: "Staff ID", key: "staffId", sample: "SHS-001" },
      { header: "First Name", key: "firstName", sample: "Tunde" },
      { header: "Last Name", key: "lastName", sample: "Adebayo" },
      { header: "Email", key: "email", sample: "teacher@example.com" },
      { header: "Phone", key: "phone", sample: "08031111111" },
      { header: "Role", key: "role", sample: "Teacher" },
      { header: "Department", key: "department", sample: "Science" },
      { header: "Employment Type", key: "employmentType", type: "enum", sample: "full_time" },
      { header: "Hire Date", key: "hireDate", type: "date", sample: "2026-08-15" },
      { header: "Salary", key: "salary", type: "number", sample: 150000 },
      { header: "Status", key: "status", type: "enum", sample: "active" },
      { header: "Address", key: "address", sample: "12 School Road" },
      { header: "Notes", key: "notes", sample: "Class teacher for JSS 1A" },
    ],
  },
  {
    sheetName: "Fee Categories",
    payloadKey: "feeCategories",
    columns: [
      { header: "Name", key: "name", sample: "Tuition" },
      { header: "Amount", key: "amount", type: "number", sample: 250000 },
      { header: "Billing Cycle", key: "billingCycle", type: "enum", sample: "term" },
      { header: "Description", key: "description", sample: "Core school fees" },
      { header: "Is Active", key: "isActive", type: "boolean", sample: true },
    ],
  },
  {
    sheetName: "Fee Templates",
    payloadKey: "feeTemplates",
    columns: [
      { header: "Name", key: "name", sample: "First Term Tuition" },
      { header: "Fee Category", key: "feeCategoryName", sample: "Tuition" },
      { header: "Amount", key: "amount", type: "number", sample: 250000 },
      { header: "Currency", key: "currency", type: "currency", sample: "NGN" },
      { header: "Is Recurring", key: "isRecurring", type: "boolean", sample: true },
      { header: "Is Optional", key: "isOptional", type: "boolean", sample: false },
      { header: "Status", key: "status", type: "enum", sample: "active" },
      { header: "Description", key: "description", sample: "Tuition invoice template" },
    ],
  },
];

export function downloadOnboardingTemplate() {
  const workbook = XLSX.utils.book_new();

  for (const sheet of SHEETS) {
    const headers = sheet.columns.map((column) => column.header);
    const sample = sheet.columns.map((column) => column.sample);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sample]);

    worksheet["!cols"] = sheet.columns.map((column) => ({
      wch: Math.max(column.header.length + 4, 18),
    }));

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  }

  XLSX.writeFile(workbook, "school-harmony-onboarding-template.xlsx");
}

export async function parseOnboardingWorkbook(file: File): Promise<OnboardingImportPayload> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const payload = emptyPayload();

  for (const sheet of SHEETS) {
    const worksheet = workbook.Sheets[sheet.sheetName];
    if (!worksheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: true,
    });

    payload[sheet.payloadKey] = rows
      .map((row, index) => normaliseRow(row, sheet, index + 2))
      .filter(hasValues);
  }

  return payload;
}

function emptyPayload(): OnboardingImportPayload {
  return {
    classes: [],
    subjects: [],
    classSubjects: [],
    academicSessions: [],
    terms: [],
    students: [],
    enrollments: [],
    employees: [],
    feeCategories: [],
    feeTemplates: [],
  };
}

function normaliseRow(row: Record<string, unknown>, sheet: SheetConfig, rowNumber: number) {
  const normalised: Record<string, unknown> = { _row: rowNumber };

  for (const column of sheet.columns) {
    const raw = row[column.header];

    if (column.type === "date") {
      normalised[column.key] = asDate(raw);
    } else if (column.type === "number") {
      normalised[column.key] = asNumber(raw);
    } else if (column.type === "boolean") {
      normalised[column.key] = asBoolean(raw);
    } else if (column.type === "enum") {
      normalised[column.key] = asEnum(raw);
    } else if (column.type === "currency") {
      normalised[column.key] = asText(raw)?.toUpperCase();
    } else {
      normalised[column.key] = asText(raw);
    }
  }

  return normalised;
}

function hasValues(row: Record<string, unknown>) {
  return Object.entries(row).some(
    ([key, value]) => key !== "_row" && value !== undefined && value !== "",
  );
}

function asText(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function asNumber(value: unknown) {
  const text = asText(value);
  if (!text) return undefined;

  const number = Number(text.replace(/,/g, ""));
  return Number.isFinite(number) ? number : text;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = asText(value)?.toLowerCase();
  if (!text) return undefined;
  if (["true", "yes", "y", "1", "active"].includes(text)) return true;
  if (["false", "no", "n", "0", "inactive"].includes(text)) return false;

  return value;
}

function asEnum(value: unknown) {
  return asText(value)
    ?.toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function asDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return [
        String(parsed.y).padStart(4, "0"),
        String(parsed.m).padStart(2, "0"),
        String(parsed.d).padStart(2, "0"),
      ].join("-");
    }
  }

  return asText(value);
}
