import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";

const signatures = new WeakMap<Page, string>();

export function sidebarPageSignature(page: Page): string {
  const cached = signatures.get(page);
  if (cached !== undefined) return cached;
  const signature = JSON.stringify([
    page.workspaceId, page.parentId, page.icon, !!page.isFolder,
    page.trashedAt, page.order, page.createdAt, page.localFilePath,
    !!page.localUnsaved, !!page.editorDraft, page.localPendingCreate,
    page.localReadState, !!page.isPinned, !!page.isFavorite, getPageTitle(page),
  ]);
  signatures.set(page, signature);
  return signature;
}
