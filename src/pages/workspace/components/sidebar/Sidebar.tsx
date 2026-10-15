import { SidebarModeRail } from "./sidebar-shell/SidebarModeRail";
import { useSidebarHover } from "./sidebar-shell/useSidebarHover";
import { renderSidebarViews } from "./sidebar-shell/renderSidebarViews";
import { SettingsDialog } from "./SettingsDialog";
import { SidebarResizeEdge } from "./SidebarResizeEdge";
import "./sidebar-layout.css";
import "./sidebar-hover.css";
import { type SidebarProps } from "./sidebar-shell/shared";
import { useSidebarLayout } from "./sidebar-shell/useSidebarLayout";
import { useSidebarNavigation } from "./sidebar-shell/useSidebarNavigation";
import { useSidebarLifecycle } from "./sidebar-shell/useSidebarLifecycle";
import { useState } from "react";

export function Sidebar(props: SidebarProps) {
  const [notebookFooterHost, setNotebookFooterHost] = useState<HTMLDivElement | null>(null);
  const layout = useSidebarLayout(props);
  const navigation = useSidebarNavigation(layout);
  const sidebarLifecycleContext = useSidebarLifecycle(navigation);
  const context = useSidebarHover(sidebarLifecycleContext);
  const {
    className,
    disableResize,
    settingsOpen,
    onSettingsOpenChange,
    settingsTab,
    onSettingsTabChange,
    settingsMainHost,
    sidebarCollapsed,
    sidebarOverlay,
    sidebarRef,
    width,
    minWidth,
    maxWidth,
    isResizing,
    handleResizePointerDown,
    handleResizeKeyDown,
    settingsSidebarHost,
  } = context;
  // 临时面板收起后仍留在覆盖层，避免退出文档流时宽度动画挤动正文。
  const sidebarFloating = context.forceCollapseLeft && (sidebarOverlay || sidebarCollapsed);

  return (
    <>
      <SidebarModeRail
        context={context}
        notebookFooterHost={settingsOpen || sidebarCollapsed ? null : notebookFooterHost}
      />
      <div
        ref={sidebarRef}
        id="workspace-sidebar-content"
        data-sidebar-view={context.currentView}
        data-sidebar-floating={sidebarFloating || undefined}
        onPointerEnter={context.keepSidebarOpen}
        onPointerLeave={context.leaveSidebar}
        className={cn(
          "pb-0 h-full flex flex-col relative group/sidebar",
          sidebarCollapsed && "pointer-events-none",
          className,
        )}
        data-sidebar-resizing={isResizing || undefined}
        style={{
          width: sidebarCollapsed ? 0 : "var(--sidebar-configured-width)",
          minWidth: 0,
          opacity: sidebarCollapsed ? 0 : 1,
          transform: sidebarCollapsed ? "translateX(-8px)" : "translateX(0)",
          overflow: sidebarCollapsed ? "hidden" : "visible",
        }}
        aria-hidden={sidebarCollapsed}
        inert={sidebarCollapsed}
      >
        {!disableResize && !sidebarCollapsed && !sidebarOverlay && (
          <SidebarResizeEdge
            width={width}
            minWidth={minWidth}
            maxWidth={maxWidth}
            isResizing={isResizing}
            onPointerDown={handleResizePointerDown}
            onKeyDown={handleResizeKeyDown}
          />
        )}

        <div
          className="sidebar-size-container flex h-full min-h-0 flex-col"
          style={{
            width: sidebarFloating ? "100%" : "var(--sidebar-configured-width)",
            minWidth: sidebarFloating ? 0 : "var(--sidebar-configured-width)",
          }}
        >
          {renderSidebarViews(context, setNotebookFooterHost)}
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={onSettingsOpenChange}
            activeTab={settingsTab}
            onTabChange={onSettingsTabChange}
            sidebarContainer={settingsSidebarHost}
            mainContainer={settingsMainHost}
          />
        </div>
      </div>
    </>
  );
}
