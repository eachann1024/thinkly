import { createElement, useCallback, useRef } from "react";
import { Plus } from "@/components/ui/icons";
import type { BlockNoteEditor } from "@blocknote/core";
import { toast } from "@/components/ui/sonner";
import { useEditorPageContext } from "../platform/hostContext";
import { getPageMentionMenuItems, getPageMentionTriggerRange, insertPageMentionFromMenu } from "./pageMentionMenuItems";
import { snapshotEditorSelection, restoreEditorSelection } from "../utils/editorSelectionSnapshot";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
import type { AiReferenceSuggestionItem } from "../ai/composer/referenceTypes";
import { wikiTargetFromReference } from "./pageMention";
import { getPageTitle } from "../utils/page-title";
const messages = i18nYaml<"src/components/editor/inline/usePageMentionItems.ts#messages:1">`
zh-Hans:
  pageCreatedTheOriginalNoteHasChangedOpen: "新页面已创建；原笔记内容已变化，请从侧栏打开"
  couldNotCreateThePageYourOriginalContent: "创建页面失败，原内容已保留"
  createPageHere: "新建“{{title}}”"
en:
  pageCreatedTheOriginalNoteHasChangedOpen: "Page created. The original note has changed; open the new page from the sidebar."
  couldNotCreateThePageYourOriginalContent: "Could not create the page. Your original content was preserved."
  createPageHere: "Create “{{title}}”"
ja:
  pageCreatedTheOriginalNoteHasChangedOpen: "新しいページを作成しました。元のノートの内容が変更されたため、サイドバーから開いてください"
  couldNotCreateThePageYourOriginalContent: "ページを作成できませんでした。元の内容は残されています"
  createPageHere: "「{{title}}」を新規作成"
`;
const t = createTranslator(messages);


export function usePageMentionItems(editor: BlockNoteEditor<any, any, any>) {
  const locale = useLocale();
  const { page, searchPages, getLatestPage, resolvePageMention, createPageMentionTarget } = useEditorPageContext();
  const pageVisit = useRef({ id: page.id });
  if (pageVisit.current.id !== page.id) pageVisit.current = { id: page.id };
  const origin = pageVisit.current;
  return useCallback(async (query: string) => {
    const resolveItem = (item: AiReferenceSuggestionItem) => {
      const live = getLatestPage?.(item.pageId);
      if (getLatestPage && (!live || live.trashedAt || live.isFolder)) return null;
      const current = resolvePageMention?.({
        pageId: item.pageId, workspaceId: live?.workspaceId ?? item.workspaceId,
        title: item.title, notebookName: item.notebookNameSnapshot ?? "",
        wikiTarget: wikiTargetFromReference(item),
      }, { includeReference: true });
      if (resolvePageMention && !current) return null;
      if (current?.reference) return current.reference;
      const title = current?.title ?? (live ? getPageTitle(live) : item.title);
      return { ...item, title, titleSnapshot: title, notebookNameSnapshot: current?.notebookName ?? item.notebookNameSnapshot };
    };
    const items = searchPages(query, { includeFolders: false }).filter((item) => !item.isFolder);
    const title = query.trim();
    const canCreate = Boolean(createPageMentionTarget && title && !items.some((item) => item.title.trim() === title));
    const result = (items.length || !canCreate ? getPageMentionMenuItems(editor, items, resolveItem) : []).map((item) => ({
      ...item,
      onItemClick: () => {
        if (pageVisit.current === origin && editor.isEditable) item.onItemClick();
      },
    }));
    if (createPageMentionTarget && canCreate) {
      result.push({
        title: t("createPageHere", { title }),
        icon: createElement(Plus, { size: 16 }),
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
            const live = resolveItem(created);
            if (!live) return;
            insertPageMentionFromMenu(editor, live, range);
            editor.focus();
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : t("couldNotCreateThePageYourOriginalContent"));
          });
        },
      });
    }
    return result;
  }, [editor, origin, searchPages, getLatestPage, resolvePageMention, createPageMentionTarget, locale]);
}
