import { getGooseDesktop } from "./runtime";

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
