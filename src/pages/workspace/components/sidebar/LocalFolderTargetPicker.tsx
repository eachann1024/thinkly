import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/LocalFolderTargetPicker.tsx#localMessages:1">`
zh-Hans:
  importFailed_fddc: "导入失败"
  theFileCouldNotBeParsed_8954: "文件内容无法解析为笔记。"
  textFileImported_376b: "文本文件已导入"
  filesImported: "已导入 {{count}} 个文件"
  filesSkipped: "{{count}} 个文件导入失败，已跳过"
  searchOtherNotebooks_c47c: "搜索其他笔记本…"
  searchFoldersOrPaths_40c6: "搜索文件夹或路径…"
  noOtherNotebooksAvailable_35ba: "没有可移动的其他笔记本"
  noMatchingFolders_6b46: "没有匹配的文件夹"
  moveTo_86ed: "移动到"
  importTo_5a85: "导入到"
en:
  importFailed_fddc: "Import failed"
  theFileCouldNotBeParsed_8954: "The file could not be parsed as a note."
  textFileImported_376b: "Text file imported"
  filesImported: "Files imported: {{count}}"
  filesSkipped: "Files skipped after import errors: {{count}}"
  searchOtherNotebooks_c47c: "Search other notebooks…"
  searchFoldersOrPaths_40c6: "Search folders or paths…"
  noOtherNotebooksAvailable_35ba: "No other notebooks available"
  noMatchingFolders_6b46: "No matching folders"
  moveTo_86ed: "Move to"
  importTo_5a85: "Import to"
ja:
  importFailed_fddc: "インポートに失敗しました"
  theFileCouldNotBeParsed_8954: "ファイルの内容をノートとして解析できませんでした。"
  textFileImported_376b: "テキストファイルをインポートしました"
  filesImported: "{{count}} 件のファイルをインポートしました"
  filesSkipped: "{{count}} 件のファイルはインポートに失敗したためスキップしました"
  searchOtherNotebooks_c47c: "他のノートブックを検索…"
  searchFoldersOrPaths_40c6: "フォルダまたはパスを検索…"
  noOtherNotebooksAvailable_35ba: "移動先にできる他のノートブックがありません"
  noMatchingFolders_6b46: "一致するフォルダがありません"
  moveTo_86ed: "移動先"
  importTo_5a85: "インポート先"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useMemo, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "@/components/ui/sonner";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { activateNotebook } from "@/lib/notebookNavigation";
import {
  buildLocalFolderPickerItems,
  rememberLocalFolderTarget,
  readRecentLocalFolderTargets,
} from "@/lib/local-folder-target";
import { importTextFilesToLocalFolder } from "@/lib/local-folder-import";
import { useLocalFolderTargetPicker } from "@/stores/useLocalFolderTargetPicker";
import { usePages } from "@/stores/usePages";
import { useSidebarView } from "@/stores/useSidebarView";
import { useTabs } from "@/stores/useTabs";
import { useNotebooks } from "@/stores/useNotebooks";
import { getNotebookMoveTargets } from "@/lib/notebook-move-targets";
import { movePageToNotebook } from "@/lib/move-page-to-notebook";
import { renderNotebookIcon } from "./notebookUtils";

export function LocalFolderTargetPicker() {
  const locale = useLocale();
  const { picker, closePicker } = useLocalFolderTargetPicker();
  const open = picker.phase !== "closed";
  const mode = picker.phase;
  const workspaceId = picker.phase !== "closed" ? picker.workspaceId : "";
  const pageId = picker.phase === "move" ? picker.pageId : undefined;
  const pages = usePages((s) => s.pages);
  const notebooks = useNotebooks((s) => s.notebooks);
  const setExpandPageId = usePages((s) => s.setExpandPageId);
  const expandView = useSidebarView((s) => s.expand);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const recentKeys = useMemo(
    () =>
      workspaceId && open ? readRecentLocalFolderTargets(workspaceId) : [],
    [workspaceId, open],
  );

  const items = useMemo(
    () =>
      workspaceId && mode === "import"
        ? buildLocalFolderPickerItems(pages, workspaceId, {
            query,
            recentKeys,
          })
        : [],
    [pages, workspaceId, query, mode, recentKeys, locale],
  );

  const moveTargets = getNotebookMoveTargets(
    pageId ? pages[pageId] : undefined,
    notebooks,
  ).filter((notebook) =>
    notebook.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  const handleMove = async (notebookId: string) => {
    if (pageId && (await movePageToNotebook(pageId, notebookId))) closePicker();
  };

  const handleSelect = async (folderId: string | undefined) => {
    if (picker.phase !== "import") return;

    const { importedIds, failedCount } = await importTextFilesToLocalFolder({
      workspaceId,
      files: picker.files,
      parentId: folderId,
    });
    rememberLocalFolderTarget(workspaceId, folderId);
    closePicker();

    const firstPageId = importedIds[0];
    if (!firstPageId) {
      toast.error(uiText("importFailed_fddc"), {
        description: uiText("theFileCouldNotBeParsed_8954"),
      });
      return;
    }

    closeNotebookAiIfFullscreen();
    await activateNotebook(workspaceId);
    useTabs.getState().openTab(firstPageId);
    await usePages.getState().setActivePage(firstPageId);
    if (folderId) {
      expandView(workspaceId, folderId);
      setExpandPageId(folderId);
    }

    const successCount = importedIds.length;
    toast.success(
      successCount === 1 ? uiText("textFileImported_376b") : uiText("filesImported", { count: successCount }),
      {
        description:
          failedCount > 0 ? uiText("filesSkipped", { count: failedCount }) : undefined,
      },
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => !next && closePicker()}
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        placeholder={mode === "move" ? uiText("searchOtherNotebooks_c47c") : uiText("searchFoldersOrPaths_40c6")}
      />
      <CommandList>
        <CommandEmpty>
          {mode === "move" ? uiText("noOtherNotebooksAvailable_35ba") : uiText("noMatchingFolders_6b46")}
        </CommandEmpty>
        {mode === "move" ? (
          <CommandGroup heading={uiText("moveTo_86ed")}>
            {moveTargets.map((notebook) => (
              <CommandItem
                key={notebook.id}
                value={notebook.id}
                disabled={notebook.localPathMissing}
                onSelect={() => void handleMove(notebook.id)}
              >
                {renderNotebookIcon(
                  notebook.icon || "BookOpen",
                  "h-4 w-4 shrink-0",
                )}
                <span className="min-w-0 truncate">{notebook.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <CommandGroup heading={uiText("importTo_5a85")}>
            {items.map((item) => (
              <CommandItem
                key={item.key}
                value={`${item.label} ${item.pathLabel}`}
                onSelect={() => void handleSelect(item.folderId)}
              >
                <GooseIcons.Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{item.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {item.pathLabel}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
