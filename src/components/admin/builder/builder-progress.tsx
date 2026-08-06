"use client";

import { Check } from "lucide-react";
import type { BuilderSessionStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STEPS: { id: BuilderSessionStatus | "start"; label: string }[] = [
  { id: "collecting_requirements", label: "Your business" },
  { id: "template_recommendation", label: "Designing" },
  { id: "content_generated", label: "Building" },
  { id: "review_ready", label: "Preview" },
];

function stepIndex(status: BuilderSessionStatus): number {
  if (status === "collecting_requirements") return 0;
  if (status === "template_recommendation" || status === "products_pending") return 1;
  if (status === "content_generated") return 2;
  return 3;
}

export function BuilderProgress({
  status,
  className,
}: {
  status: BuilderSessionStatus;
  className?: string;
}) {
  const active = stepIndex(status);

  return (
    <ol className={cn("flex flex-wrap items-center gap-3 text-sm", className)}>
      {STEPS.map((step, index) => (
        <li key={step.id} className="flex items-center gap-3">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
              index < active
                ? "bg-primary text-primary-foreground"
                : index === active
                  ? "bg-ink text-background"
                  : "bg-secondary text-ink-soft"
            }`}
          >
            {index < active ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          <span className={index === active ? "font-medium text-ink" : "text-ink-soft"}>
            {step.label}
          </span>
          {index < STEPS.length - 1 && <span className="ml-1 h-px w-8 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
