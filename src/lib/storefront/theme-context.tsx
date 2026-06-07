"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { StorefrontMode, StorefrontTheme } from "./template";

export type EditableHandlers = {
  onFieldChange: (path: string, value: string) => void;
  onImageUpload?: (path: string, file: File) => Promise<void>;
  selectedPath?: string | null;
  onSelectPath?: (path: string | null) => void;
};

type StorefrontThemeContextValue = {
  theme: StorefrontTheme;
  mode: StorefrontMode;
  editable?: EditableHandlers;
};

const StorefrontThemeContext = createContext<StorefrontThemeContextValue | null>(null);

export function StorefrontThemeProvider({
  theme,
  mode = "live",
  editable,
  children,
}: {
  theme: StorefrontTheme;
  mode?: StorefrontMode;
  editable?: EditableHandlers;
  children: ReactNode;
}) {
  return (
    <StorefrontThemeContext.Provider value={{ theme, mode, editable }}>
      <div
        data-template={theme.id}
        data-mode={mode}
        className={theme.pageBg}
        style={{ "--store-brand": theme.brandColor } as CSSProperties}
      >
        {children}
      </div>
    </StorefrontThemeContext.Provider>
  );
}

export function useStorefrontTheme() {
  const context = useContext(StorefrontThemeContext);
  if (!context) throw new Error("useStorefrontTheme must be used within StorefrontThemeProvider");
  return context;
}

export function useStorefrontThemeOptional() {
  return useContext(StorefrontThemeContext);
}
