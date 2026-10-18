/**
 * 浮动搜索窗（类似 Notion 快速搜索）的纯逻辑：主进程与验收脚本共用，不依赖 Electron。
 *
 * - resolveSearchHotkeySurface：全局搜索热键该打开应用内搜索面板，还是切换浮动搜索窗；
 * - centeredSearchWindowBounds：在光标所在屏的工作区内水平居中、偏上三分之一放置；
 * - parseOpenSearchResultPayload：校验浮动窗发往主进程的「打开结果」载荷。
 */

export const SEARCH_WINDOW_WIDTH = 680;
export const SEARCH_WINDOW_HEIGHT = 460;
export const OPEN_SEARCH_RESULT_CHANNEL = "desktop:open-search-result";
export const SEARCH_WINDOW_SHOWN_CHANNEL = "desktop:search-window-shown";

export type SearchHotkeySource = "workspace" | "quicknote" | "search";

export type SearchHotkeySurface = "in-app" | "show-floating" | "hide-floating";

export type SearchHotkeyState = {
  /** true：来自某扇已聚焦窗口的 before-input-event；false：来自系统 globalShortcut。 */
  fromWindowInput: boolean;
  sourceKind: SearchHotkeySource;
  /** 当前是否有可见、未最小化且已聚焦的 workspace 窗。 */
  workspaceFocused: boolean;
  searchVisible: boolean;
};

export function resolveSearchHotkeySurface(
  state: SearchHotkeyState,
): SearchHotkeySurface {
  if (state.searchVisible || state.sourceKind === "search") return "hide-floating";
  if (state.fromWindowInput && state.sourceKind === "workspace") return "in-app";
  if (!state.fromWindowInput && state.workspaceFocused) return "in-app";
  return "show-floating";
}

export type Rect = { x: number; y: number; width: number; height: number };

/** 窗口比工作区大时先收缩到工作区；顶部留白取剩余高度的三分之一。 */
export function centeredSearchWindowBounds(
  workArea: Rect,
  size: { width: number; height: number } = {
    width: SEARCH_WINDOW_WIDTH,
    height: SEARCH_WINDOW_HEIGHT,
  },
): Rect {
  const width = Math.max(1, Math.min(Math.round(size.width), Math.floor(workArea.width)));
  const height = Math.max(1, Math.min(Math.round(size.height), Math.floor(workArea.height)));
  const freeX = Math.max(0, workArea.width - width);
  const freeY = Math.max(0, workArea.height - height);
  return {
    x: Math.round(workArea.x + freeX / 2),
    y: Math.round(workArea.y + freeY / 3),
    width,
    height,
  };
}

export type OpenSearchResultPayload = {
  pageId: string;
  query: string;
  localFilePath?: string;
};

const MAX_ID_LENGTH = 4096;
const MAX_QUERY_LENGTH = 1000;

export function parseOpenSearchResultPayload(
  value: unknown,
): OpenSearchResultPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const pageId = typeof record.pageId === "string" ? record.pageId.trim() : "";
  if (!pageId || pageId.length > MAX_ID_LENGTH) return null;
  if (record.query !== undefined && typeof record.query !== "string") return null;
  const query = typeof record.query === "string" ? record.query.slice(0, MAX_QUERY_LENGTH) : "";
  const payload: OpenSearchResultPayload = { pageId, query };
  const filePath = record.localFilePath;
  if (typeof filePath === "string" && filePath && filePath.length <= MAX_ID_LENGTH) {
    payload.localFilePath = filePath;
  }
  return payload;
}

type ResolvablePage = { id: string; localFilePath?: string; isFolder?: boolean };

/**
 * 主窗按 id 找结果页；浮动窗只读扫描时新文件的 id 可能尚未写入映射，
 * 与主窗分配的不同，此时按本地文件路径回退匹配。
 */
export function resolveSearchResultPageId(
  pages: Record<string, ResolvablePage | undefined>,
  payload: OpenSearchResultPayload,
): string | null {
  if (pages[payload.pageId]) return payload.pageId;
  if (!payload.localFilePath) return null;
  for (const page of Object.values(pages)) {
    if (page && !page.isFolder && page.localFilePath === payload.localFilePath) return page.id;
  }
  return null;
}
