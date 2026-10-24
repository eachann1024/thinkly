/** Independent files have document services, but no mounted notebook directory. */
export const STANDALONE_FILES_WORKSPACE = "standalone-files";

export function isStandaloneFile(page: { workspaceId?: string } | null | undefined): boolean {
  return page?.workspaceId === STANDALONE_FILES_WORKSPACE;
}

/** Transfer payloads currently carry IDs only, not session-only document content. */
export async function canTransferDocumentTab(tab: { id: string; pageId: string; workspaceId?: string }): Promise<boolean> {
  if (isStandaloneFile(tab)) return false;
  const [{ usePages }, { collectTabPageIds }] = await Promise.all([
    import("@/stores/usePages"),
    import("@/stores/tabs/helpers"),
  ]);
  const pages = usePages.getState().pages;
  return collectTabPageIds(tab).every((id) => !isStandaloneFile(pages[id]));
}
