"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

type EditableTextProps = {
  path: string;
  value: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  placeholder?: string;
};

export function EditableText({
  path,
  value,
  as: Tag = "span",
  className,
  style,
  multiline = false,
  placeholder,
}: EditableTextProps) {
  const { mode, editable } = useStorefrontTheme();
  const isEditing = mode === "edit" && editable?.onFieldChange;
  const isSelected = editable?.selectedPath === path;

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => editable.onFieldChange(path, event.target.value)}
          onFocus={() => editable.onSelectPath?.(path)}
          style={style}
          className={cn(
            className,
            "w-full resize-none border-2 border-dashed bg-primary/5 outline-none transition",
            isSelected ? "border-primary" : "border-primary/30",
          )}
        />
      );
    }

    return (
      <Tag
        contentEditable
        suppressContentEditableWarning
        onFocus={() => editable.onSelectPath?.(path)}
        onBlur={(event) =>
          editable.onFieldChange(path, event.currentTarget.textContent?.trim() ?? "")
        }
        style={style}
        className={cn(
          className,
          "outline-none transition",
          isSelected && "ring-2 ring-primary/40 ring-offset-2",
        )}
      >
        {value || placeholder}
      </Tag>
    );
  }

  return (
    <Tag className={className} style={style}>
      {value}
    </Tag>
  );
}
