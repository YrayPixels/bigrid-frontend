#!/usr/bin/env node
/**
 * Called from .githooks/pre-push when pushing to main.
 * Bumps Sell PWA VERSION and commits it so the next push includes the new version.
 *
 * Exit codes:
 *   0 — nothing to do (already bumped / unchanged)
 *   2 — bump committed; caller should abort this push so you can push again
 *   1 — hard failure
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function git(args) {
  return execSync(`git ${args}`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function readVersion() {
  const source = readFileSync(resolve(root, "src/lib/pos-offline/pwa-version.ts"), "utf8");
  const match = source.match(/PWA_VERSION\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Could not read PWA_VERSION");
  return match[1];
}

const tipMsg = git("log -1 --format=%s");
if (tipMsg.startsWith("chore(pwa): bump version")) {
  console.log("PWA version already bumped on HEAD — continuing push");
  process.exit(0);
}

const dirty = git("status --porcelain");
if (dirty) {
  console.error(
    "Cannot bump PWA version: working tree has uncommitted changes.\n" +
      "Commit or stash them, then push again.",
  );
  process.exit(1);
}

const bump = spawnSync(process.execPath, [resolve(root, "scripts/bump-pwa-version.mjs")], {
  cwd: root,
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
});
if (bump.status !== 0) {
  console.error(bump.stderr || bump.stdout || "bump-pwa-version failed");
  process.exit(1);
}
process.stdout.write(bump.stdout || "");

const version = readVersion();
git("add src/lib/pos-offline/pwa-version.ts public/sw.js");
const staged = git("diff --cached --name-only");
if (!staged) {
  console.log("PWA version files unchanged after bump — continuing push");
  process.exit(0);
}

execSync(`git commit --no-verify -m "chore(pwa): bump version to ${version}"`, {
  cwd: root,
  stdio: "inherit",
});

console.log("");
console.log(`PWA version bumped to ${version} and committed.`);
console.log("This push was stopped so the bump is included — run: git push");
process.exit(2);
