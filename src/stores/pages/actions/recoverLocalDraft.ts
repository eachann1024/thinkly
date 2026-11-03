import { v4 as uuidv4 } from "uuid";
import type { Page } from "@/types";
import { withoutIdentity } from "@/lib/note-metadata/identity";

export function prepareRecoveredLocalDraft(
  page: Page,
  pages: Record<string, Page>,
  removedIds?: ReadonlySet<string>,
): Page {
  const parent = page.parentId ? pages[page.parentId] : undefined;
  const keepParent = parent?.isFolder && !parent.trashedAt &&
    parent.workspaceId === page.workspaceId && Boolean(parent.localFilePath) &&
    !removedIds?.has(parent.id);
  return {
    ...page,
    // 保留页面 ID，让待保存队列和恢复日志继续指向同一页。
    parentId: keepParent ? parent.id : undefined,
    editorDraft: true,
    localUnsaved: true,
    localFilePath: undefined,
    localPendingCreate: undefined,
    localReadState: undefined,
    localReadError: undefined,
    localMetadataId: uuidv4(),
    localMetadataRevision: undefined,
    localMetadataRoot: undefined,
    localFrontmatter: page.localFrontmatter
      ? withoutIdentity(page.localFrontmatter) || undefined
      : undefined,
    trashedAt: undefined,
    trashBatchId: undefined,
  };
}
