import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/local-folder-settings/fields/LegacyInternalPagesExportCard.tsx#localMessages:1">`
zh-Hans:
  openALocalFolderFirst_f657: "请先打开本地文件夹"
  switchToTheDestinationFolderBefore_69bc: "请切换到目标文件夹后再执行数据导出。"
  untitled_44a7: "无标题"
  legacyNotesExported: "已导出 {{count}} 篇早期内置笔记"
  exportDestination: "文件已写入 {{path}}；原始数据已完整保留。"
  exportFailedPleaseTryAgain_28ce: "导出失败，请重试"
  legacyDataMigration_20ff: "旧数据迁移"
  exportAsMarkdownToTheCurrent_f443: "导出为 Markdown 到当前文件夹，原始笔记会保留。"
  exporting_86f9: "导出中…"
  exportToCurrentFolder_958f: "导出到当前文件夹"
  legacyFound: "检测到早期内置笔记 ({{count}} 篇)"
en:
  openALocalFolderFirst_f657: "Open a local folder first"
  switchToTheDestinationFolderBefore_69bc: "Switch to the destination folder before exporting."
  untitled_44a7: "Untitled"
  legacyNotesExported: "Legacy built-in notes exported: {{count}}"
  exportDestination: "Files saved to {{path}}. All original data has been kept."
  exportFailedPleaseTryAgain_28ce: "Export failed. Please try again."
  legacyDataMigration_20ff: "Legacy data migration"
  exportAsMarkdownToTheCurrent_f443: "Export as Markdown to the current folder. The original notes are kept."
  exporting_86f9: "Exporting…"
  exportToCurrentFolder_958f: "Export to current folder"
  legacyFound: "Legacy built-in notes found: {{count}}"
`;
const uiText = createTranslator(localMessages);
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsSectionCard } from "../../settings/SettingsSectionCard";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { toast } from "@/components/ui/sonner";
import { HostAdapter } from "@/lib/host/adapter";
import { PAGE_DOC_PREFIX } from "@/lib/storage/pageRepository";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { Page } from "@/types";

export /** 检测 db 中残留的内置（非本地文件）页面——桌面模式下用于一次性导出。 */
function listLegacyInternalPages(): Page[] {
  try {
    return HostAdapter.db
      .allDocs<Page>(PAGE_DOC_PREFIX)
      .map((doc) => doc.data)
      .filter((page) => page && !page.localFilePath && !page.trashedAt);
  } catch {
    return [];
  }
}

export /** 桌面端专属：检测到旧内置（web-db）页面时，提供一次性导出为 .md 到当前仓库。 */
function LegacyInternalPagesExportCard() {
  useLocale();
  const [exporting, setExporting] = useState(false);
  const [legacyCount, setLegacyCount] = useState(
    () => listLegacyInternalPages().length,
  );
  if (legacyCount <= 0) return null;

  const handleExport = async () => {
    const notebookState = useNotebooks.getState();
    const activeNotebook = notebookState.activeNotebookId
      ? notebookState.notebooks[notebookState.activeNotebookId]
      : null;
    if (
      activeNotebook?.source !== "local-folder" ||
      !activeNotebook.localPath ||
      !window.gooseFs
    ) {
      toast.error(uiText("openALocalFolderFirst_f657"), {
        description: uiText("switchToTheDestinationFolderBefore_69bc"),
      });
      return;
    }

    setExporting(true);
    try {
      const { blocksToMarkdown } = await import("@/lib/export");
      const gooseFs = window.gooseFs!;
      const basePath = activeNotebook.localPath.replace(/[\\/]+$/, "");
      const separator = activeNotebook.localPath.includes("\\") ? "\\" : "/";
      const legacyPages = listLegacyInternalPages();

      let exported = 0;
      for (const page of legacyPages) {
        const title = (getPageTitle(page) || uiText("untitled_44a7"))
          .trim()
          .replace(/[\\/:*?"<>|]/g, "_");
        const markdown = await blocksToMarkdown(page.content as never);
        let filePath = `${basePath}${separator}${title}.md`;
        let suffix = 1;
        const exists = async (path: string) =>
          gooseFs.existsAsync
            ? await gooseFs.existsAsync(path)
            : gooseFs.exists(path);
        while (await exists(filePath)) {
          filePath = `${basePath}${separator}${title} (${suffix}).md`;
          suffix += 1;
        }
        const ok = gooseFs.writeFileAsync
          ? await gooseFs.writeFileAsync(filePath, markdown)
          : gooseFs.writeFile(filePath, markdown);
        if (ok) exported += 1;
      }

      toast.success(uiText("legacyNotesExported", { count: exported }), {
        description: uiText("exportDestination", { path: basePath }),
      });
      await usePages
        .getState()
        .loadLocalFolderPages(activeNotebook.id, activeNotebook.localPath);
    } catch (error) {
      console.error("[settings] 导出旧内置笔记失败", error);
      toast.error(uiText("exportFailedPleaseTryAgain_28ce"));
    } finally {
      setExporting(false);
      setLegacyCount(listLegacyInternalPages().length);
    }
  };

  return (
    <SettingsSectionCard title={uiText("legacyDataMigration_20ff")}>
      <div className="flex items-start justify-between gap-4 goose-settings-option-row px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {uiText("legacyFound", { count: legacyCount })}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {uiText("exportAsMarkdownToTheCurrent_f443")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="shrink-0"
        >
          {exporting ? uiText("exporting_86f9") : uiText("exportToCurrentFolder_958f")}
        </Button>
      </div>
    </SettingsSectionCard>
  );
}
