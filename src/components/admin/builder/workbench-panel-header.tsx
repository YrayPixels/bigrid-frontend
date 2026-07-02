"use client";

import type { RefObject } from "react";
import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import { cn } from "@/lib/utils";

type WorkbenchPanelHeaderProps = {
  title: string;
  panelRef?: RefObject<PanelImperativeHandle | null>;
  collapseSide?: "left" | "right";
  className?: string;
  actions?: React.ReactNode;
};

export function WorkbenchPanelHeader({
  title,
  panelRef,
  collapseSide = "left",
  className,
  actions,
}: WorkbenchPanelHeaderProps) {
  const toggle = () => {
    const panel = panelRef?.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-2",
        className,
      )}
    >
      <div className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        {panelRef ? (
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-ink-soft hover:bg-secondary hover:text-ink"
            title="Collapse panel"
            aria-label={`Collapse ${title} panel`}
          >
            {collapseSide === "left" ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

type CollapsedPanelRailProps = {
  label: string;
  onExpand: () => void;
  side?: "left" | "right";
};

export function CollapsedPanelRail({ label, onExpand, side = "left" }: CollapsedPanelRailProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "flex h-full w-full min-w-8 flex-col items-center justify-center gap-2 bg-secondary/40 text-[10px] font-semibold uppercase tracking-wide text-ink-soft hover:bg-secondary hover:text-ink",
        side === "left" ? "border-r border-border" : "border-l border-border",
      )}
      title={`Show ${label}`}
      aria-label={`Show ${label} panel`}
    >
      {side === "left" ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      <span className="[writing-mode:vertical-rl] rotate-180">{label}</span>
    </button>
  );
}

export function useWorkbenchPanelCollapsed(threshold = 6) {
  const [collapsed, setCollapsed] = useState(false);
  const onResize = useCallback(
    (size: PanelSize) => {
      setCollapsed(size.asPercentage <= threshold);
    },
    [threshold],
  );
  return { collapsed, onResize };
}
