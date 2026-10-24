import { useLocale } from "@/i18n";
import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebarView } from "@/stores/useSidebarView";
import { useEffectiveSidebarCollapsed } from "@/hooks/useWorkspaceViewportCollapse";
import { Button } from "@/components/ui/button";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { bindIdleWindowDrag } from "@/lib/electron/windowDrag";
import { cn } from "@/lib/utils";
import type { Page } from "@/types";
import { actionButtonClass, DesktopWindowNavigation } from "../../page/titlebar/DesktopWindowNavigation";
import { PageFileTitle } from "../../page/titlebar/PageFileTitle";
import { useHistoryViewLogic } from "./useHistoryViewLogic";
import { formatGroupLabel, formatTime } from "./historyViewPresentation";
import "./history-controls.css";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/history-view/HistoryToolbar.tsx#messages:1">`
zh-Hans:
  backToEditor: "返回编辑页面"
  back: "返回"
  selectAVersion: "选择历史版本"
  version: "版本"
  restoringVersion: "正在还原此版本"
  loadingVersion: "正在读取历史版本"
  restoreThisVersion: "还原此版本"
  restoring: "正在还原"
  loading: "正在读取"
en:
  backToEditor: "Back to editor"
  back: "Back"
  selectAVersion: "Select a version"
  version: "Version"
  restoringVersion: "Restoring version"
  loadingVersion: "Loading version"
  restoreThisVersion: "Restore this version"
  restoring: "Restoring"
  loading: "Loading"
ja:
  backToEditor: "編集画面に戻る"
  back: "戻る"
  selectAVersion: "履歴バージョンを選択"
  version: "バージョン"
  restoringVersion: "このバージョンを復元中"
  loadingVersion: "履歴バージョンを読み込み中"
  restoreThisVersion: "このバージョンを復元"
  restoring: "復元中"
  loading: "読み込み中"
`;
const t = createTranslator(messages);

function isChromeControlTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, textarea, [data-electron-no-drag]"));
}

export function useHistoryHeaderChrome() {
  const dragRef = useRef(false);
  const linux = typeof navigator !== "undefined" && /Linux/i.test(navigator.platform);
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (!linux || event.button !== 0 || isChromeControlTarget(event.target)) return;
      bindIdleWindowDrag(event, dragRef);
    },
    onDoubleClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (!linux || isChromeControlTarget(event.target)) return;
      void getGooseDesktop()?.toggleMaximizeWindow?.();
    },
  };
}


function versionLabelOf(createdAt: number | undefined, fallback: string) {
  return createdAt == null ? fallback : `${formatGroupLabel(createdAt, Date.now())} ${formatTime(createdAt)}`;
}

export function HistoryElectronChrome({
  page, onBeforeActivateTab, onToggleSidebar, toggleSidebarCollapsed, sidebarCollapsed, toggleSidebarShortcutLabel,
}: {
  page?: Page;
  onBeforeActivateTab?: () => void;
  onToggleSidebar?: () => void;
  toggleSidebarCollapsed: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarShortcutLabel: string;
}) {
  useLocale();
  const { exit, isEmpty, selectedEntry, selectedVersionId, selectedStatus, isRestoring, handleRestore } = useHistoryViewLogic();
  const versionLabel = versionLabelOf(selectedEntry?.createdAt, "");
  const busy = isRestoring || selectedStatus === "loading";
  const restoreLabel = isRestoring ? t("restoringVersion") : selectedStatus === "loading" ? t("loadingVersion") : t("restoreThisVersion");
  return (
    <>
      <DesktopWindowNavigation
        canGoBack
        canGoForward={false}
        onBack={exit}
        backLabel={t("backToEditor")}
        onBeforeActivateTab={onBeforeActivateTab}
        onToggleSidebar={onToggleSidebar}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebarShortcutLabel={toggleSidebarShortcutLabel}
      />
      <div className="electron-document-header relative flex min-w-0 w-full flex-1 items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {page ? (
            <div className="min-w-0">
              <PageFileTitle page={page} />
            </div>
          ) : (
            <span className="page-file-title inline-flex min-w-0 items-center gap-1 px-1 text-sm font-medium text-muted-foreground">
              {t("selectAVersion")}
            </span>
          )}
          {versionLabel && <span className="shrink-0 text-sm text-muted-foreground">{versionLabel}</span>}
        </div>
        {!isEmpty && (
          <div className="flex shrink-0 items-center gap-2">
            <TooltipProvider delayDuration={600}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    size="icon"
                    tone="muted"
                    type="button"
                    className={cn(actionButtonClass, "disabled:pointer-events-none disabled:text-disabled")}
                    aria-label={restoreLabel}
                    aria-busy={busy || undefined}
                    disabled={!selectedVersionId || selectedStatus !== "ready" || isRestoring}
                    onClick={handleRestore}
                  >
                    {busy ? <GooseIcons.LoaderCircle className="h-4 w-4 animate-spin" /> : <GooseIcons.RotateCcw className="h-4 w-4" />}
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">{busy ? (isRestoring ? t("restoring") : t("loading")) : t("restoreThisVersion")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </>
  );
}

export function HistoryBackButton() {
  useLocale();
  const { exit } = useHistoryViewLogic();
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={t("backToEditor")}
      className="history-secondary-control h-8 shrink-0 gap-1.5 px-3 text-sm shadow-none"
      onClick={exit}
      data-electron-no-drag
    >
      <GooseIcons.ArrowLeft className="h-4 w-4" />
      {t("back")}
    </Button>
  );
}

export function HistoryToolbar() {
  useLocale();
  const headerChrome = useHistoryHeaderChrome();
  const sidebarCollapsed = useEffectiveSidebarCollapsed();
  const openVersions = () => useSidebarView.getState().openSidebarPanel("engaged");
  const {
    isEmpty,
    selectedEntry,
    selectedVersionId,
    selectedStatus,
    isRestoring,
    handleRestore,
  } = useHistoryViewLogic();
  const versionLabel = selectedEntry
    ? `${formatGroupLabel(selectedEntry.createdAt, Date.now())} ${formatTime(selectedEntry.createdAt)}`
    : t("selectAVersion");

  return (
    <header className="history-document-header" {...headerChrome}>
      {sidebarCollapsed && (
        <>
          <HistoryBackButton />
          <Button variant="ghost" size="sm" onClick={openVersions} aria-label={t("selectAVersion")} data-electron-no-drag>
            <GooseIcons.History className="h-4 w-4" />{t("version")}
          </Button>
        </>
      )}
      <span className={`min-w-0 flex-1 truncate text-sm ${selectedEntry ? "text-foreground" : "text-muted-foreground"}`}>
        {versionLabel}
      </span>

      {!isEmpty && (
        <Button
          size="sm"
          aria-label={
            isRestoring
              ? t("restoringVersion")
              : selectedStatus === "loading"
                ? t("loadingVersion")
                : t("restoreThisVersion")
          }
          aria-busy={isRestoring || selectedStatus === "loading" || undefined}
          className="history-primary-control h-8 shrink-0 px-4 text-sm font-medium"
          data-electron-no-drag
          disabled={
            !selectedVersionId || selectedStatus !== "ready" || isRestoring
          }
          onClick={handleRestore}
        >
          {isRestoring || selectedStatus === "loading" ? (
            <>
              <GooseIcons.LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              {isRestoring ? t("restoring") : t("loading")}
            </>
          ) : (
            t("restoreThisVersion")
          )}
        </Button>
      )}
    </header>
  );
}
