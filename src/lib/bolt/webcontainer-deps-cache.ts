import type { WebContainer } from "@webcontainer/api";
import { joinWorkdirRelative } from "@/lib/bolt/workdir-path";

const DB_NAME = "storehause-webcontainer";
const STORE_NAME = "node-modules-cache";
const CACHE_VERSION = 3;
/** Skip caching absurdly large trees; typical hoisted Vite apps are ~150–350 MB. */
const MAX_UNCOMPRESSED_BYTES = 450_000_000;
/** IndexedDB single-value limits vary by browser — chunk compressed payloads. */
const CHUNK_BYTES = 32 * 1024 * 1024;

const MAGIC = new Uint8Array([0x53, 0x48, 0x57, 0x43]); // SHWC

type CachedFile = { path: string; bytes: Uint8Array };

export type NodeModulesCacheResult =
  | { ok: true; fileCount: number; uncompressedBytes: number; compressedBytes: number }
  | { ok: false; reason: string };

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

async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function metaKey(depsKey: string): string {
  return `v${CACHE_VERSION}:${depsKey}:meta`;
}

function chunkKey(depsKey: string, index: number): string {
  return `v${CACHE_VERSION}:${depsKey}:chunk:${index}`;
}

function encodePayload(files: CachedFile[]): Uint8Array {
  let totalBytes = 8;
  for (const file of files) {
    const pathBytes = new TextEncoder().encode(file.path);
    if (pathBytes.length > 0xffff) {
      throw new Error(`Cache path too long: ${file.path}`);
    }
    totalBytes += 2 + pathBytes.length + 4 + file.bytes.length;
  }

  const out = new Uint8Array(totalBytes);
  const view = new DataView(out.buffer);
  out.set(MAGIC, 0);
  view.setUint32(4, files.length, true);

  let offset = 8;
  for (const file of files) {
    const pathBytes = new TextEncoder().encode(file.path);
    view.setUint16(offset, pathBytes.length, true);
    offset += 2;
    out.set(pathBytes, offset);
    offset += pathBytes.length;
    view.setUint32(offset, file.bytes.length, true);
    offset += 4;
    out.set(file.bytes, offset);
    offset += file.bytes.length;
  }

  return out;
}

function decodePayload(data: Uint8Array): CachedFile[] {
  if (data.length < 8) throw new Error("Cache payload too small");
  if (data[0] !== MAGIC[0] || data[1] !== MAGIC[1] || data[2] !== MAGIC[2] || data[3] !== MAGIC[3]) {
    throw new Error("Cache payload has invalid magic");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const fileCount = view.getUint32(4, true);
  const files: CachedFile[] = [];
  let offset = 8;

  for (let i = 0; i < fileCount; i++) {
    if (offset + 2 > data.length) throw new Error("Cache payload truncated (path length)");
    const pathLen = view.getUint16(offset, true);
    offset += 2;

    if (offset + pathLen + 4 > data.length) throw new Error("Cache payload truncated (path)");
    const path = new TextDecoder().decode(data.subarray(offset, offset + pathLen));
    offset += pathLen;

    const contentLen = view.getUint32(offset, true);
    offset += 4;

    if (offset + contentLen > data.length) throw new Error("Cache payload truncated (content)");
    files.push({ path, bytes: data.subarray(offset, offset + contentLen) });
    offset += contentLen;
  }

  return files;
}

async function isDirectory(wc: WebContainer, path: string): Promise<boolean> {
  try {
    await wc.fs.readdir(path);
    return true;
  } catch {
    return false;
  }
}

async function walkNodeModules(wc: WebContainer, dir: string, files: CachedFile[]): Promise<number> {
  const entries = await wc.fs.readdir(dir);
  let totalBytes = 0;

  for (const name of entries) {
    const fullPath = `${dir}/${name}`;
    if (await isDirectory(wc, fullPath)) {
      totalBytes += await walkNodeModules(wc, fullPath, files);
      if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new Error(`node_modules exceeds ${MAX_UNCOMPRESSED_BYTES} byte cache limit`);
      }
      continue;
    }

    const raw = await wc.fs.readFile(fullPath);
    const bytes = raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw));
    totalBytes += bytes.length;
    if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new Error(`node_modules exceeds ${MAX_UNCOMPRESSED_BYTES} byte cache limit`);
    }

    files.push({
      path: fullPath.replace(/^node_modules\//, ""),
      bytes,
    });
  }

  return totalBytes;
}

async function idbGet(db: IDBDatabase, key: string): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => {
      const value = req.result;
      if (value instanceof Uint8Array) resolve(value);
      else if (value instanceof ArrayBuffer) resolve(new Uint8Array(value));
      else resolve(undefined);
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
}

async function idbPut(db: IDBDatabase, key: string, value: Uint8Array): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("IndexedDB write failed"));
  });
}

async function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("IndexedDB delete failed"));
  });
}

async function readCompressedCache(db: IDBDatabase, depsKey: string): Promise<Uint8Array | undefined> {
  const metaRaw = await idbGet(db, metaKey(depsKey));
  if (!metaRaw?.length) return undefined;

  const meta = JSON.parse(new TextDecoder().decode(metaRaw)) as { chunks?: number };
  if (!meta.chunks || meta.chunks < 1) return undefined;

  const parts: Uint8Array[] = [];
  for (let i = 0; i < meta.chunks; i++) {
    const part = await idbGet(db, chunkKey(depsKey, i));
    if (!part?.length) return undefined;
    parts.push(part);
  }

  const merged = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

async function writeCompressedCache(db: IDBDatabase, depsKey: string, compressed: Uint8Array): Promise<void> {
  const chunks = Math.ceil(compressed.length / CHUNK_BYTES) || 1;
  const meta = JSON.stringify({ chunks, bytes: compressed.length, v: CACHE_VERSION });

  await idbPut(db, metaKey(depsKey), new TextEncoder().encode(meta));
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_BYTES;
    const end = Math.min(start + CHUNK_BYTES, compressed.length);
    await idbPut(db, chunkKey(depsKey, i), compressed.subarray(start, end));
  }
}

async function clearCompressedCache(db: IDBDatabase, depsKey: string): Promise<void> {
  const metaRaw = await idbGet(db, metaKey(depsKey));
  if (!metaRaw?.length) return;

  try {
    const meta = JSON.parse(new TextDecoder().decode(metaRaw)) as { chunks?: number };
    if (meta.chunks) {
      for (let i = 0; i < meta.chunks; i++) {
        await idbDelete(db, chunkKey(depsKey, i));
      }
    }
  } catch {
    // ignore malformed meta
  }

  await idbDelete(db, metaKey(depsKey));
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
    compressed = await readCompressedCache(db, depsKey);
    db.close();
  } catch {
    return false;
  }

  if (!compressed?.length) return false;

  let files: CachedFile[];
  try {
    const payload = await gunzipBytes(compressed);
    files = decodePayload(payload);
    if (files.length === 0) return false;
  } catch {
    return false;
  }

  await wc.fs.mkdir("node_modules", { recursive: true });
  const total = files.length;
  let written = 0;
  const createdDirs = new Set<string>();

  try {
    for (const file of files) {
      const fullPath = joinWorkdirRelative("node_modules", file.path);
      const dir = fullPath.split("/").slice(0, -1).join("/");
      if (dir && !createdDirs.has(dir)) {
        await wc.fs.mkdir(dir, { recursive: true });
        createdDirs.add(dir);
      }
      await wc.fs.writeFile(fullPath, file.bytes);
      written += 1;
      if (written === 1 || written === total || written % 250 === 0) {
        onProgress?.({ written, total });
      }
    }
  } catch {
    return false;
  }

  await fixRestoredNodeModulesPermissions(wc);
  return true;
}

/** Restored cache files are written without executable bits; fix .bin shims and native binaries. */
export async function fixRestoredNodeModulesPermissions(wc: WebContainer): Promise<void> {
  const proc = await wc.spawn(
    "sh",
    [
      "-lc",
      [
        "chmod -R +x node_modules/.bin 2>/dev/null || true",
        "find node_modules -type f -path '*/.bin/*' -exec chmod +x {} + 2>/dev/null || true",
        "find node_modules -type f -path '*/bin/*' ! -name '*.js' ! -name '*.cjs' ! -name '*.mjs' ! -name '*.ts' ! -name '*.json' ! -name '*.txt' ! -name '*.md' -exec chmod +x {} + 2>/dev/null || true",
      ].join("; "),
    ],
    { env: { FORCE_COLOR: "0" } },
  );
  await proc.exit;
}

export async function saveNodeModulesCache(
  wc: WebContainer,
  depsKey: string,
): Promise<NodeModulesCacheResult> {
  if (typeof indexedDB === "undefined") {
    return { ok: false, reason: "IndexedDB unavailable" };
  }
  if (!(await hasNodeModules(wc))) {
    return { ok: false, reason: "node_modules is empty" };
  }

  const files: CachedFile[] = [];
  let uncompressedBytes = 0;
  try {
    uncompressedBytes = await walkNodeModules(wc, "node_modules", files);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Failed to read node_modules",
    };
  }

  if (files.length === 0) {
    return { ok: false, reason: "No files found in node_modules" };
  }

  let compressed: Uint8Array;
  try {
    const payload = encodePayload(files);
    compressed = await gzipBytes(payload);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Failed to encode cache payload",
    };
  }

  try {
    const db = await openDb();
    await clearCompressedCache(db, depsKey);
    await writeCompressedCache(db, depsKey, compressed);
    db.close();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "IndexedDB write failed",
    };
  }

  return {
    ok: true,
    fileCount: files.length,
    uncompressedBytes,
    compressedBytes: compressed.length,
  };
}

export async function clearNodeModulesCache(depsKey: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await clearCompressedCache(db, depsKey);
    db.close();
  } catch {
    // ignore
  }
}

async function hasNodeModules(wc: WebContainer): Promise<boolean> {
  try {
    const entries = await wc.fs.readdir("node_modules");
    return entries.length > 0;
  } catch {
    return false;
  }
}
