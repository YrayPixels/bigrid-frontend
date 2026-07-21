"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { File, Folder } from "lucide-react";
import {
  filterMentionCandidates,
  getActiveMention,
  type MentionCandidate,
} from "@/lib/bolt/workbench-mentions";
import { cn } from "@/lib/utils";

type WorkbenchChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  filePaths: string[];
  busy?: boolean;
  placeholder?: string;
  className?: string;
};

export function WorkbenchChatInput({
  value,
  onChange,
  onSubmit,
  filePaths,
  busy = false,
  placeholder,
  className,
}: WorkbenchChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursor, setCursor] = useState(0);

  const mention = useMemo(() => getActiveMention(value, cursor), [value, cursor]);
  const candidates = useMemo(
    () => (mention ? filterMentionCandidates(filePaths, mention.query) : []),
    [mention, filePaths],
  );
  const mentionOpen = Boolean(mention && candidates.length > 0);

  useEffect(() => {
    setMentionIndex(0);
  }, [mention?.query, mention?.start]);

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      if (!mention || !textareaRef.current) return;
      const end = textareaRef.current.selectionStart ?? cursor;
      const before = value.slice(0, mention.start);
      const after = value.slice(end);
      const path =
        candidate.kind === "folder" ? `${candidate.path}/` : candidate.path;
      const insert = `@${path} `;
      const next = `${before}${insert}${after}`;
      onChange(next);
      const nextCursor = before.length + insert.length;
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        setCursor(nextCursor);
      });
    },
    [cursor, mention, onChange, value],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((index) => (index + 1) % candidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((index) => (index - 1 + candidates.length) % candidates.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selected = candidates[mentionIndex];
        if (selected) insertMention(selected);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (mention) setCursor(mention.start);
        return;
      }
    }

    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!busy && value.trim()) onSubmit();
  }

  return (
    <div className="relative min-w-0 flex-1">
      {mentionOpen ? (
        <div
          ref={listRef}
          className="absolute bottom-full left-0 z-20 mb-2 max-h-52 w-full min-w-[240px] overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-elevated"
          role="listbox"
          aria-label="Tag a file or folder"
        >
          {candidates.map((candidate, index) => {
            const name = candidate.path.split("/").pop() ?? candidate.path;
            const Icon = candidate.kind === "folder" ? Folder : File;
            return (
              <button
                key={`${candidate.kind}:${candidate.path}`}
                type="button"
                role="option"
                aria-selected={index === mentionIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertMention(candidate)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                  index === mentionIndex ? "bg-primary/10 text-ink" : "text-ink-soft hover:bg-secondary/80 hover:text-ink",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 opacity-50",
                    candidate.kind === "folder" ? "text-amber-600/80" : null,
                  )}
                />
                <span className="truncate font-medium">
                  {candidate.kind === "folder" ? `${name}/` : name}
                </span>
                {candidate.kind === "folder" || name !== candidate.path ? (
                  <span className="ml-auto truncate text-xs text-ink-soft">
                    {candidate.kind === "folder" ? candidate.path : candidate.path}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        data-builder-chat-input
        value={value}
        disabled={busy}
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart ?? 0);
        }}
        onClick={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
        onKeyUp={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder={placeholder}
        className={cn(
          "min-h-[72px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60",
          className,
        )}
      />
    </div>
  );
}
