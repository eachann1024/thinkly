import { usePages } from "@/stores/usePages";
import { warmPinyinMatcher } from "@/lib/pinyin-search";

export function scheduleBackgroundWarmup(rootElement: HTMLElement) {
  if (rootElement.dataset.entry !== "quicknote") {
    warmPinyinMatcher();
    const preloadAll = async () => {
      try {
        await usePages.getState().loadAllLocalFolderPages();
      } catch (err) {
        console.error("预加载本地文件夹页面失败", err);
      }
      try {
        const { triggerAutoWebdavBackup } = await import("@/lib/webdavSync");
        void triggerAutoWebdavBackup();
      } catch (err) {
        console.error("加载 webdavSync 模块失败", err);
      }
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(preloadAll, { timeout: 4000 });
    } else {
      setTimeout(preloadAll, 1500);
    }
  }
}
