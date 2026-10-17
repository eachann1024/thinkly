import { getLanguageSnapshot } from "./store";

/** 菜单栏、关于面板和窗口标题。数据目录不走这个名字。 */
export function localizedAppName(): string {
  try {
    return getLanguageSnapshot().effectiveLocale === "zh-Hans" ? "思绪 · Thinkly" : "Thinkly";
  } catch {
    return "Thinkly";
  }
}
