"use client";

import { BuilderThinkingLog } from "@/components/admin/builder/builder-thinking-log";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ThinkingLogTurn } from "@/lib/storefront-builder/session-thinking-log";

export function BuilderThinkingLogSheet({
  open,
  onOpenChange,
  turns,
  streaming,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turns: ThinkingLogTurn[];
  streaming?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>AI process log</SheetTitle>
          <SheetDescription>
            Every message you send in the builder chat is recorded here with the AI steps that ran for
            that turn.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <BuilderThinkingLog turns={turns} streaming={streaming} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
