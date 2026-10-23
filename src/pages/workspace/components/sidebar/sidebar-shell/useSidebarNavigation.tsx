import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { useSidebarView } from "@/stores/useSidebarView";
import { useSidebarEffects } from "../hooks/useSidebarEffects";
import { shouldDismissSidebarOverlay } from "../sidebarOverlayEscape";
import { useSearchSession } from "../useSearchSession";
import { readSearchSelection } from "../readSearchSelection";
import { useHistoryView } from "@/stores/useHistoryView";
import { closeNotebookAiIfFullscreen } from "../../notebook-ai/useNotebookAiPanel";
import { viewClickLeavesFullscreenAi } from "./railClick";
import { activateWorkspace } from "@/lib/settings-navigation";
import { type SidebarView } from "./shared";
import type { useSidebarLayout } from "./useSidebarLayout";

export function useSidebarNavigation(
  input: ReturnType<typeof useSidebarLayout>,
) {
  const {
    scrollContainerRef,
    settingsOpen,
    onSettingsSidebarExpandedChange,
    onSettingsOpenChange,
    onSettingsTabChange,
    activePageId,
    activeNotebookId,
    workspaceSidebarCollapsed,
    setLeftExpandOverride,
    sidebarOverlay,
    sidebarRef,
    sidebarModeRailRef,
    currentView,
    setCurrentView,
  } = input;

  const [settingsSidebarHost, setSettingsSidebarHost] =
    useState<HTMLDivElement | null>(null);

  const searchSessionOpen = useSearchSession((state) => state.view.phase !== "closed");

  // 搜索改为主区底部面板，侧栏不再保留搜索视图。
  useEffect(() => {
    if (currentView === "search") setCurrentView("pages");
  }, [currentView, setCurrentView]);

  useLayoutEffect(() => {
    const rail = sidebarModeRailRef.current;
    if (!rail?.contains(document.activeElement)) return;
    // 焦点已在窄栏内时跟随当前视图，保留编辑器或搜索框里的焦点。
    rail
      .querySelector<HTMLButtonElement>('[data-sidebar-view][aria-pressed="true"]')
      ?.focus({ preventScroll: true });
  }, [currentView, settingsOpen, sidebarModeRailRef]);

  const openSearchSession = useSearchSession((s) => s.openSearch);

  const searchShortcut = useSettings((state) =>
    state.appShortcuts.openSearch
      ? formatShortcut(state.appShortcuts.openSearch)
      : "",
  );

  const sidebarViewShortcut = (digit: number) =>
    formatShortcut(`Mod+${digit}`);

  // 历史列表替换内容面板；导航轨道继续提供返回笔记和设置的入口。
  const historyActivePageId = useHistoryView((s) => s.active);

  const exitHistoryView = useHistoryView((s) => s.exit);

  const inHistoryMode =
    !!historyActivePageId && historyActivePageId === activePageId;

  const restoreSidebarFocusRef = useRef<SidebarView | null>(null);

  const [scrollAreaNode, setScrollAreaNode] = useState<HTMLDivElement | null>(
    null,
  );

  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);

  const closeSidebarOverlay = useCallback(() => {
    const active = document.activeElement;
    const restoreFocus =
      !!active &&
      (!!sidebarRef.current?.contains(active) ||
        active === sidebarRef.current?.previousElementSibling);
    restoreSidebarFocusRef.current = restoreFocus ? currentView : null;
    if (settingsOpen) onSettingsSidebarExpandedChange(false);
    else {
      setLeftExpandOverride(false);
      if (!useWorkspaceViewport.getState().forceCollapseLeft) useSidebarView.getState().setSidebarCollapsed(true);
    }
  }, [settingsOpen, onSettingsSidebarExpandedChange, setLeftExpandOverride, sidebarRef, currentView]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{
        resetQuery?: boolean;
        selectionQuery?: string;
      }>).detail;
      if (detail?.resetQuery) useSearchSession.getState().setQuery("");
      else {
        const query = detail?.selectionQuery ?? readSearchSelection();
        if (query) useSearchSession.getState().setQuery(query);
      }
      activateWorkspace();
      if (inHistoryMode) exitHistoryView();
      closeNotebookAiIfFullscreen();
      openSearchSession(
        activeNotebookId,
        activePageId,
        scrollContainerRef?.current?.scrollTop ?? 0,
      );
    };
    const onSwitchSidebarView = (event: Event) => {
      const view = (event as CustomEvent<{ view?: SidebarView }>).detail?.view;
      if (view === "search") onOpen(event);
      else if (view === "pages" || view === "outline") {
        activateWorkspace();
        if (viewClickLeavesFullscreenAi(view)) closeNotebookAiIfFullscreen();
        setCurrentView(view);
        if (workspaceSidebarCollapsed) useSidebarView.getState().openSidebarPanel("engaged");
        if (inHistoryMode) exitHistoryView();
      }
    };
    const onWorkspaceActivate = () => onSettingsOpenChange(false);
    const onCloseSettings = () => onSettingsOpenChange(false);
    window.addEventListener("goose-note:open-search", onOpen);
    window.addEventListener(
      "goose-note:switch-sidebar-view",
      onSwitchSidebarView,
    );
    window.addEventListener(
      "goose-note:workspace-activate",
      onWorkspaceActivate,
    );
    window.addEventListener("goose-note:close-settings", onCloseSettings);
    return () => {
      window.removeEventListener("goose-note:open-search", onOpen);
      window.removeEventListener(
        "goose-note:switch-sidebar-view",
        onSwitchSidebarView,
      );
      window.removeEventListener(
        "goose-note:workspace-activate",
        onWorkspaceActivate,
      );
      window.removeEventListener("goose-note:close-settings", onCloseSettings);
    };
  }, [
    activeNotebookId,
    activePageId,
    inHistoryMode,
    scrollContainerRef,
    openSearchSession,
    setLeftExpandOverride,
    exitHistoryView,
    onSettingsOpenChange,
    workspaceSidebarCollapsed,
    setCurrentView,
  ]);

  useEffect(() => {
    if (!sidebarOverlay) return;
    const onEscape = (event: KeyboardEvent) => {
      if (settingsOpen || useSearchSession.getState().view.phase === "sheet") return;
      if (!shouldDismissSidebarOverlay(event, document)) return;
      event.preventDefault();
      event.stopPropagation();
      closeSidebarOverlay();
    };
    // 菜单与输入框仍先处理；仅提示气泡不应吞掉关闭面板的 Esc。
    document.addEventListener("keydown", onEscape, true);
    return () => document.removeEventListener("keydown", onEscape, true);
  }, [sidebarOverlay, settingsOpen, closeSidebarOverlay]);

  useSidebarEffects({
    activePageId,
    activeNotebookId,
    currentView,
    onSettingsTabChange,
    onOpenSettings: (tab) => {
      if (tab) onSettingsTabChange(tab);
      onSettingsOpenChange(true);
    },
  });
  return {
    ...input,
    settingsSidebarHost,
    setSettingsSidebarHost,
    searchSessionOpen,
    openSearchSession,
    searchShortcut,
    sidebarViewShortcut,
    historyActivePageId,
    exitHistoryView,
    inHistoryMode,
    restoreSidebarFocusRef,
    scrollAreaNode,
    setScrollAreaNode,
    scrollAreaHeight,
    setScrollAreaHeight,
    closeSidebarOverlay,
  };
}
