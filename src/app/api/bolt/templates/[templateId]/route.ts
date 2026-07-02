import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isBoltTemplateId } from "@/lib/bolt/templates";

type CodeFile = { path: string; content: string; encoding?: "base64" };

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
  // Bun/npm/yarn lockfiles are for Lovable/local dev; WebContainer installs with pnpm + pnpm-lock.yaml.
  "bun.lock",
  "package-lock.json",
  "yarn.lock",
  ".DS_Store",
]);

const MAX_FILES = 700;
const MAX_TOTAL_BYTES = 5_000_000; // ~5MB (includes image assets)

const BINARY_EXT = /\.(jpg|jpeg|png|webp|gif|ico|woff2?|ttf|eot)$/i;

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

    if (BINARY_EXT.test(entry.name)) {
      const raw = await fs.readFile(abs);
      const bytes = raw.byteLength;
      if (budget.bytes + bytes > MAX_TOTAL_BYTES) return;
      budget.bytes += bytes;
      out.push({ path: rel, content: raw.toString("base64"), encoding: "base64" });
      continue;
    }

    // Only include common text/code assets.
    if (!/\.(ts|tsx|js|jsx|json|css|md|txt|html|svg)$/.test(entry.name) && !/^(package\.json|pnpm-lock\.yaml|tsconfig\.json|vite\.config\.ts|components\.json|eslint\.config\.js|bunfig\.toml|\.prettierrc|\.prettierignore|\.gitignore)$/.test(entry.name)) {
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;

  if (!isBoltTemplateId(templateId)) {
    return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 404 });
  }

  try {
    const rootAbs = path.resolve(process.cwd(), "bolt-templates", templateId);
    const stat = await fs.stat(rootAbs).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json({ error: `${templateId} template folder not found` }, { status: 404 });
    }

    const files: CodeFile[] = [];
    const budget = { bytes: 0 };
    await walk(rootAbs, rootAbs, files, budget);

    files.sort((a, b) => a.path.localeCompare(b.path));

    return NextResponse.json({
      template: templateId,
      root: templateId,
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
