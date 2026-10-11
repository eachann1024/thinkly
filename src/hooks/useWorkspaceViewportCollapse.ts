import { useLayoutEffect } from "react";
import {
  computeWorkspaceViewportCollapse,
  isEffectiveSidebarCollapsed,
} from "@/lib/workspaceViewport";
import { useSidebarView } from "@/stores/useSidebarView";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";

/**
 * 按窗口宽度强制收起左右侧栏，不改用户持久化偏好。
 * 拉宽后恢复原偏好；显式固定的面板在覆盖与并排布局间转换。
 */
export function useWorkspaceViewportCollapse(): void {
  const setForceCollapse = useWorkspaceViewport((s) => s.setForceCollapse);

  useLayoutEffect(() => {
    const apply = () => {
      const next = computeWorkspaceViewportCollapse(window.innerWidth);
      setForceCollapse(next.forceCollapseLeft, next.forceCollapseRight);
    };

    apply();
    window.addEventListener("resize", apply);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      visualViewport?.removeEventListener("resize", apply);
    };
  }, [setForceCollapse]);
}

export function useEffectiveSidebarCollapsed(): boolean {
  const userCollapsed = useSidebarView((s) => s.sidebarCollapsed);
  const forceCollapseLeft = useWorkspaceViewport((s) => s.forceCollapseLeft);
  const leftExpandOverride = useWorkspaceViewport((s) => s.leftExpandOverride);
  return isEffectiveSidebarCollapsed(
    userCollapsed,
    forceCollapseLeft,
    leftExpandOverride,
  );
}
