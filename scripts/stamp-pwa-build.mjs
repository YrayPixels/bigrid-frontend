#!/usr/bin/env node
/**
 * Stamp a build id into public/sw.js so each deploy changes the service worker
 * bytes and browsers pick up the update. Does not touch git-friendly VERSION.
 *
 * Usage:
 *   node scripts/stamp-pwa-build.mjs                 # stamp commit/sha
 *   node scripts/stamp-pwa-build.mjs --reset          # restore BUILD_ID to "dev"
 *   node scripts/stamp-pwa-build.mjs --reset-if-local # reset only outside CI/Vercel
 *     (so production deploys keep the stamped id in the shipped public/sw.js)
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const swFile = resolve(root, "public/sw.js");
const args = new Set(process.argv.slice(2));
const resetRequested = args.has("--reset") || args.has("--reset-if-local");
const isCi = Boolean(process.env.VERCEL || process.env.CI || process.env.GITHUB_ACTIONS);

if (args.has("--reset-if-local") && isCi) {
  console.log("Skipping PWA BUILD_ID reset on CI so the stamped worker is deployed");
  process.exit(0);
}

const reset = resetRequested;

function resolveBuildId() {
  if (reset) return "dev";
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { encoding: "utf8" }).trim();
  } catch {
    return `local-${Date.now()}`;
  }
}

const id = resolveBuildId();
const swSource = readFileSync(swFile, "utf8");
if (!/const BUILD_ID = "[^"]*";/.test(swSource)) {
  console.error('public/sw.js is missing `const BUILD_ID = "...";`');
  process.exit(1);
}

writeFileSync(
  swFile,
  swSource.replace(/const BUILD_ID = "[^"]*";/, `const BUILD_ID = "${id}";`),
);
console.log(`${reset ? "Reset" : "Stamped"} Sell PWA BUILD_ID=${id}`);
