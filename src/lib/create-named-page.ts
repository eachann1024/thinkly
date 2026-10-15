import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { requestNewPageName } from "./new-page-name";
import { createDefaultPageContent, focusNewPage } from "@/stores/pages/actions/create/content";
import { flushEditorContent } from "@/stores/pages/actions/flushEditor";
import { useSettings } from "@/stores/useSettings";
import { pickRandomPageIcon } from "./randomPageIcon";

/** 手动新建入口；导入和 AI 等已有标题的写入继续使用 record API。 */
export async function createNamedPage(parentId: string | undefined, workspaceId: string) {
  const notebooks = useNotebooks.getState();
  if (notebooks.notebooks[workspaceId]?.source === "local-folder") {
    return usePages.getState().createLocalPage(parentId, workspaceId);
  }
  const id = await requestNewPageName(workspaceId, async (title) => {
    flushEditorContent();
    return usePages.getState().createPageRecord({
      workspaceId, parentId, content: createDefaultPageContent(title),
      ...(useSettings.getState().randomIconOnCreate ? { icon: pickRandomPageIcon() } : {}),
    }) || null;
  });
  if (!id) return null;
  usePages.getState().setActivePage(id);
  useNotebooks.getState().setLastActivePage(workspaceId, id);
  focusNewPage(id);
  return id;
}
