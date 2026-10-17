import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-shell/SidebarModeRail.tsx#localMessages:1">`
zh-Hans:
  local_8e7e: "本地"
  outline_9338: "大纲"
  search_e5f7: "搜索"
  sidebarViews_2d93: "侧栏视图"
en:
  local_8e7e: "Local"
  outline_9338: "Outline"
  search_e5f7: "Search"
  sidebarViews_2d93: "Sidebar views"
`;
const uiText = createTranslator(localMessages);
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
  const searchSheetOpen = useSearchSession((s) => s.view.phase === "sheet");
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
      label: uiText("local_8e7e"),
      icon: "folder" as const,
      digit: 1 as const,
    },
    {
      view: "outline" as const,
      label: uiText("outline_9338"),
      icon: "outline" as const,
      digit: 2 as const,
    },
    {
      view: "search" as const,
      label: uiText("search_e5f7"),
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
          aria-label={uiText("sidebarViews_2d93")}
        >
          {views.map(({ view, label, icon, digit }) => (
            <Tooltip key={view}>
              <TooltipTrigger asChild>
                <Button contentStyle="preserve" variant="ghost" size="sm"
                  type="button"
                  className="h-auto whitespace-normal border-0 px-0 py-0 sidebar-mode-rail-button rounded-lg"
                  aria-label={label}
                  data-sidebar-view={view}
                  aria-pressed={view === "search" ? searchSheetOpen : !settingsOpen && currentView === view}
                  aria-expanded={
                    view === "search" ? undefined : !settingsOpen && !sidebarCollapsed && currentView === view
                  }
                  aria-controls={view === "search" ? undefined : "workspace-sidebar-content"}
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
                    selected={view === "search" ? searchSheetOpen : !settingsOpen && currentView === view}
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
