import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { snapshot } from "@webcontainer/snapshot";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "bolt-snapshots");

const BOLT_TEMPLATE_IDS = ["furniture-hardware", "hair-and-fashion"];

function stableHash(files) {
  let h = 2166136261;
  for (const f of files) {
    const s = `${f.path}\n${f.content}\n`;
    for (let i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) * 16777619;
      h >>>= 0;
    }
  }
  return String(h);
}

function depsKeyFromContents(packageJson, pnpmLock = "") {
  return stableHash([
    { path: "package.json", content: packageJson },
    { path: "pnpm-lock.yaml", content: pnpmLock },
  ]);
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with exit ${code}`));
    });
  });
}

async function materializeSymlinks(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = await fs.readlink(fullPath);
      const resolved = path.resolve(path.dirname(fullPath), target);
      const stat = await fs.stat(resolved);
      await fs.unlink(fullPath);
      if (stat.isDirectory()) {
        await fs.cp(resolved, fullPath, { recursive: true });
      } else {
        await fs.copyFile(resolved, fullPath);
      }
      continue;
    }
    if (entry.isDirectory()) {
      await materializeSymlinks(fullPath);
    }
  }
}

async function buildSnapshotForTemplate(templateId) {
  const templateDir = path.join(root, "bolt-templates", templateId);
  const stat = await fs.stat(templateDir).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Template folder not found: ${templateDir}`);
  }

  console.log(`\n[${templateId}] Installing template dependencies with pnpm…`);
  await run("pnpm", ["install", "--frozen-lockfile"], templateDir);

  const packageJson = await fs.readFile(path.join(templateDir, "package.json"), "utf8");
  let pnpmLock = "";
  try {
    pnpmLock = await fs.readFile(path.join(templateDir, "pnpm-lock.yaml"), "utf8");
  } catch {
    // optional
  }

  const depsKey = depsKeyFromContents(packageJson, pnpmLock);
  const nodeModulesDir = path.join(templateDir, "node_modules");
  const nodeModulesStat = await fs.stat(nodeModulesDir).catch(() => null);
  if (!nodeModulesStat?.isDirectory()) {
    throw new Error(`node_modules not found after pnpm install for ${templateId}`);
  }

  console.log(`[${templateId}] Materializing symlinks for snapshot…`);
  await materializeSymlinks(nodeModulesDir);

  console.log(`[${templateId}] Building WebContainer node_modules snapshot…`);
  const buffer = await snapshot(nodeModulesDir);

  await fs.mkdir(outDir, { recursive: true });
  const snapshotPath = `/bolt-snapshots/${templateId}.node_modules.snapshot`;
  const snapshotFile = path.join(outDir, `${templateId}.node_modules.snapshot`);
  await fs.writeFile(snapshotFile, Buffer.from(buffer));

  const manifest = {
    template: templateId,
    depsKey,
    snapshotPath,
  };
  await fs.writeFile(
    path.join(outDir, `${templateId}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  );

  const mb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
  console.log(`[${templateId}] Done. Snapshot: ${snapshotFile} (${mb} MB), depsKey: ${depsKey}`);
}

async function main() {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const templateIds = requested.length ? requested : BOLT_TEMPLATE_IDS;

  for (const templateId of templateIds) {
    if (!BOLT_TEMPLATE_IDS.includes(templateId)) {
      throw new Error(`Unknown template: ${templateId}. Available: ${BOLT_TEMPLATE_IDS.join(", ")}`);
    }
    await buildSnapshotForTemplate(templateId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
