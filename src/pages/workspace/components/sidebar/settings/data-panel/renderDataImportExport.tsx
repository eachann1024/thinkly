import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  Globe,
  RotateCcw,
  Upload,
} from "@/components/ui/icons";
import { SelectableCard } from "@/components/ui/selectable-card";
import { SettingsSectionCard } from "../SettingsSectionCard";
import { renderNotebookIcon } from "../../notebookUtils";
import type { useWebdavRemoteActions } from "./useWebdavRemoteActions";
import { DATA_BADGE_CLASS, DATA_UNSELECTED_CARD_CLASS } from "./shared";

export function renderDataImportExport(
  context: ReturnType<typeof useWebdavRemoteActions>,
) {
  const {
    importing,
    onImport,
    selectedIds,
    notebookList,
    onToggleNotebook,
    onSelectAll,
    format,
    onFormatChange,
    exporting,
    onExport,
    onOpenResetDialog,
    selectedCount,
    totalCount,
  } = context;
  return (
    <div className="space-y-4">
      <SettingsSectionCard
        title={
          <span className="flex items-center gap-2">
            <Download
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            导入与导出
          </span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={onImport}
            disabled={importing}
          >
            {importing ? "正在导入…" : "导入 ZIP"}
            {!importing && <Upload className="ml-2 h-4 w-4" />}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">
              选择笔记本
            </Label>
            <div className="flex items-center gap-2">
              <span className={DATA_BADGE_CLASS}>
                已选 {selectedCount}/{totalCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-8 rounded-[var(--goose-control-radius)] px-2 text-sm text-muted-foreground transition-colors hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]"
              >
                {selectedCount === totalCount ? "取消全选" : "全选"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {notebookList.map((notebook) => {
              const isSelected = selectedIds.includes(notebook.id);
              return (
                <Button contentStyle="preserve" variant="ghost" size="sm"
                  key={notebook.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-selected={isSelected || undefined}
                  onClick={() => onToggleNotebook(notebook.id)}
                  className={cn(
                    "goose-accent-selection h-auto border-0 flex items-center gap-2 rounded-[var(--goose-choice-card-radius,12px)] border px-3 py-2.5 text-left transition-all duration-200",
                    "",
                    isSelected
                      ? "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]"
                      : DATA_UNSELECTED_CARD_CLASS,
                  )}
                >
                  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5">
                    {renderNotebookIcon(
                      notebook.icon || "BookOpen",
                      "h-4 w-4 stroke-[1.6]",
                    )}
                  </span>
                  <span className="truncate text-sm">{notebook.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            导出格式
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <SelectableCard
              selected={format === "md"}
              onClick={() => onFormatChange("md")}
              className={cn(
                "flex h-[var(--goose-control-height)] items-center gap-2 rounded-[var(--goose-control-radius)] px-3 text-sm",
                format !== "md" && DATA_UNSELECTED_CARD_CLASS,
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">Markdown (.md)</span>
            </SelectableCard>
            <SelectableCard
              selected={format === "html"}
              onClick={() => onFormatChange("html")}
              className={cn(
                "flex h-[var(--goose-control-height)] items-center gap-2 rounded-[var(--goose-control-radius)] px-3 text-sm",
                format !== "html" && DATA_UNSELECTED_CARD_CLASS,
              )}
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="truncate">HTML (.html)</span>
            </SelectableCard>
          </div>
        </div>

        <Button
          className="w-full rounded-[var(--goose-control-radius)]"
          onClick={onExport}
          disabled={selectedCount === 0 || exporting}
        >
          {exporting ? "正在导出…" : "开始导出"}
          {!exporting && <Download className="ml-2 h-4 w-4" />}
        </Button>
      </SettingsSectionCard>

      <SettingsSectionCard
        tone="danger"
        title={
          <span className="flex items-center gap-2">
            <RotateCcw
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            重置所有数据
          </span>
        }
        actions={
          <Button variant="destructive" size="sm" onClick={onOpenResetDialog}>
            重置所有数据
          </Button>
        }
      />
    </div>
  );
}
