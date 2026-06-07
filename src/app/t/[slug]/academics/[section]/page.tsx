import { AcademicsPageContent, type AcademicSection } from "../page";
import { notFound } from "next/navigation";

const sections: AcademicSection[] = [
  "sessions",
  "classes",
  "subjects",
  "terms",
  "enrollments",
  "exams",
];

export default async function AcademicsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!sections.includes(section as AcademicSection)) {
    notFound();
  }

  return <AcademicsPageContent section={section as AcademicSection} />;
}
