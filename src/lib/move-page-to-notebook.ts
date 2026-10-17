import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/move-page-to-notebook.ts#localMessages:1">`
zh-Hans:
  movedToNotebook: "已移动到「{{name}}」"
  destinationNotebook: "目标笔记本"
  couldnTMoveTheNoteToTheDestinationNotebook: "无法移动到目标笔记本"
  undo: "撤回"
  couldnTUndoTheMoveTheOriginalNotebookNo: "撤回失败：原笔记本不存在"
  moveFailedTryAgain: "移动失败，请重试"
en:
  movedToNotebook: "Moved to {{name}}"
  destinationNotebook: "Destination notebook"
  couldnTMoveTheNoteToTheDestinationNotebook: "Couldn’t move the note to the destination notebook"
  undo: "Undo"
  couldnTUndoTheMoveTheOriginalNotebookNo: "Couldn’t undo the move: the original notebook no longer exists"
  moveFailedTryAgain: "Move failed. Try again."
`;
const uiText = createTranslator(localMessages);
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
  const targetName = notebooks[targetNotebookId]?.name || uiText("destinationNotebook");
  try {
    if (page && notebooks[page.workspaceId]?.source === "local-folder") {
      await pages.moveLocalPageToNotebook(pageId, targetNotebookId);
      toast.success(uiText("movedToNotebook", {name: targetName}));
      return true;
    }
    const result = pages.movePageTreeToNotebook(pageId, targetNotebookId);
    if (!result.ok) throw new Error(uiText("couldnTMoveTheNoteToTheDestinationNotebook"));
    toast.success(uiText("movedToNotebook", {name: targetName}), {
      duration: 5000,
      action: {
        label: uiText("undo"),
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
            toast.error(uiText("couldnTUndoTheMoveTheOriginalNotebookNo"));
        },
      },
    });
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : uiText("moveFailedTryAgain"));
    return false;
  }
}
