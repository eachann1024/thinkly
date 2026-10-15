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
  { id: "appearance", label: "外观与主题", icon: GooseIcons.Laptop },
  { id: "general", label: "通用", icon: GooseIcons.Settings },
  { id: "shortcuts", label: "快捷键", icon: GooseIcons.Keyboard },
  { id: "local-folder", label: "本地文件夹", icon: GooseIcons.FolderOpen },
  { id: "git-sync", label: "Git 同步", icon: GooseIcons.GitBranch },
  { id: "ai", label: "AI 助手", icon: GooseIcons.Sparkles },
  { id: "data", label: "数据与备份", icon: GooseIcons.Database },
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
        label: "备份覆盖前本地版本",
      });
    } catch (err) {
      console.error("[history] Failed to save pre-overwrite history", err);
    }
  }
};
