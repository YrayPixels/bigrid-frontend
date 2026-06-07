"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApiRequestError, onboardingImportApi, tenantsApi } from "@/lib/api-client";
import { downloadOnboardingTemplate, parseOnboardingWorkbook } from "@/lib/onboarding-import";
import type {
  OnboardingImportError,
  OnboardingImportResult,
  OnboardingImportSheet,
} from "@/lib/schoolos-types";

const summaryLabels: Record<OnboardingImportSheet, string> = {
  classes: "Classes",
  subjects: "Subjects",
  classSubjects: "Class subjects",
  academicSessions: "Academic sessions",
  terms: "Terms",
  students: "Students",
  enrollments: "Enrollments",
  employees: "Employees",
  feeCategories: "Fee categories",
  feeTemplates: "Fee templates",
};

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<OnboardingImportResult | null>(null);
  const [importErrors, setImportErrors] = useState<OnboardingImportError[]>([]);

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      if (!tenantId) throw new Error("School is still loading. Try again in a moment.");
      const payload = await parseOnboardingWorkbook(file);
      return onboardingImportApi.upload(tenantId, payload);
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportErrors([]);
      toast.success("School data imported");
      qc.invalidateQueries({ queryKey: ["students", tenantId] });
      qc.invalidateQueries({ queryKey: ["employees", tenantId] });
      qc.invalidateQueries({ queryKey: ["classes", tenantId] });
      qc.invalidateQueries({ queryKey: ["subjects", tenantId] });
      qc.invalidateQueries({ queryKey: ["class-subjects", tenantId] });
      qc.invalidateQueries({ queryKey: ["enrollments", tenantId] });
      qc.invalidateQueries({ queryKey: ["fee-categories", tenantId] });
      qc.invalidateQueries({ queryKey: ["fee-templates", tenantId] });
    },
    onError: (error) => {
      setImportResult(null);
      if (error instanceof ApiRequestError && Array.isArray(error.details)) {
        setImportErrors(error.details as OnboardingImportError[]);
      }
      toast.error(error instanceof Error ? error.message : "Import failed");
    },
  });

  const handleFile = (file?: File) => {
    if (!file) return;
    importMut.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">Settings</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">School settings</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Data import
              </CardTitle>
              <CardDescription>
                Onboard an existing school with one Excel workbook for classes, students, staff,
                academics, and fee setup.
              </CardDescription>
            </div>
            <Badge variant="secondary">Excel template</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium text-foreground">1. Download</p>
              <p>Use the sample workbook to see the columns and allowed values.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium text-foreground">2. Fill</p>
              <p>Keep each data type on its own sheet: Students, Employees, Classes, and more.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium text-foreground">3. Upload</p>
              <p>Rows are validated first, then matching records are updated safely.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={downloadOnboardingTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
            <Button
              type="button"
              className="bg-gradient-hero"
              disabled={!tenantId || importMut.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {importMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload completed workbook
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          {importResult && (
            <Alert>
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(importResult.summary).map(([sheet, counts]) => (
                    <div key={sheet} className="rounded-md bg-muted/60 p-3">
                      <p className="font-medium text-foreground">
                        {summaryLabels[sheet as OnboardingImportSheet]}
                      </p>
                      <p>
                        {counts.created} created, {counts.updated} updated
                      </p>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {importErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Import needs changes</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  {importErrors.slice(0, 10).map((error, index) => (
                    <p key={`${error.sheet}-${error.row}-${error.field}-${index}`}>
                      {error.sheet}
                      {error.row ? ` row ${error.row}` : ""}, {error.field}: {error.message}
                    </p>
                  ))}
                  {importErrors.length > 10 && (
                    <p>And {importErrors.length - 10} more errors in the workbook.</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding & profile</CardTitle>
          <CardDescription>Name, logo, motto, primary color, and contact info.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Team & roles</CardTitle>
          <CardDescription>Invite teachers, accountants, principals, and admins.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </div>
  );
}
