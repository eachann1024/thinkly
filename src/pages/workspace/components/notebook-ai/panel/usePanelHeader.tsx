import { IconButton } from "@/components/ui/icon-button";
import { useSettings } from "@/stores/useSettings";
import { useNotebookAiSession } from "../NotebookAiSession";
import { useEffect, useMemo } from "react";
import {
  Plus,
  X,
  PanelRight,
  AppWindow,
  History as HistoryIcon,
  MoreHorizontal,
  Check,
} from "@/components/ui/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAction,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConversationHistoryList } from "../ConversationHistoryPopover";
import {
  clearAiHeaderActions,
  clearAiHeaderTitle,
  setAiHeaderActions,
  setAiHeaderTitle,
} from "../aiHeaderSlot";
import type { NotebookAiPanelProps } from "./types";
import type { PanelCommands } from "./usePanelCommands";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/panel/usePanelHeader.tsx#messages:1">`
zh-Hans:
  aiToolbar: "AI 工具栏"
  newConversation: "新建会话"
  conversationHistory: "历史会话"
  morePanelOptions: "更多面板选项"
  sideBySide: "侧栏并排"
  fullScreen: "全屏"
  closeAi: "关闭 AI"
  aiAssistant: "AI 助手"
en:
  aiToolbar: "AI toolbar"
  newConversation: "New conversation"
  conversationHistory: "Conversation history"
  morePanelOptions: "More panel options"
  sideBySide: "Side by side"
  fullScreen: "Full screen"
  closeAi: "Close AI"
  aiAssistant: "AI assistant"
`;
const t = createTranslator(messages);

export function usePanelHeader(
  props: NotebookAiPanelProps,
  commands: PanelCommands,
  options: {
    isFullscreen: boolean;
    isElectronChrome: boolean;
    layoutIsFullscreen: boolean;
    isBusy: boolean;
    conversationSummary: string;
  },
) {
  const { notebookId, onClose, onLayoutModeChange } = props;
  const { unavailableReason } = useNotebookAiSession();
  const hydrated = useSettings((state) => state._hasHydrated);
  const unavailable = !hydrated || Boolean(unavailableReason);
  const {
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
  } = commands;
  const {
    isFullscreen,
    isElectronChrome,
    layoutIsFullscreen,
    isBusy,
    conversationSummary,
  } = options;
  // 全屏时工具栏上移到 PageHeader 右上角（顶替 PageMenu）
  const headerToolbar = useMemo(() => {
    const iconBtn =
      "flex items-center justify-center text-muted-foreground disabled:pointer-events-none disabled:text-disabled ";
    return (
      <TooltipProvider delayDuration={300}>
        <div
          className="notebook-ai-header-toolbar flex shrink-0 items-center gap-0.5"
          role="toolbar"
          aria-label={t("aiToolbar")}
        >
          {!unavailable ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton size="sm" tone="muted"
                    type="button"
                    onClick={handleNewConversation}
                    className={iconBtn}
                    aria-label={t("newConversation")}
                    disabled={isBusy}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>{t("newConversation")}</TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <IconButton size="sm" tone="muted"
                    type="button"
                    className={iconBtn}
                    aria-label={t("conversationHistory")}
                  >
                    <HistoryIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </IconButton>
                </PopoverTrigger>
                <PopoverContent
                  variant="menu"
                  align="end"
                  sideOffset={6}
                  collisionPadding={12}
                  className="notebook-ai-header-menu notebook-ai-history-menu max-w-[calc(100vw-24px)] overflow-x-hidden overflow-y-auto"
                >
                  <ConversationHistoryList
                    compact
                    notebookId={notebookId}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                </PopoverContent>
              </Popover>

              {onLayoutModeChange ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <IconButton size="sm" tone="muted"
                      type="button"
                      className={iconBtn}
                      aria-label={t("morePanelOptions")}
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </IconButton>
                  </PopoverTrigger>
                  <PopoverContent
                    variant="menu"
                    align="end"
                    sideOffset={6}
                    collisionPadding={12}
                    className="notebook-ai-header-menu goose-list-layout w-48 max-w-[calc(100vw-24px)] overflow-y-auto p-1"
                  >
                    <PopoverAction
                      aria-pressed={!layoutIsFullscreen}
                      onSelect={() => onLayoutModeChange("side-panel")}
                      className="gap-2"
                    >
                      <PanelRight className="h-4 w-4" strokeWidth={1.75} />
                      <span className="flex-1">{t("sideBySide")}</span>
                      {!layoutIsFullscreen ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </PopoverAction>
                    <PopoverAction
                      aria-pressed={layoutIsFullscreen}
                      onSelect={() => onLayoutModeChange("fullscreen")}
                      className="gap-2"
                    >
                      <AppWindow className="h-4 w-4" strokeWidth={1.75} />
                      <span className="flex-1">{t("fullScreen")}</span>
                      {layoutIsFullscreen ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </PopoverAction>
                  </PopoverContent>
                </Popover>
              ) : null}
            </>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton size="sm" tone="muted"
                type="button"
                onClick={onClose}
                className={iconBtn}
                aria-label={t("closeAi")}
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("closeAi")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }, [
    unavailable,
    onClose,
    handleNewConversation,
    isBusy,
    notebookId,
    handleSelectConversation,
    handleDeleteConversation,
    onLayoutModeChange,
    layoutIsFullscreen,
  ]);

  // 桌面两种布局都把工具栏交给顶栏；网页侧栏仍保留面板内标题。
  useEffect(() => {
    if (!isFullscreen && !isElectronChrome) {
      clearAiHeaderActions();
      clearAiHeaderTitle();
      return;
    }
    setAiHeaderActions(headerToolbar);
    setAiHeaderTitle(unavailable ? t("aiAssistant") : conversationSummary);
    return () => {
      clearAiHeaderActions();
      clearAiHeaderTitle();
    };
  }, [
    isFullscreen,
    isElectronChrome,
    headerToolbar,
    conversationSummary,
    unavailable,
  ]);

  return headerToolbar;
}
