import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/local-folder-settings/fields/localFolderSettingsConfig.tsx#localMessages:1">`
zh-Hans:
  defaultFileExplorer_3dda: "默认（资源管理器）"
  defaultCommandPrompt_6c00: "默认（命令提示符）"
  defaultFinder_1bce: "默认（访达）"
  defaultTerminal_6a94: "默认（终端）"
  defaultFileManager_77ea: "默认（文件管理器）"
en:
  defaultFileExplorer_3dda: "Default (File Explorer)"
  defaultCommandPrompt_6c00: "Default (Command Prompt)"
  defaultFinder_1bce: "Default (Finder)"
  defaultTerminal_6a94: "Default (Terminal)"
  defaultFileManager_77ea: "Default (file manager)"
`;
const uiText = createTranslator(localMessages);
import { type ComponentType } from "react";
import { type LocalFolderOpenAppCandidate } from "@/lib/local-folder-open-apps";

export interface SettingsLocalFolderProps {
  visible?: boolean;
  localFolderFileManager: string;
  setLocalFolderFileManager: (value: string) => void;
  localFolderExternalEditor: string;
  setLocalFolderExternalEditor: (value: string) => void;
  localFolderTerminal: string;
  setLocalFolderTerminal: (value: string) => void;
  localFolderHiddenFolders: string[];
  setLocalFolderHiddenFolders: (folders: string[]) => void;
}

export interface OpenAppFieldProps {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  onChange: (value: string) => void;
  defaultLabel: string;
  customPlaceholder: string;
  options: LocalFolderOpenAppCandidate[];
  systemIds?: ReadonlySet<string>;
}

export const SYSTEM_VALUE = "__system__";

export const CUSTOM_VALUE = "__custom__";

export const DEFAULT_HIDDEN_FOLDERS = ["assets"];

export const SETTINGS_OPTION_ROW_CLASS =
  "goose-settings-option-row";

export const SYSTEM_FILE_MANAGER_IDS = new Set([
  "finder",
  "explorer",
  "nautilus",
]);

export const SYSTEM_TERMINAL_IDS = new Set([
  "terminal",
  "cmd",
  "x-terminal-emulator",
]);

export function getSystemDefaultLabels() {
  const platform = navigator.platform || navigator.userAgent;
  if (/Win/i.test(platform)) {
    return {
      fileManager: uiText("defaultFileExplorer_3dda"),
      terminal: uiText("defaultCommandPrompt_6c00"),
    };
  }
  if (/Mac/i.test(platform)) {
    return {
      fileManager: uiText("defaultFinder_1bce"),
      terminal: uiText("defaultTerminal_6a94"),
    };
  }
  return {
    fileManager: uiText("defaultFileManager_77ea"),
    terminal: uiText("defaultTerminal_6a94"),
  };
}

export interface HiddenFoldersFieldProps {
  folders: string[];
  onChange: (folders: string[]) => void;
}
