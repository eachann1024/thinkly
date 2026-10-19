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
import { enterDocumentBody, isPlainDocumentNavigation, UPDATE_DOCUMENT_TITLE_EVENT } from "@/lib/document-title-keyboard";
import { flushEditorContent } from "@/stores/pages/actions/flushEditor";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";

const displayTitle = (page: Page) => {
  const title = getPageTitle(page);
  return title === UNTITLED_PAGE_TITLE ? "" : title;
};

/** 本地文件与草稿的正文大标题：显示文件名，提交时重命名或落盘。 */
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
  const saveQueueRef = useRef(Promise.resolve());
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
      return;
    }
    // 连续回车、撤销/重做必须按顺序改名，不能并发使用同一个旧文件路径。
    pendingSavesRef.current += 1;
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      let succeeded = true;
      try {
        const store = usePages.getState();
        const current = store.pages[page.id];
        if (!current || next === displayTitle(current)) return;
        const name = normalizeNewFileName(next || UNTITLED_PAGE_TITLE);
        if (!current.localFilePath) {
          flushEditorContent();
          const saved = await store.materializeUnsavedLocalPage(page.id, { title: name });
          if (!saved) throw new Error(uiText("createFailed"));
          if (getPageTitle(usePages.getState().pages[page.id]) === name) return;
        }
        await usePages.getState().renameLocalPageFile(page.id, name);
      } catch (error) {
        succeeded = false;
        toast.error(error instanceof Error ? error.message : uiText("renameFailed"));
      } finally {
        pendingSavesRef.current -= 1;
        const latest = usePages.getState().pages[page.id];
        // 失败时保留输入，尤其不能抹掉撤销刚从正文恢复的原标题。
        if (succeeded && !pendingSavesRef.current && !editingRef.current && latest) updateValue(displayTitle(latest));
      }
    });
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
      // 首次拆分由随后的 blur 提交；正文内撤销/重做则立即同步文件名。
      if (document.activeElement !== field) commitRef.current();
    };
    field.addEventListener(UPDATE_DOCUMENT_TITLE_EVENT, updateFromEditor);
    return () => field.removeEventListener(UPDATE_DOCUMENT_TITLE_EVENT, updateFromEditor);
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
