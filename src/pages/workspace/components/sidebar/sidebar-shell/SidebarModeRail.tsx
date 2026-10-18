import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-shell/SidebarModeRail.tsx#localMessages:1">`
zh-Hans:
  local_8e7e: "本地"
  outline_9338: "大纲"
  search_e5f7: "搜索"
  sidebarViews_2d93: "侧栏视图"
  openAi: "打开 AI 面板"
  closeAi: "关闭 AI 面板"
en:
  local_8e7e: "Local"
  outline_9338: "Outline"
  search_e5f7: "Search"
  sidebarViews_2d93: "Sidebar views"
  openAi: "Open AI panel"
  closeAi: "Close AI panel"
ja:
  local_8e7e: "ローカル"
  outline_9338: "アウトライン"
  search_e5f7: "検索"
  sidebarViews_2d93: "サイドバーの表示"
  openAi: "AI パネルを開く"
  closeAi: "AI パネルを閉じる"
`;
const uiText = createTranslator(localMessages);
import { useRef, type ComponentProps } from "react";
import { useAiPanelVisibility } from "@/stores/useAiPanelVisibility";
import {
  normalizeSidebarRailOrder,
  type SidebarRailItem,
} from "@/stores/settings/slices/sidebarRailSlice";
import { useFolderToolbarActions } from "../../page/useFolderToolbarActions";
import { SidebarFooter } from "../SidebarFooter";
import { readSearchSelection } from "../readSearchSelection";
import { useSearchSession } from "../useSearchSession";
import { SidebarRailButton } from "./SidebarRailButton";
import { SidebarRailSortableList } from "./SidebarRailSortable";
import type { useSidebarHover } from "./useSidebarHover";

type RailButtonConfig = Omit<ComponentProps<typeof SidebarRailButton>, "id">;

export function SidebarModeRail({
  context,
}: {
  context: ReturnType<typeof useSidebarHover>;
}) {
  useLocale();
  const searchSelectionRef = useRef("");
  const searchSheetOpen = useSearchSession((s) => s.view.phase === "sheet");
  const aiEnabled = useSettings((s) => s.ai.enabled);
  const folderActionsAvailable = useFolderToolbarActions();
  // 只读布局层算出的真实可见状态，不在这里另起一份 AI 面板状态。
  const aiPanelVisible = useAiPanelVisibility((s) => s.visible);
  // 侧屏模式下 AI 入口在标题栏，图标栏只在全屏模式显示。
  const aiFullscreen = useAiPanelVisibility((s) => s.fullscreen);
  const activePageId = usePages((s) => s.activePageId);
  const pageTrashed = usePages((s) =>
    Boolean(s.activePageId && s.pages[s.activePageId]?.trashedAt),
  );
  const storedOrder = useSettings((s) => s.sidebarRailOrder);
  const setRailOrder = useSettings((s) => s.setSidebarRailOrder);
  const showAi = aiEnabled && aiFullscreen && folderActionsAvailable && Boolean(activePageId) && !pageTrashed;
  // Mod+1~4 按完整顺序编号，AI 入口不在图标栏时也保留它的序号。
  const order = normalizeSidebarRailOrder(storedOrder);
  const toggleAiLabel = aiPanelVisible ? uiText("closeAi") : uiText("openAi");
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
  const viewButton = (
    view: "pages" | "outline" | "search",
    label: string,
    icon: "folder" | "outline" | "search",
  ): RailButtonConfig => {
    const selected = view === "search" ? searchSheetOpen : !settingsOpen && currentView === view;
    return {
      label,
      icon,
      selected,
      tooltip: `${label} · ${sidebarViewShortcut(order.indexOf(view) + 1)}`,
      "data-sidebar-view": view,
      "aria-expanded":
        view === "search" ? undefined : !settingsOpen && !sidebarCollapsed && currentView === view,
      "aria-controls": view === "search" ? undefined : "workspace-sidebar-content",
      onPointerEnter: (event) => {
        if (event.pointerType === "mouse") hoverSidebarView(view);
      },
      onPointerDownCapture: (event) => {
        if (view === "search" && event.button === 0)
          searchSelectionRef.current = readSearchSelection();
      },
      onClick: (event) => {
        if (view === "search") {
          // 鼠标点击先保存正文选区，按钮拿到焦点后再消费。
          const query = event.detail
            ? searchSelectionRef.current
            : readSearchSelection();
          searchSelectionRef.current = "";
          if (query && useSearchSession.getState().view.phase === "closed") useSearchSession.getState().setQuery(query);
        }
        openSidebarView(view, event.detail === 0);
      },
    } as RailButtonConfig;
  };
  const buttons: Record<SidebarRailItem, RailButtonConfig> = {
    pages: viewButton("pages", uiText("local_8e7e"), "folder"),
    ai: {
      label: toggleAiLabel,
      icon: "ai",
      // 与其他入口一致：设置页打开时只高亮设置。
      selected: !settingsOpen && aiPanelVisible,
      tooltip: `${toggleAiLabel} · ${sidebarViewShortcut(order.indexOf("ai") + 1)}`,
      onClick: () => {
        window.dispatchEvent(new CustomEvent("goose-note:toggle-ai-panel"));
      },
    },
    outline: viewButton("outline", uiText("outline_9338"), "outline"),
    search: viewButton("search", uiText("search_e5f7"), "search"),
  };
  const visible = order.filter((item) => item !== "ai" || showAi);
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
          <SidebarRailSortableList order={order} visible={visible} onOrderChange={setRailOrder}>
            {visible.map((item) => (
              <SidebarRailButton key={item} id={item} {...buttons[item]} />
            ))}
          </SidebarRailSortableList>
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
