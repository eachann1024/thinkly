import type { Page } from "@/types";
import { changedPageIds } from "@/stores/pages/pageChanges";
import { isWorkspaceSkillFilePath } from "@/lib/notebook-ai/localSkillParsing";

export function createAIContextPagesRevision(notebookId: string | null) {
  let previous: Record<string, Page> | null = null;
  let revision = 0;
  const relevant = (page: Page | undefined) => Boolean(page &&
    page.workspaceId === notebookId && !page.trashedAt && !page.isFolder &&
    page.localFilePath && isWorkspaceSkillFilePath(page.localFilePath));
  return (state: { pages: Record<string, Page> }) => {
    if (!notebookId || previous === state.pages) return revision;
    for (const id of changedPageIds(previous, state.pages)) {
      const before = previous?.[id], after = state.pages[id];
      if (relevant(before) || relevant(after)) { revision++; break; }
    }
    previous = state.pages;
    return revision;
  };
}
