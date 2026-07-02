import type { BuilderSession, BuilderSessionResponse, StorefrontContent } from "@/lib/api/types";
import { codeFs, type CodeFile } from "@/lib/code-fs";
import { stableHash } from "@/lib/bolt/deps-key";

export type WorkbenchProjectPayload = {
  custom_files: CodeFile[];
  edit_metadata: { locked_paths: string[] };
};

export function buildWorkbenchProjectPayload(lockedPaths: Iterable<string>): WorkbenchProjectPayload {
  return {
    custom_files: codeFs.exportFiles(),
    edit_metadata: {
      locked_paths: [...lockedPaths],
    },
  };
}

/** @deprecated Use buildWorkbenchProjectPayload for workbench autosave. */
export function buildWorkbenchStorefrontSnapshot(
  session: BuilderSession,
  lockedPaths: Iterable<string>,
): StorefrontContent {
  const customFiles = codeFs.exportFiles();
  const snapshot = {
    ...(session.storefront_snapshot ?? ({} as StorefrontContent)),
    custom_files: customFiles as never,
    edit_metadata: {
      ...((session.storefront_snapshot?.edit_metadata ?? {}) as Record<string, unknown>),
      locked_paths: [...lockedPaths],
    } as never,
  };

  if (customFiles.length > 0) {
    delete (snapshot as Record<string, unknown>).custom_code;
  }

  return snapshot;
}

export function workbenchFilesFingerprint(): string {
  return stableHash(
    codeFs.exportFiles().map((file) => ({
      path: file.path,
      content: file.content,
    })),
  );
}
