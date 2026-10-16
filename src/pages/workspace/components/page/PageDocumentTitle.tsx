import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { getPageTitle, UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import {
  completePageTitleFocus,
  isPageTitleFocusRequested,
  subscribePageTitleFocus,
} from "@/lib/page-title-focus";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";

const displayTitle = (page: Page) => {
  const title = getPageTitle(page);
  return title === UNTITLED_PAGE_TITLE ? "" : title;
};

/** 本地文件的正文大标题：显示文件名，提交时重命名文件。 */
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
      await usePages.getState().renameLocalPageFile(page.id, next);
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
