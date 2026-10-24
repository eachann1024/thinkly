export function navigateNotebookAiReference(
  pageId: string | undefined | null,
  openPage: (pageId: string) => void,
): boolean {
  const id = typeof pageId === "string" ? pageId.trim() : "";
  if (!id) return false;
  openPage(id);
  return true;
}
