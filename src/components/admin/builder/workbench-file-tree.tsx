"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NODE_PADDING = 14;
const CHEVRON_WIDTH = 14;

type FileNode = {
  kind: "file";
  id: number;
  depth: number;
  name: string;
  fullPath: string;
};

type FolderNode = {
  kind: "folder";
  id: number;
  depth: number;
  name: string;
  fullPath: string;
};

type TreeNode = FileNode | FolderNode;

function compareNodes(a: TreeNode, b: TreeNode) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

function parentPath(fullPath: string) {
  const slash = fullPath.lastIndexOf("/");
  return slash === -1 ? "" : fullPath.slice(0, slash);
}

function ancestorFolders(fullPath: string): string[] {
  const parts = fullPath.split("/").filter(Boolean);
  if (parts.length <= 1) return [];
  const folders: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    folders.push(parts.slice(0, i + 1).join("/"));
  }
  return folders;
}

function buildFileTree(paths: string[]): TreeNode[] {
  const folderPaths = new Set<string>();
  const nodes: TreeNode[] = [];

  for (const rawPath of paths) {
    const normalized = rawPath.replace(/^\/+/, "");
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const name = segments[i]!;
      const isFile = i === segments.length - 1;
      currentPath = currentPath ? `${currentPath}/${name}` : name;

      if (isFile) {
        nodes.push({
          kind: "file",
          id: nodes.length,
          name,
          fullPath: currentPath,
          depth: i,
        });
      } else if (!folderPaths.has(currentPath)) {
        folderPaths.add(currentPath);
        nodes.push({
          kind: "folder",
          id: nodes.length,
          name,
          fullPath: currentPath,
          depth: i,
        });
      }
    }
  }

  return sortTreeNodes(nodes);
}

function sortTreeNodes(nodeList: TreeNode[]): TreeNode[] {
  const childrenMap = new Map<string, TreeNode[]>();

  for (const node of nodeList) {
    const parent = parentPath(node.fullPath);
    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
    childrenMap.get(parent)!.push(node);
  }

  for (const children of childrenMap.values()) {
    children.sort(compareNodes);
  }

  const sorted: TreeNode[] = [];

  const walk = (path: string) => {
    const children = childrenMap.get(path) ?? [];
    for (const child of children) {
      sorted.push(child);
      if (child.kind === "folder") walk(child.fullPath);
    }
  };

  walk("");
  return sorted;
}

type WorkbenchFileTreeProps = {
  paths: string[];
  selectedPath: string;
  dirtyPath?: string | null;
  modifiedPaths?: Set<string>;
  streamingPaths?: Set<string>;
  onSelect: (path: string) => void;
  className?: string;
};

export function WorkbenchFileTree({
  paths,
  selectedPath,
  dirtyPath,
  modifiedPaths,
  streamingPaths,
  onSelect,
  className,
}: WorkbenchFileTreeProps) {
  const fileList = useMemo(() => buildFileTree(paths), [paths]);

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setCollapsedFolders((prev) => {
      const next = new Set<string>();
      for (const node of fileList) {
        if (node.kind === "folder" && prev.has(node.fullPath)) next.add(node.fullPath);
      }
      return next;
    });
  }, [fileList]);

  useEffect(() => {
    const expand = ancestorFolders(selectedPath);
    if (expand.length === 0) return;
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const folder of expand) {
        if (next.delete(folder)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedPath]);

  const visibleNodes = useMemo(() => {
    const list: TreeNode[] = [];
    let hiddenBelowDepth = Number.MAX_SAFE_INTEGER;

    for (const node of fileList) {
      const { depth } = node;

      if (hiddenBelowDepth === depth) {
        hiddenBelowDepth = Number.MAX_SAFE_INTEGER;
      }

      if (node.kind === "folder" && collapsedFolders.has(node.fullPath)) {
        hiddenBelowDepth = Math.min(hiddenBelowDepth, depth);
      }

      if (hiddenBelowDepth < depth) continue;

      list.push(node);
    }

    return list;
  }, [fileList, collapsedFolders]);

  const toggleFolder = (fullPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(fullPath)) next.delete(fullPath);
      else next.add(fullPath);
      return next;
    });
  };

  if (paths.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-ink-soft">
        No custom files yet. Prompt the AI to generate your site.
      </div>
    );
  }

  return (
    <div className={cn("text-[13px] leading-5", className)}>
      {visibleNodes.map((node) => {
        const paddingLeft = 6 + node.depth * NODE_PADDING;
        const isSelected = selectedPath === node.fullPath;
        const isDirty = dirtyPath === node.fullPath;
        const isModified = modifiedPaths?.has(node.fullPath) ?? false;
        const isStreaming = streamingPaths?.has(node.fullPath) ?? false;

        if (node.kind === "folder") {
          const collapsed = collapsedFolders.has(node.fullPath);
          return (
            <button
              key={node.fullPath}
              type="button"
              onClick={() => toggleFolder(node.fullPath)}
              className="flex w-full items-center gap-0.5 rounded-sm py-0.5 pr-2 text-left text-ink-soft hover:bg-secondary/80 hover:text-ink"
              style={{ paddingLeft }}
            >
              <span className="flex h-4 w-3.5 shrink-0 items-center justify-center">
                {collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                )}
              </span>
              {collapsed ? (
                <Folder className="h-3.5 w-3.5 shrink-0 text-amber-600/80" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-600/80" />
              )}
              <span className="truncate font-medium">{node.name}</span>
            </button>
          );
        }

        return (
          <button
            key={node.fullPath}
            type="button"
            onClick={() => onSelect(node.fullPath)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-sm py-0.5 pr-2 text-left",
              isSelected ? "bg-primary/10 font-medium text-ink" : "text-ink-soft hover:bg-secondary/80 hover:text-ink",
              isStreaming ? "ring-1 ring-primary/30" : null,
            )}
            style={{ paddingLeft: paddingLeft + CHEVRON_WIDTH }}
          >
            <File className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span className="truncate">{node.name}</span>
            {isDirty || isModified ? (
              <span
                className={cn(
                  "ml-auto h-1.5 w-1.5 shrink-0 rounded-full",
                  isDirty ? "bg-primary" : "bg-amber-500",
                )}
                title={isDirty ? "Unsaved in editor" : "Modified vs last saved"}
              />
            ) : isStreaming ? (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" title="AI writing" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
