import { useLocale, createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/DesktopTitleBar.tsx#localMessages:1">`
zh-Hans:
  aiConversation: "AI 会话"
  newConversation: "新会话"
  locked: "已锁定"
  deleted: "页面已被删除"
  closeAi: "关闭 AI 面板"
  openAi: "打开 AI 面板"
  restore: "恢复笔记"
  deletePermanently: "彻底删除笔记"
  permanentDelete: "彻底删除"
  aiAssistant: "AI 助手"
en:
  aiConversation: "AI conversation"
  newConversation: "New conversation"
  locked: "Locked"
  deleted: "This note has been deleted"
  closeAi: "Close AI panel"
  openAi: "Open AI panel"
  restore: "Restore note"
  deletePermanently: "Delete note permanently"
  permanentDelete: "Delete permanently"
  aiAssistant: "AI assistant"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { WinWindowControls } from "./WinWindowControls";
import type { DesktopTitleBarProps } from "./titlebar/DesktopTitleBarProps";
import { cn, formatShortcut } from "@/lib/utils";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { bindIdleWindowDrag } from "@/lib/electron/windowDrag";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "@/components/ui/icons";
import { usePages } from "@/stores/usePages";
import { useFileNavHistory } from "@/stores/useFileNavHistory";
import { useSidebarView } from "@/stores/useSidebarView";
import { useEffectiveSidebarCollapsed } from "@/hooks/useWorkspaceViewportCollapse";
import { useSettings } from "@/stores/useSettings";
import { useAiStatus } from "@/stores/useAiStatus";
import { isFullscreenAiLayout } from "../notebook-ai/useNotebookAiPanel";
import { useAiHeaderActions, useAiHeaderTitle } from "../notebook-ai/aiHeaderSlot";
import { ConversationTitle } from "../notebook-ai/ConversationTitle";
import { HistoryToolbar } from "../history/HistoryView";
import { PageMenu } from "./PageMenu";
import { TabRail } from "./TabRail";
import { useFolderToolbarActions } from "./useFolderToolbarActions";
import { useIncomingWorkspaceTabs } from "./useIncomingWorkspaceTabs";

import { actionButtonClass, DesktopWindowNavigation } from "./titlebar/DesktopWindowNavigation";
import { PageFileTitle } from "./titlebar/PageFileTitle";



export function DesktopTitleBar({
  page,
  settingsOpen = false,
  sidebarCollapsedOverride,
  onToggleSidebar,
  isWelcomeTab,
  inHistoryMode,
  onOpenSearch,
  onBeforeActivateTab,
  onRestore,
  onDelete,
  aiPanelOpen,
  aiLayoutMode = "fullscreen",
  onToggleAiPanel,
}: DesktopTitleBarProps) {
  useLocale();
  const activePageId = usePages((s) => s.activePageId);
  const folderActionsAvailable = useFolderToolbarActions();
  const workspaceSidebarCollapsed = useEffectiveSidebarCollapsed();
  const sidebarCollapsed = sidebarCollapsedOverride ?? workspaceSidebarCollapsed;
  const toggleSidebarCollapsed = useSidebarView(
    (s) => s.toggleSidebarCollapsed,
  );
  const appShortcuts = useSettings((s) => s.appShortcuts);
  const aiPhase = useAiStatus((s) => s.phase);
  const aiHeaderActions = useAiHeaderActions();
  const aiHeaderTitle = useAiHeaderTitle();
  const canGoBack = useFileNavHistory((s) => s.index > 0);
  const canGoForward = useFileNavHistory((s) => s.index >= 0 && s.index < s.entries.length - 1);

  const toggleSidebarShortcutLabel = appShortcuts.toggleSidebar
    ? formatShortcut(appShortcuts.toggleSidebar)
    : "";
  const toggleAiPanelShortcutLabel = appShortcuts.toggleAIPanel
    ? formatShortcut(appShortcuts.toggleAIPanel)
    : "";

  const aiFullscreenOpen =
    folderActionsAvailable && Boolean(aiPanelOpen) && isFullscreenAiLayout(aiLayoutMode);
  const aiSidePanelOpen = folderActionsAvailable && Boolean(aiPanelOpen) && !aiFullscreenOpen;
  const showTabRail = folderActionsAvailable && !settingsOpen && !inHistoryMode && !aiFullscreenOpen;
  useIncomingWorkspaceTabs(!showTabRail);

  // Win/Linux 均为 frameless：右侧渲染自定义 min/max/close 窗控。
  const isFramelessElectron =
    typeof navigator !== "undefined" && /Win|Linux/i.test(navigator.platform);
  // Linux 上 CSS 拖拽区不派发鼠标事件（index.css 已整体 no-drag），
  // 顶栏空白处改走 JS 拖拽，双击切换最大化/还原。
  const isLinuxElectron =
    typeof navigator !== "undefined" && /Linux/i.test(navigator.platform);

  const titleBarWindowDragRef = useRef(false);
  const isInteractiveTitleBarTarget = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "button, input, textarea, a, select, [role='button'], [role='tab'], [data-electron-no-drag]",
      ),
    );

  const onTitleBarPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isLinuxElectron) return;
    if (event.button !== 0) return;
    if (isInteractiveTitleBarTarget(event.target)) return;
    bindIdleWindowDrag(event, titleBarWindowDragRef);
  };

  const onTitleBarDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isLinuxElectron) return;
    if (isInteractiveTitleBarTarget(event.target)) return;
    void getGooseDesktop()?.toggleMaximizeWindow?.();
  };

  const windowControls = (
    <DesktopWindowNavigation canGoBack={canGoBack} canGoForward={canGoForward}
      onBeforeActivateTab={onBeforeActivateTab} onToggleSidebar={onToggleSidebar}
      toggleSidebarCollapsed={toggleSidebarCollapsed} sidebarCollapsed={sidebarCollapsed}
      toggleSidebarShortcutLabel={toggleSidebarShortcutLabel} />
  );

  if (inHistoryMode) {
    // 历史预览：不渲染导航/侧栏/置顶按钮和标签栏，仅保留 返回 + 标题 + 还原。
    return (
      <div
        className={cn("electron-titlebar flex w-full shrink-0 items-center", !isFramelessElectron && "pr-4")}
        data-history-mode
        data-sidebar-collapsed={sidebarCollapsed}
        onPointerDown={onTitleBarPointerDown}
        onDoubleClick={onTitleBarDoubleClick}
      >
        <HistoryToolbar />
        {isFramelessElectron ? <WinWindowControls /> : null}
      </div>
    );
  }

  const showPageActions = Boolean(page) && !page?.trashedAt;
  const showWorkspaceActions =
    (!isWelcomeTab && Boolean(page)) || Boolean(aiPanelOpen);
  const titleBarRow = (
    <div className="electron-document-header relative flex min-w-0 w-full flex-1 items-center justify-between">
      <div
        className={cn(
          "min-w-0 flex-1 items-center gap-2 overflow-hidden",
          "flex",
        )}
      >
        {aiFullscreenOpen ? (
          <div
            className="tab-rail flex min-w-0 flex-1 items-center"
            role="tablist"
            aria-label={uiText("aiConversation")}
          >
            <div
              role="tab"
              aria-selected="true"
              tabIndex={0}
              className="tab-rail-item flex min-w-0 flex-1 items-center px-2 text-foreground"
            >
              <ConversationTitle
                summary={aiHeaderTitle ?? uiText("newConversation")}
                muted={false}
              />
            </div>
          </div>
        ) : showTabRail ? (
          <TabRail variant="electron-titlebar" page={page} onOpenSearch={onOpenSearch}
            onBeforeActivateTab={onBeforeActivateTab} />
        ) : !isWelcomeTab && page ? <PageFileTitle page={page} /> : null}

        {!aiFullscreenOpen && page?.isLocked && (
          <span className="rounded bg-[var(--goose-color-lock-bg)] px-1.5 py-0.5 text-xs text-[var(--goose-color-lock-text)]">
            {uiText("locked")}</span>
        )}
        {!aiFullscreenOpen && page?.trashedAt && (
          <span className="rounded bg-[var(--goose-color-lock-bg)] px-1.5 py-0.5 text-xs text-[var(--goose-color-lock-text)]">
            {uiText("deleted")}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showWorkspaceActions && folderActionsAvailable && onToggleAiPanel && !page?.trashedAt && (
          <TooltipProvider delayDuration={600}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton size="icon" tone="muted"
                  type="button"
                  className={cn(
                    "ai-icon-button shrink-0",
                    actionButtonClass,
                    "text-foreground",
                  )}
                  data-ai-state={aiPhase}
                  onClick={onToggleAiPanel}
                  aria-label={aiPanelOpen ? uiText("closeAi") : uiText("openAi")}
                  aria-pressed={aiPanelOpen}
                >
                  <Sparkles className="h-4 w-4" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{aiPanelOpen ? uiText("closeAi") : uiText("openAi")}</span>
                  {toggleAiPanelShortcutLabel && (
                    <span className="text-[11px] text-muted-foreground">
                      {toggleAiPanelShortcutLabel}
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {page?.trashedAt && onRestore && onDelete && (
          <>
            <TooltipProvider delayDuration={600}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton size="icon" tone="muted"
                    onClick={onRestore}
                    type="button"
                    aria-label={uiText("restore")}
                    className=""
                  >
                    <GooseIcons.RotateCcw className="h-4 w-4" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">{uiText("restore")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={600}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton size="icon" tone="danger"
                    onClick={onDelete}
                    type="button"
                    aria-label={uiText("deletePermanently")}
                    className=""
                  >
                    <GooseIcons.Trash2 className="h-4 w-4" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">{uiText("permanentDelete")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {settingsOpen ? null : aiFullscreenOpen ? (
          aiHeaderActions
        ) : showPageActions && page && activePageId ? (
          <PageMenu />
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "electron-titlebar flex w-full shrink-0 items-center",
        isFramelessElectron ? "pr-0" : "pr-4",
      )}
      data-ai-conversation-header={aiFullscreenOpen || undefined}
      data-ai-side-panel={aiSidePanelOpen || undefined}
      data-sidebar-collapsed={sidebarCollapsed}
      onPointerDown={onTitleBarPointerDown}
      onDoubleClick={onTitleBarDoubleClick}
    >
      {windowControls}
      {!settingsOpen && titleBarRow}
      {!settingsOpen && aiSidePanelOpen && (
        <div className="electron-ai-header relative flex min-w-0 shrink-0 items-center gap-2 px-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{uiText("aiAssistant")}</span>
          {aiHeaderActions}
        </div>
      )}
      {isFramelessElectron ? <WinWindowControls /> : null}
    </div>
  );
}
