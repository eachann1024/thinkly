import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { SidebarFooter } from "../SidebarFooter";
import { SidebarRailIcon } from "../SidebarRailIcon";
import { readSearchSelection } from "../readSearchSelection";
import { useSearchSession } from "../useSearchSession";
import type { useSidebarHover } from "./useSidebarHover";

export function SidebarModeRail({
  context,
}: {
  context: ReturnType<typeof useSidebarHover>;
}) {
  const searchSelectionRef = useRef("");
  const {
    sidebarModeRailRef,
    settingsOpen,
    sidebarCollapsed,
    currentView,
    openSidebarView,
    hoverSidebarView,
    keepSidebarOpen,
    leaveSidebar,
    sidebarViewShortcut,
    onSettingsOpenChange,
    inHistoryMode,
    exitHistoryView,
  } = context;
  const views = [
    {
      view: "pages" as const,
      label: "本地",
      icon: "folder" as const,
      digit: 1 as const,
    },
    {
      view: "outline" as const,
      label: "大纲",
      icon: "outline" as const,
      digit: 2 as const,
    },
    {
      view: "search" as const,
      label: "搜索",
      icon: "search" as const,
      digit: 3 as const,
    },
  ];
  return (
    <div
      className="sidebar-rail-shell"
      onPointerEnter={keepSidebarOpen}
      onPointerLeave={leaveSidebar}
    >
      <TooltipProvider delayDuration={600}>
        <nav
          ref={sidebarModeRailRef}
          className="sidebar-mode-rail"
          aria-label="侧栏视图"
        >
          {views.map(({ view, label, icon, digit }) => (
            <Tooltip key={view}>
              <TooltipTrigger asChild>
                <Button contentStyle="preserve" variant="ghost" size="sm"
                  type="button"
                  className="h-auto whitespace-normal border-0 px-0 py-0 sidebar-mode-rail-button rounded-lg"
                  aria-label={label}
                  aria-pressed={!settingsOpen && currentView === view}
                  aria-expanded={
                    !settingsOpen && !sidebarCollapsed && currentView === view
                  }
                  aria-controls="workspace-sidebar-content"
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") hoverSidebarView(view);
                  }}
                  onPointerDownCapture={(event) => {
                    if (view === "search" && event.button === 0)
                      searchSelectionRef.current = readSearchSelection();
                  }}
                  onClick={(event) => {
                    if (view === "search") {
                      // 鼠标点击先保存正文选区，按钮拿到焦点后再消费。
                      const query = event.detail
                        ? searchSelectionRef.current
                        : readSearchSelection();
                      searchSelectionRef.current = "";
                      if (query) useSearchSession.getState().setQuery(query);
                    }
                    openSidebarView(view, event.detail === 0);
                  }}
                >
                  <SidebarRailIcon
                    name={icon}
                    selected={!settingsOpen && currentView === view}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {label} · {sidebarViewShortcut(digit)}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
      <SidebarFooter
        isSettingsOpen={settingsOpen}
        onOpenSettings={() => {
          if (inHistoryMode) exitHistoryView();
          context.dismissAfterNavigation();
          onSettingsOpenChange(true);
        }}
      />
    </div>
  );
}
