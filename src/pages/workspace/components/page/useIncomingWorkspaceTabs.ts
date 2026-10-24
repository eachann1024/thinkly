import { useEffect } from "react";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useTabs, type TabItem } from "@/stores/useTabs";

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
