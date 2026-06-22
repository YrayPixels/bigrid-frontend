"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmItem = {
  id: number;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
};

type ConfirmOptions = {
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  enqueue: (item: Omit<ConfirmItem, "id">) => void;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

let enqueueConfirm: ConfirmContextValue["enqueue"] | null = null;

export function confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    enqueueConfirm?.({
      title: message,
      description: options?.description,
      confirmLabel: options?.confirmLabel ?? "Continue",
      cancelLabel: options?.cancelLabel ?? "Cancel",
      destructive: options?.destructive,
      resolve,
    });
  });
}

function ConfirmDialog({
  item,
  onDismiss,
}: {
  item: ConfirmItem;
  onDismiss: () => void;
}) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      item.resolve(false);
      onDismiss();
    }
  };

  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{item.title}</AlertDialogTitle>
          {item.description ? (
            <AlertDialogDescription>{item.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{item.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={item.destructive ? "bg-destructive hover:bg-destructive/90" : undefined}
            onClick={() => {
              item.resolve(true);
              onDismiss();
            }}
          >
            {item.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const idRef = useRef(0);
  const [queue, setQueue] = useState<ConfirmItem[]>([]);
  const active = queue[0] ?? null;

  const enqueue = useCallback<ConfirmContextValue["enqueue"]>((item) => {
    const id = ++idRef.current;
    setQueue((current) => [...current, { ...item, id }]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  useEffect(() => {
    enqueueConfirm = enqueue;
    return () => {
      enqueueConfirm = null;
    };
  }, [enqueue]);

  return (
    <ConfirmContext.Provider value={{ enqueue }}>
      {children}
      {active ? <ConfirmDialog item={active} onDismiss={dismiss} /> : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return context;
}
