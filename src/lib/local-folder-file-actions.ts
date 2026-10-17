import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/local-folder-file-actions.ts#localMessages:1">`
zh-Hans:
  couldnTOpenTheFileCheckYourExternalApp: "打开失败，请检查外部应用设置"
  couldnTOpenTheFolderCheckYourFileManager: "打开失败，请检查文件管理器设置"
  couldnTOpenTheTerminalCheckYourTerminalSettings: "打开失败，请检查终端设置"
  folderPathCopied: "已复制文件夹路径"
  filePathCopied: "已复制文件路径"
  copyFailed: "复制失败"
en:
  couldnTOpenTheFileCheckYourExternalApp: "Couldn’t open the file. Check your external app settings."
  couldnTOpenTheFolderCheckYourFileManager: "Couldn’t open the folder. Check your file manager settings."
  couldnTOpenTheTerminalCheckYourTerminalSettings: "Couldn’t open the terminal. Check your terminal settings."
  folderPathCopied: "Folder path copied"
  filePathCopied: "File path copied"
  copyFailed: "Copy failed"
`;
const uiText = createTranslator(localMessages);
import type { Page } from "@/types";
import { toast } from "@/components/ui/sonner";
import { pageDirectory } from "@/lib/currentLocalPagePath";
import { shell } from "@/lib/electron-platform/shell";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { useSidebarView } from "@/stores/useSidebarView";

/** 本地文件夹打开快捷键与 GitHub Desktop 的打开/显示命令一致。 */
export const LOCAL_FOLDER_FILE_SHORTCUTS = {
  openInExternalApp: "Mod+Shift+A",
  revealInFileManager: "Mod+Shift+F",
  openInTerminal: "Ctrl+`",
  copyFilePath: "Mod+Shift+C",
  moveItem: "Mod+Shift+M",
} as const;

export function resolveCurrentLocalFolderPage(): Page | null {
  const { activeNotebookId, notebooks } = useNotebooks.getState();
  if (!activeNotebookId) return null;
  if (notebooks[activeNotebookId]?.source !== "local-folder") return null;

  const pages = usePages.getState().pages;
  const selectedId =
    useSidebarView.getState().selectedByNotebook[activeNotebookId];
  const pageId = selectedId ?? usePages.getState().activePageId;
  const page = pageId ? pages[pageId] : undefined;
  if (!page?.localFilePath || page.trashedAt) return null;
  if (page.workspaceId !== activeNotebookId) return null;
  return page;
}

export function hasCurrentLocalFolderPage(): boolean {
  return resolveCurrentLocalFolderPage() !== null;
}

export async function openLocalFolderPageInExternalApp(page: Page) {
  const target = page.localFilePath;
  if (!target) return;
  const editor = useSettings.getState().localFolderExternalEditor.trim();
  const ok = editor
    ? await shell.openWithEditor(target, editor)
    : await shell.openPath(target);
  if (!ok) toast.error(uiText("couldnTOpenTheFileCheckYourExternalApp"));
}

export async function revealLocalFolderPageInFileManager(page: Page) {
  const target = page.localFilePath;
  if (!target) return;
  const fileManager = useSettings.getState().localFolderFileManager.trim();
  const ok = fileManager
    ? await shell.openWithApp(target, fileManager)
    : page.isFolder
      ? await shell.openPath(target)
      : await shell.showItemInFolder(target);
  if (!ok) toast.error(uiText("couldnTOpenTheFolderCheckYourFileManager"));
}

export async function openLocalFolderPageInTerminal(page: Page) {
  const target = page.localFilePath;
  if (!target) return;
  const directory = page.isFolder ? target : pageDirectory(target);
  const terminal = useSettings.getState().localFolderTerminal;
  const ok = await shell.openTerminalAtPath(directory, terminal);
  if (!ok) toast.error(uiText("couldnTOpenTheTerminalCheckYourTerminalSettings"));
}

export async function copyLocalFolderPagePath(page: Page) {
  const target = page.localFilePath;
  if (!target) return;
  try {
    shell.copyText(target);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(target);
    }
    toast.success(page.isFolder ? uiText("folderPathCopied") : uiText("filePathCopied"));
  } catch {
    toast.error(uiText("copyFailed"));
  }
}
