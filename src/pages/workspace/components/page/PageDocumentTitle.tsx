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
  const committed = displayTitle(page);
  const [value, setValue] = useState(committed);
  const editingRef = useRef(false);
  const discardRef = useRef(false);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editingRef.current) setValue(committed);
  }, [committed]);

  useEffect(() => {
    if (!focused || !editable) return;
    const focusTitle = (pageId: string) => {
      if (pageId !== page.id || !isPageTitleFocusRequested(pageId)) return;
      requestAnimationFrame(() => {
        fieldRef.current?.focus();
        completePageTitleFocus(pageId);
      });
    };
    focusTitle(page.id);
    return subscribePageTitleFocus(focusTitle);
  }, [editable, focused, page.id]);

  const commit = async () => {
    editingRef.current = false;
    const next = value.replace(/\s+/g, " ").trim();
    if (discardRef.current || !next || next === committed) {
      discardRef.current = false;
      setValue(committed);
      return;
    }
    try {
      const name = normalizeNewFileName(next);
      const store = usePages.getState();
      if (!store.pages[page.id]?.localFilePath) {
        // 草稿首次命名即落盘，重名时由分配逻辑自动加后缀。
        flushEditorContent();
        const saved = await store.materializeUnsavedLocalPage(page.id, { title: name });
        if (!saved) throw new Error("新建失败：目标位置不可用或无写入权限");
        // 正文保存可能先一步以默认名落盘，此时再按标题重命名。
        if (displayTitle(usePages.getState().pages[page.id]) === name) return;
      }
      await usePages.getState().renameLocalPageFile(page.id, name);
    } catch (error) {
      setValue(committed);
      toast.error(error instanceof Error ? error.message : "重命名失败，请重试");
    }
  };

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
      aria-label="页面标题"
      onFocus={() => { editingRef.current = true; }}
      onChange={(event) => setValue(event.target.value.replace(/\n/g, ""))}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter") {
          event.preventDefault();
          fieldRef.current?.blur();
          window.dispatchEvent(new Event("goose-note:focus-editor-start"));
        } else if (event.key === "Escape") {
          event.preventDefault();
          discardRef.current = true;
          fieldRef.current?.blur();
        }
      }}
    />
  );
}
