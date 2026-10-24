import { useLayoutEffect } from "react";
import {
  computeWorkspaceViewportCollapse,
  isEffectiveSidebarCollapsed,
} from "@/lib/workspaceViewport";
import { useSidebarView } from "@/stores/useSidebarView";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";

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
