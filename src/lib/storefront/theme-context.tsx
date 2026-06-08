"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  const paletteVars = useMemo(
    () =>
      ({
        "--store-brand": theme.palette.primary,
        "--store-accent": theme.palette.accent,
        "--store-bg": theme.palette.background,
        "--store-surface": theme.palette.surface,
        "--store-text": theme.palette.text,
        "--store-muted": theme.palette.muted,
        "--store-border": theme.palette.border,
        "--store-toast-radius": theme.buttonStyle === "square" ? "0px" : "9999px",
      }) satisfies Record<string, string>,
    [
      theme.buttonStyle,
      theme.palette.accent,
      theme.palette.background,
      theme.palette.border,
      theme.palette.muted,
      theme.palette.primary,
      theme.palette.surface,
      theme.palette.text,
    ],
  );

  useEffect(() => {
    const root = document.documentElement;
    const previousTemplate = root.dataset.storefrontTemplate;
    const previousMode = root.dataset.storefrontMode;
    const previousVars = Object.fromEntries(
      Object.keys(paletteVars).map((key) => [key, root.style.getPropertyValue(key)]),
    );

    root.dataset.storefrontTemplate = theme.id;
    root.dataset.storefrontMode = mode;
    Object.entries(paletteVars).forEach(([key, value]) => root.style.setProperty(key, value));

    return () => {
      if (previousTemplate) {
        root.dataset.storefrontTemplate = previousTemplate;
      } else {
        delete root.dataset.storefrontTemplate;
      }

      if (previousMode) {
        root.dataset.storefrontMode = previousMode;
      } else {
        delete root.dataset.storefrontMode;
      }

      Object.entries(previousVars).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(key, value);
        } else {
          root.style.removeProperty(key);
        }
      });
    };
  }, [
    mode,
    paletteVars,
    theme.id,
  ]);

  return (
    <StorefrontThemeContext.Provider value={{ theme, mode, editable }}>
      <div
        data-template={theme.id}
        data-mode={mode}
        className={theme.pageBg}
        style={paletteVars as CSSProperties}
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
