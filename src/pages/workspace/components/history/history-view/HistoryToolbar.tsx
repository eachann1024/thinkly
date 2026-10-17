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
    <header className="h-11 px-3 flex items-center gap-3 shrink-0 bg-[hsl(var(--goose-editor-bg))]">
      <Button
        variant="secondary"
        size="sm"
        aria-label={t("backToEditor")}
        className="history-secondary-control h-8 px-3 text-xs gap-1.5 shadow-none"
        onClick={exit}
      >
        <GooseIcons.ArrowLeft className="h-3.5 w-3.5" />
        {t("back")}
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">{pageTitle}</span>
      </div>

      {sidebarCollapsed && (
        <Button variant="ghost" size="sm" onClick={openVersions} aria-label={t("selectAVersion")}>
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
          className="history-primary-control h-7 shrink-0 px-3 text-xs"
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
