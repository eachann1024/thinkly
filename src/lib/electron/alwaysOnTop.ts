/**
 * Electron 主窗口「始终置顶」。非桌面构建调用直接返回 false / 忽略。
 */
import { getGooseDesktop } from "./runtime";

export async function getDesktopAlwaysOnTop(): Promise<boolean> {
  try {
    return Boolean(await getGooseDesktop()?.getAlwaysOnTop());
  } catch (error) {
    console.warn("[electron] 读取窗口置顶失败", error);
    throw error;
  }
}

export async function setDesktopAlwaysOnTop(on: boolean): Promise<boolean> {
  try {
    return Boolean(await getGooseDesktop()?.setAlwaysOnTop(on));
  } catch (error) {
    console.warn("[electron] 设置窗口置顶失败", error);
    throw error;
  }
}
