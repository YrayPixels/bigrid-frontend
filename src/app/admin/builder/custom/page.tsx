import { redirect } from "next/navigation";
import { isCodeWorkbenchEnabled } from "@/lib/features";

export default function AdminBuilderCustomPreviewPage() {
  redirect(isCodeWorkbenchEnabled() ? "/admin/builder/workbench" : "/admin/website?mode=create");
}
