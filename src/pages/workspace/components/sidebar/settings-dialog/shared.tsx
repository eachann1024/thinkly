import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/shared.tsx#localMessages:1">`
zh-Hans:
  appearanceAndThemes_6902: "外观与主题"
  general_aa05: "通用"
  keyboardShortcuts_f7d2: "快捷键"
  localFolders_497e: "本地文件夹"
  gitSync_fcb0: "Git 同步"
  aiAssistant_318e: "AI 助手"
  dataAndBackups_e963: "数据与备份"
  localVersionBeforeBackupRestore_8346: "备份覆盖前本地版本"
en:
  appearanceAndThemes_6902: "Appearance and themes"
  general_aa05: "General"
  keyboardShortcuts_f7d2: "Keyboard shortcuts"
  localFolders_497e: "Local folders"
  gitSync_fcb0: "Git sync"
  aiAssistant_318e: "AI assistant"
  dataAndBackups_e963: "Data and backups"
  localVersionBeforeBackupRestore_8346: "Local version before backup restore"
`;
const uiText = createTranslator(localMessages);
import type { SettingsTab, SettingsTabConfig } from "../settings/types";
import { usePages } from "@/stores/usePages";
import * as GooseIcons from "@/components/ui/icons";

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  sidebarContainer: HTMLElement | null;
  mainContainer: HTMLElement | null;
}

export const SETTINGS_TABS: SettingsTabConfig[] = [
  { id: "appearance", label: uiText("appearanceAndThemes_6902"), icon: GooseIcons.Laptop },
  { id: "general", label: uiText("general_aa05"), icon: GooseIcons.Settings },
  { id: "shortcuts", label: uiText("keyboardShortcuts_f7d2"), icon: GooseIcons.Keyboard },
  { id: "local-folder", label: uiText("localFolders_497e"), icon: GooseIcons.FolderOpen },
  { id: "git-sync", label: uiText("gitSync_fcb0"), icon: GooseIcons.GitBranch },
  { id: "ai", label: uiText("aiAssistant_318e"), icon: GooseIcons.Sparkles },
  { id: "data", label: uiText("dataAndBackups_e963"), icon: GooseIcons.Database },
];

export const recordPreOverwriteHistory = async (id: string | undefined) => {
  if (!id) return;
  const existingPage = usePages.getState().pages[id];
  if (existingPage && existingPage.content) {
    const oldContent = existingPage.content;
    const oldWorkspaceId = existingPage.workspaceId;
    try {
      const { recordHistorySnapshot } = await import("@/lib/history/snapshot");
      await recordHistorySnapshot({
        pageId: id,
        workspaceId: oldWorkspaceId,
        content: oldContent,
        trigger: "manual",
        isMilestone: true,
        label: uiText("localVersionBeforeBackupRestore_8346"),
      });
    } catch (err) {
      console.error("[history] Failed to save pre-overwrite history", err);
    }
  }
};
