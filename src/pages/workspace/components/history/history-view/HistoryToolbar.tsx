import { useLocale } from "@/i18n";
import * as GooseIcons from "@/components/ui/icons";
import { useSidebarView } from "@/stores/useSidebarView";
import { useEffectiveSidebarCollapsed } from "@/hooks/useWorkspaceViewportCollapse";
import { Button } from "@/components/ui/button";
import { useHistoryViewLogic } from "./useHistoryViewLogic";
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
`;
const t = createTranslator(messages);


export function HistoryToolbar() {
  useLocale();
  const sidebarCollapsed = useEffectiveSidebarCollapsed();
  const openVersions = () => useSidebarView.getState().openSidebarPanel("engaged");
  const {
    pageTitle,
    isEmpty,
    selectedVersionId,
    selectedStatus,
    isRestoring,
    exit,
    handleRestore,
  } = useHistoryViewLogic();

  return (
    <header className="history-toolbar h-11 min-w-0 shrink-0 grow pl-3 pr-4 flex items-center gap-3 bg-[hsl(var(--goose-editor-bg))] [-webkit-app-region:no-drag]">
      <Button
        variant="secondary"
        size="sm"
        aria-label={t("backToEditor")}
        className="history-secondary-control h-8 px-3 text-sm gap-1.5 shadow-none"
        onClick={exit}
        data-electron-no-drag
      >
        <GooseIcons.ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Button>

      <span className="h-5 w-px shrink-0 bg-[var(--workspace-divider-strong)]" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-base font-semibold [-webkit-app-region:drag]">{pageTitle}</span>

      {sidebarCollapsed && (
        <Button variant="ghost" size="sm" onClick={openVersions} aria-label={t("selectAVersion")} data-electron-no-drag>
          <GooseIcons.History className="h-4 w-4" />{t("version")}
        </Button>
      )}
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
