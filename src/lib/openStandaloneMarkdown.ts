import { comparisonLocalPath, localPathsAreCaseInsensitive } from "./canonicalLocalPath";
import { readMarkdownFile } from "./local-folder-scanner/entries";
import { localFileTitleFromPath, parseLocalMarkdownContent } from "./local-folder-scanner";
import { setLocalMdSnapshot, updateSnapshotStat } from "./local-md-snapshot";
import { usePages } from "@/stores/usePages";
import { recoverScannedLocalPages } from "@/stores/pages/actions/localFolder/load/recovery";

// Session-only documents have no mounted root and never scan their parent folder.
import { STANDALONE_FILES_WORKSPACE } from "./standaloneFileCapabilities";
export { STANDALONE_FILES_WORKSPACE } from "./standaloneFileCapabilities";

export async function openStandaloneMarkdownPage(filePath: string): Promise<string> {
  const fs = window.gooseFs;
  if (!fs) throw new Error("Filesystem unavailable");
  const key = comparisonLocalPath(filePath, localPathsAreCaseInsensitive());
  const existing = Object.values(usePages.getState().pages).find((page) =>
    !page.isFolder && page.localFilePath &&
    comparisonLocalPath(page.localFilePath, localPathsAreCaseInsensitive()) === key);
  if (existing) {
    // Never replace an open editor's unsaved content on a repeated OS open event.
    if (existing.localReadState === "error") {
      await usePages.getState().reloadLocalPageFromDisk(existing.id);
    }
    return existing.id;
  }
  const read = await readMarkdownFile(fs, filePath);
  const parsed = await parseLocalMarkdownContent(read.content, localFileTitleFromPath(filePath), read.error);
  const id = `external:${key}`;
  const now = Date.now();
  if (typeof read.content === "string") {
    setLocalMdSnapshot(filePath, read.content);
    if (read.stat) updateSnapshotStat(filePath, read.stat);
  }
  usePages.setState((state) => ({ pages: { ...state.pages, [id]: {
    id, workspaceId: STANDALONE_FILES_WORKSPACE,
    content: parsed.content, isFolder: false, isLocked: parsed.isLocked,
    fontSize: "default", fontFamily: parsed.fontFamily, pageLayout: parsed.pageLayout,
    localFilePath: filePath, localFrontmatter: parsed.frontmatter,
    localReadState: parsed.readState, localReadError: parsed.readError,
    createdAt: now, updatedAt: now,
  } } }));
  recoverScannedLocalPages(usePages.setState, usePages.getState, STANDALONE_FILES_WORKSPACE);
  return id;
}
