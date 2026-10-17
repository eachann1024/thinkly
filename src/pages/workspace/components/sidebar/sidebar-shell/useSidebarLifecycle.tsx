import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-shell/useSidebarLifecycle.tsx#localMessages:1">`
zh-Hans:
  search_e5f7: "搜索"
  documentOutline_081c: "文档大纲"
  local_8e7e: "本地"
  repository_c270: "仓库"
  page_59ce: "页面"
en:
  search_e5f7: "Search"
  documentOutline_081c: "Document outline"
  local_8e7e: "Local"
  repository_c270: "Repository"
  page_59ce: "Page"
`;
const uiText = createTranslator(localMessages);
import { createNamedPage } from "@/lib/create-named-page";
import { useSearchSession } from "../useSearchSession";
import { closeNotebookAiIfFullscreen } from "../../notebook-ai/useNotebookAiPanel";
import { activateWorkspace } from "@/lib/settings-navigation";
import { type SidebarView } from "./shared";
import type { useSidebarNavigation } from "./useSidebarNavigation";

export function useSidebarLifecycle(
  input: ReturnType<typeof useSidebarNavigation>,
) {
  useLocale();
  const {
    selectedPageId,
    scrollContainerRef,
    activePageId,
    getPage,
    setExpandPageId,
    activeNotebookId,
    openInCurrentTab,
    sidebarCollapsed,
    sidebarOverlay,
    setViewportWidth,
    sidebarRef,
    isLocalFolder,
    electronNoVault,
    previewSidebarWidth,
    width,
    currentView,
    setCurrentView,
    openSearchSession,
    exitHistoryView,
    inHistoryMode,
    restoreSidebarFocusRef,
    scrollAreaNode,
    setScrollAreaHeight,
  } = input;

  const previousNotebookIdRef = useRef<string | null | undefined>(undefined);

  const resetSidebarAfterNotebookChange = useCallback(
    (options: { exitHistory: boolean }) => {
      setCurrentView("pages");
      if (options.exitHistory) exitHistoryView();
    },
    [exitHistoryView, setCurrentView],
  );

  useEffect(() => {
    const previousNotebookId = previousNotebookIdRef.current;
    previousNotebookIdRef.current = activeNotebookId;
    if (previousNotebookId === activeNotebookId) return;
    if (previousNotebookId === undefined && !isLocalFolder) return;
    if (useSearchSession.getState().view.phase !== "closed") return;

    resetSidebarAfterNotebookChange({
      exitHistory: inHistoryMode,
    });
  }, [
    activeNotebookId,
    inHistoryMode,
    isLocalFolder,
    resetSidebarAfterNotebookChange,
  ]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const sidebar = sidebarRef.current;
    const stage = sidebar?.closest(".workspace-stage");
    root.toggleAttribute("data-sidebar-collapsed", sidebarCollapsed);
    sidebarRef.current?.toggleAttribute("data-sidebar-overlay", sidebarOverlay);
    if (stage instanceof HTMLElement) {
      stage.toggleAttribute("data-sidebar-collapsed", sidebarCollapsed);
      stage.toggleAttribute("data-sidebar-overlay", sidebarOverlay);
    }
    return () => {
      root.removeAttribute("data-sidebar-collapsed");
      sidebar?.removeAttribute("data-sidebar-overlay");
      if (stage instanceof HTMLElement) {
        stage.removeAttribute("data-sidebar-collapsed");
        stage.removeAttribute("data-sidebar-overlay");
      }
    };
  }, [sidebarCollapsed, sidebarOverlay, sidebarRef]);

  useLayoutEffect(() => {
    previewSidebarWidth(width);
  }, [previewSidebarWidth, width]);

  useLayoutEffect(() => {
    if (sidebarOverlay || !restoreSidebarFocusRef.current) return;
    const view = restoreSidebarFocusRef.current;
    restoreSidebarFocusRef.current = null;
    sidebarRef.current
      ?.closest(".workspace-shell")
      ?.querySelector<HTMLButtonElement>(`.sidebar-mode-rail-button[data-sidebar-view="${view}"]`)
      ?.focus({ preventScroll: true });
  }, [sidebarOverlay, sidebarRef, restoreSidebarFocusRef, currentView]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setViewportWidth(window.innerWidth);
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [setViewportWidth]);

  useEffect(() => {
    if (!scrollAreaNode) {
      setScrollAreaHeight(0);
      return;
    }
    let lastHeight = -1;
    const updateHeight = () => {
      const height = scrollAreaNode.clientHeight;
      // 隐藏列表会报告 0；保留有效高度，避免切换视图时重绘整棵树。
      if (height <= 0 || height === lastHeight) return;
      lastHeight = height;
      setScrollAreaHeight(height);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(scrollAreaNode);
    return () => observer.disconnect();
  }, [scrollAreaNode, setScrollAreaHeight]);

  const handleCreatePage = async () => {
    if (!activeNotebookId) return;
    activateWorkspace();
    closeNotebookAiIfFullscreen();
    // 在当前所处页面的同级创建：取当前页的 parentId 作为新页的父级
    const basePageId = selectedPageId ?? activePageId;
    const basePage = basePageId ? getPage(basePageId) : undefined;
    const siblingParentId =
      basePage && basePage.workspaceId === activeNotebookId
        ? basePage.parentId
        : undefined;
    const newPageId = await createNamedPage(siblingParentId, activeNotebookId);
    if (!newPageId) return;
    openInCurrentTab(newPageId);
    window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete", { detail: { pageId: newPageId } }));
    // 新页若落在折叠的父级下，展开祖先并聚焦使其可见
    if (siblingParentId) setExpandPageId(newPageId);
  };

  const handleOpenSearch = () => {
    activateWorkspace();
    if (inHistoryMode) exitHistoryView();
    closeNotebookAiIfFullscreen();
    openSearchSession(
      activeNotebookId,
      activePageId,
      scrollContainerRef?.current?.scrollTop ?? 0,
    );
  };

  const switchSidebarView = (view: SidebarView) => {
    activateWorkspace();
    if (inHistoryMode) exitHistoryView();
    if (view === "outline") closeNotebookAiIfFullscreen();
    setCurrentView(view);
  };

  const headerTitle =
    currentView === "search"
      ? uiText("search_e5f7")
      : currentView === "outline"
        ? uiText("documentOutline_081c")
        : isLocalFolder
          ? uiText("local_8e7e")
          : electronNoVault
            ? uiText("repository_c270")
            : uiText("page_59ce");
  return {
    ...input,
    previousNotebookIdRef,
    resetSidebarAfterNotebookChange,
    handleCreatePage,
    handleOpenSearch,
    switchSidebarView,
    headerTitle,
  };
}
