import { toast } from "@/components/ui/sonner";
import { useNotebooks } from "@/stores/useNotebooks";
import { createNamedPage } from "@/lib/create-named-page";

/**
 * 分屏前创建同本空白页。
 * 所有手动新建均先命名；取消时不创建分屏。
 */
export async function createSplitBlankPage(): Promise<string | null> {
  const notebooks = useNotebooks.getState();
  const workspaceId = notebooks.activeNotebookId;
  if (!workspaceId) {
    toast.error("无法创建分屏页面", {
      description: "当前没有打开的笔记本",
    });
    return null;
  }

  return createNamedPage(undefined, workspaceId);
}
