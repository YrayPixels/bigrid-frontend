import type { WebContainer } from "@webcontainer/api";
import { DEFAULT_BOLT_TEMPLATE_ID, type BoltTemplateId } from "@/lib/bolt/templates";

/** Flip to true after `npm run build:wc-snapshot` succeeds and manifests are deployed. */
export const PREBUILT_SNAPSHOTS_ENABLED = false;

export type PrebuiltSnapshotManifest = {
  template: string;
  depsKey: string;
  snapshotPath: string;
};

export async function fetchPrebuiltSnapshotManifest(
  templateId: BoltTemplateId = DEFAULT_BOLT_TEMPLATE_ID,
): Promise<PrebuiltSnapshotManifest | null> {
  if (!PREBUILT_SNAPSHOTS_ENABLED) return null;

  try {
    const res = await fetch(`/bolt-snapshots/${templateId}.manifest.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as PrebuiltSnapshotManifest;
    if (!data?.depsKey || !data?.snapshotPath) return null;
    return data;
  } catch {
    return null;
  }
}

export async function mountPrebuiltNodeModulesSnapshot(args: {
  wc: WebContainer;
  depsKey: string;
  templateId?: BoltTemplateId;
}): Promise<boolean> {
  const manifest = await fetchPrebuiltSnapshotManifest(args.templateId ?? DEFAULT_BOLT_TEMPLATE_ID);
  if (!manifest || manifest.depsKey !== args.depsKey) return false;

  try {
    const res = await fetch(manifest.snapshotPath, { cache: "force-cache" });
    if (!res.ok) return false;
    const buffer = await res.arrayBuffer();
    if (!buffer.byteLength) return false;
    await args.wc.mount(buffer, { mountPoint: `${args.wc.workdir}/node_modules` });
    return true;
  } catch {
    return false;
  }
}
