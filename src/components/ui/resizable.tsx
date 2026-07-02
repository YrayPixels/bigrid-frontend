import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

type PanelGroupProps = React.ComponentProps<typeof Group> & {
  direction?: "horizontal" | "vertical";
};

const ResizablePanelGroup = ({ className, direction, orientation, ...props }: PanelGroupProps) => (
  <Group
    orientation={orientation ?? direction ?? "horizontal"}
    className={cn("flex h-full min-h-0 w-full min-w-0", className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      "relative z-20 flex w-1.5 shrink-0 items-center justify-center bg-border/80 transition-colors hover:bg-primary/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-orientation=vertical]:h-1.5 data-[panel-group-orientation=vertical]:w-full",
      className,
    )}
    {...props}
  >
    {withHandle ? (
      <div className="z-30 flex h-5 w-3 items-center justify-center rounded-sm border bg-background shadow-sm">
        <GripVertical className="h-3 w-3 text-ink-soft" />
      </div>
    ) : null}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
export { usePanelRef } from "react-resizable-panels";
export type { PanelImperativeHandle } from "react-resizable-panels";
