type HostPageIdentity =
  | {
      id?: string | null;
      localFilePath?: string | null;
      localUnsaved?: boolean | null;
    }
  | null
  | undefined;

export const QUICKNOTE_DRAFT_PAGE_ID = "__quicknote_draft__";

export function isQuickNoteEditorPage(page: HostPageIdentity): boolean {
  return page?.id === QUICKNOTE_DRAFT_PAGE_ID;
}

export function shouldUseRawEditorContent(page: HostPageIdentity): boolean {
  return (
    Boolean(page?.localFilePath) ||
    Boolean(page?.localUnsaved) ||
    isQuickNoteEditorPage(page)
  );
}
