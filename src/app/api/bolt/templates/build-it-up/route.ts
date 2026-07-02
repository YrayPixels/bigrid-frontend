import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

type CodeFile = { path: string; content: string };

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".tanstack",
  ".nitro",
  ".output",
  "coverage",
]);

const IGNORE_FILES = new Set([
  "bun.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".DS_Store",
]);

const MAX_FILES = 600;
const MAX_TOTAL_BYTES = 3_500_000; // ~3.5MB

async function walk(rootAbs: string, dirAbs: string, out: CodeFile[], budget: { bytes: number }) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;

    const abs = path.join(dirAbs, entry.name);
    const rel = path.relative(rootAbs, abs).replaceAll(path.sep, "/");

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(rootAbs, abs, out, budget);
      continue;
    }

    if (!entry.isFile()) continue;
    if (IGNORE_FILES.has(entry.name)) continue;

    // Only include common text/code assets.
    if (!/\.(ts|tsx|js|jsx|json|css|md|txt|html|svg)$/.test(entry.name) && !/^(package\.json|tsconfig\.json|vite\.config\.ts|components\.json|eslint\.config\.js|bunfig\.toml|\.prettierrc|\.prettierignore|\.gitignore)$/.test(entry.name)) {
      continue;
    }

    const content = await fs.readFile(abs, "utf8").catch(() => null);
    if (content == null) continue;

    const bytes = Buffer.byteLength(content, "utf8");
    if (budget.bytes + bytes > MAX_TOTAL_BYTES) return;
    budget.bytes += bytes;
    out.push({ path: rel, content });
  }
}

export async function GET() {
  try {
    // Vendored template lives inside this repo so prod always has it.
    const rootAbs = path.resolve(process.cwd(), "bolt-templates", "build-it-up");
    const stat = await fs.stat(rootAbs).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json({ error: "build-it-up template folder not found" }, { status: 404 });
    }

    const files: CodeFile[] = [];
    const budget = { bytes: 0 };
    await walk(rootAbs, rootAbs, files, budget);

    // Sort to keep deterministic output.
    files.sort((a, b) => a.path.localeCompare(b.path));

    return NextResponse.json({
      template: "build-it-up",
      root: "build-it-up",
      file_count: files.length,
      total_bytes: budget.bytes,
      files,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Template export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

