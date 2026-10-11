import { Pin, X } from "@/components/ui/icons";
import type { useSidebarHover } from "./useSidebarHover";
export function SidebarPanelControls({
  context,
}: {
  context: ReturnType<typeof useSidebarHover>;
}) {
  const { pinned, toggleSidebarPin, closeSidebarOverlay } = context;
  return (
    <div className="sidebar-panel-controls">
      <button
        type="button"
        aria-label={pinned ? "取消固定导航面板" : "固定导航面板"}
        title={pinned ? "取消固定导航面板" : "固定导航面板"}
        aria-pressed={pinned}
        onClick={toggleSidebarPin}
      >
        <Pin className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="关闭导航面板"
        title="关闭导航面板"
        onClick={closeSidebarOverlay}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
