import { useCallback, useRef } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { toast } from "@/components/ui/sonner";
import { useEditorPageContext } from "../platform/hostContext";
import { getPageMentionMenuItems, getPageMentionTriggerRange, insertPageMentionFromMenu } from "./pageMentionMenuItems";
import { snapshotEditorSelection, restoreEditorSelection } from "../utils/editorSelectionSnapshot";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/inline/usePageMentionItems.ts#messages:1">`
zh-Hans:
  pageCreatedTheOriginalNoteHasChangedOpen: "新页面已创建；原笔记内容已变化，请从侧栏打开"
  couldNotCreateThePageYourOriginalContent: "创建页面失败，原内容已保留"
  createPageHere: "在当前目录新建“{{title}}”"
en:
  pageCreatedTheOriginalNoteHasChangedOpen: "Page created. The original note has changed; open the new page from the sidebar."
  couldNotCreateThePageYourOriginalContent: "Could not create the page. Your original content was preserved."
  createPageHere: "Create “{{title}}” in this folder"
`;
const t = createTranslator(messages);


export function usePageMentionItems(editor: BlockNoteEditor<any, any, any>) {
  const locale = useLocale();
  const { page, searchPages, createPageMentionTarget } = useEditorPageContext();
  const pageVisit = useRef({ id: page.id });
  if (pageVisit.current.id !== page.id) pageVisit.current = { id: page.id };
  const origin = pageVisit.current;
  return useCallback(async (query: string) => {
    const items = searchPages(query).filter((item) => !item.isFolder);
    const result = getPageMentionMenuItems(editor, items).map((item) => ({
      ...item,
      onItemClick: () => {
        if (pageVisit.current === origin && editor.isEditable) item.onItemClick();
      },
    }));
    const title = query.trim();
    if (createPageMentionTarget && title && !items.some((item) => item.title.trim() === title)) {
      result.push({
        title: t("createPageHere", { title }),
        onItemClick: () => {
          if (pageVisit.current !== origin || !editor.isEditable) return;
          const snapshot = snapshotEditorSelection(editor.prosemirrorState);
          const range = getPageMentionTriggerRange(editor);
          void createPageMentionTarget(title).then((created) => {
            if (!created) return;
            if (pageVisit.current !== origin || !editor.isEditable ||
              !restoreEditorSelection(editor.prosemirrorView, snapshot)) {
              toast.info(t("pageCreatedTheOriginalNoteHasChangedOpen"));
              return;
            }
            insertPageMentionFromMenu(editor, created, range);
            editor.focus();
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : t("couldNotCreateThePageYourOriginalContent"));
          });
        },
      });
    }
    return result;
  }, [editor, origin, searchPages, createPageMentionTarget, locale]);
}
