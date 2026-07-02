import type { WebContainer } from "@webcontainer/api";
import { WORK_DIR } from "@/lib/bolt/constants";

/** WebContainer fs APIs expect paths relative to `wc.workdir`, not absolute `/home/project/...`. */
export function workdirRelative(wc: WebContainer, filePath: string): string {
  if (filePath === wc.workdir || filePath === WORK_DIR) return ".";

  const workdirPrefix = `${wc.workdir}/`;
  if (filePath.startsWith(workdirPrefix)) {
    return filePath.slice(workdirPrefix.length);
  }

  const constantPrefix = `${WORK_DIR}/`;
  if (filePath.startsWith(constantPrefix)) {
    return filePath.slice(constantPrefix.length);
  }

  return filePath.replace(/^\/+/, "");
}

export function joinWorkdirRelative(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}
