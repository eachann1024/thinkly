import { toast } from "@/components/ui/sonner";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";

export async function movePageToNotebook(
  pageId: string,
  targetNotebookId: string,
): Promise<boolean> {
  const pages = usePages.getState();
  const notebooks = useNotebooks.getState().notebooks;
  const page = pages.pages[pageId];
  const targetName = notebooks[targetNotebookId]?.name || "目标记事本";
  try {
    if (page && notebooks[page.workspaceId]?.source === "local-folder") {
      await pages.moveLocalPageToNotebook(pageId, targetNotebookId);
      toast.success(`已移动到「${targetName}」`);
      return true;
    }
    const result = pages.movePageTreeToNotebook(pageId, targetNotebookId);
    if (!result.ok) throw new Error("无法移动到目标记事本");
    toast.success(`已移动到「${targetName}」`, {
      duration: 5000,
      action: {
        label: "撤回",
        onClick: () => {
          if (
            !usePages
              .getState()
              .undoMovePageTree(
                result.undoSnapshots,
                result.sourceNotebookId,
                result.prevActivePageId,
              )
          )
            toast.error("撤回失败：源记事本不存在");
        },
      },
    });
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "移动失败，请重试");
    return false;
  }
}
