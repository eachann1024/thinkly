import { useEffect } from "react";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useTabs, type TabItem } from "@/stores/useTabs";

/** 保留旧窗口尚未结束的传入操作，避免源窗口释放后丢失打开状态。 */
export function useIncomingWorkspaceTabs(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    return getGooseDesktop()?.onAcceptTab?.(({ tab }) => {
      useTabs.getState().adoptTab({
        id: tab.id,
        pageId: tab.pageId,
        type: tab.type as TabItem["type"],
        workspaceId: tab.workspaceId,
      });
    });
  }, [enabled]);
}
