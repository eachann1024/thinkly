export type OpenedPagePlace = {
  tabId: string;
  pageId: string;
  leafPageIds: string[];
};

/**
 * 当前格换页之后，旧页是否还开在其它格或其它标签。
 * 当前标签的 pageId 要等焦点同步才更新，不能把它算成仍被引用。
 */
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
