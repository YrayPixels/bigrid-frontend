import type { BoltAction, BoltArtifactInfo } from "@/lib/code-parser";
import { createBoltActionRunner, type BoltActionResult } from "@/lib/bolt/action-runner";
import { createEnhancedCodeParser } from "@/lib/bolt/enhanced-code-parser";

import type { WorkbenchEditStep } from "@/lib/bolt/workbench-edit-agent";

export type BoltStreamCallbacks = {
  onArtifactStart?: (info: BoltArtifactInfo) => void;
  onArtifactEnd?: () => void;
  onActionOpen?: (action: BoltAction) => void;
  onActionStream?: (action: BoltAction) => void;
  onActionComplete?: (action: BoltAction, result: BoltActionResult) => void;
  onShellOutput?: (chunk: string) => void;
  onAgentStep?: (step: WorkbenchEditStep) => void;
};

export function createBoltStreamPipeline(options?: {
  lockedPaths?: string[] | Set<string>;
  callbacks?: BoltStreamCallbacks;
  onShellOutput?: (chunk: string) => void;
}) {
  const runner = createBoltActionRunner({
    lockedPaths: options?.lockedPaths,
    onShellOutput: options?.onShellOutput ?? options?.callbacks?.onShellOutput,
  });
  const callbacks = options?.callbacks;

  const parser = createEnhancedCodeParser({
    onArtifactStart: (info) => {
      callbacks?.onArtifactStart?.(info);
    },
    onArtifactEnd: () => {
      callbacks?.onArtifactEnd?.();
    },
    onActionOpen: (action) => {
      callbacks?.onActionOpen?.(action);
    },
    onActionStream: (action) => {
      runner.applyStream(action);
      callbacks?.onActionStream?.(action);
    },
    onAction: (action) => {
      const result = runner.apply(action);
      callbacks?.onActionComplete?.(action, result);
    },
  });

  return { parser, runner };
}

export function lockedPathsFromStorefront(
  storefront: Record<string, unknown> | null | undefined,
  extra?: Iterable<string>,
): string[] {
  const fromSnapshot =
    (storefront?.edit_metadata as { locked_paths?: string[] } | undefined)?.locked_paths ?? [];
  const merged = new Set(fromSnapshot.filter(Boolean));
  if (extra) {
    for (const path of extra) {
      if (path) merged.add(path);
    }
  }
  return [...merged];
}
