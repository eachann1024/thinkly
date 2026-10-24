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

export function cloneLocalPageContent(content?: JSONContent | null) {
  if (!content) {
    return cloneBlockNotePageContent(createEmptyLocalPageContent());
  }
  return cloneBlockNotePageContent(
    normalizePageContent(content, { ensureFirstTitle: false }),
  );
}
