import type { Page } from "@/types";
import { getHistoryContentSignature } from "./contentSignature";
import { getPageHistorySettings } from "./settings";

export function historyRestoreTargetSignature(page: Page): string {
  return JSON.stringify({
    id: page.id, workspaceId: page.workspaceId, path: page.localFilePath,
    content: getHistoryContentSignature(page.content), settings: getPageHistorySettings(page),
    frontmatter: page.localFrontmatter, readState: page.localReadState, trashedAt: page.trashedAt,
  });
}

export function canApplyHistoryRestore(signature: string, page?: Page): boolean {
  return Boolean(page && !page.trashedAt && page.localReadState !== "error" && historyRestoreTargetSignature(page) === signature);
}
