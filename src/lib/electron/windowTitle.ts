import { common } from "@/i18n/common";
import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/electron/windowTitle.ts#localMessages:1">`
zh-Hans:
  start: "开始"
en:
  start: "Start"
ja:
  start: "開始"
`;
const uiText = createTranslator(localMessages);
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getGooseDesktop } from "./runtime";

export const getDefaultWindowTitle = () => common("productName");
export const getWelcomeWindowTitle = () => uiText("start");
export const TITLE_SYNC_DEBOUNCE_MS = 300;

export function resolveWindowTitle(
  page: Page | null | undefined,
  options?: { isWelcomeTab?: boolean },
): string {
  if (options?.isWelcomeTab) return getWelcomeWindowTitle();
  if (!page) return getDefaultWindowTitle();
  const title = getPageTitle(page).trim();
  return title || getDefaultWindowTitle();
}

export async function syncDesktopWindowTitle(title: string): Promise<void> {

  try {
    document.title = title;
    const api = getGooseDesktop();
    await api?.setTitle(title);
  } catch (error) {
    console.warn("[electron] 同步窗口标题失败", error);
  }
}
