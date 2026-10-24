export type OpenedPagePlace = {
  tabId: string;
  pageId: string;
  leafPageIds: string[];
};

export function replacedDraftStillReferenced(
  pageId: string,
  places: OpenedPagePlace[],
  currentTabId: string,
): boolean {
  return places.some((place) => {
    if (place.leafPageIds.includes(pageId)) return true;
    return place.tabId !== currentTabId && place.pageId === pageId;
  });
}
