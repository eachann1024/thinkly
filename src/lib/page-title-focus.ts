import type { Page } from "@/types";

const FOCUS_PAGE_TITLE_EVENT = "goose-note:focus-page-title";

let pendingPageId: string | null = null;
let protectedPageId: string | null = null;
let protectionTimer: ReturnType<typeof setTimeout> | null = null;

const COMPLETED_FOCUS_PROTECTION_MS = 500;

export function requestPageTitleFocus(pageId: string) {
  pendingPageId = pageId;
  protectedPageId = pageId;
  if (protectionTimer !== null) {
    clearTimeout(protectionTimer);
    protectionTimer = null;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FOCUS_PAGE_TITLE_EVENT, { detail: { pageId } }),
    );
  }
}

export function isPageTitleFocusRequested(pageId: string): boolean {
  return pendingPageId === pageId;
}

export function isPageTitleAutoFocusProtected(pageId: string): boolean {
  return pendingPageId === pageId || protectedPageId === pageId;
}

export function completePageTitleFocus(pageId: string) {
  if (pendingPageId !== pageId) return;
  pendingPageId = null;
  if (protectionTimer !== null) clearTimeout(protectionTimer);
  protectionTimer = setTimeout(() => {
    if (protectedPageId === pageId) protectedPageId = null;
    protectionTimer = null;
  }, COMPLETED_FOCUS_PROTECTION_MS);
}

export function subscribePageTitleFocus(
  listener: (pageId: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handle = (event: Event) => {
    const pageId = (event as CustomEvent<{ pageId?: string }>).detail?.pageId;
    if (pageId) listener(pageId);
  };
  window.addEventListener(FOCUS_PAGE_TITLE_EVENT, handle);
  return () => window.removeEventListener(FOCUS_PAGE_TITLE_EVENT, handle);
}

export function hasDocumentTitle(page: Page | null | undefined): boolean {
  if (!page || page.isFolder || page.id === "__quicknote_draft__") return false;
  return Boolean(page.localFilePath || page.localUnsaved);
}
