export const ENTER_DOCUMENT_BODY_EVENT = "goose-note:enter-document-body";
export const UPDATE_DOCUMENT_TITLE_EVENT = "goose-note:update-document-title";

export type DocumentTitleSplit = {
  pageId: string;
  before: string;
  title: string;
  body: string;
};

export function splitDocumentTitle(field: HTMLTextAreaElement, pageId: string): DocumentTitleSplit {
  return {
    pageId,
    before: field.value,
    title: field.value.slice(0, field.selectionStart),
    body: field.value.slice(field.selectionEnd),
  };
}

type NavigationKey = {
  defaultPrevented: boolean;
  isComposing: boolean;
  keyCode: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/** 修饰键和输入法确认交回原有快捷键，不跨越标题/正文边界。 */
export function isPlainDocumentNavigation(event: NavigationKey): boolean {
  return !event.defaultPrevented && !event.isComposing && event.keyCode !== 229 &&
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

export function enterDocumentBody(field: HTMLTextAreaElement, pageId: string) {
  field.dispatchEvent(new CustomEvent(ENTER_DOCUMENT_BODY_EVENT, {
    bubbles: true,
    detail: splitDocumentTitle(field, pageId),
  }));
}
