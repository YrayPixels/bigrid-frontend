#!/usr/bin/env node
/**
 * Bump Bizgrid Sell PWA patch version in both version sources.
 * Used by the pre-push git hook (.githooks/pre-push) when pushing to main.
 * Usage: node scripts/bump-pwa-version.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const versionFile = resolve(root, "src/lib/pos-offline/pwa-version.ts");
const swFile = resolve(root, "public/sw.js");

const versionSource = readFileSync(versionFile, "utf8");
const match = versionSource.match(/PWA_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"/);
if (!match) {
  console.error("Could not find PWA_VERSION in", versionFile);
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]);
const next = `${major}.${minor}.${patch + 1}`;
const prev = `${major}.${minor}.${patch}`;

const nextVersionSource = versionSource.replace(
  /PWA_VERSION\s*=\s*"\d+\.\d+\.\d+"/,
  `PWA_VERSION = "${next}"`,
);
writeFileSync(versionFile, nextVersionSource);

const swSource = readFileSync(swFile, "utf8");
if (!swSource.includes(`const VERSION = "${prev}"`)) {
  console.error(`public/sw.js VERSION is not "${prev}" — keep it in sync before bumping.`);
  process.exit(1);
}
writeFileSync(swFile, swSource.replace(`const VERSION = "${prev}"`, `const VERSION = "${next}"`));

console.log(`Bumped PWA version ${prev} → ${next}`);
