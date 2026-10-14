export interface HistoryLocation { relativePath: string; previousPaths: string[] }
export interface HistoryLocations { version: 1; pages: Record<string, HistoryLocation> }

export function historyHash(pageId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < pageId.length; i++) h = Math.imul(h ^ pageId.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export function validHistoryRelativePath(value: unknown): value is string {
  return typeof value === "string" && Boolean(value) && !/[\\\0\r\n]/.test(value)
    && value.split("/").every((part) => part && part !== "." && part !== "..");
}

export function originalHistoryPath(pageId: string, workspaceId?: string): string | null {
  const prefix = workspaceId ? `local-${workspaceId}-` : pageId.match(/^local-[a-zA-Z0-9]+-/)?.[0];
  if (!prefix || !pageId.startsWith(prefix)) return null;
  try {
    const path = decodeURIComponent(pageId.slice(prefix.length).replace(/--\d+$/, ""));
    return validHistoryRelativePath(path) ? path : null;
  } catch { return null; }
}

export function parseHistoryLocations(text: string | null): HistoryLocations {
  if (!text) return { version: 1, pages: Object.create(null) };
  const raw = JSON.parse(text);
  if (raw.version !== 1 || !raw.pages || typeof raw.pages !== "object" || Array.isArray(raw.pages)) throw new Error("历史路径映射无效，原历史文件已保留");
  const pages: Record<string, HistoryLocation> = Object.create(null);
  for (const [id, value] of Object.entries(raw.pages)) {
    const entry = value as HistoryLocation;
    if (!validHistoryRelativePath(entry.relativePath) || !Array.isArray(entry.previousPaths) || !entry.previousPaths.every(validHistoryRelativePath)) throw new Error("历史路径映射包含无效路径，原历史文件已保留");
    pages[id] = { relativePath: entry.relativePath, previousPaths: entry.previousPaths };
  }
  return { version: 1, pages };
}
