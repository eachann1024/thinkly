import { getGooseDesktop } from "./runtime";

/** 其它 Electron 窗口的当前标题。非桌面端或查询失败时视为没有占用。 */
export async function readOtherWindowTitles(): Promise<string[]> {
  const read = getGooseDesktop()?.otherWindowTitles;
  if (!read) return [];
  try {
    const titles = await read();
    if (!Array.isArray(titles)) return [];
    return titles.filter((title): title is string => typeof title === "string" && title.trim().length > 0);
  } catch {
    return [];
  }
}
