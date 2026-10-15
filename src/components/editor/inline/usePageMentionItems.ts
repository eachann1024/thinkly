import { useCallback, useRef } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { toast } from "@/components/ui/sonner";
import { useEditorPageContext } from "../platform/hostContext";
import { getPageMentionMenuItems, getPageMentionTriggerRange, insertPageMentionFromMenu } from "./pageMentionMenuItems";
import { snapshotEditorSelection, restoreEditorSelection } from "../utils/editorSelectionSnapshot";

export function usePageMentionItems(editor: BlockNoteEditor<any, any, any>) {
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
        title: `在当前目录新建“${title}”`,
        onItemClick: () => {
          if (pageVisit.current !== origin || !editor.isEditable) return;
          const snapshot = snapshotEditorSelection(editor.prosemirrorState);
          const range = getPageMentionTriggerRange(editor);
          void createPageMentionTarget(title).then((created) => {
            if (!created) return;
            if (pageVisit.current !== origin || !editor.isEditable ||
              !restoreEditorSelection(editor.prosemirrorView, snapshot)) {
              toast.info("新页面已创建；原笔记内容已变化，请从侧栏打开");
              return;
            }
            insertPageMentionFromMenu(editor, created, range);
            editor.focus();
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "创建页面失败，原内容已保留");
          });
        },
      });
    }
    return result;
  }, [editor, origin, searchPages, createPageMentionTarget]);
}
