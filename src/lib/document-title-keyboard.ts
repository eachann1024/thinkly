export const ENTER_DOCUMENT_BODY_EVENT = "goose-note:enter-document-body";

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
    detail: { pageId },
  }));
}
