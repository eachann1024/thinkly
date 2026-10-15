import type { JSONContent } from "@/types";
import {
  createEmptyBlockNoteContent,
  clonePageContent as cloneBlockNotePageContent,
  normalizePageContent,
  createEmptyLocalPageContent,
} from "@/components/editor/utils/blocknote-content";
import { UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import { requestPageTitleFocus } from "@/lib/page-title-focus";

export const initialContent: JSONContent =
  createEmptyBlockNoteContent(UNTITLED_PAGE_TITLE);

/** 新建后由活动编辑器消费请求，等待编辑器挂载后再聚焦正文。 */
export function focusNewPage(pageId: string) {
  requestPageTitleFocus(pageId);
}

export function createDefaultPageContent(
  title = UNTITLED_PAGE_TITLE,
): JSONContent {
  return createEmptyBlockNoteContent(title);
}

export function clonePageContent(content?: JSONContent | null) {
  if (!content) {
    return cloneBlockNotePageContent(initialContent);
  }
  return cloneBlockNotePageContent(normalizePageContent(content));
}

// local-folder 页面标题由标签栏中的文件名承担，内容不存在
// 「首块必须是 H1」的约束，克隆时禁止 ensureFirstTitleHeading 注入空标题块。
export function cloneLocalPageContent(content?: JSONContent | null) {
  if (!content) {
    return cloneBlockNotePageContent(createEmptyLocalPageContent());
  }
  return cloneBlockNotePageContent(
    normalizePageContent(content, { ensureFirstTitle: false }),
  );
}
