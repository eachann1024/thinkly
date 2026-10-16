import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { createDefaultPageContent, focusNewPage } from "@/stores/pages/actions/create/content";
import { flushEditorContent } from "@/stores/pages/actions/flushEditor";
import { useSettings } from "@/stores/useSettings";
import { pickRandomPageIcon } from "./randomPageIcon";
import { toast } from "@/components/ui/sonner";

/** 手动新建入口：直接以「新页面」创建，标题在正文顶部修改。 */
export async function createNamedPage(parentId: string | undefined, workspaceId: string) {
  const notebooks = useNotebooks.getState();
  if (notebooks.notebooks[workspaceId]?.source === "local-folder") {
    const localId = await usePages.getState().createLocalPage(parentId, workspaceId);
    if (!localId) toast.error("新建失败：目标位置不可用或无写入权限");
    return localId;
  }
  flushEditorContent();
  const id = usePages.getState().createPageRecord({
    workspaceId, parentId, content: createDefaultPageContent(),
    ...(useSettings.getState().randomIconOnCreate ? { icon: pickRandomPageIcon() } : {}),
  }) || null;
  if (!id) return null;
  usePages.getState().setActivePage(id);
  useNotebooks.getState().setLastActivePage(workspaceId, id);
  focusNewPage(id);
  return id;
}
