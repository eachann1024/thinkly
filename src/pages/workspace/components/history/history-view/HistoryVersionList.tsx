import { useLocale } from "@/i18n";
import { ListRow } from "@/components/ui/list-row";
import { IconButton } from "@/components/ui/icon-button";
import * as GooseIcons from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkeletonList } from "@/components/ui/skeleton";
import { closeNotebookAiIfFullscreen } from "../../notebook-ai/useNotebookAiPanel";
import { triggerLabel, formatTime } from "./historyViewPresentation";
import "./history-controls.css";
import { useHistoryViewLogic } from "./useHistoryViewLogic";
import { HistoryBackButton, useHistoryHeaderChrome } from "./HistoryToolbar";
import { i18nYaml, createTranslator, getFormatLocale } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/history-view/HistoryVersionList.tsx#messages:1">`
zh-Hans:
  versionHistory: "页面历史"
  selectAVersionToPreviewAndRestore: "选择时间点预览后还原"
  noVersionHistory: "暂无历史版本"
  milestone: "里程碑"
  removingMilestone: "正在取消标记此版本"
  markingMilestone: "正在标记此版本"
  removeMilestone: "取消标记此版本"
  markAsMilestone: "标记此版本"
  characterCount_other: "{{count}} 字"
  changeCount: "变化 {{count}}"
  viewVersionAt: "查看 {{date}} {{time}} 的历史版本"
en:
  versionHistory: "Version history"
  selectAVersionToPreviewAndRestore: "Select a version to preview and restore"
  noVersionHistory: "No version history"
  milestone: "Milestone"
  removingMilestone: "Removing milestone"
  markingMilestone: "Marking milestone"
  removeMilestone: "Remove milestone"
  markAsMilestone: "Mark as milestone"
  characterCount_one: "{{count}} character"
  characterCount_other: "{{count}} characters"
  changeCount: "Change: {{count}}"
  viewVersionAt: "View version from {{date}}, {{time}}"
ja:
  versionHistory: "ページ履歴"
  selectAVersionToPreviewAndRestore: "時点を選んでプレビューし、復元します"
  noVersionHistory: "履歴バージョンはまだありません"
  milestone: "マイルストーン"
  removingMilestone: "このバージョンのマークを解除中"
  markingMilestone: "このバージョンをマーク中"
  removeMilestone: "このバージョンのマークを解除"
  markAsMilestone: "このバージョンをマーク"
  characterCount_other: "{{count}} 文字"
  changeCount: "変更 {{count}}"
  viewVersionAt: "{{date}} {{time}} の履歴バージョンを表示"
`;
const t = createTranslator(messages);


export /**
 * 页面历史模块（历史模式下占据整块侧栏主体，替换笔记本头 + 页面树/大纲）。
 * 不自带宽度/背景/边框——靠 Sidebar 父容器提供。
 * 表头与正文栏 HistoryToolbar 同高，共用一条底线。
 */
function HistoryVersionList() {
  useLocale();
  const headerChrome = useHistoryHeaderChrome();
  const {
    groups,
    isEmpty,
    indexError,
    indexLoading,
    selectedVersionId,
    pendingMilestoneVersionId,
    select,
    handleToggleMilestone,
  } = useHistoryViewLogic();

  return (
    <div className="flex-1 min-h-0 flex flex-col" aria-label={t("versionHistory")}>
      <header className="history-column-header" {...headerChrome}>
        <HistoryBackButton />
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {t("versionHistory")}
        </span>
      </header>
      {!isEmpty && (
        <p className="shrink-0 truncate whitespace-nowrap px-3 pb-2 pt-3 text-[11px] leading-none text-muted-foreground">
          {t("selectAVersionToPreviewAndRestore")}
        </p>
      )}
      {isEmpty && indexLoading ? (
        <SkeletonList rows={6} icon={false} label={t("versionHistory")} className="px-2 py-1" />
      ) : isEmpty ? (
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          {indexError ?? t("noVersionHistory")}
        </p>
      ) : (
        <ScrollArea className="flex-1">
          <div className="py-1 pb-4">
            {groups.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-3 py-1.5 text-[11px] tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="px-2">
                  {group.items.map((v, index) => {
                    const isSelected = selectedVersionId === v.versionId;
                    const isMilestonePending =
                      pendingMilestoneVersionId === v.versionId;
                    const isFirst = index === 0;
                    const isLast = index === group.items.length - 1;
                    const delta = v.charDelta;
                    const deltaText =
                      delta === 0 ? null : delta > 0 ? `+${delta}` : `${delta}`;
                    const detailTitle = [
                      new Date(v.createdAt).toLocaleString(getFormatLocale()),
                      triggerLabel(v.trigger),
                      t("characterCount", { count: v.charCount }),
                      deltaText ? t("changeCount", { count: deltaText }) : null,
                      v.label || null,
                      v.isMilestone ? t("milestone") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div
                        key={v.versionId}
                        data-selected={isSelected ? "true" : "false"}
                        className="history-version-item group relative flex items-center"
                      >
                        {/* 绝对定位轨道：覆盖整行高度（含 padding），相邻项首尾相接不断线 */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute bottom-0 left-1.5 top-0 z-[1] flex w-4 items-center justify-center"
                        >
                          {!isFirst ? (
                            <span className="absolute bottom-1/2 left-1/2 top-0 w-px -translate-x-1/2 bg-border/70" />
                          ) : null}
                          {!isLast ? (
                            <span className="absolute bottom-0 left-1/2 top-1/2 w-px -translate-x-1/2 bg-border/70" />
                          ) : null}
                          <span
                            className={cn(
                              "relative z-[1] h-2 w-2 rounded-marker border",
                              isSelected
                                ? "border-[var(--goose-interactive-selected-fg)] bg-[var(--goose-interactive-selected-fg)]"
                                : "border-border bg-[hsl(var(--goose-shell-bg))]",
                            )}
                          />
                        </span>
                        <ListRow
                          type="button"
                          title={detailTitle}
                          aria-current={isSelected ? "true" : undefined}
                          data-selected={isSelected ? "true" : "false"}
                          aria-label={t("viewVersionAt", { date: group.label, time: formatTime(v.createdAt) })}
                          onClick={() => {
                            closeNotebookAiIfFullscreen();
                            select(v.versionId);
                            window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
                          }}
                          data-goose-row-inset=""
                          className="goose-list-row goose-accent-selection history-version-row flex min-h-8 w-full min-w-0 cursor-pointer items-center justify-start pl-8 pr-8 text-left "
                        >
                          <span
                            className={cn(
                              "min-w-0 text-xs leading-snug",
                              isSelected
                                ? "font-medium text-[var(--goose-interactive-selected-fg)]"
                                : "text-foreground",
                            )}
                          >
                            <span className="tabular-nums">
                              {formatTime(v.createdAt)}
                            </span>
                            {v.label ? (
                              <span
                                className={cn(
                                  "ml-1.5 font-normal",
                                  isSelected
                                    ? "text-[var(--goose-interactive-selected-fg)]"
                                    : "text-muted-foreground",
                                )}
                              >
                                {v.label}
                              </span>
                            ) : null}
                            {deltaText ? (
                              <span
                                className={cn(
                                  "ml-1.5 text-[11px] tabular-nums",
                                  isSelected
                                    ? "text-[var(--goose-interactive-selected-fg)]"
                                    : "text-muted-foreground",
                                )}
                              >
                                {deltaText}
                              </span>
                            ) : null}
                          </span>
                        </ListRow>
                        <IconButton size="sm" tone="muted"
                          type="button"
                          data-marked={v.isMilestone ? "true" : "false"}
                          aria-busy={isMilestonePending || undefined}
                          aria-pressed={v.isMilestone}
                          aria-label={
                            isMilestonePending
                              ? v.isMilestone
                                ? t("removingMilestone")
                                : t("markingMilestone")
                              : v.isMilestone
                                ? t("removeMilestone")
                                : t("markAsMilestone")
                          }
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            if (event.button !== 0) return;
                            event.preventDefault();
                            handleToggleMilestone(v.versionId, !v.isMilestone);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (event.detail !== 0) return;
                            handleToggleMilestone(v.versionId, !v.isMilestone);
                          }}
                          className="history-star-control absolute right-0.5 top-1/2 z-[2] -translate-y-1/2 select-none"
                        >
                          <GooseIcons.Star
                            fill={v.isMilestone ? "currentColor" : undefined}
                            className={cn(
                              "h-4 w-4",
                              v.isMilestone &&
                                "fill-[var(--goose-interactive-selected-fg)] text-[var(--goose-interactive-selected-fg)]",
                            )}
                          />
                        </IconButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
