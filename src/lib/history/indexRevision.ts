const revisions = new Map<string, number>();

export const getHistoryIndexRevision = (pageId: string): number => revisions.get(pageId) ?? 0;

export function bumpHistoryIndexRevision(pageId: string): void {
  revisions.set(pageId, getHistoryIndexRevision(pageId) + 1);
}
