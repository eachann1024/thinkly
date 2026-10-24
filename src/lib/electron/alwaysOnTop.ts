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
