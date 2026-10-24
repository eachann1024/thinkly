import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/PageDocumentTitle.tsx#localMessages:1">`
zh-Hans:
  createFailed: "新建失败：目标位置不可用或无写入权限"
  renameFailed: "重命名失败，请重试"
  noteTitle: "页面标题"
en:
  createFailed: "Couldn’t create the note: the destination is unavailable or you don’t have write permission"
  renameFailed: "Couldn’t rename the note. Try again."
  noteTitle: "Note title"
ja:
  createFailed: "ノートを作成できませんでした：保存先を利用できないか、書き込み権限がありません"
  renameFailed: "名前を変更できませんでした。もう一度お試しください。"
  noteTitle: "ノートのタイトル"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { getPageTitle, UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import {
  completePageTitleFocus,
  isPageTitleFocusRequested,
  subscribePageTitleFocus,
} from "@/lib/page-title-focus";
import { normalizeNewFileName } from "@/lib/new-page-name";
import { enterDocumentBody, isPlainDocumentNavigation, UPDATE_DOCUMENT_TITLE_EVENT, SAVE_DOCUMENT_TITLE_EVENT, type DocumentTitleSave } from "@/lib/document-title-keyboard";
import { flushEditorContent } from "@/stores/pages/actions/flushEditor";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";

const displayTitle = (page: Page) => {
  const title = getPageTitle(page);
  return title === UNTITLED_PAGE_TITLE ? "" : title;
};

export function PageDocumentTitle({ page, focused, editable }: {
  page: Page;
  focused: boolean;
  editable: boolean;
}) {
  useLocale();
  const committed = displayTitle(page);
  const [value, setValue] = useState(committed);
  const valueRef = useRef(value);
  const editingRef = useRef(false);
  const discardRef = useRef(false);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const allowEmptyRef = useRef(false);

  const updateValue = (next: string) => {
    valueRef.current = next;
    setValue(next);
  };

  useEffect(() => {
    if (!editingRef.current && !pendingSavesRef.current) updateValue(committed);
  }, [committed]);

  useEffect(() => {
    if (!focused || !editable) return;
    let frame: number | undefined;
    const focusTitle = (pageId: string) => {
      if (pageId !== page.id || !isPageTitleFocusRequested(pageId)) return;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!isPageTitleFocusRequested(pageId)) return;
        fieldRef.current?.focus();
        completePageTitleFocus(pageId);
      });
    };
    focusTitle(page.id);
    const unsubscribe = subscribePageTitleFocus(focusTitle);
    return () => {
      unsubscribe();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [editable, focused, page.id]);

  const commit = () => {
    editingRef.current = false;
    const next = valueRef.current.replace(/\s+/g, " ").trim();
    const allowEmpty = allowEmptyRef.current;
    allowEmptyRef.current = false;
    if (discardRef.current || (!next && !allowEmpty)) {
      discardRef.current = false;
      updateValue(committed);
      return Promise.resolve(false);
    }
    pendingSavesRef.current += 1;
    const save = saveQueueRef.current.then(async () => {
      let succeeded = true;
      try {
        const store = usePages.getState();
        const current = store.pages[page.id];
        if (!current) return false;
        if (next === displayTitle(current)) return true;
        const name = normalizeNewFileName(next || UNTITLED_PAGE_TITLE);
        if (!current.localFilePath) {
          flushEditorContent();
          const saved = await store.materializeUnsavedLocalPage(page.id, { title: name });
          if (!saved) throw new Error(uiText("createFailed"));
          if (getPageTitle(usePages.getState().pages[page.id]) === name) return true;
        }
        await usePages.getState().renameLocalPageFile(page.id, name);
      } catch (error) {
        succeeded = false;
        toast.error(error instanceof Error ? error.message : uiText("renameFailed"));
      } finally {
        pendingSavesRef.current -= 1;
        const latest = usePages.getState().pages[page.id];
        if (succeeded && !pendingSavesRef.current && !editingRef.current && latest) updateValue(displayTitle(latest));
      }
      return succeeded;
    });
    saveQueueRef.current = save;
    return save;
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const updateFromEditor = (event: Event) => {
      const detail = (event as CustomEvent<{ pageId: string; title: string }>).detail;
      if (detail.pageId !== page.id) return;
      updateValue(detail.title);
      allowEmptyRef.current = true;
      if (document.activeElement !== field) commitRef.current();
    };
    const saveFromEditor = (event: Event) => {
      const detail = (event as CustomEvent<DocumentTitleSave>).detail;
      if (detail.pageId !== page.id) return;
      event.preventDefault();
      const previous = valueRef.current;
      updateValue(detail.title);
      void commitRef.current().then((saved) => {
        if (!saved && valueRef.current === detail.title) updateValue(previous);
        const current = usePages.getState().pages[page.id];
        detail.complete(saved && Boolean(current && displayTitle(current) === detail.title));
      });
    };
    field.addEventListener(UPDATE_DOCUMENT_TITLE_EVENT, updateFromEditor);
    field.addEventListener(SAVE_DOCUMENT_TITLE_EVENT, saveFromEditor);
    return () => {
      field.removeEventListener(UPDATE_DOCUMENT_TITLE_EVENT, updateFromEditor);
      field.removeEventListener(SAVE_DOCUMENT_TITLE_EVENT, saveFromEditor);
    };
  }, [page.id]);

  return (
    <Textarea
      ref={fieldRef}
      variant="inline"
      context="editor"
      className="page-document-title"
      rows={1}
      value={value}
      placeholder={UNTITLED_PAGE_TITLE}
      readOnly={!editable}
      spellCheck={false}
      aria-label={uiText("noteTitle")}
      onFocus={() => { editingRef.current = true; }}
      onChange={(event) => updateValue(event.target.value.replace(/\n/g, ""))}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (!editable || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
        if (event.key === "Enter") {
          const navigate = isPlainDocumentNavigation(event.nativeEvent);
          event.preventDefault();
          if (!event.repeat && navigate) enterDocumentBody(event.currentTarget, page.id);
        } else if (event.key === "Escape") {
          event.preventDefault();
          discardRef.current = true;
          fieldRef.current?.blur();
        }
      }}
    />
  );
}
