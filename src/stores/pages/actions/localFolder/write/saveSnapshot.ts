import type { Page } from "@/types";
import type { JSONContent } from "@/types";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";

const SAVED_PAGE_FIELDS = [
  "localFilePath",
  "localFrontmatter",
  "fontFamily",
  "pageLayout",
  "isLocked",
  "isPinned",
  "isFavorite",
] as const;

export function localSaveSnapshotIsCurrent(
  savedPage: Page,
  currentPage: Page | undefined,
  savedContent: JSONContent,
  savedPath = savedPage.localFilePath,
): boolean {
  if (
    !currentPage ||
    currentPage.localFilePath !== savedPath ||
    getContentSignature(currentPage.content) !== getContentSignature(savedContent)
  ) {
    return false;
  }
  return SAVED_PAGE_FIELDS.filter((field) => field !== "localFilePath").every((field) =>
    getContentSignature(currentPage[field]) === getContentSignature(savedPage[field]),
  );
}

export function shouldClearDirtyAfterLocalSave(
  snapshotIsCurrent: boolean,
  hasQueuedSave: boolean,
): boolean {
  return snapshotIsCurrent && !hasQueuedSave;
}

export function resolveLocalSaveCompletion(
  savedPage: Page,
  currentPage: Page | undefined,
  savedContent: JSONContent,
  savedPath: string,
  createOnly: boolean,
  hasQueuedSave: boolean,
): {
  snapshotIsCurrent: boolean;
  clearDraftFlags: boolean;
  clearDirty: boolean;
} {
  const snapshotIsCurrent = localSaveSnapshotIsCurrent(
    savedPage, currentPage, savedContent, savedPath,
  );
  const clearDraftFlags = Boolean(
    currentPage &&
    (createOnly || savedPage.editorDraft) &&
    currentPage.workspaceId === savedPage.workspaceId &&
    currentPage.localFilePath === savedPath,
  );
  return {
    snapshotIsCurrent,
    clearDraftFlags,
    clearDirty: shouldClearDirtyAfterLocalSave(snapshotIsCurrent, hasQueuedSave),
  };
}

export function localSaveFailureNeedsNotice(
  dirty: boolean,
  hasQueuedSave: boolean,
  flushFailed: boolean,
): boolean {
  return dirty || hasQueuedSave || flushFailed;
}
