import type { WebContainer } from "@webcontainer/api";

const DB_NAME = "storehause-webcontainer";
const STORE_NAME = "node-modules-cache";
const CACHE_VERSION = 1;
const MAX_CACHE_BYTES = 220_000_000;

type CachedFile = { p: string; b: string };
type CachePayload = { v: number; files: CachedFile[] };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function gzipText(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzipText(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function isDirectory(wc: WebContainer, path: string): Promise<boolean> {
  try {
    await wc.fs.readdir(path);
    return true;
  } catch {
    return false;
  }
}

async function walkNodeModules(
  wc: WebContainer,
  dir: string,
  files: CachedFile[],
  budget: { bytes: number },
): Promise<void> {
  const entries = await wc.fs.readdir(dir);
  for (const name of entries) {
    if (budget.bytes > MAX_CACHE_BYTES) return;
    const fullPath = `${dir}/${name}`;
    if (await isDirectory(wc, fullPath)) {
      await walkNodeModules(wc, fullPath, files, budget);
      continue;
    }
    const raw = await wc.fs.readFile(fullPath);
    const bytes = raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw));
    budget.bytes += bytes.length;
    files.push({
      p: fullPath.replace(/^\/project\/node_modules\//, ""),
      b: toBase64(bytes),
    });
  }
}

export async function restoreNodeModulesCache(
  wc: WebContainer,
  depsKey: string,
  onProgress?: (info: { written: number; total: number }) => void,
): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;

  let compressed: Uint8Array | undefined;
  try {
    const db = await openDb();
    compressed = await new Promise<Uint8Array | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(depsKey);
      req.onsuccess = () => {
        const value = req.result;
        if (value instanceof Uint8Array) resolve(value);
        else if (value instanceof ArrayBuffer) resolve(new Uint8Array(value));
        else resolve(undefined);
      };
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    db.close();
  } catch {
    return false;
  }

  if (!compressed?.length) return false;

  let payload: CachePayload;
  try {
    const json = await gunzipText(compressed);
    payload = JSON.parse(json) as CachePayload;
    if (payload.v !== CACHE_VERSION || !Array.isArray(payload.files) || payload.files.length === 0) {
      return false;
    }
  } catch {
    return false;
  }

  await wc.fs.mkdir("/project/node_modules", { recursive: true });
  const total = payload.files.length;
  let written = 0;
  const createdDirs = new Set<string>();

  for (const file of payload.files) {
    const fullPath = `/project/node_modules/${file.p}`;
    const dir = fullPath.split("/").slice(0, -1).join("/");
    if (!createdDirs.has(dir)) {
      await wc.fs.mkdir(dir, { recursive: true });
      createdDirs.add(dir);
    }
    await wc.fs.writeFile(fullPath, fromBase64(file.b));
    written += 1;
    if (written === 1 || written === total || written % 250 === 0) {
      onProgress?.({ written, total });
    }
  }

  return true;
}

export async function saveNodeModulesCache(wc: WebContainer, depsKey: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  if (!(await hasNodeModules(wc))) return;

  const files: CachedFile[] = [];
  const budget = { bytes: 0 };
  try {
    await walkNodeModules(wc, "/project/node_modules", files, budget);
  } catch {
    return;
  }

  if (files.length === 0 || budget.bytes > MAX_CACHE_BYTES) return;

  const payload: CachePayload = { v: CACHE_VERSION, files };
  let compressed: Uint8Array;
  try {
    compressed = await gzipText(JSON.stringify(payload));
  } catch {
    return;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(compressed, depsKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB write failed"));
    });
    db.close();
  } catch {
    // Best-effort cache — ignore write failures (quota, private mode, etc.)
  }
}

async function hasNodeModules(wc: WebContainer): Promise<boolean> {
  try {
    const entries = await wc.fs.readdir("/project/node_modules");
    return entries.length > 0;
  } catch {
    return false;
  }
}
