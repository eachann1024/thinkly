import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/PageHeader.tsx#localMessages:1">`
zh-Hans:
  newConversation: "新会话"
  showSidebar: "展开侧栏"
  locked: "已锁定"
  deleted: "页面已被删除"
  restore: "恢复页面"
  deletePermanently: "永久删除页面"
  permanentDelete: "永久删除"
en:
  newConversation: "New conversation"
  showSidebar: "Show sidebar"
  locked: "Locked"
  deleted: "This note has been deleted"
  restore: "Restore note"
  deletePermanently: "Delete note permanently"
  permanentDelete: "Delete permanently"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import type { Page } from "@/types";
import type { NotebookAiLayoutMode } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { isFullscreenAiLayout } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { useAiHeaderActions, useAiHeaderTitle } from "@/pages/workspace/components/notebook-ai/aiHeaderSlot";
import { ConversationTitle } from "@/pages/workspace/components/notebook-ai/ConversationTitle";
import { useAiStatus } from "@/stores/useAiStatus";
import { useSidebarView } from "@/stores/useSidebarView";
import { useEffectiveSidebarCollapsed } from "@/hooks/useWorkspaceViewportCollapse";
import { PageMenu } from "./PageMenu";
import { TabRail } from "./TabRail";
import { useEffectiveSingleTabMode } from "@/lib/tabMode";
import { cn, formatShortcut } from "@/lib/utils";
import { useFolderToolbarActions } from "./useFolderToolbarActions";
import { PageFileTitle } from "./titlebar/PageFileTitle";
import { TitleBarAiToggle } from "./titlebar/TitleBarAiToggle";

interface PageHeaderProps {
  page?: Page;
  onOpenSearch: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  /** AI 面板当前是否打开 */
  aiPanelOpen?: boolean;
  aiLayoutMode?: NotebookAiLayoutMode;
}

export function PageHeader({
  page,
  onOpenSearch,
  onRestore,
  onDelete,
  aiPanelOpen,
  aiLayoutMode = "fullscreen",
}: PageHeaderProps) {
  useLocale();
  const aiPhase = useAiStatus((state) => state.phase);
  const folderActionsAvailable = useFolderToolbarActions();
  const { appShortcuts } = useSettings();
  const singleTabMode = useEffectiveSingleTabMode();
  const aiHeaderActions = useAiHeaderActions();
  const aiHeaderTitle = useAiHeaderTitle();
  const sidebarCollapsed = useEffectiveSidebarCollapsed();
  const toggleSidebarCollapsed = useSidebarView(
    (s) => s.toggleSidebarCollapsed,
  );
  const toggleSidebarShortcutLabel = appShortcuts.toggleSidebar
    ? formatShortcut(appShortcuts.toggleSidebar)
    : "";
  const showWorkspaceActions = Boolean(page) || Boolean(aiPanelOpen);
  const aiFullscreenOpen =
    folderActionsAvailable && Boolean(aiPanelOpen) && isFullscreenAiLayout(aiLayoutMode);

  return (
    <div
      className={cn(
        "workspace-divider sticky top-0 z-10 shrink-0 bg-[hsl(var(--goose-editor-bg))] px-3",
        aiFullscreenOpen
          ? "notebook-ai-page-header-stack rounded-[12px] py-1"
          : "flex h-12 items-center justify-between",
        aiPhase === "streaming" && "ai-header-nebula-streaming",
      )}
      data-ai-conversation-header={aiFullscreenOpen || undefined}
      data-ai-header-effect={aiPhase === "streaming" ? "nebula" : undefined}
    >
      {aiFullscreenOpen ? (
        <div className="flex min-w-0 items-center px-0.5">
          <ConversationTitle summary={aiHeaderTitle ?? uiText("newConversation")} />
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-center justify-between",
          aiFullscreenOpen ? "h-8 min-h-8 w-full" : "h-12 w-full",
        )}
      >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {sidebarCollapsed ? (
          <TooltipProvider delayDuration={600}>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton size="icon" tone="muted"
                  type="button"
                  className={cn(
                    "shrink-0 text-muted-foreground ",
                    "sidebar-toggle-button",
                  )}
                  onClick={toggleSidebarCollapsed}
                  aria-label={uiText("showSidebar")}
                >
                  <GooseIcons.PanelLeftOpen className="h-4 w-4" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{uiText("showSidebar")}</span>
                  {toggleSidebarShortcutLabel && (
                    <span className="text-[11px] text-muted-foreground">
                      {toggleSidebarShortcutLabel}
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}

        {!aiFullscreenOpen && (singleTabMode || !folderActionsAvailable
          ? page && <PageFileTitle page={page} />
          : <TabRail variant="page-header" page={page} onOpenSearch={onOpenSearch} />)}

        {page?.isLocked && (
          <span className="text-xs bg-[var(--goose-color-lock-bg)] text-[var(--goose-color-lock-text)] px-1.5 py-0.5 rounded">
            {uiText("locked")}</span>
        )}
        {page?.trashedAt && (
          <span className="text-xs bg-[var(--goose-color-lock-bg)] text-[var(--goose-color-lock-text)] px-1.5 py-0.5 rounded">
            {uiText("deleted")}</span>
        )}
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1">
        {showWorkspaceActions && folderActionsAvailable && !page?.trashedAt && (
          <TitleBarAiToggle pressed={Boolean(aiPanelOpen)} className={"inline-flex items-center justify-center text-muted-foreground"} />
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

        {aiFullscreenOpen ? (
          aiHeaderActions
        ) : page && !page.trashedAt ? (
          <PageMenu />
        ) : null}
      </div>
      </div>
    </div>
  );
}
