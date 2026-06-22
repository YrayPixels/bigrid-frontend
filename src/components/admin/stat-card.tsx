"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminStatCard({
  value,
  label,
  tooltip,
  backgroundClassName,
  icon,
}: {
  value: string;
  label: string;
  tooltip: string;
  backgroundClassName: string;
  icon: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-center justify-between gap-4 rounded-2xl px-4 py-4 sm:px-5 sm:py-5 ${backgroundClassName}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-3 text-ink-soft/50 transition hover:text-ink-soft"
            aria-label={`About ${label}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56 bg-[#3f3f46] text-white">
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <div className="min-w-0 pr-6">
        <p className="font-display text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
        <p className="mt-1 text-xs font-medium text-ink-soft sm:text-sm">{label}</p>
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm sm:h-12 sm:w-12">
        {icon}
      </div>
    </div>
  );
}
