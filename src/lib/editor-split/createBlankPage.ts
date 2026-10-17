import { isUnsavedEditorPage, localPageHasPersistableContent } from "@/lib/unsavedLocalPage";
import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/editor-split/createBlankPage.ts#localMessages:1">`
zh-Hans:
  couldnTCreateANoteInSplitView: "无法创建分屏页面"
  theSourceNoteOrItsNotebookNoLongerExists: "来源笔记或所属笔记本已不存在"
en:
  couldnTCreateANoteInSplitView: "Couldn’t create a note in split view"
  theSourceNoteOrItsNotebookNoLongerExists: "The source note or its notebook no longer exists"
`;
const uiText = createTranslator(localMessages);
import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";

/** 分屏先打开内存草稿；首次实际编辑保存后才创建源文件的同级文件。 */
export async function createSplitBlankPage(sourcePageId: string): Promise<string | null> {
  const id = usePages.getState().createEditorDraftPage(sourcePageId);
  if (id) return id;
  toast.error(uiText("couldnTCreateANoteInSplitView"), { description: uiText("theSourceNoteOrItsNotebookNoLongerExists") });
  return null;
}

export function discardFailedSplitPage(pageId: string) {
  const pages = usePages.getState();
  const page = pages.getPage(pageId);
  if (
    isUnsavedEditorPage(page) &&
    !localPageHasPersistableContent(page.content)
  ) {
    pages.discardEditorDraftPage(pageId);
  }
}
