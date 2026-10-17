import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/sidebar-context-menu/shared.tsx#localMessages:1">`
zh-Hans:
  open_d709: "打开"
  openWithDefaultApp_8869: "用默认程序打开"
  openInTerminal_004c: "在终端中打开"
  openFinder: "在访达中打开"
  showFinder: "在访达中显示"
  openExplorer: "在资源管理器中打开"
  showExplorer: "在资源管理器中显示"
  openManager: "在文件管理器中打开"
  showManager: "在文件管理器中显示"
  openApp: "用 {{app}} 打开"
  openTerminal: "在 {{app}} 中打开"
  externalApp: "外部应用"
  fileManager: "文件管理器"
  terminal: "终端"
en:
  open_d709: "Open"
  openWithDefaultApp_8869: "Open with default app"
  openInTerminal_004c: "Open in terminal"
  openFinder: "Open in Finder"
  showFinder: "Show in Finder"
  openExplorer: "Open in File Explorer"
  showExplorer: "Show in File Explorer"
  openManager: "Open in file manager"
  showManager: "Show in file manager"
  openApp: "Open with {{app}}"
  openTerminal: "Open in {{app}}"
  externalApp: "external app"
  fileManager: "file manager"
  terminal: "terminal"
`;
const uiText = createTranslator(localMessages);

import type { Page } from "@/types";
import { formatShortcut } from "@/lib/utils";
import { formatLocalFolderOpenAppName } from "@/lib/local-folder-open-apps";

export const _platform = navigator.platform || navigator.userAgent;

export const _isMac = /Mac/i.test(_platform);

export const _isWin = /Win/i.test(_platform);

export function getFinderLabel(isFolder: boolean) {
  if (_isMac) return uiText(isFolder ? "openFinder" : "showFinder");
  if (_isWin) return uiText(isFolder ? "openExplorer" : "showExplorer");
  return uiText(isFolder ? "openManager" : "showManager");
}

export function MenuShortcut({ shortcut }: { shortcut: string }) {
  return (
    <span className="goose-menu-shortcut">
      {formatShortcut(shortcut)}
    </span>
  );
}

export function getExternalAppLabel(app: string): string {
  if (!app.trim()) return uiText("openWithDefaultApp_8869");
  return uiText("openApp", { app: formatLocalFolderOpenAppName(app, uiText("externalApp")) });
}

export function getFileManagerLabel(
  isFolder: boolean,
  fileManager: string,
): string {
  if (!fileManager.trim()) return getFinderLabel(isFolder);
  return uiText("openApp", { app: formatLocalFolderOpenAppName(fileManager, uiText("fileManager")) });
}

export function getTerminalLabel(terminal: string): string {
  if (!terminal.trim()) return uiText("openInTerminal_004c");
  return uiText("openTerminal", { app: formatLocalFolderOpenAppName(terminal, uiText("terminal")) });
}

export function scheduleAfterMenuClose(action: () => void) {
  window.setTimeout(action, 0);
}

export interface SidebarContextMenuProps {
  page: Page;
  children: React.ReactNode;
  /** 该行在侧栏里是不是文件夹行 */
  isFolderRow?: boolean;
  onCreateLocalFile?: (parentId?: string) => void;
  onCreateLocalFolder?: (parentId?: string) => void;
}
