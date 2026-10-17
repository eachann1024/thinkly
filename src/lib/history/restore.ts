import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { findHistoryEntry } from "./layout";
import { rendererHistoryDisk } from "./localDisk";
import { rebaseHistoricalResources } from "../local-resource-paths";
import { validHistoryRelativePath } from "./localPaths";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { resolveHistoryBackend } from "./backend";

/** 读取某个版本的完整内容。MVP 仅支持 snapshot 版本，直接返回 content。 */
export async function materializeVersion(
  pageId: string,
  versionId: string,
): Promise<{ content: BlockNoteContent; localFrontmatter?: string } | null> {
  const backend = resolveHistoryBackend(pageId);
  const version = await backend.loadVersion(pageId, versionId);
  if (!version) return null;
  let content = version.content;
  const page = usePages.getState().pages[pageId];
  const basePath = page ? useNotebooks.getState().notebooks[page.workspaceId]?.localPath : null;
  const fs = rendererHistoryDisk();
  if (basePath && page?.localFilePath && fs) {
    const location = (await findHistoryEntry(basePath, pageId, fs)).meta;
    const from = version.relativePath ?? location?.previousPaths.at(-1) ?? location?.relativePath ?? undefined;
    if (validHistoryRelativePath(from)) content = await rebaseHistoricalResources(content, `${basePath}/${from}`, page.localFilePath, (path) => fs.exists(path), basePath);
  }
  return {
    content,
    ...(version.localFrontmatter !== undefined
      ? { localFrontmatter: version.localFrontmatter }
      : {}),
  };
}
